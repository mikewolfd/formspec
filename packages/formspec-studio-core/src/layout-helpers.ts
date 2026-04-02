/** @filedesc Spatial and theme override helpers for the Layout workspace direct-manipulation canvas. */
import type { HelperResult } from './helper-types.js';
import type { Project } from './project.js';

/** A node reference — either a nodeId or a bind key, matching component.setNodeStyle's NodeRef. */
export interface NodeRef {
  nodeId?: string;
  bind?: string;
}

/** One entry in the cascade provenance array returned by getPropertySources. */
export interface PropertySource {
  /** Human-readable cascade source label. Matches ResolvedProperty.source from resolveThemeCascade. */
  source: 'default' | 'selector' | 'item-override';
  /** Optional detail (e.g. "selector #2: field + string"). */
  sourceDetail?: string;
  /** The value at this cascade level. */
  value: unknown;
}

// ── Style helpers (Tier 3 — Component node style) ────────────────────

/**
 * Set `style.gridColumn = "span N"` on a component node.
 * Clamps N to [1, 12]. Preserves all other style properties.
 */
export function setColumnSpan(
  project: Project,
  ref: NodeRef,
  n: number,
): void {
  const clamped = Math.min(12, Math.max(1, n));
  project.setNodeStyleProperty(ref, 'gridColumn', `span ${clamped}`);
}

/**
 * Set `style.gridRow = "span N"` on a component node.
 * Clamps N to [1, 12]. Preserves all other style properties.
 */
export function setRowSpan(
  project: Project,
  ref: NodeRef,
  n: number,
): void {
  const clamped = Math.min(12, Math.max(1, n));
  project.setNodeStyleProperty(ref, 'gridRow', `span ${clamped}`);
}

/**
 * Set `style.padding` on a component node.
 * Preserves all other style properties.
 */
export function setPadding(
  project: Project,
  ref: NodeRef,
  value: string,
): void {
  project.setNodeStyleProperty(ref, 'padding', value);
}

// ── Theme helpers (Tier 2 — PresentationBlock cascade) ───────────────

/**
 * Walk all cascade levels for a PresentationBlock property on a given item.
 * Returns entries in ascending level order: default → selector(s) → item-override.
 * Only selectors whose match criteria apply to the item's type and dataType are included.
 */
export function getPropertySources(
  project: Project,
  itemKey: string,
  prop: string,
  itemType: string = 'field',
  itemDataType?: string,
): PropertySource[] {
  const theme = project.state.theme;
  const sources: PropertySource[] = [];

  // Level 1: theme defaults
  const defaults = (theme.defaults ?? {}) as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(defaults, prop)) {
    sources.push({ source: 'default', value: defaults[prop] });
  }

  // Level 2: theme selectors — only include selectors that match this item's type/dataType
  const selectors = (theme.selectors ?? []) as Array<{
    match?: { type?: string; dataType?: string };
    apply?: Record<string, unknown>;
  }>;
  for (let i = 0; i < selectors.length; i++) {
    const sel = selectors[i];
    // Apply same match logic as resolveThemeCascade / selectorMatches in theme-cascade.ts
    const match = sel.match;
    if (match) {
      if (match.type && match.type !== itemType) continue;
      if (match.dataType && match.dataType !== itemDataType) continue;
    }
    const apply = sel.apply ?? {};
    if (Object.prototype.hasOwnProperty.call(apply, prop)) {
      const parts: string[] = [];
      if (sel.match?.type) parts.push(sel.match.type);
      if (sel.match?.dataType) parts.push(sel.match.dataType);
      const sourceDetail = `selector #${i + 1}${parts.length ? ': ' + parts.join(' + ') : ''}`;
      sources.push({ source: 'selector', sourceDetail, value: apply[prop] });
    }
  }

  // Level 3: item-level override
  const items = (theme.items ?? {}) as Record<string, Record<string, unknown>>;
  const itemOverride = items[itemKey];
  if (itemOverride && Object.prototype.hasOwnProperty.call(itemOverride, prop)) {
    sources.push({ source: 'item-override', value: itemOverride[prop] });
  }

  return sources;
}

/** Fixed list of PresentationBlock properties available for per-item theme override. */
const EDITABLE_THEME_PROPERTIES: string[] = [
  'labelPosition',
  'widget',
  'widgetConfig',
  'style',
  'cssClass',
  'accessibility',
  'fallback',
];

/**
 * Returns the list of PresentationBlock property names that can be overridden
 * on a per-item basis in the Theme cascade.
 */
export function getEditableThemeProperties(
  _project: Project,
  _itemKey: string,
): string[] {
  return EDITABLE_THEME_PROPERTIES;
}

/**
 * Set a per-item theme override via the existing project.setItemOverride path.
 */
export function setThemeOverride(
  project: Project,
  itemKey: string,
  prop: string,
  value: unknown,
): HelperResult {
  return project.setItemOverride(itemKey, prop, value);
}

/**
 * Remove a single per-item theme override property.
 * Calls theme.setItemOverride with value=null, which deletes the property.
 */
export function clearThemeOverride(
  project: Project,
  itemKey: string,
  prop: string,
): HelperResult {
  return project.setItemOverride(itemKey, prop, null);
}
