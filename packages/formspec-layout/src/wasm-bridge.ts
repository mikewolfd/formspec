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
        if (Array.isArray(item.children)) {
            Object.assign(map, buildItemsByPath(item.children, fullPath));
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

/** Convert the TS PlanContext to the JSON shape the Rust WASM expects. */
function toPlanContextJson(ctx: PlanContext): PlanContextJson {
    return {
        itemsByPath: buildItemsByPath(ctx.items),
        formPresentation: ctx.formPresentation ?? undefined,
        componentDocument: ctx.componentDocument ?? undefined,
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
    const resultJson = wasmPlanComponentTree(
        JSON.stringify(tree),
        JSON.stringify(contextJson),
    );
    return JSON.parse(resultJson);
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
    const resultJson = wasmPlanDefinitionFallback(
        JSON.stringify(items),
        JSON.stringify(contextJson),
    );
    return JSON.parse(resultJson);
}

/** Reset the node ID counter (for deterministic testing). */
export function resetNodeIdCounter(): void {
    wasmResetNodeIdCounter();
}
