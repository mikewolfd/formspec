# formspec-webcomponent

`<formspec-render>` custom element that binds `FormEngine` to the DOM. Implements a component registry pattern, theme cascade resolver, slot binding mechanism, reactive ARIA attributes, and responsive breakpoint support.

**Runtime dependency:** `formspec-engine` (monorepo sibling; `@preact/signals-core` comes through it)
**Dev dependencies:** `happy-dom`, `typescript`, `vitest`
**Test environment:** happy-dom via Vitest
**Entry point:** `dist/index.js` (ESM)

---

## `<formspec-render>` Element

`src/index.ts` — `FormspecRender extends HTMLElement`

The class is exported but **not auto-registered**. Consumers call:
```javascript
customElements.define('formspec-render', FormspecRender);
```

### Settable Properties

| Property | Type | Side Effect |
|---|---|---|
| `definition` | any (Formspec definition JSON) | Creates a new `FormEngine(val)`, calls `render()` |
| `componentDocument` | any (Component Document JSON) | Stores reference, calls `render()` |
| `themeDocument` | `ThemeDocument \| null` | Stores reference, calls `loadStylesheets()` then `render()` |

### Public Methods

```typescript
getEngine(): FormEngine | null
getDiagnosticsSnapshot(options?: { mode?: 'continuous' | 'submit' }): any
applyReplayEvent(event: any): { ok: boolean; event: any; error?: string }
replay(events: any[], options?: { stopOnError?: boolean }): { applied: number; results: any[]; errors: any[] }
setRuntimeContext(context: any): void
touchAllFields(): void
submit(options?: { mode?: 'continuous' | 'submit'; emitEvent?: boolean }): { response: any; validationReport: any } | null
```

Most methods proxy to the internal `FormEngine` instance. `touchAllFields()` and `submit()` are renderer-level helpers.

### Custom Events

| Event | Dispatched When | `detail` |
|---|---|---|
| `formspec-submit` | `submit()` is called with `emitEvent !== false` (including via `SubmitButton`) | `{ response, validationReport }` |

### Lifecycle

- No `connectedCallback`. Rendering is triggered imperatively when properties are set.
- `disconnectedCallback`: disposes all reactive effects (`cleanup()`), decrements stylesheet ref-counts, removes breakpoint listeners, removes the root container.

### render() Flow

1. `cleanup()` — dispose previous reactive effects
2. Set up breakpoint media query listeners → `_activeBreakpointSignal`
3. Validate component document version (`$formspecComponent: '1.0'`) and target URL
4. Create (or reuse stable) `.formspec-container` div
5. Emit CSS custom properties from theme/component tokens onto the container
6. Render component document tree **or** fall back to auto-rendering from definition items

### Private State

- `engine: FormEngine | null`
- `cleanupFns: Array<() => void>` — `effect()` disposers accumulated during rendering
- `_activeBreakpointSignal: Signal<string | null>`
- `static stylesheetRefCounts: Map<string, number>` — class-level ref-counting for shared theme stylesheets
- `rootContainer: HTMLDivElement | null` — stable across re-renders

---

## Component Registry

`src/registry.ts`

```typescript
interface ComponentPlugin {
  type: string;
  render: (comp: any, parent: HTMLElement, ctx: RenderContext) => void;
}

class ComponentRegistry {
  register(plugin: ComponentPlugin): void  // Re-registering same type replaces previous
  get(type: string): ComponentPlugin | undefined
  get size(): number
}

export const globalRegistry = new ComponentRegistry();
```

Third-party components: `globalRegistry.register({ type: 'x-my-component', render: ... })`.

`registerDefaultComponents()` (called at module load in `src/components/index.ts`) registers all 37 built-in components into `globalRegistry`.

---

## RenderContext

`src/types.ts`

Passed to every component's `render` function:

