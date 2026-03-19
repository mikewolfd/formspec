# formspec-webcomponent — API Reference

*Auto-generated from TypeScript declarations — do not hand-edit.*

`<formspec-render>` custom element that binds a FormEngine to the DOM. Provides a component registry, styling pipeline, navigation (wizard/field focus), and accessibility attributes.

## `renderCheckboxGroup: AdapterRenderFn<CheckboxGroupBehavior>`

## `renderCheckbox: AdapterRenderFn<FieldBehavior>`

## `renderDatePicker: AdapterRenderFn<DatePickerBehavior>`

## `renderFileUpload: AdapterRenderFn<FileUploadBehavior>`

## `defaultAdapter: RenderAdapter`

## `renderMoneyInput: AdapterRenderFn<MoneyInputBehavior>`

## `renderNumberInput: AdapterRenderFn<NumberInputBehavior>`

## `renderRadioGroup: AdapterRenderFn<RadioGroupBehavior>`

## `renderRating: AdapterRenderFn<RatingBehavior>`

## `renderSelect: AdapterRenderFn<SelectBehavior>`

## `createFieldDOM(behavior: FieldBehavior, actx: AdapterContext): FieldDOM`

Create the common field wrapper structure: root div, label, description, hint, error.
Uses behavior.widgetClassSlots for x-classes support (from theme widgetConfig).
Returns element references for adapter-specific control insertion.

## `finalizeFieldDOM(fieldDOM: FieldDOM, behavior: FieldBehavior, actx: AdapterContext): void`

Finalize field DOM: append remote options status, error display, and apply theme styles.
Call this AFTER inserting the control element.

## `applyControlSlotClass(control: HTMLElement, behavior: FieldBehavior, actx: AdapterContext, isGroup?: boolean): void`

Apply widgetClassSlots.control to the actual input element(s).
For radio/checkbox groups, applies to each input. For others, applies to the control.

#### interface `FieldDOM`

- **root**: `HTMLElement`
- **label**: `HTMLElement`
- **hint**: `HTMLElement | undefined`
- **error**: `HTMLElement`
- **describedBy**: `string[]`

## `renderSignature: AdapterRenderFn<SignatureBehavior>`

## `renderSlider: AdapterRenderFn<SliderBehavior>`

## `renderTabs: AdapterRenderFn<TabsBehavior>`

## `renderTextInput: AdapterRenderFn<TextInputBehavior>`

## `renderToggle: AdapterRenderFn<ToggleBehavior>`

## `renderWizard: AdapterRenderFn<WizardBehavior>`

#### interface `AdapterContext`

Context passed to adapter render functions.

Extended beyond ADR 0046's minimal definition (onDispose only) with
styling helpers that the default adapter needs to reproduce current DOM.
External design-system adapters can ignore all but onDispose.

##### `onDispose(fn: () => void): void`

Register a cleanup function called when the component is torn down.

##### `applyCssClass(el: HTMLElement, comp: any): void`

Apply cssClass from a PresentationBlock or comp descriptor to an element.

##### `applyStyle(el: HTMLElement, style: any): void`

Apply inline styles with token resolution to an element.

##### `applyAccessibility(el: HTMLElement, comp: any): void`

Apply accessibility attributes (role, aria-description, aria-live).

##### `applyClassValue(el: HTMLElement, classValue: unknown): void`

Apply a single class value (string or array) to an element's classList.

#### interface `RenderAdapter`

A render adapter provides DOM construction functions for component types.
Missing entries fall back to the default adapter.

- **name**: `string`
- **components**: `Partial<Record<string, AdapterRenderFn>>`

#### type `AdapterRenderFn`

An adapter render function receives a behavior contract and a parent element.
It creates DOM, appends to parent, calls behavior.bind(refs), and registers dispose.

```ts
type AdapterRenderFn = (behavior: B, parent: HTMLElement, actx: AdapterContext) => void;
```

## `useCheckboxGroup(ctx: BehaviorContext, comp: any): CheckboxGroupBehavior`

## `useCheckbox(ctx: BehaviorContext, comp: any): FieldBehavior`

