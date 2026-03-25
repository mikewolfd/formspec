/** @filedesc WASM bridge — delegates layout planning and theme resolution to Rust via formspec-engine. */

import {
    wasmResolvePresentation,
    wasmResolveToken,
    wasmPlanComponentTree,
    wasmPlanDefinitionFallback,
    wasmPlanThemePages,
    wasmPlanUnboundRequired,
    wasmResetNodeIdCounter,
} from 'formspec-engine/fel-tools';

import type { LayoutNode, PlanContext } from './types.js';
import type {
    ThemeDocument,
    PresentationBlock,
    ItemDescriptor,
    Tier1Hints,
} from './theme-resolver.js';

// ── Theme normalization ──────────────────────────────────────────────

/**
 * Normalize a TS theme object for the Rust side.
 * The Rust ThemeDocument requires `$formspecTheme`, `version`, and
 * `targetDefinition` fields. TS callers often pass partial theme objects.
 */
function normalizeTheme(theme: any): any {
    if (!theme || typeof theme !== 'object') return theme;
    return {
        $formspecTheme: '1.0',
        version: '1.0.0',
        targetDefinition: { url: '' },
        ...theme,
    };
}

// ── PlanContext → PlanContextJson conversion ─────────────────────────

/**
 * JSON-serializable context for the Rust planner (matches PlanContextJson in formspec-plan).
 * The Rust side expects `itemsByPath` (flat map of path → item) instead of
 * `items` (array) + `findItem` (function).
 */
interface PlanContextJson {
    itemsByPath: Record<string, unknown>;
    formPresentation?: unknown;
    componentDocument?: unknown;
    theme?: unknown;
    viewportWidth?: number | null;
    availableComponents: string[];
}

/**
 * Build a flat path → item map from a recursive items array.
 * Walks children recursively, building dotted paths (e.g. "group.field").
 */
function buildItemsByPath(items: any[], prefix = ''): Record<string, unknown> {
    const map: Record<string, unknown> = {};
    for (const item of items) {
        const key = item?.key || item?.name;
        if (!key) continue;
        const fullPath = prefix ? `${prefix}.${key}` : key;
        map[fullPath] = item;
        // Support both "children" (TS convention) and "items" (definition schema)
        const subItems = item.children || item.items;
        if (Array.isArray(subItems)) {
            Object.assign(map, buildItemsByPath(subItems, fullPath));
        }
    }
    return map;
}

/**
 * Compute the active breakpoint name from viewport width and theme breakpoints.
 * Returns the largest breakpoint whose value is <= viewportWidth, or null.
 */
function resolveViewportWidth(ctx: PlanContext): number | null {
    if (ctx.activeBreakpoint != null && ctx.theme?.breakpoints) {
        const bp = ctx.theme.breakpoints[ctx.activeBreakpoint];
        if (typeof bp === 'number') return bp;
    }
    return null;
}

/**
 * Structural keys used by the component tree schema.
 * These are NEVER treated as custom component params.
 * Note: domain props like 'title', 'gap', etc. are NOT structural —
 * they could be custom params and are handled by the Rust planner's extract_props().
 */
const TREE_STRUCTURAL_KEYS = new Set([
    'component', 'children', 'when', 'responsive', 'bind', 'style',
    'cssClass', 'accessibility', 'params',
]);

/**
 * Normalize a component document for the Rust side.
 * 1. Renames "tree" → "template" in custom component definitions
 *    (component schema uses "tree", Rust planner expects "template").
 * 2. Packs top-level custom component params into a "params" object
 *    on tree nodes that reference custom components.
 */
function normalizeComponentDocument(doc: any): any {
    if (!doc || typeof doc !== 'object') return doc;
    const result = { ...doc };

    // Collect custom component definitions (name → def with params array)
    const customDefs = new Map<string, any>();
    if (result.components && typeof result.components === 'object') {
        const normalized: Record<string, any> = {};
        for (const [name, def] of Object.entries(result.components)) {
            if (def && typeof def === 'object' && 'tree' in (def as any) && !('template' in (def as any))) {
                const { tree, ...rest } = def as any;
                normalized[name] = { ...rest, template: tree };
            } else {
                normalized[name] = def;
            }
            customDefs.set(name, def);
        }
        result.components = normalized;
    }

    // Normalize tree nodes: pack top-level keys as params for custom components
    if (result.tree && customDefs.size > 0) {
        result.tree = normalizeTreeNode(result.tree, customDefs);
    }

    return result;
}

/**
 * Walk a component tree node and pack non-structural top-level keys
 * into a "params" object for nodes that reference custom components.
 * Uses the custom component's declared param names to distinguish
 * params from regular component props.
 */