```typescript
interface RenderContext {
  engine: FormEngine;
  componentDocument: any;
  themeDocument: ThemeDocument | null;
  prefix: string;                    // Path prefix for current repeat context
  submit: (options?: { mode?: 'continuous' | 'submit'; emitEvent?: boolean }) => { response: any; validationReport: any } | null;
  renderComponent: (comp: any, parent: HTMLElement, prefix?: string) => void;
  resolveToken: (val: any) => any;   // Resolves $token.xxx references
  applyStyle: (el: HTMLElement, style: any) => void;
  applyCssClass: (el: HTMLElement, comp: any) => void;
  applyAccessibility: (el: HTMLElement, comp: any) => void;
  resolveItemPresentation: (item: ItemDescriptor) => PresentationBlock;
  cleanupFns: Array<() => void>;     // Push effect disposers here
  findItemByKey: (key: string, items?: any[]) => any | null;
  renderInputComponent: (comp: any, item: any, fullName: string) => HTMLElement;
  activeBreakpoint: string | null;
}
```

---

## Built-in Components (37 total)

### Layout (10) — `src/components/layout.ts`

| Type | HTML | Key Props |
|---|---|---|
| `Page` | `<section class="formspec-page">` | `id`, `title`, `description`, `children` |
| `Stack` | `<div class="formspec-stack">` | `direction` (horizontal), `align`, `wrap`, `gap`, `children` |
| `Grid` | `<div class="formspec-grid">` | `columns`, `gap`, `rowGap`, `children` |
| `Divider` | `<hr>` or labeled `<div class="formspec-divider--labeled">` | `label` |
| `Collapsible` | `<details class="formspec-collapsible">` | `title`, `defaultOpen`, `children` |
| `Columns` | `<div class="formspec-columns">` (CSS grid) | `columnCount`, `gap`, `children` |
| `Panel` | `<div class="formspec-panel">` | `title`, `width`, `children` |
| `Accordion` | `<div class="formspec-accordion">` + `<details>` per item | `labels`, `defaultOpen` (index), `allowMultiple`, `children` |
| `Modal` | `<dialog class="formspec-modal">` + trigger button | `title`, `size` (sm/md/lg/xl/full), `closable`, `triggerLabel`, `children` |
| `Popover` | Trigger button + content div with `role="dialog"` | `triggerLabel`, `triggerBind`, `placement`, `children` |

`Accordion`: exclusive mode by default (opening one closes others). `Modal`: uses native `<dialog>` + `showModal()`. `Popover`: uses Popover API when available, falls back to `hidden` toggle.

### Inputs (13) — `src/components/inputs.ts`

All except Slider, Rating, FileUpload, Signature, MoneyInput delegate to `ctx.renderInputComponent()` — the centralized field renderer that creates the full field wrapper with label, hint, error, and ARIA linkage.

| Type | Input/HTML | Key Props |
|---|---|---|
| `TextInput` | `<input type="text">`, `<textarea>` when `maxLines>1`, or wrapper with prefix/suffix | `bind`, `placeholder`, `inputMode`, `maxLines`, `prefix`, `suffix`, `labelOverride`, `labelPosition` |
| `NumberInput` | `<input type="number">` | `bind`, `min`, `max`, `step` |
| `Select` | `<select>` | `bind`, `placeholder`, `clearable` |
| `Toggle` | `<input type="checkbox">` with optional on/off labels | `bind`, `onLabel`, `offLabel` |
| `Checkbox` | `<input type="checkbox">` | `bind` |
| `DatePicker` | `<input type="date\|time\|datetime-local">` based on field dataType | `bind`, `minDate`, `maxDate` |
| `RadioGroup` | `<div role="radiogroup">` with radio inputs | `bind` |
| `CheckboxGroup` | `<div class="formspec-checkbox-group">` | `bind`, `columns`, `selectAll` |
| `Slider` | `<input type="range">` + value display (custom render) | `bind`, `min`, `max`, `step`, `showValue` |
| `Rating` | Star-based clickable spans (custom render) | `bind`, `max` (default 5), `icon` |
| `FileUpload` | `<input type="file">` with optional drag-drop zone | `bind`, `accept`, `multiple`, `dragDrop` |
| `Signature` | `<canvas>` with mouse drawing (custom render) | `bind`, `height`, `strokeColor` |
| `MoneyInput` | Delegates to `renderInputComponent` with `component:'NumberInput', dataType:'money'` | `bind` |

