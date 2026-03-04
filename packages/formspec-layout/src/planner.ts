/**
 * Layout planner — produces a JSON-serializable LayoutNode tree from a
 * component document tree or a definition items array.
 *
 * The planner is pure: it reads from a PlanContext snapshot and emits
 * LayoutNode trees with no side effects, signals, or DOM references.
 *
 * @module
 */

import type { LayoutNode, PlanContext } from './types.js';
import type { PresentationBlock, ItemDescriptor, Tier1Hints } from './theme-resolver.js';
import { resolvePresentation, resolveWidget } from './theme-resolver.js';
import { resolveResponsiveProps } from './responsive.js';
import { resolveToken } from './tokens.js';
import { interpolateParams } from './params.js';
import { getDefaultComponent } from './defaults.js';

// ── Component category classification ────────────────────────────────

const LAYOUT_COMPONENTS = new Set([
    'Page', 'Stack', 'Grid', 'Divider', 'Collapsible', 'Columns',
    'Panel', 'Accordion', 'Modal', 'Popover',
]);

const INPUT_COMPONENTS = new Set([
    'TextInput', 'NumberInput', 'Select', 'Toggle', 'Checkbox',
    'DatePicker', 'RadioGroup', 'CheckboxGroup', 'Slider', 'Rating',
    'FileUpload', 'Signature', 'MoneyInput',
]);

const DISPLAY_COMPONENTS = new Set([
    'Heading', 'Text', 'Card', 'Spacer', 'Alert', 'Badge',
    'ProgressBar', 'Summary', 'ValidationSummary',
]);

const INTERACTIVE_COMPONENTS = new Set([
    'Wizard', 'Tabs', 'SubmitButton',
]);

const SPECIAL_COMPONENTS = new Set([
    'ConditionalGroup', 'DataTable',
]);

function classifyComponent(type: string): LayoutNode['category'] {
    if (LAYOUT_COMPONENTS.has(type)) return 'layout';
    if (INPUT_COMPONENTS.has(type)) return 'field';
    if (DISPLAY_COMPONENTS.has(type)) return 'display';
    if (INTERACTIVE_COMPONENTS.has(type)) return 'interactive';
    if (SPECIAL_COMPONENTS.has(type)) return 'special';
    // Unknown components default to layout (custom components are usually structural)
    return 'layout';
}

// ── ID generation ────────────────────────────────────────────────────

let nodeIdCounter = 0;

/** Reset the ID counter (for testing). */
export function resetNodeIdCounter(): void {
    nodeIdCounter = 0;
}

function nextId(prefix: string): string {
    return `${prefix}-${++nodeIdCounter}`;
}

// ── Token resolution helpers ─────────────────────────────────────────

function resolveTokenInContext(val: any, ctx: PlanContext): any {
    return resolveToken(val, ctx.componentDocument?.tokens, ctx.theme?.tokens);
}

function resolveStyleTokens(
    style: Record<string, string | number> | undefined,
    ctx: PlanContext,
): Record<string, string | number> | undefined {
    if (!style) return undefined;
    const resolved: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(style)) {
        resolved[k] = resolveTokenInContext(v, ctx);
    }
    return resolved;
}

function normalizeCssClass(val: string | string[] | undefined): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val.flatMap(c => c.split(/\s+/).filter(Boolean));
    return val.split(/\s+/).filter(Boolean);
}

function resolveCssClasses(comp: any, ctx: PlanContext): string[] {
    const raw = normalizeCssClass(comp.cssClass);
    return raw.map(c => String(resolveTokenInContext(c, ctx)));
}

// ── Prop extraction ──────────────────────────────────────────────────

/** Extract all component-specific props (everything except structural keys).
 * Note: 'bind' is intentionally NOT in this set — it's preserved in props
 * so renderers can access the original bind key for path construction. */
const STRUCTURAL_KEYS = new Set([
    'component', 'children', 'when', 'responsive',
    'style', 'cssClass', 'accessibility', 'params',
]);