function normalizeTreeNode(node: any, customDefs: Map<string, any>): any {
    if (!node || typeof node !== 'object') return node;

    const result = { ...node };

    // If this node references a custom component and has no explicit params,
    // collect declared param keys into a params object.
    const customDef = customDefs.get(result.component);
    if (customDef && !result.params) {
        const declaredParams: string[] = customDef.params || [];
        const params: Record<string, any> = {};

        if (declaredParams.length > 0) {
            // Use declared params to know which keys to extract
            for (const paramName of declaredParams) {
                if (paramName in result) {
                    params[paramName] = result[paramName];
                    delete result[paramName];
                }
            }
        } else {
            // No declared params — collect all non-structural keys as params
            // This handles the case where custom components don't declare their params
            for (const [key, val] of Object.entries(result)) {
                if (!TREE_STRUCTURAL_KEYS.has(key) && key !== 'component') {
                    params[key] = val;
                }
            }
            for (const key of Object.keys(params)) {
                delete result[key];
            }
        }

        if (Object.keys(params).length > 0) {
            result.params = params;
        }
    }

    // Recurse on children
    if (Array.isArray(result.children)) {
        result.children = result.children.map((child: any) => normalizeTreeNode(child, customDefs));
    }

    return result;
}

/** Convert the TS PlanContext to the JSON shape the Rust WASM expects. */
function toPlanContextJson(ctx: PlanContext): PlanContextJson {
    return {
        itemsByPath: buildItemsByPath(ctx.items),
        formPresentation: ctx.formPresentation ?? undefined,
        componentDocument: ctx.componentDocument ? normalizeComponentDocument(ctx.componentDocument) : undefined,
        theme: ctx.theme ? normalizeTheme(ctx.theme) : undefined,
        viewportWidth: resolveViewportWidth(ctx),
        availableComponents: collectAvailableComponents(ctx),
    };
}

/** Collect available component names from the context predicate (if provided). */
function collectAvailableComponents(ctx: PlanContext): string[] {
    if (!ctx.isComponentAvailable) return [];

    // The Rust side needs an explicit list. We probe the known component types.
    const KNOWN_TYPES = [
        'Page', 'Stack', 'Grid', 'Divider', 'Collapsible', 'Columns',
        'Panel', 'Accordion', 'Modal', 'Popover',
        'TextInput', 'NumberInput', 'Select', 'Toggle', 'Checkbox',
        'DatePicker', 'RadioGroup', 'CheckboxGroup', 'Slider', 'Rating',
        'FileUpload', 'Signature', 'MoneyInput',
        'Heading', 'Text', 'Card', 'Spacer', 'Alert', 'Badge',
        'ProgressBar', 'Summary', 'ValidationSummary',
        'Wizard', 'Tabs', 'SubmitButton',
        'ConditionalGroup', 'DataTable',
    ];
    return KNOWN_TYPES.filter(t => ctx.isComponentAvailable!(t));
}

// ── Theme cascade (delegates to Rust formspec-theme) ─────────────────

/**
 * Resolve the effective PresentationBlock for a single item via the 6-level cascade.
 *
 * Delegates to Rust `formspec_theme::resolve_presentation` via WASM.
 */
export function resolvePresentation(
    theme: ThemeDocument | null | undefined,
    item: ItemDescriptor,
    tier1?: Tier1Hints,
): PresentationBlock {
    // Rust expects `itemType` and `dataType` (camelCase of item_type/data_type);
    // TS ItemDescriptor uses `type` and `dataType`.
    const rustItem = {
        key: item.key,
        itemType: item.type,
        dataType: item.dataType,
    };

    // Rust Tier1Hints expects `itemPresentation` and `formPresentation` with
    // Rust field names; the TS shape already uses camelCase so it should be fine,
    // but ensure `widgetHint` in itemPresentation is present.
    const resultJson = wasmResolvePresentation(
        theme ? JSON.stringify(normalizeTheme(theme)) : 'null',
        JSON.stringify(rustItem),
        tier1 ? JSON.stringify(tier1) : 'null',
    );
    return JSON.parse(resultJson);
}

/**
 * Resolve a $token.key reference against component tokens and theme tokens.
 *
 * Delegates to Rust `formspec_theme::resolve_token` via WASM.
 */