### Display (8) — `src/components/display.ts`

| Type | HTML | Key Props |
|---|---|---|
| `Heading` | `<h1>`–`<h6>` | `text`, `level` (1-6) |
| `Text` | `<p class="formspec-text">` | `text`, `bind`, `format` (markdown) |
| `Card` | `<div class="formspec-card">` | `title`, `subtitle`, `elevation` (0-5), `children` |
| `Spacer` | `<div class="formspec-spacer">` | `size` (token-resolvable) |
| `Alert` | `<div class="formspec-alert formspec-alert--{severity}">` | `text`, `severity`, `dismissible` |
| `Badge` | `<span class="formspec-badge formspec-badge--{variant}">` | `text`, `variant` |
| `ProgressBar` | `<progress>` in wrapper | `value`, `max`, `bind`, `showPercent` |
| `Summary` | `<dl class="formspec-summary">` | `items: [{ label, bind }]` |

`Text`: reactive if `bind` provided (reads engine signal). `ProgressBar`: reactive if `bind` provided.

### Interactive (3) — `src/components/interactive.ts`

| Type | HTML | Key Props | Behavior |
|---|---|---|---|
| `Wizard` | `.formspec-wizard` + panels + nav | `children`, `showProgress` (default true), `allowSkip` | Step navigation via Preact signal. Progress indicators with active/completed states. Previous hidden at step 0; Next shows "Finish" at last step. |
| `Tabs` | `.formspec-tabs` + tab bar + panels | `tabLabels`, `children`, `defaultTab` (0), `position` (top/bottom/left/right) | Tab switching via DOM class toggling. |
| `SubmitButton` | `<button class="formspec-submit">` | `label`, `mode` (`submit`/`continuous`), `emitEvent` | Calls `ctx.submit()` and optionally emits `formspec-submit`. |

### Special (2) — `src/components/special.ts`

| Type | HTML | Key Props | Behavior |
|---|---|---|---|
| `ConditionalGroup` | `<div style="display:contents">` | `children` | Passthrough container for conditional rendering |
| `DataTable` | `<table class="formspec-data-table">` | `bind` (repeat group key), `columns: [{ header, bind }]`, `showRowNumbers`, `allowAdd`, `allowRemove` | Reactive to repeat count signal. Type-aware input coercion (integer, decimal, money). Readonly signal disables inputs. |

---

## Theme Resolution

`src/theme-resolver.ts`

### Cascade Order (low → high priority)

1. Definition-wide hints (`definition.formPresentation`)
2. Per-item hints (`item.presentation.widgetHint`)
3. Theme defaults (`theme.defaults`)
4. Theme selectors (`theme.selectors`, document order, later wins)
5. Theme items by key (`theme.items["fieldKey"]`) — highest

### Key Functions

```typescript
resolvePresentation(theme: ThemeDocument, item: ItemDescriptor, tier1?: Tier1Hints): PresentationBlock
// Merges all 5 cascade levels. Merge semantics:
// - Scalars (widget, labelPosition, fallback): higher replaces lower
// - cssClass: unioned (deduplicated); strings split on whitespace before union
// - style, widgetConfig, accessibility: shallow-merged ({ ...lower, ...higher })
// - widgetConfig["x-classes"]: additively merged (slot maps combined across levels)

resolveWidget(presentation: PresentationBlock, isAvailable: (widget: string) => boolean): string | null
// Tries presentation.widget, then iterates presentation.fallback[],
// checking availability via callback. Returns first available or null.

selectorMatches(match: SelectorMatch, item: ItemDescriptor): boolean
// Empty match objects → false. match.type AND match.dataType must both match (AND logic).
```

### CSS Custom Property Emission

