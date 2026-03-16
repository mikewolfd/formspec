/**
 * Theme command handlers.
 *
 * The Formspec theme document controls visual presentation through a three-level
 * cascade that determines how each form item is rendered:
 *
 *   - **Cascade Level 1 (Defaults)** -- Form-wide presentation baseline.
 *   - **Cascade Level 2 (Selectors)** -- Pattern-based overrides.
 *   - **Cascade Level 3 (Per-Item Overrides)** -- Highest-specificity level.
 *
 * Also manages design tokens, breakpoints, page layout, and stylesheets.
 *
 * All handlers return `{ rebuildComponentTree: false }` because theme mutations
 * do not alter the definition item tree structure.
 *
 * @module handlers/theme
 */
import type { CommandHandler } from '../types.js';
import type { ThemeState } from '../types.js';

/** Auto-incrementing counter for generating unique page IDs. */
let pageCounter = 0;

function ensureItems(theme: ThemeState): Record<string, any> {
  if (!theme.items) theme.items = {};
  return theme.items as Record<string, any>;
}

function ensureItemBlock(theme: ThemeState, itemKey: string): Record<string, any> {
  const items = ensureItems(theme);
  if (!items[itemKey]) items[itemKey] = {};
  return items[itemKey];
}

function findPage(theme: ThemeState, pageId: string): any {
  const pages = theme.pages as any[];
  if (!pages) throw new Error('No pages defined');
  const page = pages.find((p: any) => p.id === pageId);
  if (!page) throw new Error(`Page not found: ${pageId}`);
  return page;
}

