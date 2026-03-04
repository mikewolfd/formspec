# formspec-webcomponent — API Reference

*Auto-generated from TypeScript declarations — do not hand-edit.*

`<formspec-render>` custom element that binds a FormEngine to the DOM. Provides a component registry, styling pipeline, navigation (wizard/field focus), and accessibility attributes.

## `HeadingPlugin: ComponentPlugin`

Renders an `<h1>`-`<h6>` heading element based on the `level` prop (defaults to h1).

## `TextPlugin: ComponentPlugin`

Renders a `<p>` text element. When `bind` is set, subscribes to the field or variable signal
and reactively updates the text content, including currency formatting for money values.

## `CardPlugin: ComponentPlugin`

Renders a `<div>` card container with optional `<h3>` title, `<p>` subtitle, and elevation data attribute.

## `SpacerPlugin: ComponentPlugin`

Renders an empty `<div>` spacer with token-resolved height from the `size` prop.

## `AlertPlugin: ComponentPlugin`

Renders a `<div>` alert with severity variant CSS class and optional dismiss button that removes the element.

## `BadgePlugin: ComponentPlugin`

Renders an inline `<span>` badge with a variant CSS class.

## `ProgressBarPlugin: ComponentPlugin`

Renders a `<progress>` element with optional percentage label.
When `bind` is set, subscribes to the field signal to reactively update the progress value.

## `SummaryPlugin: ComponentPlugin`

Renders a `<dl>` definition list with reactive `<dd>` values bound to field or variable signals.
Supports currency formatting for money values and optionSet label lookup.

## `ValidationSummaryPlugin: ComponentPlugin`

Renders validation summary messages from either live validation state or
the latest submit event detail, with optional jump links to target fields.

Props:
- `source`: 'live' | 'submit' (default 'live')
- `mode`: validation mode for live source (default 'continuous')
- `showFieldErrors`: include bind-level field errors (default false)
- `jumpLinks`: render clickable jump buttons to focus related fields
- `dedupe`: deduplicate repeated messages (default true)

## `registerDefaultComponents(): void`

Registers all 37 built-in component plugins with the global registry.
Includes layout (10), input (13), display (9), interactive (3), and special (2) plugins.

## `InputPlugins: ComponentPlugin[]`

All 13 built-in input component plugins, exported as a single array for bulk registration.

## `WizardPlugin: ComponentPlugin`

Renders a multi-step wizard with signal-driven panel visibility.
Creates a step progress indicator (numbered spans), prev/next navigation buttons, and optional skip button.
The last step shows "Finish" instead of "Next". Panel switching uses a Preact signal for the current step index.

## `TabsPlugin: ComponentPlugin`

Renders a tabbed interface with click-based tab switching.
Supports configurable tab bar position (top or bottom) and default active tab.
Each tab button toggles visibility of its corresponding panel.

## `SubmitButtonPlugin: ComponentPlugin`

Renders a submit button that invokes the host renderer's `submit()` API.
Supports submit mode selection and optional event dispatch control.

## `PagePlugin: ComponentPlugin`

Renders a `<section>` page container with optional `<h2>` title and `<p>` description.

## `StackPlugin: ComponentPlugin`

Renders a flex `<div>` stack with configurable direction, alignment, wrap, and gap (token-resolved).

## `GridPlugin: ComponentPlugin`

Renders a CSS grid `<div>` with configurable column count, gap, and row gap.

## `DividerPlugin: ComponentPlugin`

Renders an `<hr>` divider, or a labeled divider with `<hr>` lines flanking a `<span>` label.

## `CollapsiblePlugin: ComponentPlugin`

Renders a `<details>`/`<summary>` collapsible section with optional default-open state.

## `ColumnsPlugin: ComponentPlugin`

Renders a multi-column `<div>` layout with configurable column count and token-resolved gap.

## `PanelPlugin: ComponentPlugin`

Renders a `<div>` panel container with optional header and configurable width.

## `AccordionPlugin: ComponentPlugin`

Renders an accordion using `<details>`/`<summary>` elements for each child.
Supports single-open mode (default) via toggle event listeners, or multi-open via `allowMultiple`.

## `ModalPlugin: ComponentPlugin`

Renders a `<dialog>` modal with optional close button, title, and a trigger button that calls `showModal()`.

## `PopoverPlugin: ComponentPlugin`

Renders a popover with a trigger button and content panel.
Trigger label can be bound to a field signal. Uses the Popover API when available, falls back to hidden toggle.