Theme and component tokens are merged (component tokens override theme tokens) and emitted as `--formspec-{key}` on `.formspec-container`, with dots replaced by dashes:
```
tokens: { "spacing.lg": "1.5rem" } → --formspec-spacing-lg: 1.5rem
```

### Token Resolution

`resolveToken(val, componentTokens, themeTokens)` resolves `$token.xxx` references. Checks component tokens first, then theme tokens. Non-token values pass through unchanged.

### External Stylesheets

`theme.stylesheets` entries loaded as `<link rel="stylesheet" data-formspec-theme>` in `document.head`. Reference-counted via static `stylesheetRefCounts` map across multiple `<formspec-render>` instances. Cleaned up on `disconnectedCallback`.

### Default Theme

`src/default-theme.json` — used when no `themeDocument` is set. Sets `labelPosition: "top"`, `accessibility.liveRegion: "off"`. Selectors map all dataTypes to widgets: boolean→Toggle, choice→Select (RadioGroup fallback), multiChoice→CheckboxGroup, date/dateTime/time→DatePicker, integer/decimal→NumberInput, attachment→FileUpload, money→NumberInput, uri/text/string→TextInput.

---

## Slot Binding (`x-classes`)

`src/index.ts` — `resolveWidgetClassSlots()` (line ~340)

Themes inject CSS classes onto specific DOM elements within a field wrapper. Resolution for each slot (first non-empty wins):

| Slot | Resolves From |
|---|---|
| `root` | `widgetConfig.rootClass` or `widgetConfig["x-classes"].root` |
| `label` | `widgetConfig.labelClass` or `widgetConfig["x-classes"].label` |
| `control` | `widgetConfig.controlClass` or `widgetConfig.inputClass` or `widgetConfig["x-classes"].control` or `.input` |
| `hint` | `widgetConfig.hintClass` or `widgetConfig["x-classes"].hint` |
| `error` | `widgetConfig.errorClass` or `widgetConfig["x-classes"].error` |

`x-classes` maps are **additively merged** across cascade levels (not replaced). This is the key mechanism for design system integration (see USWDS example below).

---

## Accessibility

### Field-Level ARIA (in `renderInputComponent`)

All generated via reactive `effect()` calls:

- `label[for]` → input `id`
- `aria-describedby` → links input to hint element ID + error element ID
- `aria-required` → reactive from `engine.requiredSignals[fullName]`
- `aria-hidden` → reactive from `engine.relevantSignals[fullName]`
- `aria-readonly` → reactive from `engine.readonlySignals[fullName]`
- `aria-invalid` → reactive from `engine.errorSignals[fullName]`
- Error div: `role="alert" aria-live="polite"`
- Required indicator: `<span class="formspec-required">*</span>` (reactive)
- Hidden labels: `labelPosition: 'hidden'` → `formspec-sr-only` class (visually hidden, readable by screen readers)
- `RadioGroup` container: `role="radiogroup"`

### Component-Level ARIA (`applyAccessibility`)

Applied from `comp.accessibility`:
- `role` attribute
- `aria-description` attribute + visually-hidden `<span>` linked via `aria-describedby` (dual approach for browser compatibility)
- `aria-live` from `liveRegion`

### Modal: `aria-label="Close"` on close button. Native `<dialog>`.
### Alert: `aria-label="Dismiss"` on dismiss button.
### Popover: content `role="dialog"`.

---

## Rendering Paths

### 1. Component Document Tree

When `componentDocument.tree` exists: renders recursively via `renderComponent()` → `renderComponentInner()` → `renderActualComponent()`. Looks up plugin from `globalRegistry`, or expands custom components from `componentDocument.components[type]`.

### 2. Definition Fallback

No component document: iterates `definition.items`, calls `renderItem()`. Uses `resolveWidget()` against theme cascade to select widgets, `getDefaultComponent()` as final fallback based on dataType.

### Conditional Rendering (`when`)

Component with `when` property: `effect()` reactively evaluates the FEL expression (via `engine.compileExpression`) and toggles `.formspec-hidden`.