## `useDatePicker(ctx: BehaviorContext, comp: any): DatePickerBehavior`

## `useFileUpload(ctx: BehaviorContext, comp: any): FileUploadBehavior`

## `useMoneyInput(ctx: BehaviorContext, comp: any): MoneyInputBehavior`

## `useNumberInput(ctx: BehaviorContext, comp: any): NumberInputBehavior`

## `useRadioGroup(ctx: BehaviorContext, comp: any): RadioGroupBehavior`

## `useRating(ctx: BehaviorContext, comp: any): RatingBehavior`

## `useSelect(ctx: BehaviorContext, comp: any): SelectBehavior`

## `resolveFieldPath(bind: string, prefix: string): string`

Build full field path from bind key and prefix.

## `toFieldId(fieldPath: string): string`

Convert a dotted field path to a DOM-safe element ID.

## `resolveAndStripTokens(block: PresentationBlock, resolveToken: (v: any) => any, comp?: any): ResolvedPresentationBlock`

Pre-resolve all $token. references in a PresentationBlock.
Adapters receive concrete values only — no token resolution needed.

## `warnIfIncompatible(componentType: string, dataType: string): void`

Warn if the component type is incompatible with the item's dataType.

## `bindSharedFieldEffects(ctx: BehaviorContext, fieldPath: string, labelText: string, refs: FieldRefs): Array<() => void>`

Wire the shared reactive effects that all field behaviors need:
required indicator, validation display, readonly, relevance, touched tracking.

Returns an array of dispose functions.

## `useSignature(ctx: BehaviorContext, comp: any): SignatureBehavior`

## `useSlider(ctx: BehaviorContext, comp: any): SliderBehavior`

## `useTabs(ctx: BehaviorContext, comp: any): TabsBehavior`

## `useTextInput(ctx: BehaviorContext, comp: any): TextInputBehavior`

## `useToggle(ctx: BehaviorContext, comp: any): ToggleBehavior`

#### interface `ResolvedPresentationBlock`

Pre-resolved PresentationBlock — all $token. references already
substituted with concrete values. Adapters never need token resolution.

- **widget?**: `string`
- **widgetConfig?**: `Record<string, any>`
- **labelPosition?**: `'top' | 'start' | 'hidden'`
- **style?**: `Record<string, string>`
- **accessibility?**: `{
        role?: string;
        description?: string;
        liveRegion?: string;
    }`
- **cssClass?**: `string | string[]`
- **fallback?**: `string[]`

#### interface `FieldRefs`

- **root**: `HTMLElement`
- **label**: `HTMLElement`
- **control**: `HTMLElement`
- **hint?**: `HTMLElement`
- **error?**: `HTMLElement`
- **optionControls?**: `Map<string, HTMLInputElement>`
- **rebuildOptions?**: `(container: HTMLElement, options: ReadonlyArray<{
        value: string;
        label: string;
    }>) => Map<string, HTMLInputElement>`

#### interface `SubmitDetail`

Returned by every field behavior hook.

- **response**: `any`
- **validationReport**: `{
        valid: boolean;
        results: any[];
        counts: {
            error: number;
            warning: number;
            info: number;
        };
        timestamp: string;
    }`

#### interface `FieldBehavior`

- **widgetClassSlots** (`{
        root?: unknown;
        label?: unknown;
        control?: unknown;
        hint?: unknown;
        error?: unknown;
    }`): Widget class slots from theme widgetConfig x-classes.
Used by the default adapter for slot-level class injection.
Custom adapters can ignore this.
- **compOverrides** (`{
        cssClass?: any;
        style?: any;
        accessibility?: any;
    }`): Component-level style/class/accessibility overrides from the component descriptor.
Used by the default adapter to apply comp-level overrides.
Custom adapters can ignore this — they own their own styling.