export function resolveToken(
    val: any,
    componentTokens: Record<string, string | number> | undefined,
    themeTokens: Record<string, string | number> | undefined,
): any {
    // Fast path: non-token values pass through without WASM call
    if (typeof val !== 'string' || !val.startsWith('$token.')) {
        return val;
    }

    const resultJson = wasmResolveToken(
        val,
        componentTokens ? JSON.stringify(componentTokens) : 'null',
        themeTokens ? JSON.stringify(themeTokens) : 'null',
    );
    const result = JSON.parse(resultJson);
    if (result === null) {
        // WASM returns null for unresolved tokens; TS API returns the original value + warning
        console.warn(`Unresolved token reference: ${val}`);
        return val;
    }
    return result;
}

// ── Layout planner (delegates to Rust formspec-plan) ─────────────────

/**
 * Plan a component tree node into a LayoutNode tree.
 *
 * Delegates to Rust `formspec_plan::plan_component_tree` via WASM.
 */
export function planComponentTree(
    tree: any,
    ctx: PlanContext,
    _prefix?: string,
    _customComponentStack?: Set<string>,
    _applyThemePages?: boolean,
): LayoutNode {
    const contextJson = toPlanContextJson(ctx);

    // Normalize the tree: if component document has custom components,
    // pack declared param keys into a params object for custom component refs.
    let normalizedTree = tree;
    const customDefs = collectCustomComponentDefs(ctx.componentDocument);
    if (customDefs.size > 0) {
        normalizedTree = normalizeTreeNode(tree, customDefs);
    }

    const resultJson = wasmPlanComponentTree(
        JSON.stringify(normalizedTree),
        JSON.stringify(contextJson),
    );
    return JSON.parse(resultJson);
}

/** Collect custom component definitions from a component document. */
function collectCustomComponentDefs(doc: any): Map<string, any> {
    const defs = new Map<string, any>();
    if (doc?.components && typeof doc.components === 'object') {
        for (const [name, def] of Object.entries(doc.components)) {
            defs.set(name, def);
        }
    }
    return defs;
}

/**
 * Plan definition items into LayoutNode trees (fallback when no component
 * document is provided).
 *
 * Delegates to Rust `formspec_plan::plan_definition_fallback` via WASM.
 */
export function planDefinitionFallback(
    items: any[],
    ctx: PlanContext,
    _prefix?: string,
    _applyThemePages?: boolean,
): LayoutNode[] {
    const contextJson = toPlanContextJson(ctx);
    // Rust expects group sub-items under "items" key, but TS definitions may use "children"
    const normalizedItems = normalizeDefinitionItems(items);
    const resultJson = wasmPlanDefinitionFallback(
        JSON.stringify(normalizedItems),
        JSON.stringify(contextJson),
    );
    return JSON.parse(resultJson);
}

/**
 * Normalize definition items: rename "children" → "items" for group sub-items.
 * The Formspec definition schema uses "items" for group children, but TS callers
 * often use "children" (inherited from the component tree convention).
 */
function normalizeDefinitionItems(items: any[]): any[] {
    return items.map(item => {
        if (!item || typeof item !== 'object') return item;
        const result = { ...item };
        if (Array.isArray(result.children) && !result.items) {
            result.items = normalizeDefinitionItems(result.children);
            delete result.children;
        } else if (Array.isArray(result.items)) {
            result.items = normalizeDefinitionItems(result.items);
        }
        return result;
    });
}

/**
 * Plan layout using theme pages (SS6.1–6.3).
 *
 * Delegates to Rust `formspec_plan::plan_theme_pages` via WASM.
 */
export function planThemePages(
    items: any[],
    ctx: PlanContext,
): LayoutNode[] {
    const contextJson = toPlanContextJson(ctx);
    const normalizedItems = normalizeDefinitionItems(items);
    const resultJson = wasmPlanThemePages(
        JSON.stringify(normalizedItems),
        JSON.stringify(contextJson),
    );
    return JSON.parse(resultJson);
}

/**
 * Identify unbound required items and produce fallback nodes (Component SS4.5).
 *
 * Takes a planned component tree, the definition items, and context.
 * Returns LayoutNode[] for required items that are not bound in the tree.
 */
export function planUnboundRequired(
    tree: LayoutNode,
    items: any[],
    ctx: PlanContext,
): LayoutNode[] {
    const contextJson = toPlanContextJson(ctx);
    const normalizedItems = normalizeDefinitionItems(items);
    const resultJson = wasmPlanUnboundRequired(
        JSON.stringify(tree),
        JSON.stringify(normalizedItems),
        JSON.stringify(contextJson),
    );
    return JSON.parse(resultJson);
}

/** Reset the node ID counter (for deterministic testing). */
export function resetNodeIdCounter(): void {
    wasmResetNodeIdCounter();
}
