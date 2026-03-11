# formspec-layout — API Reference

*Auto-generated from TypeScript declarations — do not hand-edit.*

Layout planning engine. Resolves theme tokens, computes responsive breakpoints, and produces a flat layout plan (widths, order, visibility) from a component tree and theme definition.

formspec-layout — Pure layout planning utilities for Formspec.

Provides theme cascade resolution, token resolution, responsive breakpoint
merging, default component mapping, and parameter interpolation. All
functions are pure (no DOM, no signals, no side effects beyond warnings).

## `getDefaultComponent(item: {
    dataType?: string;
}): string`

Map a definition item to its default component type based on `dataType`.

Used as a fallback when no component document is provided or when the
theme's widget cascade doesn't resolve to an available component.

## `interpolateParams(node: any, params: any): void`

Replace `{param}` placeholders in a component tree node with values from
a params object. Walks string properties, arrays, and nested objects
recursively. Used during custom component expansion to substitute
parameterized values declared in component document templates.

Layout planner — produces a JSON-serializable LayoutNode tree from a
component document tree or a definition items array.

The planner is pure: it reads from a PlanContext snapshot and emits
LayoutNode trees with no side effects, signals, or DOM references.

## `resetNodeIdCounter(): void`

Reset the ID counter (for testing).

## `planComponentTree(tree: any, ctx: PlanContext, prefix?: string, customComponentStack?: Set<string>, applyThemePages?: boolean): LayoutNode`

Plan a component tree node into a LayoutNode tree.

Walks the component document tree, resolves responsive props, resolves
tokens, expands custom components, and emits a JSON-serializable
LayoutNode tree. Conditional rendering (`when`) and repeat groups are
emitted as markers for the renderer to handle reactively.

## `planDefinitionFallback(items: any[], ctx: PlanContext, prefix?: string, applyThemePages?: boolean): LayoutNode[]`

Plan definition items into LayoutNode trees (fallback when no component
document is provided).

Walks the definition items array, runs the theme cascade for each item,
selects default widgets, and emits LayoutNode trees.

## `resolveResponsiveProps(comp: any, activeBreakpoint: string | null): any`

Merge responsive breakpoint overrides onto a component descriptor.

If the component has a `responsive` map and the given breakpoint name
appears as a key, shallow-merges those overrides onto a copy of the
descriptor. Returns the original descriptor unchanged when no overrides
apply.

Theme cascade resolver.

Resolves the effective {@link PresentationBlock} for a given item by
merging the 5-level theme cascade:

  1. Tier 1 formPresentation (lowest)
  2. Tier 1 item.presentation
  3. Theme defaults
  4. Matching theme selectors (document order)
  5. Theme items[key] (highest)

Also provides {@link resolveWidget} for selecting the best available
widget from a preference + fallback chain.

## `resolvePresentation(theme: ThemeDocument | null | undefined, item: ItemDescriptor, tier1?: Tier1Hints): PresentationBlock`

Resolve the effective {@link PresentationBlock} for a single item by
merging five cascade levels (lowest to highest priority):

1. Tier 1 form-wide presentation hints (`formPresentation`)
2. Tier 1 per-item presentation hints (`item.presentation`)
3. Theme defaults
4. Theme selectors (document order; later selectors override earlier)
5. Theme `items[key]` overrides

Scalar properties are replaced at each level. `cssClass` is unioned,
and `style`, `widgetConfig`, and `accessibility` are shallow-merged.

## `resolveWidget(presentation: PresentationBlock, isAvailable: (type: string) => boolean): string | null`

Select the best available widget from a presentation block's preference
and fallback chain.

Tries the preferred `widget` first, then each entry in `fallback` in order.
If none are available in the component registry, logs a warning (per Theme
spec section 7) and returns `null` so the caller can fall back to the default
component for the item's dataType.

#### interface `AccessibilityBlock`

ARIA-related presentation hints applied to a rendered element.

- **role?**: `string`
- **description?**: `string`
- **liveRegion?**: `'off' | 'polite' | 'assertive'`

#### interface `PresentationBlock`

Merged presentation directives for a single item: widget choice, label position, styles, CSS classes, accessibility, and fallback chain.

- **widget?**: `string`
- **widgetConfig?**: `Record<string, unknown>`
- **labelPosition?**: `'top' | 'start' | 'hidden'`
- **style?**: `Record<string, string | number>`
- **accessibility?**: `AccessibilityBlock`
- **fallback?**: `string[]`
- **cssClass?**: `string | string[]`

#### interface `SelectorMatch`

Criteria for a theme selector rule: matches items by type, dataType, or both.

- **type?**: `'group' | 'field' | 'display'`
- **dataType?**: `FormspecDataType`

#### interface `ThemeSelector`

A theme selector rule pairing a {@link SelectorMatch} condition with a {@link PresentationBlock} to apply.

- **match**: `SelectorMatch`
- **apply**: `PresentationBlock`

#### interface `Region`

A named layout region within a page, with optional grid span/start and responsive overrides.

- **key**: `string`
- **span?**: `number`
- **start?**: `number`
- **responsive?**: `Record<string, {
        span?: number;
        start?: number;
        hidden?: boolean;
    }>`

#### interface `Page`

A page definition within a theme, used for wizard/tab page layouts with optional region grid.

- **id**: `string`
- **title**: `string`
- **description?**: `string`
- **regions?**: `Region[]`

#### interface `ThemeDocument`

Top-level theme document: tokens, defaults, selectors, per-item overrides, pages, breakpoints, and stylesheets.

- **$formspecTheme**: `'1.0'`
- **version**: `string`
- **targetDefinition**: `{
        url: string;
        compatibleVersions?: string;
    }`
- **url?**: `string`
- **name?**: `string`
- **title?**: `string`
- **description?**: `string`
- **platform?**: `string`
- **tokens?**: `Record<string, string | number>`
- **defaults?**: `PresentationBlock`
- **selectors?**: `ThemeSelector[]`
- **items?**: `Record<string, PresentationBlock>`
- **pages?**: `Page[]`
- **breakpoints?**: `Record<string, number>`
- **stylesheets?**: `string[]`
- **extensions?**: `Record<string, unknown>`

#### interface `ItemDescriptor`

Lightweight identifier for a definition item, used as the input to the theme cascade resolver.

- **key**: `string`
- **type**: `'group' | 'field' | 'display'`
- **dataType?**: `FormspecDataType`

#### interface `LayoutHints`

Tier 1 layout hints from the definition: flow direction, grid columns, collapsibility, and page assignment.

- **flow?**: `'stack' | 'grid' | 'inline'`
- **columns?**: `number`
- **colSpan?**: `number`
- **newRow?**: `boolean`
- **collapsible?**: `boolean`
- **collapsedByDefault?**: `boolean`
- **page?**: `string`

#### interface `StyleHints`

Tier 1 visual emphasis and sizing hints from the definition.

- **emphasis?**: `'primary' | 'success' | 'warning' | 'danger' | 'muted'`
- **size?**: `'compact' | 'default' | 'large'`

#### interface `Tier1Hints`

Definition-level (Tier 1) presentation hints that feed into the lowest two levels of the theme cascade.

- **itemPresentation** (`{
        widgetHint?: string;
        layout?: LayoutHints;
        styleHints?: StyleHints;
    }`): Per-item presentation hints from the definition
- **formPresentation** (`{
        labelPosition?: 'top' | 'start' | 'hidden';
        density?: 'compact' | 'comfortable' | 'spacious';
        pageMode?: 'single' | 'wizard' | 'tabs';
    }`): Form-wide presentation defaults from the definition

#### type `FormspecDataType`

Union of all `dataType` values recognized by the Formspec schema for selector matching and field definitions.

```ts
type FormspecDataType = 'string' | 'text' | 'integer' | 'decimal' | 'boolean' | 'date' | 'dateTime' | 'time' | 'uri' | 'attachment' | 'choice' | 'multiChoice' | 'money';
```

## `resolveToken(val: any, componentTokens: Record<string, string | number> | undefined, themeTokens: Record<string, string | number> | undefined): any`

Resolve a `$token.xxx` reference against component and theme token maps.

Component tokens take precedence over theme tokens. Values that are not
`$token.` prefixed strings pass through unchanged. Logs a warning when
a token reference cannot be resolved in either map.

#### interface `LayoutNode`

A JSON-serializable layout plan node. Produced by the planner and consumed
by renderers (webcomponent, React, PDF, SSR, etc.).

All values are plain data — no functions, class instances, or signals.

- **id** (`string`): Stable ID for diffing/keying (auto-generated during planning).
- **component** (`string`): Resolved component type: "Stack", "TextInput", "Wizard", etc.
- **category** (`'layout' | 'field' | 'display' | 'interactive' | 'special'`): Node classification for renderer dispatch.
- **props** (`Record<string, unknown>`): All resolved component props (tokens resolved, responsive merged). JSON-serializable.
- **style** (`Record<string, string | number>`): Resolved inline styles (tokens resolved).
- **cssClasses** (`string[]`): Merged CSS class list from theme cascade + component doc.
- **accessibility** (`{
        role?: string;
        description?: string;
        liveRegion?: string;
    }`): Accessibility attributes.
- **children** (`LayoutNode[]`): Ordered child nodes.
- **bindPath** (`string`): Full bind path (e.g. "applicantInfo.orgName").
- **fieldItem** (`{
        key: string;
        label: string;
        hint?: string;
        dataType?: string;
    }`): Snapshot of the definition item this field maps to.
- **presentation** (`PresentationBlock`): Resolved presentation block from 5-level theme cascade.
- **labelPosition** (`'top' | 'start' | 'hidden'`): Effective label position.
- **when** (`string`): FEL expression string — renderer subscribes to this for reactive visibility.
- **whenPrefix** (`string`): Path prefix for evaluating the when expression.
- **fallback** (`string`): Fallback content when when=false.
- **repeatGroup** (`string`): Group name for repeat signals.
- **repeatPath** (`string`): Full path of the repeat group.
- **isRepeatTemplate** (`boolean`): If true, children are a template to stamp per instance.
- **scopeChange** (`boolean`): If true, this node's bind path creates a new scope (prefix) for child rendering.
Used by definition-fallback groups where item keys are relative.

#### interface `PlanContext`

Plain-value snapshot the planner needs to produce a layout plan.
Contains no signals or reactive references — just data.

- **items** (`any[]`): The definition items array.
- **formPresentation** (`any`): Definition-level formPresentation block.
- **componentDocument** (`any`): The loaded component document (tree, components, tokens, breakpoints).
- **theme** (`any`): The loaded theme document.
- **activeBreakpoint** (`string | null`): Currently active breakpoint name, or null.
- **findItem** (`(key: string) => any | null`): Lookup a definition item by key (supports dotted paths).
- **isComponentAvailable** (`(type: string) => boolean`): Check if a component type is registered in the renderer.

