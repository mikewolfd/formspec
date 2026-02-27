# formspec-webcomponent — API Reference

*Auto-generated from TypeScript declarations — do not hand-edit.*

`<formspec-render>` custom element that binds a FormEngine to the DOM. Provides a component registry, theme cascade resolver, token resolution, responsive breakpoints, and accessibility attributes. Ships with 35 built-in component plugins.

## `interpolateParams(node: any, params: any): void`

Replace `{param}` placeholders in a component tree node with values from
a params object. Walks string properties, arrays, and nested objects
recursively. Used during custom component expansion to substitute
parameterized values declared in component document templates.

## `resolveResponsiveProps(comp: any, activeBreakpoint: string | null): any`

Merge responsive breakpoint overrides onto a component descriptor.

If the component has a `responsive` map and the given breakpoint name
appears as a key, shallow-merges those overrides onto a copy of the
descriptor. Returns the original descriptor unchanged when no overrides
apply.

## `resolveToken(val: any, componentTokens: Record<string, string | number> | undefined, themeTokens: Record<string, string | number> | undefined): any`

Resolve a `$token.xxx` reference against component and theme token maps.

Component tokens take precedence over theme tokens. Values that are not
`$token.` prefixed strings pass through unchanged. Logs a warning when
a token reference cannot be resolved in either map.

#### class `FormspecRender`

`<formspec-render>` custom element -- the entry point for rendering a
Formspec form in the browser.

Orchestrates the full rendering pipeline:
- Accepts a definition, optional component document, and optional theme document.
- Creates and manages a {@link FormEngine} instance for reactive form state.
- Builds the DOM by walking the component tree (or falling back to definition items).
- Applies the 5-level theme cascade, token resolution, responsive breakpoints,
  and accessibility attributes.
- Manages ref-counted stylesheet injection, signal-driven DOM updates, and
  cleanup of effects and event listeners on disconnect.
- Supports replay, diagnostics snapshots, and runtime context injection.

- **(set) definition** (`any`): Set the form definition. Creates a new {@link FormEngine} instance and
schedules a re-render. Throws if engine initialization fails.
- **(get) definition** (`any`): The currently loaded form definition object.
- **(set) componentDocument** (`any`): Set the component document (component tree, custom components, tokens,
breakpoints). Schedules a re-render.
- **(get) componentDocument** (`any`): The currently loaded component document.
- **(set) themeDocument** (`ThemeDocument | null`): Set the theme document. Loads/unloads referenced stylesheets via
ref-counting and schedules a re-render.
- **(get) themeDocument** (`ThemeDocument | null`): The currently loaded theme document, or `null` if none.

##### `getEngine(): FormEngine | null`

Return the underlying {@link FormEngine} instance, or `null` if no
definition has been set yet. Useful for direct engine access in tests
or advanced integrations.