### Repeatable Group Rendering

Component `bind` pointing to a repeatable group: creates `.formspec-repeat` container; `effect()` on `engine.repeats[fullName]` reactively adds/removes `.formspec-repeat-instance` wrappers. "Add" button calls `engine.addRepeatInstance()`.

### Custom Component Expansion

Type not in registry but in `componentDocument.components`: deep-clones the template tree, interpolates `{param}` placeholders from component properties, renders recursively. Guarded by `customComponentStack` Set to detect recursion.

### Responsive Rendering

Components with `responsive` property: `renderResponsiveComponent()` creates a `display: contents` wrapper, lazily renders variant subtrees per breakpoint, `effect()` on `_activeBreakpointSignal` shows/hides the appropriate variant. Each variant gets its own cleanup scope via `withCleanupScope()`.

---

## Exports

### From `src/index.ts`

**Values:**
- `FormspecRender` (class)
- `defaultTheme` (default theme JSON object)
- `interpolateParams(node, params)` (utility)
- `resolveResponsiveProps(comp, activeBreakpoint)` (utility)
- `resolveToken(val, componentTokens, themeTokens)` (utility)
- `resolvePresentation` (re-exported from theme-resolver)
- `resolveWidget` (re-exported from theme-resolver)

**Types:**
- `ThemeDocument`, `PresentationBlock`, `ItemDescriptor`, `AccessibilityBlock`
- `ThemeSelector`, `SelectorMatch`, `Tier1Hints`, `FormspecDataType`
- `Page`, `Region`, `LayoutHints`, `StyleHints`

### From `src/registry.ts` (not re-exported from index)
- `ComponentRegistry`, `globalRegistry`

### From `src/types.ts` (not re-exported from index)
- `RenderContext`, `ComponentPlugin`

---

## USWDS Integration Example

`examples/uswds-theme.json` + `examples/formspec-uswds-bridge.css` + `USWDS.md`

Three integration hooks:
1. `theme.stylesheets` — loads USWDS CSS from CDN
2. `PresentationBlock.cssClass` — adds USWDS form classes
3. `widgetConfig["x-classes"]` — maps USWDS classes to DOM slots:
   ```json
   "x-classes": {
     "root": "usa-form-group",
     "label": "usa-label",
     "control": "usa-input",
     "hint": "usa-hint",
     "error": "usa-error-message"
   }
   ```

The bridge CSS handles structural differences (spacing, empty element hiding) that class names alone cannot solve.

---

## Tests

8 test files in `tests/`, using Vitest + happy-dom:

- `registry.test.ts` — Registry CRUD, re-registration, all 35 components enumerated
- `render-lifecycle.test.ts` — Definition/render, re-render stability, submit event, custom component recursion detection, `disconnectedCallback` cleanup, stylesheet ref-counting
- `input-rendering.test.ts` — Label position cascade, x-classes slots, ARIA attributes, reactive signals, dataType-to-input mapping, Select propagation, TextInput variants, NumberInput attributes
- `interpolation.test.ts` — `interpolateParams()` and `resolveResponsiveProps()` pure function tests
- `theme-resolver.test.ts` — Full cascade resolution, selector matching (type/dataType conjunction, empty), cssClass union/dedup, style/widgetConfig/accessibility shallow merge, x-classes additive merge, fallback replacement, `resolveWidget()` with fallback chain
- `token-resolution.test.ts` — Token priority (component > theme), passthrough, unresolved warning, CSS property emission, override behavior
- `interactive-plugins.test.ts` — Wizard (panel visibility, nav, progress, allowSkip), Tabs (active state, defaultTab, position bottom), Accordion (defaultOpen, exclusive/allowMultiple)
- `helpers/engine-fixtures.ts` — Test fixtures: `singleFieldDef()`, `multiFieldDef()`, `boundFieldDef()`, `repeatGroupDef()`, `minimalComponentDoc()`, `minimalTheme()`