function extractProps(comp: any): Record<string, unknown> {
    const props: Record<string, unknown> = {};
    for (const key of Object.keys(comp)) {
        if (!STRUCTURAL_KEYS.has(key)) {
            props[key] = comp[key];
        }
    }
    return props;
}

// ── Main planner ─────────────────────────────────────────────────────

/**
 * Plan a component tree node into a LayoutNode tree.
 *
 * Walks the component document tree, resolves responsive props, resolves
 * tokens, expands custom components, and emits a JSON-serializable
 * LayoutNode tree. Conditional rendering (`when`) and repeat groups are
 * emitted as markers for the renderer to handle reactively.
 *
 * @param tree   - A component tree node from the component document.
 * @param ctx    - The planning context snapshot.
 * @param prefix - Bind path prefix for the current scope.
 * @param customComponentStack - Recursion guard for custom component expansion.
 * @returns A LayoutNode tree.
 */
export function planComponentTree(
    tree: any,
    ctx: PlanContext,
    prefix = '',
    customComponentStack?: Set<string>,
): LayoutNode {
    if (!customComponentStack) customComponentStack = new Set();

    // Apply responsive overrides
    const comp = resolveResponsiveProps(tree, ctx.activeBreakpoint ?? null);
    const componentType = comp.component as string;

    // Check for custom component expansion
    const customComponents = ctx.componentDocument?.components;
    if (customComponents?.[componentType]) {
        if (customComponentStack.has(componentType)) {
            // Recursion detected — emit a placeholder
            return {
                id: nextId('err'),
                component: 'Text',
                category: 'display',
                props: { text: `[Recursive component: ${componentType}]` },
                cssClasses: [],
                children: [],
            };
        }

        const customDef = customComponents[componentType];
        const template = JSON.parse(JSON.stringify(customDef.tree));
        interpolateParams(template, comp.params || comp);

        customComponentStack.add(componentType);
        const result = planComponentTree(template, ctx, prefix, customComponentStack);
        customComponentStack.delete(componentType);
        return result;
    }

    // Resolve bind path
    const bindKey = comp.bind as string | undefined;
    const fullBindPath = bindKey
        ? (prefix ? `${prefix}.${bindKey}` : bindKey)
        : undefined;

    // Check if this is a repeat group
    const item = bindKey ? ctx.findItem(bindKey) : null;
    const isRepeatGroup = item?.type === 'group' && item?.repeatable === true
        && componentType !== 'DataTable';

    // Build the node
    const props = extractProps(comp);

    // Resolve token values in known prop positions
    if (props.gap !== undefined) props.gap = resolveTokenInContext(props.gap, ctx);
    if (props.size !== undefined) props.size = resolveTokenInContext(props.size, ctx);

    const node: LayoutNode = {
        id: nextId(componentType.toLowerCase()),
        component: componentType,
        category: classifyComponent(componentType),
        props,
        style: resolveStyleTokens(comp.style, ctx),
        cssClasses: resolveCssClasses(comp, ctx),
        children: [],
    };

    // Accessibility
    if (comp.accessibility) {
        node.accessibility = { ...comp.accessibility };
    }

    // Bind path
    if (fullBindPath) {
        node.bindPath = fullBindPath;
    }

    // Field item snapshot
    if (item && item.type === 'field') {
        node.fieldItem = {
            key: item.key ?? bindKey,
            label: item.label ?? bindKey,
            hint: item.hint,
            dataType: item.dataType,
        };

        // Resolve theme presentation for this field
        const itemDesc: ItemDescriptor = {
            key: bindKey!,
            type: 'field',
            dataType: item.dataType,
        };
        const tier1: Tier1Hints = {
            formPresentation: ctx.formPresentation,
            itemPresentation: item.presentation,
        };
        const presentation = resolvePresentation(ctx.theme, itemDesc, tier1);
        node.presentation = presentation;
        node.labelPosition = presentation.labelPosition ?? 'top';

        // Merge presentation CSS classes
        const presClasses = normalizeCssClass(presentation.cssClass);
        if (presClasses.length > 0) {
            const union = new Set([...node.cssClasses, ...presClasses]);
            node.cssClasses = [...union];
        }
    }

    // Conditional rendering
    if (comp.when) {
        node.when = comp.when;
        node.whenPrefix = prefix;
        if (comp.fallback) {
            node.fallback = comp.fallback;
        }
    }

    // Repeat group
    if (isRepeatGroup && fullBindPath) {
        node.repeatGroup = bindKey;
        node.repeatPath = fullBindPath;
        node.isRepeatTemplate = true;
    }

    // Plan children
    const childPrefix = isRepeatGroup && fullBindPath
        ? `${fullBindPath}[0]` // Template uses index 0 as placeholder
        : (fullBindPath && item?.type === 'group' ? fullBindPath : prefix);

    if (Array.isArray(comp.children)) {
        for (const child of comp.children) {
            node.children.push(
                planComponentTree(child, ctx, childPrefix, customComponentStack),
            );
        }
    }

    return node;
}

