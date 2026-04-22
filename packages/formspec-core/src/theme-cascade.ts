/** @filedesc Resolves presentation properties via the full 5-level cascade (formPresentation → item.presentation → theme defaults → selectors → item overrides). */
import type { ThemeDocument } from './types.js';

export interface ResolvedProperty {
  value: unknown;
  source: 'form-default' | 'item-hint' | 'default' | 'selector' | 'item-override';
  sourceDetail?: string;
}

/** The three cascade-relevant slices of a ThemeDocument. */
export type ThemeCascadeInput = Pick<ThemeDocument, 'defaults' | 'selectors' | 'items'>;

/** Optional definition-level inputs for the 2 lowest cascade levels. */
export interface DefinitionCascadeInput {
  formPresentation?: Record<string, unknown>;
  itemPresentation?: Record<string, unknown>;
}

interface SelectorEntry {
  match?: { type?: string; dataType?: string };
  apply?: Record<string, unknown>;
}

function selectorMatches(match: SelectorEntry['match'], itemType: string, itemDataType?: string): boolean {
  if (!match) return true;
  if (match.type && match.type !== itemType) return false;
  if (match.dataType && match.dataType !== itemDataType) return false;
  return true;
}

function selectorLabel(match: SelectorEntry['match'], index: number): string {
  const parts: string[] = [];
  if (match?.type) parts.push(match.type);
  if (match?.dataType) parts.push(match.dataType);
  return 'selector #' + (index + 1) + (parts.length ? ': ' + parts.join(' + ') : '');
}

export function resolveThemeCascade(
  theme: ThemeCascadeInput,
  itemKey: string,
  itemType: string,
  itemDataType?: string,
  definition?: DefinitionCascadeInput,
): Record<string, ResolvedProperty> {
  const result: Record<string, ResolvedProperty> = {};

  // Level -1: formPresentation (definition-wide defaults)
  if (definition?.formPresentation) {
    for (const [prop, value] of Object.entries(definition.formPresentation)) {
      if (value !== undefined) {
        result[prop] = { value, source: 'form-default' };
      }
    }
  }

  // Level 0: item.presentation (per-item hints)
  if (definition?.itemPresentation) {
    for (const [prop, value] of Object.entries(definition.itemPresentation)) {
      if (value !== undefined) {
        result[prop] = { value, source: 'item-hint' };
      }
    }
  }

  // Level 1: theme defaults
  const defaults = (theme.defaults ?? {}) as Record<string, unknown>;
  for (const [prop, value] of Object.entries(defaults)) {
    result[prop] = { value, source: 'default' };
  }

  // Level 2: selectors (in array order, later overrides earlier)
  const selectors = (theme.selectors ?? []) as SelectorEntry[];
  for (let i = 0; i < selectors.length; i++) {
    const sel = selectors[i];
    if (!selectorMatches(sel.match, itemType, itemDataType)) continue;
    const apply = sel.apply ?? {};
    for (const [prop, value] of Object.entries(apply)) {
      result[prop] = {
        value,
        source: 'selector',
        sourceDetail: selectorLabel(sel.match, i),
      };
    }
  }

  // Level 3: item overrides
  const items = (theme.items ?? {}) as Record<string, Record<string, unknown>>;
  const itemOverrides = items[itemKey];
  if (itemOverrides && typeof itemOverrides === 'object') {
    for (const [prop, value] of Object.entries(itemOverrides)) {
      result[prop] = { value, source: 'item-override' };
    }
  }

  return result;
}
