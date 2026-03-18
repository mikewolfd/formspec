/** @filedesc Behavioral page-view query — translates schema-native page structure to UI vocabulary. */
import type { ProjectState } from '../types.js';
import type { FormItem } from 'formspec-types';
import { resolvePageStructure } from '../page-resolution.js';

// ── Behavioral types ────────────────────────────────────────────────

/** What PagesTab sees — no schema vocabulary. */
export interface PageView {
  id: string;
  title: string;
  description?: string;
  items: PageItemView[];
}

export interface PageItemView {
  key: string;
  label: string;
  status: 'valid' | 'broken';
  width: number;             // 1-12, from Region.span
  offset?: number;           // from Region.start
  responsive: Record<string, {
    width?: number;
    offset?: number;
    hidden?: boolean;
  }>;
}

export interface PlaceableItem {
  key: string;
  label: string;
}

export interface PageStructureView {
  mode: 'single' | 'wizard' | 'tabs';
  pages: PageView[];
  unassigned: PlaceableItem[];
  breakpointNames: string[];
  diagnostics: Array<{ severity: 'warning' | 'error'; message: string }>;
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Walk the item tree depth-first, building a key → label lookup. */
function buildLabelMap(items: FormItem[]): Map<string, string> {
  const map = new Map<string, string>();
  function walk(nodes: FormItem[]) {
    for (const item of nodes) {
      map.set(item.key, item.label ?? item.key);
      if (item.children) walk(item.children);
    }
  }
  walk(items);
  return map;
}

/** Collect all top-level item keys (non-recursive — same set resolvePageStructure uses). */
function collectAllKeys(items: FormItem[]): string[] {
  const keys: string[] = [];
  function walk(nodes: FormItem[]) {
    for (const item of nodes) {
      keys.push(item.key);
      if (item.children) walk(item.children);
    }
  }
  walk(items);
  return keys;
}

/** Translate Region.responsive (schema: span/start/hidden) to PageItemView.responsive (behavioral: width/offset/hidden). */
function translateResponsive(
  raw?: Record<string, { span?: number; start?: number; hidden?: boolean }>,
): Record<string, { width?: number; offset?: number; hidden?: boolean }> {
  if (!raw) return {};
  const result: Record<string, { width?: number; offset?: number; hidden?: boolean }> = {};
  for (const [bp, overrides] of Object.entries(raw)) {
    const entry: { width?: number; offset?: number; hidden?: boolean } = {};
    if (overrides.span !== undefined) entry.width = overrides.span;
    if (overrides.start !== undefined) entry.offset = overrides.start;
    if (overrides.hidden !== undefined) entry.hidden = overrides.hidden;
    result[bp] = entry;
  }
  return result;
}

const DEFAULT_BREAKPOINT_NAMES = ['sm', 'md', 'lg'];

// ── Query function ──────────────────────────────────────────────────

/**
 * Resolves the page structure into behavioral types for the Pages UI.
 *
 * Pure function: `(state: ProjectState) => PageStructureView`.
 * Wraps `resolvePageStructure` and translates schema vocabulary (span, start, exists)
 * to UI vocabulary (width, offset, status).
 */
export function resolvePageView(state: ProjectState): PageStructureView {
  const defItems: FormItem[] = (state.definition.items ?? []) as FormItem[];
  const allKeys = collectAllKeys(defItems);
  const labelMap = buildLabelMap(defItems);

  const resolved = resolvePageStructure(
    { theme: state.theme as any, definition: state.definition },
    allKeys,
  );

  const pages: PageView[] = resolved.pages.map(p => ({
    id: p.id,
    title: p.title,
    ...(p.description !== undefined && { description: p.description }),
    items: p.regions.map(r => ({
      key: r.key,
      label: labelMap.get(r.key) ?? r.key,
      status: (r.exists ? 'valid' : 'broken') as 'valid' | 'broken',
      width: r.span,
      ...(r.start !== undefined && { offset: r.start }),
      responsive: translateResponsive(r.responsive),
    })),
  }));

  const unassigned: PlaceableItem[] = resolved.unassignedItems.map(key => ({
    key,
    label: labelMap.get(key) ?? key,
  }));

  const breakpointNames: string[] = state.theme.breakpoints
    ? Object.keys(state.theme.breakpoints)
    : DEFAULT_BREAKPOINT_NAMES;

  const diagnostics = resolved.diagnostics.map(d => ({
    severity: d.severity,
    message: d.message,
  }));

  return {
    mode: resolved.mode,
    pages,
    unassigned,
    breakpointNames,
    diagnostics,
  };
}