/**
 * Plan definition items into LayoutNode trees (fallback when no component
 * document is provided).
 *
 * Walks the definition items array, runs the theme cascade for each item,
 * selects default widgets, and emits LayoutNode trees.
 *
 * @param items  - The definition items array.
 * @param ctx    - The planning context snapshot.
 * @param prefix - Bind path prefix for the current scope.
 * @returns An array of LayoutNode trees, one per top-level item.
 */
export function planDefinitionFallback(
    items: any[],
    ctx: PlanContext,
    prefix = '',
): LayoutNode[] {
    const nodes: LayoutNode[] = [];

    for (const item of items) {
        const key = item.key || item.name;
        const fullPath = prefix ? `${prefix}.${key}` : key;

        // Resolve theme presentation
        const itemDesc: ItemDescriptor = {
            key,
            type: item.type,
            dataType: item.dataType,
        };
        const tier1: Tier1Hints = {
            formPresentation: ctx.formPresentation,
            itemPresentation: item.presentation,
        };
        const presentation = resolvePresentation(ctx.theme, itemDesc, tier1);

        if (item.type === 'group') {
            const isRepeat = item.repeatable === true;

            const groupNode: LayoutNode = {
                id: nextId('group'),
                component: 'Stack',
                category: 'layout',
                props: { title: item.label || key, bind: key },
                cssClasses: normalizeCssClass(presentation.cssClass),
                children: [],
                bindPath: fullPath,
                scopeChange: true,
            };

            if (isRepeat) {
                groupNode.repeatGroup = key;
                groupNode.repeatPath = fullPath;
                groupNode.isRepeatTemplate = true;
            }

            // Recurse into children
            const childPrefix = isRepeat ? `${fullPath}[0]` : fullPath;
            if (Array.isArray(item.children)) {
                groupNode.children = planDefinitionFallback(item.children, ctx, childPrefix);
            }

            nodes.push(groupNode);
        } else if (item.type === 'field') {
            // Select widget via theme cascade or default
            const isAvailable = ctx.isComponentAvailable ?? (() => true);
            const themeWidget = resolveWidget(presentation, isAvailable);
            const widget = themeWidget || item.presentation?.widgetHint || getDefaultComponent(item);

            const fieldNode: LayoutNode = {
                id: nextId('field'),
                component: widget,
                category: 'field',
                props: { bind: key },
                cssClasses: normalizeCssClass(presentation.cssClass),
                children: [],
                bindPath: fullPath,
                fieldItem: {
                    key,
                    label: item.label ?? key,
                    hint: item.hint,
                    dataType: item.dataType,
                },
                presentation,
                labelPosition: presentation.labelPosition ?? 'top',
            };

            nodes.push(fieldNode);
        } else if (item.type === 'display') {
            const displayNode: LayoutNode = {
                id: nextId('display'),
                component: 'Text',
                category: 'display',
                props: { text: item.label || '' },
                cssClasses: normalizeCssClass(presentation.cssClass),
                children: [],
            };

            // Display items may have relevance conditions via bind
            if (item.relevant) {
                displayNode.when = item.relevant;
                displayNode.whenPrefix = prefix;
            }

            nodes.push(displayNode);
        }
    }

    return nodes;
}