##### `options(): ReadonlyArray<{
        value: string;
        label: string;
    }>`

##### `bind(refs: FieldRefs): () => void`

#### interface `RadioGroupBehavior`

- **groupRole**: `'radiogroup'`
- **inputName**: `string`
- **orientation?**: `string`

#### interface `CheckboxGroupBehavior`

##### `setValue(val: string[]): void`

#### interface `SelectBehavior`

- **placeholder?**: `string`
- **clearable?**: `boolean`
- **dataType**: `string`

#### interface `ToggleBehavior`

- **onLabel?**: `string`
- **offLabel?**: `string`

#### interface `TextInputBehavior`

- **placeholder?**: `string`
- **inputMode?**: `string`
- **maxLines?**: `number`
- **prefix?**: `string`
- **suffix?**: `string`
- **resolvedInputType?**: `string`
- **extensionAttrs**: `Record<string, string>`

#### interface `NumberInputBehavior`

- **min?**: `number`
- **max?**: `number`
- **step?**: `number`
- **dataType**: `string`

#### interface `DatePickerBehavior`

- **inputType**: `string`
- **minDate?**: `string`
- **maxDate?**: `string`

#### interface `MoneyInputBehavior`

- **min?**: `number`
- **max?**: `number`
- **step?**: `number`
- **placeholder?**: `string`
- **resolvedCurrency**: `string | null`

#### interface `SliderBehavior`

- **min?**: `number`
- **max?**: `number`
- **step?**: `number`
- **showTicks**: `boolean`
- **showValue**: `boolean`

#### interface `RatingBehavior`

##### `setValue(value: number): void`

#### interface `FileUploadBehavior`

- **accept?**: `string`
- **multiple**: `boolean`
- **dragDrop**: `boolean`

#### interface `SignatureBehavior`

- **height**: `number`
- **strokeColor**: `string`

#### interface `WizardRefs`

- **root**: `HTMLElement`
- **stepIndicators?**: `HTMLElement[]`
- **stepContent**: `HTMLElement`
- **prevButton?**: `HTMLButtonElement`
- **nextButton?**: `HTMLButtonElement`

#### interface `WizardBehavior`

##### `activeStep(): number`

##### `totalSteps(): number`

##### `canGoNext(): boolean`

##### `canGoPrev(): boolean`

##### `goNext(): void`

##### `goPrev(): void`

##### `goToStep(index: number): void`

##### `renderStep(index: number, parent: HTMLElement): void`

##### `bind(refs: WizardRefs): () => void`

#### interface `TabsRefs`

- **root**: `HTMLElement`
- **tabBar**: `HTMLElement`
- **panels**: `HTMLElement[]`
- **buttons**: `HTMLButtonElement[]`

#### interface `TabsBehavior`

##### `activeTab(): number`

##### `setActiveTab(index: number): void`

##### `renderTab(index: number, parent: HTMLElement): void`

##### `bind(refs: TabsRefs): () => void`

#### interface `BehaviorContext`

Context passed to behavior hooks. Subset of RenderContext
focused on what behaviors actually need.

- **engine**: `FormEngine`
- **definition**: `any`
- **prefix**: `string`
- **cleanupFns**: `Array<() => void>`
- **touchedFields**: `Set<string>`
- **touchedVersion**: `Signal<number>`
- **latestSubmitDetailSignal**: `Signal<SubmitDetail | null>`
- **resolveToken**: `(val: any) => any`
- **resolveItemPresentation**: `(item: ItemDescriptor) => PresentationBlock`
- **resolveWidgetClassSlots**: `(presentation: PresentationBlock) => {
        root?: unknown;
        label?: unknown;
        control?: unknown;
        hint?: unknown;
        error?: unknown;
    }`
- **findItemByKey**: `(key: string) => any | null`
- **renderComponent**: `(comp: any, parent: HTMLElement, prefix?: string) => void`
- **submit**: `(options?: {
        mode?: 'continuous' | 'submit';
        emitEvent?: boolean;
    }) => SubmitDetail | null`
- **registryEntries**: `Map<string, any>`
- **rerender**: `() => void`

## `useWizard(ctx: BehaviorContext, comp: any): WizardBehavior`

## `HeadingPlugin: ComponentPlugin`

Renders an `<h1>`-`<h6>` heading element based on the `level` prop (defaults to h1).
When `bind` is set, subscribes to the field signal and reactively updates the text.

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

## `TextInputPlugin: ComponentPlugin`

Renders a text input field via the behavior→adapter pipeline.

## `NumberInputPlugin: ComponentPlugin`

Renders a number input field via the behavior→adapter pipeline.

## `SelectPlugin: ComponentPlugin`

Renders a select dropdown via the behavior→adapter pipeline.

## `TogglePlugin: ComponentPlugin`

Renders a toggle switch via the behavior→adapter pipeline.

## `CheckboxPlugin: ComponentPlugin`

Renders a checkbox input via the behavior→adapter pipeline.

## `DatePickerPlugin: ComponentPlugin`

Renders a date picker input via the behavior→adapter pipeline.

## `RadioGroupPlugin: ComponentPlugin`

Renders a radio button group via the behavior→adapter pipeline.

## `CheckboxGroupPlugin: ComponentPlugin`

Renders a checkbox group via the behavior→adapter pipeline.

## `SliderPlugin: ComponentPlugin`

Renders a range slider via the behavior→adapter pipeline.

## `RatingPlugin: ComponentPlugin`

Renders an icon-rating control via the behavior→adapter pipeline.

## `FileUploadPlugin: ComponentPlugin`

Renders a file upload input via the behavior→adapter pipeline.

## `SignaturePlugin: ComponentPlugin`

Renders a signature canvas via the behavior→adapter pipeline.

## `MoneyInputPlugin: ComponentPlugin`

Renders a money input via the behavior→adapter pipeline.

## `InputPlugins: ComponentPlugin[]`

All 13 built-in input component plugins, exported as a single array for bulk registration.

## `WizardPlugin: ComponentPlugin`

Renders a multi-step wizard via the behavior-adapter pipeline.

## `TabsPlugin: ComponentPlugin`

Renders a tabbed interface via the behavior-adapter pipeline.

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
If `bind` is present, each instance of the repeating group becomes one accordion section.

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
- **_registryEntries** (`Map<string, any>`): @internal
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
- **(set) registryDocuments** (`any | any[]`): Set one or more extension registry documents. Builds an internal lookup
map from extension name → registry entry so that field renderers can
apply constraints and metadata (inputMode, autocomplete, pattern, etc.)
generically instead of hardcoding per-extension behaviour.
- **(get) registryEntries** (`Map<string, any>`): The current registry entry lookup (extension name → entry).
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

## `formatMoney(moneyVal: {
    amount: any;
    currency?: string;
} | null | undefined, locale?: string): string`

Format a Formspec money value `{amount, currency}` as a localized currency string.
Returns `''` when the amount is missing or not a finite number.

## `findFieldElement(host: NavigationHost, path: string): HTMLElement | null`

## `revealTabsForField(_host: NavigationHost, fieldEl: HTMLElement): void`

## `focusField(host: NavigationHost, path: string): boolean`

#### interface `NavigationHost`

@filedesc Navigation barrel: exports NavigationHost, path utils, focus, and wizard helpers.

##### `querySelector(selectors: string): Element | null`

##### `querySelectorAll(selectors: string): NodeListOf<Element>`

## `normalizeFieldPath(path: unknown): string`

@filedesc Path normalization and external-to-internal index conversion utilities.

## `externalPathToInternal(path: string): string`

## `goToWizardStep(host: NavigationHost, index: number): boolean`

## `globalRegistry: ComponentRegistry`

Application-wide singleton registry shared by all `<formspec-render>` instances.

All 35 built-in component plugins are registered here at module load.
External code can register additional plugins via `globalRegistry.register(plugin)`.

#### class `ComponentRegistry`

Map-based registry that dispatches component type strings to their
{@link ComponentPlugin} implementations, and resolves render adapter
functions for the headless component architecture.

At render time the `FormspecRender` element looks up each component
descriptor's `component` field in the registry to find the plugin
responsible for building the corresponding DOM subtree.

Built-in components are registered at module load via
`registerDefaultComponents()`. Custom plugins can be added at any
time by calling {@link register} on the {@link globalRegistry} singleton.

- **(get) size** (`number`): The number of currently registered component plugins.
- **(get) activeAdapterName** (`string`): Get the name of the currently active adapter.

##### `register(plugin: ComponentPlugin): void`

Register a component plugin, keyed by its `type` string.
If a plugin with the same type already exists it is silently replaced.

##### `get(type: string): ComponentPlugin | undefined`

Look up a registered plugin by component type.

##### `registerAdapter(adapter: RenderAdapter): void`

Register a render adapter. The 'default' adapter is always the fallback.

##### `setAdapter(name: string): void`

Set the active adapter by name. Warns and keeps current if name is unknown.

##### `resolveAdapterFn(componentType: string): AdapterRenderFn | undefined`

Resolve the render function for a component type. Falls back to default adapter.

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

##### `applyClassValue(el: HTMLElement, classValue: unknown): void`

##### `findItemByKey(key: string, items?: any[]): any | null`

##### `submit(options?: any): any`

##### `resolveValidationTarget(resultOrPath: any): ValidationTargetMetadata`

##### `focusField(path: string): boolean`

##### `setSubmitPending(pending: boolean): void`

##### `isSubmitPending(): boolean`

##### `render(): void`

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

## `hasActiveScreener(definition: any): boolean`

## `renderScreener(host: ScreenerHost, container: HTMLElement): void`

#### interface `ScreenerHost`

##### `classifyScreenerRoute(route: ScreenerRoute | null | undefined): 'none' | 'internal' | 'external'`

##### `emitScreenerStateChange(reason: string, answers?: Record<string, any>): void`

##### `dispatchEvent(event: Event): boolean`

##### `render(): void`

## `applyAccessibility(_host: StylingHost, el: HTMLElement, comp: any): void`

## `applyCssClass(host: StylingHost, el: HTMLElement, comp: any): void`

## `applyClassValue(host: StylingHost, el: HTMLElement, classValue: unknown): void`

## `resolveWidgetClassSlots(_host: StylingHost, presentation: PresentationBlock): {
    root?: unknown;
    label?: unknown;
    control?: unknown;
    hint?: unknown;
    error?: unknown;
}`

## `resolveItemPresentation(host: StylingHost, itemDesc: ItemDescriptor): PresentationBlock`

#### interface `StylingHost`

##### `getEffectiveTheme(): ThemeDocument`

##### `findItemByKey(key: string, items?: any[]): any | null`

## `applyStyle(host: StylingHost, el: HTMLElement, style: any): void`

## `canonicalizeStylesheetHref(href: string): string`

## `findThemeStylesheet(hrefKey: string): HTMLLinkElement | null`

## `loadStylesheets(host: StylingHost): void`

## `cleanupStylesheets(host: StylingHost): void`

## `stylesheetRefCounts: Map<string, number>`

Module-level ref counts (was static on the class).

## `resolveToken(host: StylingHost, val: any): any`

## `emitTokenProperties(host: StylingHost, container: HTMLElement): void`

## `touchFieldsInContainer(container: Element, touchedFields: Set<string>, touchedVersion: {
    value: number;
}): void`

Touch all fields within a specific DOM container element (e.g. a wizard panel).
Fields are identified by `.formspec-field[data-name]` elements.
Used for soft per-page wizard validation: errors become visible without blocking navigation.

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

##### `focusField(path: string): void`

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
- **touchedFields** (`Set<string>`): Set of field paths that have been interacted with (blurred/changed).
Errors are only displayed for touched fields. Plugins can add paths here
to force inline error display (e.g. wizard soft-validation on Next click).
- **touchedVersion** (`Signal<number>`): Monotonic counter that increments whenever touched state changes.
Error-display effects subscribe to this so they re-run when fields are
touched programmatically (e.g. wizard Next click).
- **findItemByKey** (`(key: string, items?: any[]) => any | null`): Look up a definition item by key (supports dotted paths like `"group.field"`). Returns `null` if not found.
- **activeBreakpoint** (`string | null`): The currently active responsive breakpoint name, or `null` when no breakpoint matches.
- **behaviorContext** (`BehaviorContext`): Behavior context for the headless behavior→adapter pipeline.
- **adapterContext** (`AdapterContext`): Adapter context for the headless behavior→adapter pipeline.

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

