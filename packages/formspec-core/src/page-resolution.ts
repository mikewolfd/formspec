/** @filedesc Resolves theme pages into enriched page structures with diagnostics. */
import type { ThemeDocument, FormDefinition, FormItem } from './types.js';

// ── Public types ─────────────────────────────────────────────────────

/**
 * Enriched region from theme.schema.json Region with existence check.
 * Schema source: theme.schema.json#/$defs/Region
 */
export interface ResolvedRegion {
  key: string;
  span: number;       // default 12 per schema
  start?: number;
  responsive?: Record<string, { span?: number; start?: number; hidden?: boolean }>;
  exists: boolean;     // key exists in definition items?
}

/**
 * Resolved page from theme.schema.json Page with enriched regions.
 * Schema source: theme.schema.json#/$defs/Page
 */
export interface ResolvedPage {
  id: string;
  title: string;
  description?: string;
  regions: ResolvedRegion[];
}

export interface PageDiagnostic {
  code: 'UNKNOWN_REGION_KEY' | 'PAGEMODE_MISMATCH';
  severity: 'warning' | 'error';
  message: string;
}

export interface ResolvedPageStructure {
  mode: 'single' | 'wizard' | 'tabs';
  pages: ResolvedPage[];
  diagnostics: PageDiagnostic[];
  unassignedItems: string[];
  itemPageMap: Record<string, string>;
}

/** The two document slices resolvePageStructure reads. */
export type PageStructureInput = {
  theme: Pick<ThemeDocument, 'pages'>;
  definition: Pick<FormDefinition, 'formPresentation' | 'items'>;
};

/**
 * Resolves the current page structure from studio-managed internal state.
 *
 * Reads `theme.pages` as the canonical source. No tier cascade —
 * Studio is the sole writer and keeps all documents consistent.
 */
export function resolvePageStructure(
  state: PageStructureInput,
  definitionItemKeys: string[],
): ResolvedPageStructure {
  const diagnostics: PageDiagnostic[] = [];
  const themePages = (state.theme.pages ?? []) as any[];
  const pageMode: string = state.definition.formPresentation?.pageMode ?? 'single';
  const knownKeys = new Set(definitionItemKeys);

  // Build resolved pages from theme.pages (canonical source)
  // Maps theme.schema.json Page/Region to enriched ResolvedPage/ResolvedRegion
  const pages: ResolvedPage[] = themePages.map((p: any) => ({
    id: p.id ?? '',
    title: p.title ?? '',
    ...(p.description !== undefined && { description: p.description }),
    regions: (p.regions ?? []).map((r: any) => {
      const region: ResolvedRegion = {
        key: r.key ?? '',
        span: r.span ?? 12,  // Region.span default per schema
        exists: knownKeys.has(r.key ?? ''),
      };
      if (r.start !== undefined) region.start = r.start;
      if (r.responsive !== undefined) region.responsive = r.responsive;
      return region;
    }),
  }));

  // Build itemPageMap and emit diagnostics for unknown keys
  // 1. Explicitly assigned keys from regions
  const itemPageMap: Record<string, string> = {};
  for (const page of pages) {
    for (const region of page.regions) {
      if (region.exists) {
        itemPageMap[region.key] = page.id;
      } else if (region.key) {
        diagnostics.push({
          code: 'UNKNOWN_REGION_KEY',
          severity: 'warning',
          message: `Region key "${region.key}" on page "${page.title || page.id}" does not match any definition item.`,
        });
      }
    }
  }

  // 2. Bidirectional page ID propagation
  // Top-down: groups assign page IDs to their children.
  // Bottom-up: groups whose children are ALL assigned inherit a page ID.
  function propagate(items: FormItem[], parentPageId?: string) {
    for (const item of items) {
      const inheritedId = itemPageMap[item.key] ?? parentPageId;
      if (inheritedId && !itemPageMap[item.key]) {
        itemPageMap[item.key] = inheritedId;
      }
      if (item.children) {
        propagate(item.children, inheritedId);
        // Bottom-up: if all children are assigned, mark the group as assigned too
        if (!(item.key in itemPageMap)) {
          const allChildrenAssigned = item.children.length > 0 &&
            item.children.every(c => c.key in itemPageMap);
          if (allChildrenAssigned) {
            itemPageMap[item.key] = itemPageMap[item.children[0].key];
          }
        }
      }
    }
  }
  propagate(state.definition.items ?? []);

  // Compute unassigned items.
  // For groups with children: if the group is unassigned but SOME children are
  // assigned, only show the unassigned children (not the group itself).
  // For groups with NO children assigned: show the group (not individual children).
  const unassignedItems: string[] = [];
  const visited = new Set<string>();
  function collectUnassigned(items: FormItem[]) {
    for (const item of items) {
      visited.add(item.key);
      const isAssigned = item.key in itemPageMap;

      if (item.children && item.children.length > 0) {
        const anyChildAssigned = item.children.some(c => c.key in itemPageMap);
        if (isAssigned) {
          // Group fully assigned (all children placed) — nothing to show
        } else if (anyChildAssigned) {
          // Partial: some children placed, some not — show only unassigned children
          for (const child of item.children) {
            visited.add(child.key);
            if (!(child.key in itemPageMap)) {
              unassignedItems.push(child.key);
            }
          }
        } else {
          // No children assigned — show the group itself
          unassignedItems.push(item.key);
          // Mark children as visited so they don't appear separately
          for (const child of item.children) {
            visited.add(child.key);
          }
        }
      } else if (!isAssigned) {
        unassignedItems.push(item.key);
      }
    }
  }
  collectUnassigned(state.definition.items ?? []);

  // Also include keys from the input list that weren't in the items tree
  // (guards against mismatched inputs and supports minimal test cases)
  for (const key of definitionItemKeys) {
    if (!visited.has(key) && !(key in itemPageMap)) {
      unassignedItems.push(key);
    }
  }

  // Emit PAGEMODE_MISMATCH
  if (pages.length > 0 && pageMode === 'single') {
    diagnostics.push({
      code: 'PAGEMODE_MISMATCH',
      severity: 'warning',
      message: 'Theme pages exist but definition pageMode is "single". Pages may not render.',
    });
  }

  // Determine effective mode (definition.schema.json formPresentation.pageMode enum)
  const mode: 'single' | 'wizard' | 'tabs' =
    pageMode === 'tabs' ? 'tabs' : pageMode === 'wizard' ? 'wizard' : 'single';

  return {
    mode,
    pages,
    diagnostics,
    unassignedItems,
    itemPageMap,
  };
}