## `ConditionalGroupPlugin: ComponentPlugin`

Renders a simple wrapper `<div>` for conditional content whose visibility is controlled by bind relevance.

## `DataTablePlugin: ComponentPlugin`

Renders an editable `<table>` bound to a repeatable group.
Supports add/remove row buttons, optional row numbers, and signal-driven cell updates.
Editable cells use `<input>` elements with type coercion; read-only cells display formatted text
including currency formatting for money values. Cell effect subscriptions are tracked and
disposed on re-render to prevent leaks.

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

##### `constructor()`

- **_definition** (`any`): @internal
- **_componentDocument** (`any`): @internal
- **_themeDocument** (`ThemeDocument | null`): @internal
- **engine** (`FormEngine | null`): @internal
- **cleanupFns** (`Array<() => void>`): @internal
- **stylesheetHrefs** (`string[]`): @internal
- **touchedFields** (`Set<string>`): Fields the user has interacted with (blur). Validation errors are hidden until touched.
- **touchedVersion** (`import("@preact/signals-core").Signal<number>`): Incremented when touched state changes so error-display effects can react.
- **_screenerCompleted** (`boolean`): Whether the screener has been completed (route selected).
- **_screenerRoute** (`ScreenerRoute | null`): The route selected by the screener, if any.
- **resolveToken** (`(val: any) => any`): @internal
- **resolveItemPresentation** (`(itemDesc: ItemDescriptor) => PresentationBlock`): @internal
- **applyStyle** (`(el: HTMLElement, style: any) => void`): @internal
- **applyCssClass** (`(el: HTMLElement, comp: any) => void`): @internal
- **applyClassValue** (`(el: HTMLElement, classValue: unknown) => void`): @internal
- **resolveWidgetClassSlots** (`(presentation: PresentationBlock) => {
        root?: unknown;
        label?: unknown;
        control?: unknown;
        hint?: unknown;
        error?: unknown;
    }`): @internal
- **applyAccessibility** (`(el: HTMLElement, comp: any) => void`): @internal
- **(set) definition** (`any`): Set the form definition. Creates a new {@link FormEngine} instance and
schedules a re-render. Throws if engine initialization fails.
- **(get) definition** (`any`): The currently loaded form definition object.
- **(set) componentDocument** (`any`): Set the component document (component tree, custom components, tokens,
breakpoints). Schedules a re-render.
- **(get) componentDocument** (`any`): The currently loaded component document.
- **(set) themeDocument** (`ThemeDocument | null`): Set the theme document. Loads/unloads referenced stylesheets via
ref-counting and schedules a re-render.
- **(get) themeDocument** (`ThemeDocument | null`): The currently loaded theme document, or `null` if none.
- **findItemByKey** (`(key: string, items?: any[]) => any | null`): @internal

##### `classifyScreenerRoute(route: ScreenerRoute | null | undefined): ScreenerRouteType`

@internal

##### `getScreenerState(): ScreenerStateSnapshot`

Returns the current screener completion + routing state.

##### `emitScreenerStateChange(reason: string, answers?: Record<string, any>): void`

@internal

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

##### `touchAllFields(): void`

Mark all registered fields as touched so validation errors become visible.