##### `getDiagnosticsSnapshot(options?: {
        mode?: 'continuous' | 'submit';
    }): import("formspec-engine").FormEngineDiagnosticsSnapshot | null`

Capture a diagnostics snapshot from the engine, including current signal
values, validation state, and repeat counts.

##### `applyReplayEvent(event: any): import("formspec-engine").EngineReplayApplyResult | {
        ok: boolean;
        event: any;
        error: string;
    }`

Apply a single replay event (e.g. `setValue`, `addRepeat`) to the engine.

##### `replay(events: any[], options?: {
        stopOnError?: boolean;
    }): import("formspec-engine").EngineReplayResult | {
        applied: number;
        results: never[];
        errors: {
            index: number;
            event: null;
            error: string;
        }[];
    }`

Replay a sequence of events against the engine in order.

##### `setRuntimeContext(context: any): void`

Inject a runtime context (e.g. `now`, user metadata) into the engine.
This context is available to FEL expressions via `@context` references.

##### `render(): void`

Perform a full synchronous render of the form.

Tears down existing signal effects, sets up responsive breakpoints,
validates the component document, emits CSS token custom properties,
and walks the component tree (or definition items as fallback) to
build the DOM. Appends a submit button that dispatches a
`formspec-submit` CustomEvent with the engine response.

##### `disconnectedCallback(): void`

Custom element lifecycle callback. Disposes all signal effects,
decrements stylesheet ref-counts (removing orphaned `<link>` elements),
tears down breakpoint media query listeners, and removes the root container.

## `globalRegistry: ComponentRegistry`

Application-wide singleton registry shared by all `<formspec-render>` instances.

All 35 built-in component plugins are registered here at module load.
External code can register additional plugins via `globalRegistry.register(plugin)`.

#### class `ComponentRegistry`

Map-based registry that dispatches component type strings to their
{@link ComponentPlugin} implementations.

At render time the `FormspecRender` element looks up each component
descriptor's `component` field in the registry to find the plugin
responsible for building the corresponding DOM subtree.

Built-in components are registered at module load via
`registerDefaultComponents()`. Custom plugins can be added at any
time by calling {@link register} on the {@link globalRegistry} singleton.

- **(get) size** (`number`): The number of currently registered component plugins.

##### `register(plugin: ComponentPlugin): void`

Register a component plugin, keyed by its `type` string.
If a plugin with the same type already exists it is silently replaced.

##### `get(type: string): ComponentPlugin | undefined`

Look up a registered plugin by component type.

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

#### interface `RenderContext`

Context object passed to every {@link ComponentPlugin} render function.

Provides access to the form engine, theme/component documents, and a
toolkit of rendering helpers so plugins can build DOM, resolve tokens,
apply theme styles, and recursively render child components without
depending on the `FormspecRender` element directly.

- **engine** (`FormEngine`): The active FormEngine instance managing reactive form state.
- **componentDocument** (`any`): The loaded component document (component tree, custom components, tokens, breakpoints).
- **themeDocument** (`ThemeDocument | null`): The loaded theme document, or `null` when no theme is provided.
- **prefix** (`string`): Dotted path prefix for the current render scope (e.g. `"group[0]"`).
- **renderComponent** (`(comp: any, parent: HTMLElement, prefix?: string) => void`): Recursively render a child component descriptor into a parent element.
- **resolveToken** (`(val: any) => any`): Resolve a `$token.xxx` reference against component and theme token maps. Non-token values pass through unchanged.
- **applyStyle** (`(el: HTMLElement, style: any) => void`): Apply an inline style object to an element, resolving token references in values.
- **applyCssClass** (`(el: HTMLElement, comp: any) => void`): Apply `cssClass` entries from a component descriptor to an element's classList.
- **applyAccessibility** (`(el: HTMLElement, comp: any) => void`): Apply accessibility attributes (role, aria-description, aria-live) from a component descriptor.
- **resolveItemPresentation** (`(item: ItemDescriptor) => PresentationBlock`): Resolve the effective PresentationBlock for a definition item via the 5-level theme cascade.
- **cleanupFns** (`Array<() => void>`): Disposal callbacks for signal effects and event listeners created during this render cycle.
- **findItemByKey** (`(key: string, items?: any[]) => any | null`): Look up a definition item by key (supports dotted paths like `"group.field"`). Returns `null` if not found.
- **renderInputComponent** (`(comp: any, item: any, fullName: string) => HTMLElement`): Build and return a fully-wired field input element (label, input control,
hint, error display, signal bindings, ARIA attributes) for a bound field.
- **activeBreakpoint** (`string | null`): The currently active responsive breakpoint name, or `null` when no breakpoint matches.

#### interface `ComponentPlugin`

Contract for a component plugin registered with the {@link ComponentRegistry}.

Each plugin declares a `type` string (e.g. `"TextInput"`, `"Wizard"`) that
maps to a component document's `component` field, and a `render` function
that builds the DOM for that component type.

- **type** (`string`): Component type identifier matched against `comp.component` at render time.
- **render** (`(comp: any, parent: HTMLElement, ctx: RenderContext) => void`): Build DOM for this component and append it to `parent`.