export const themeHandlers: Record<string, CommandHandler> = {

  // ── Tokens & Defaults ───────────────────────────────────────────

  'theme.setToken': (state, payload) => {
    const { key, value } = payload as { key: string; value: unknown };
    if (!state.theme.tokens) state.theme.tokens = {};
    if (value === null) {
      delete state.theme.tokens[key];
    } else {
      state.theme.tokens[key] = value;
    }
    return { rebuildComponentTree: false };
  },

  'theme.setTokens': (state, payload) => {
    const { tokens } = payload as { tokens: Record<string, unknown> };
    if (!state.theme.tokens) state.theme.tokens = {};
    Object.assign(state.theme.tokens, tokens);
    return { rebuildComponentTree: false };
  },

  'theme.setDefaults': (state, payload) => {
    const { property, value } = payload as { property: string; value: unknown };
    if (!state.theme.defaults) state.theme.defaults = {};
    if (value === null) {
      delete state.theme.defaults[property];
    } else {
      state.theme.defaults[property] = value;
    }
    return { rebuildComponentTree: false };
  },

  // ── Selectors (Cascade Level 2) ─────────────────────────────────

  'theme.addSelector': (state, payload) => {
    const { match, apply, insertIndex } = payload as { match: unknown; apply: unknown; insertIndex?: number };
    if (!state.theme.selectors) state.theme.selectors = [];
    const selector = { match, apply };
    if (insertIndex !== undefined) {
      state.theme.selectors.splice(insertIndex, 0, selector);
    } else {
      state.theme.selectors.push(selector);
    }
    return { rebuildComponentTree: false };
  },

  'theme.setSelector': (state, payload) => {
    const { index, match, apply } = payload as { index: number; match?: unknown; apply?: unknown };
    if (!state.theme.selectors?.[index]) throw new Error(`Selector not found at index: ${index}`);
    const sel = state.theme.selectors[index] as any;
    if (match !== undefined) sel.match = match;
    if (apply !== undefined) sel.apply = apply;
    return { rebuildComponentTree: false };
  },

  'theme.deleteSelector': (state, payload) => {
    const { index } = payload as { index: number };
    if (!state.theme.selectors) return { rebuildComponentTree: false };
    state.theme.selectors.splice(index, 1);
    return { rebuildComponentTree: false };
  },

  'theme.reorderSelector': (state, payload) => {
    const { index, direction } = payload as { index: number; direction: 'up' | 'down' };
    if (!state.theme.selectors) return { rebuildComponentTree: false };
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= state.theme.selectors.length) return { rebuildComponentTree: false };
    [state.theme.selectors[index], state.theme.selectors[target]] =
      [state.theme.selectors[target], state.theme.selectors[index]];
    return { rebuildComponentTree: false };
  },

  // ── Per-Item Overrides (Cascade Level 3) ────────────────────────

  'theme.setItemOverride': (state, payload) => {
    const { itemKey, property, value } = payload as { itemKey: string; property: string; value: unknown };
    const items = ensureItems(state.theme);
    if (value === null) {
      if (items[itemKey]) {
        delete items[itemKey][property];
        if (Object.keys(items[itemKey]).length === 0) delete items[itemKey];
      }
    } else {
      const block = ensureItemBlock(state.theme, itemKey);
      block[property] = value;
    }
    return { rebuildComponentTree: false };
  },

  'theme.deleteItemOverride': (state, payload) => {
    const { itemKey } = payload as { itemKey: string };
    const items = state.theme.items as Record<string, any>;
    if (items) delete items[itemKey];
    return { rebuildComponentTree: false };
  },

  'theme.setItemStyle': (state, payload) => {
    const { itemKey, property, value } = payload as { itemKey: string; property: string; value: unknown };
    const block = ensureItemBlock(state.theme, itemKey);
    if (!block.style) block.style = {};
    if (value === null) {
      delete block.style[property];
    } else {
      block.style[property] = value;
    }
    return { rebuildComponentTree: false };
  },

  'theme.setItemWidgetConfig': (state, payload) => {
    const { itemKey, property, value } = payload as { itemKey: string; property: string; value: unknown };
    const block = ensureItemBlock(state.theme, itemKey);
    if (!block.widgetConfig) block.widgetConfig = {};
    if (value === null) {
      delete block.widgetConfig[property];
    } else {
      block.widgetConfig[property] = value;
    }
    return { rebuildComponentTree: false };
  },

  'theme.setItemAccessibility': (state, payload) => {
    const { itemKey, property, value } = payload as { itemKey: string; property: string; value: unknown };
    const block = ensureItemBlock(state.theme, itemKey);
    if (!block.accessibility) block.accessibility = {};
    if (value === null) {
      delete block.accessibility[property];
    } else {
      block.accessibility[property] = value;
    }
    return { rebuildComponentTree: false };
  },

  // ── Page Layout ─────────────────────────────────────────────────

  'theme.addPage': (state, payload) => {
    const p = payload as { id?: string; title?: string; description?: string; insertIndex?: number };
    if (!state.theme.pages) state.theme.pages = [];
    const page: any = {
      id: p.id ?? `theme_page_${++pageCounter}`,
      title: p.title ?? '',
      regions: [],
    };
    if (p.description) page.description = p.description;
    if (p.insertIndex !== undefined) {
      (state.theme.pages as any[]).splice(p.insertIndex, 0, page);
    } else {
      (state.theme.pages as any[]).push(page);
    }
    return { rebuildComponentTree: false };
  },

  'theme.setPageProperty': (state, payload) => {
    const { index, property, value } = payload as { index: number; property: string; value: unknown };
    const pages = state.theme.pages as any[];
    if (!pages?.[index]) throw new Error(`Page not found at index: ${index}`);
    pages[index][property] = value;
    return { rebuildComponentTree: false };
  },

  'theme.deletePage': (state, payload) => {
    const { index } = payload as { index: number };
    const pages = state.theme.pages as any[];
    if (!pages) return { rebuildComponentTree: false };
    if (pages.length <= 1) throw new Error('Cannot delete the last page');
    pages.splice(index, 1);
    return { rebuildComponentTree: false };
  },

  'theme.reorderPage': (state, payload) => {
    const { index, direction } = payload as { index: number; direction: 'up' | 'down' };
    const pages = state.theme.pages as any[];
    if (!pages) return { rebuildComponentTree: false };
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= pages.length) return { rebuildComponentTree: false };
    [pages[index], pages[target]] = [pages[target], pages[index]];
    return { rebuildComponentTree: false };
  },

  'theme.addRegion': (state, payload) => {
    const { pageId, key, span, start, insertIndex } = payload as {
      pageId: string; key?: string; span?: number; start?: number; insertIndex?: number;
    };
    const page = findPage(state.theme, pageId);
    if (!page.regions) page.regions = [];
    const region: any = {};
    if (key) region.key = key;
    if (span !== undefined) region.span = span;
    if (start !== undefined) region.start = start;
    if (insertIndex !== undefined) {
      page.regions.splice(insertIndex, 0, region);
    } else {
      page.regions.push(region);
    }
    return { rebuildComponentTree: false };
  },

  'theme.setRegionProperty': (state, payload) => {
    const { pageId, regionIndex, property, value } = payload as {
      pageId: string; regionIndex: number; property: string; value: unknown;
    };
    const page = findPage(state.theme, pageId);
    if (!page.regions?.[regionIndex]) throw new Error('Region not found');
    page.regions[regionIndex][property] = value;
    return { rebuildComponentTree: false };
  },

  'theme.deleteRegion': (state, payload) => {
    const { pageId, regionIndex } = payload as { pageId: string; regionIndex: number };
    const page = findPage(state.theme, pageId);
    if (!page.regions) return { rebuildComponentTree: false };
    page.regions.splice(regionIndex, 1);
    return { rebuildComponentTree: false };
  },

  'theme.reorderRegion': (state, payload) => {
    const { pageId, regionIndex, direction } = payload as {
      pageId: string; regionIndex: number; direction: 'up' | 'down';
    };
    const page = findPage(state.theme, pageId);
    if (!page.regions) return { rebuildComponentTree: false };
    const target = direction === 'up' ? regionIndex - 1 : regionIndex + 1;
    if (target < 0 || target >= page.regions.length) return { rebuildComponentTree: false };
    [page.regions[regionIndex], page.regions[target]] = [page.regions[target], page.regions[regionIndex]];
    return { rebuildComponentTree: false };
  },

  'theme.renamePage': (state, payload) => {
    const { pageId, newId } = payload as { pageId: string; newId: string };
    const page = findPage(state.theme, pageId);
    page.id = newId;
    return { rebuildComponentTree: false };
  },

  'theme.setRegionKey': (state, payload) => {
    const { pageId, regionIndex, newKey } = payload as { pageId: string; regionIndex: number; newKey: string };
    const page = findPage(state.theme, pageId);
    if (!page.regions?.[regionIndex]) throw new Error('Region not found');
    page.regions[regionIndex].key = newKey;
    return { rebuildComponentTree: false };
  },

  'theme.setPages': (state, payload) => {
    const { pages } = payload as { pages: unknown[] };
    state.theme.pages = pages;
    return { rebuildComponentTree: false };
  },

  // ── Document-Level ──────────────────────────────────────────────

  'theme.setBreakpoint': (state, payload) => {
    const { name, minWidth } = payload as { name: string; minWidth: number | null };
    if (!state.theme.breakpoints) state.theme.breakpoints = {};
    if (minWidth === null) {
      delete state.theme.breakpoints[name];
    } else {
      state.theme.breakpoints[name] = minWidth;
    }
    return { rebuildComponentTree: false };
  },

  'theme.setStylesheets': (state, payload) => {
    const { urls } = payload as { urls: string[] };
    state.theme.stylesheets = urls;
    return { rebuildComponentTree: false };
  },

  'theme.setDocumentProperty': (state, payload) => {
    const { property, value } = payload as { property: string; value: unknown };
    if (value === null) {
      delete (state.theme as any)[property];
    } else {
      (state.theme as any)[property] = value;
    }
    return { rebuildComponentTree: false };
  },

  'theme.setExtension': (state, payload) => {
    const { key, value } = payload as { key: string; value: unknown };
    if (value === null) {
      delete (state.theme as any)[key];
    } else {
      (state.theme as any)[key] = value;
    }
    return { rebuildComponentTree: false };
  },

  'theme.setTargetCompatibility': (state, payload) => {
    const { compatibleVersions } = payload as { compatibleVersions: string };
    if (!state.theme.targetDefinition) {
      state.theme.targetDefinition = { url: '' };
    }
    state.theme.targetDefinition.compatibleVersions = compatibleVersions;
    return { rebuildComponentTree: false };
  },
};