##### `submit(options?: {
        mode?: 'continuous' | 'submit';
        emitEvent?: boolean;
    }): {
        response: any;
        validationReport: {
            valid: boolean;
            results: any;
            counts: {
                error: number;
                warning: number;
                info: number;
            };
            timestamp: any;
        };
    } | null`

Build a submit payload and validation report from the current form state.
Optionally dispatches `formspec-submit` with `{ response, validationReport }`.

##### `resolveValidationTarget(resultOrPath: any): ValidationTargetMetadata`

Resolve a validation result/path to a navigation target with metadata.

##### `setSubmitPending(pending: boolean): void`

Toggle shared submit pending state and emit `formspec-submit-pending-change`
whenever the value changes.

##### `isSubmitPending(): boolean`

Returns the current shared submit pending state.

##### `goToWizardStep(index: number): boolean`

Programmatically navigate to a wizard step in the first rendered wizard.

##### `focusField(path: string): boolean`

Reveal and focus a field by bind path.

##### `getEffectiveTheme(): ThemeDocument`

@internal

##### `render(): void`

Perform a full synchronous render of the form.

##### `getScreenerRoute(): ScreenerRoute | null`

Returns the screener route selected during the screening phase, or null.

##### `skipScreener(): void`

Programmatically skip the screener and proceed to the main form.

##### `restartScreener(): void`

Return to the screener from the main form.

##### `disconnectedCallback(): void`

Custom element lifecycle callback. Disposes all signal effects,
decrements stylesheet ref-counts, tears down breakpoint listeners,
and removes the root container.

## `renderInputComponent(host: FieldInputHost, comp: any, item: any, fullName: string): HTMLElement`

#### interface `FieldInputHost`

##### `resolveItemPresentation(itemDesc: ItemDescriptor): PresentationBlock`

##### `resolveWidgetClassSlots(presentation: PresentationBlock): {
        root?: unknown;
        label?: unknown;
        control?: unknown;
        hint?: unknown;
        error?: unknown;
    }`

##### `applyClassValue(el: HTMLElement, classValue: unknown): void`

##### `applyCssClass(el: HTMLElement, comp: any): void`

##### `applyStyle(el: HTMLElement, style: any): void`

##### `applyAccessibility(el: HTMLElement, comp: any): void`

##### `render(): void`

## `formatMoney(moneyVal: {
    amount: any;
    currency?: string;
} | null | undefined, locale?: string): string`

Format a Formspec money value `{amount, currency}` as a localized currency string.
Returns `''` when the amount is missing or not a finite number.

## `normalizeFieldPath(path: unknown): string`

## `externalPathToInternal(path: string): string`

## `findFieldElement(host: NavigationHost, path: string): HTMLElement | null`

## `revealTabsForField(_host: NavigationHost, fieldEl: HTMLElement): void`

## `goToWizardStep(host: NavigationHost, index: number): boolean`

## `focusField(host: NavigationHost, path: string): boolean`

#### interface `NavigationHost`

##### `querySelector(selectors: string): Element | null`

##### `querySelectorAll(selectors: string): NodeListOf<Element>`

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

## `createBreakpointState(): BreakpointState`

## `setupBreakpoints(host: BreakpointHost, state: BreakpointState): void`

## `cleanupBreakpoints(state: BreakpointState): void`

#### interface `BreakpointHost`

##### `scheduleRender(): void`

#### interface `BreakpointState`

- **activeBreakpointSignal**: `ReturnType<typeof signal<string | null>>`
- **cleanups**: `Array<() => void>`

## `emitNode(host: RenderHost, node: LayoutNode, parent: HTMLElement, prefix: string): void`

Walk a LayoutNode tree from the planner and emit DOM.

## `renderComponent(host: RenderHost, comp: any, parent: HTMLElement, prefix?: string): void`

Render a component, handling LayoutNode objects by delegating to emitNode.

## `renderActualComponent(host: RenderHost, comp: any, parent: HTMLElement, prefix?: string): void`

Look up a component plugin and invoke its render function with a full RenderContext.

#### interface `RenderHost`

Interface for what emitNode/renderActualComponent need from FormspecRender.

##### `resolveToken(val: any): any`

##### `resolveItemPresentation(itemDesc: ItemDescriptor): PresentationBlock`

##### `applyStyle(el: HTMLElement, style: any): void`

##### `applyCssClass(el: HTMLElement, comp: any): void`

##### `applyClassValue(el: HTMLElement, classValue: unknown): void`

##### `resolveWidgetClassSlots(presentation: PresentationBlock): {
        root?: unknown;
        label?: unknown;
        control?: unknown;
        hint?: unknown;
        error?: unknown;
    }`

##### `applyAccessibility(el: HTMLElement, comp: any): void`

##### `findItemByKey(key: string, items?: any[]): any | null`

##### `submit(options?: any): any`

##### `resolveValidationTarget(resultOrPath: any): ValidationTargetMetadata`

##### `focusField(path: string): boolean`

##### `setSubmitPending(pending: boolean): void`

##### `isSubmitPending(): boolean`

##### `render(): void`

## `renderScreener(host: ScreenerHost, container: HTMLElement): void`

#### interface `ScreenerHost`

##### `classifyScreenerRoute(route: ScreenerRoute | null | undefined): 'none' | 'internal' | 'external'`

##### `emitScreenerStateChange(reason: string, answers?: Record<string, any>): void`

##### `dispatchEvent(event: Event): boolean`

##### `render(): void`

## `resolveToken(host: StylingHost, val: any): any`

## `resolveItemPresentation(host: StylingHost, itemDesc: ItemDescriptor): PresentationBlock`

## `applyStyle(host: StylingHost, el: HTMLElement, style: any): void`

## `applyCssClass(host: StylingHost, el: HTMLElement, comp: any): void`

## `applyClassValue(host: StylingHost, el: HTMLElement, classValue: unknown): void`

## `resolveWidgetClassSlots(_host: StylingHost, presentation: PresentationBlock): {
    root?: unknown;
    label?: unknown;
    control?: unknown;
    hint?: unknown;
    error?: unknown;
}`

## `applyAccessibility(_host: StylingHost, el: HTMLElement, comp: any): void`

## `emitTokenProperties(host: StylingHost, container: HTMLElement): void`

## `loadStylesheets(host: StylingHost): void`

## `cleanupStylesheets(host: StylingHost): void`

## `canonicalizeStylesheetHref(href: string): string`

## `findThemeStylesheet(hrefKey: string): HTMLLinkElement | null`

## `stylesheetRefCounts: Map<string, number>`

Module-level ref counts (was static on the class).

#### interface `StylingHost`

##### `getEffectiveTheme(): ThemeDocument`

##### `findItemByKey(key: string, items?: any[]): any | null`

## `touchAllFields(host: SubmitHost): void`

Mark all registered fields as touched so validation errors become visible.

## `submit(host: SubmitHost, options?: {
    mode?: 'continuous' | 'submit';
    emitEvent?: boolean;
}): {
    response: any;
    validationReport: {
        valid: boolean;
        results: any;
        counts: {
            error: number;
            warning: number;
            info: number;
        };
        timestamp: any;
    };
} | null`

Build a submit payload and validation report from the current form state.
Optionally dispatches `formspec-submit` with `{ response, validationReport }`.

## `setSubmitPending(host: SubmitHost, pending: boolean): void`

Toggle shared submit pending state and emit `formspec-submit-pending-change`
whenever the value changes.

## `isSubmitPending(host: SubmitHost): boolean`

Returns the current shared submit pending state.

## `resolveValidationTarget(host: SubmitHost, resultOrPath: any): ValidationTargetMetadata`

Resolve a validation result/path to a navigation target with metadata.

#### interface `SubmitHost`

##### `dispatchEvent(event: Event): boolean`

##### `findItemByKey(key: string, items?: any[]): any | null`

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

#### interface `ValidationTargetMetadata`

Metadata describing where a validation result points and whether it is jumpable.

- **path**: `string`
- **label**: `string`
- **formLevel**: `boolean`
- **jumpable**: `boolean`
- **fieldElement?**: `HTMLElement | null`

#### interface `ScreenerRoute`

Selected screener route target (if any).

- **target**: `string`
- **label?**: `string`
- **extensions?**: `Record<string, any>`

#### interface `ScreenerStateSnapshot`

Snapshot of current screener completion and routing state.

- **hasScreener**: `boolean`
- **completed**: `boolean`
- **routeType**: `ScreenerRouteType`
- **route**: `ScreenerRoute | null`

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
- **submit** (`(options?: {
        mode?: 'continuous' | 'submit';
        emitEvent?: boolean;
    }) => {
        response: any;
        validationReport: {
            valid: boolean;
            results: any[];
            counts: {
                error: number;
                warning: number;
                info: number;
            };
            timestamp: string;
        };
    } | null`): Build submit payload + validation report and optionally dispatch `formspec-submit`.
- **resolveValidationTarget** (`(resultOrPath: any) => ValidationTargetMetadata`): Resolve a validation result/path to a target path + label + jump metadata.
- **focusField** (`(path: string) => boolean`): Reveal and focus a field by path; returns false when no target field is found.
- **submitPendingSignal** (`Signal<boolean>`): Reactive shared submit pending signal used by submit-oriented plugins.
- **latestSubmitDetailSignal** (`Signal<{
        response: any;
        validationReport: {
            valid: boolean;
            results: any[];
            counts: {
                error: number;
                warning: number;
                info: number;
            };
            timestamp: string;
        };
    } | null>`): Latest renderer submit detail (`{ response, validationReport }`), or null before first submit.
- **setSubmitPending** (`(pending: boolean) => void`): Set shared submit pending state and emit change event when it toggles.
- **isSubmitPending** (`() => boolean`): Read shared submit pending state.
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

#### type `ScreenerRouteType`

Classifies the screener route relative to the current definition URL.

```ts
type ScreenerRouteType = 'none' | 'internal' | 'external';
```

