# formspec-webcomponent

`<formspec-render>` — a custom element that binds a `FormEngine` to the DOM. Ships with 37 built-in components, a plugin registry, theme cascade, reactive ARIA attributes, and responsive breakpoint support.

## Install

```bash
npm install formspec-webcomponent
```

The package is ESM-only. Runtime dependencies: `formspec-engine`, `formspec-layout`.

## Quick Start

```js
import { FormspecRender } from 'formspec-webcomponent';
import 'formspec-webcomponent/formspec-base.css';

customElements.define('formspec-render', FormspecRender);

const el = document.createElement('formspec-render');
document.body.appendChild(el);

el.definition = { /* Formspec definition JSON */ };
el.componentDocument = { /* Component document JSON */ };
el.themeDocument = { /* Theme document JSON (optional) */ };
```

The element is exported but **not auto-registered** — call `customElements.define()` with your preferred tag name.

## Properties

| Property | Type | Description |
|---|---|---|
| `definition` | `object` | Formspec definition JSON. Creates a new `FormEngine` and triggers a render. |
| `componentDocument` | `object` | Component document JSON (layout tree, tokens, breakpoints). |
| `themeDocument` | `ThemeDocument \| null` | Theme document. Loads/unloads external stylesheets and triggers a render. |

Setting any property schedules a coalesced re-render via microtask.

## Methods

```ts
// Engine access
getEngine(): FormEngine | null

// Diagnostics
getDiagnosticsSnapshot(options?: { mode?: 'continuous' | 'submit' }): object

// Replay
applyReplayEvent(event: object): { ok: boolean; event: object; error?: string }
replay(events: object[], options?: { stopOnError?: boolean }): { applied: number; results: object[]; errors: object[] }

// Runtime context (inject `now`, user metadata, etc.)
setRuntimeContext(context: object): void

// Validation & submission
touchAllFields(): void
submit(options?: { mode?: 'continuous' | 'submit'; emitEvent?: boolean }): { response: object; validationReport: object } | null
resolveValidationTarget(resultOrPath: any): ValidationTargetMetadata

// Field focus
focusField(path: string): boolean

// Submit pending state
setSubmitPending(pending: boolean): void
isSubmitPending(): boolean

// Wizard navigation
goToWizardStep(index: number): void

// Screener
getScreenerState(): ScreenerStateSnapshot
getScreenerRoute(): ScreenerRoute | null
skipScreener(): void
restartScreener(): void

// Force re-render
render(): void
```

## Events

| Event | When | `detail` |
|---|---|---|
| `formspec-submit` | `submit()` called with `emitEvent !== false` | `{ response, validationReport }` |
| `formspec-submit-pending-change` | Pending state toggles | `{ pending: boolean }` |
| `formspec-screener-route` | Screener evaluates a route | `{ route, answers, routeType, isInternal }` |
| `formspec-screener-state-change` | Screener state changes (definition set, skip, restart, route) | `{ hasScreener, completed, routeType, route, reason }` |

All events bubble and are composed.

## Component Registry

All 37 built-in components are registered automatically on import. To add custom components:

```js
import { globalRegistry } from 'formspec-webcomponent';

globalRegistry.register({
  type: 'MyWidget',
  render(comp, parent, ctx) {
    const div = document.createElement('div');
    div.textContent = comp.props?.label ?? 'Hello';
    parent.appendChild(div);
  },
});
```

### Built-in Components

| Category | Components |
|---|---|
| **Layout** | Page, Stack, Grid, Divider, Collapsible, Columns, Panel, Accordion, Modal, Popover |
| **Input** | TextInput, NumberInput, Select, Toggle, Checkbox, DatePicker, RadioGroup, CheckboxGroup, Slider, Rating, FileUpload, Signature, MoneyInput |
| **Display** | Heading, Text, Card, Spacer, Alert, Badge, ProgressBar, Summary, ValidationSummary |
| **Interactive** | Wizard, Tabs, SubmitButton |
| **Special** | ConditionalGroup, DataTable |

## Theme Cascade

Presentation is resolved through a 5-level cascade (lowest to highest priority):

1. Form-wide `formPresentation` hints (from the definition)
2. Per-item `presentation` hints (from the definition item)
3. Theme `defaults`
4. Theme `selectors` (document order; later wins)
5. Theme `items[key]` per-item overrides

Tokens (`$token.spacing.lg`) are resolved from the component document and theme document, then emitted as CSS custom properties (`--formspec-spacing-lg`) on the form container.

### External Stylesheets

Theme documents can declare `stylesheets` — an array of CSS URLs. The renderer injects `<link>` elements with ref-counting so multiple `<formspec-render>` instances sharing a theme don't duplicate loads.

## Rendering Pipeline

1. **Cleanup** — dispose all previous signal effects
2. **Breakpoints** — wire `matchMedia` listeners from `componentDocument.breakpoints`
3. **Validate** — check component document version and target definition match
4. **Tokens** — emit CSS custom properties onto the `.formspec-container`
5. **Screener gate** — if a screener is defined and incomplete, render it instead
6. **Plan** — call `planComponentTree()` (from `formspec-layout`) to produce a `LayoutNode` tree
7. **Emit** — walk the tree, creating DOM elements, wiring signal effects for reactivity (relevance, validation, repeat instances)

Each input component gets a fully-wired field wrapper with label, hint, error display, ARIA attributes, and touch tracking — all driven by Preact Signals from the engine.

## Exports

```ts
// Element
export { FormspecRender } from './element';

// Registry
export { ComponentRegistry, globalRegistry } from './registry';

// Utilities
export { formatMoney } from './format';
export { defaultTheme } from './default-theme.json';

// Re-exports from formspec-layout
export { resolvePresentation, resolveWidget, interpolateParams, resolveResponsiveProps, resolveToken, getDefaultComponent };

// Types
export type { RenderContext, ComponentPlugin, ValidationTargetMetadata, ScreenerRoute, ScreenerRouteType, ScreenerStateSnapshot };
export type { ThemeDocument, PresentationBlock, ItemDescriptor, AccessibilityBlock, ThemeSelector, SelectorMatch, Tier1Hints, FormspecDataType, Page, Region, LayoutHints, StyleHints };
```

## Development

```bash
npm run build          # tsc + copy base CSS
npm run test           # vitest (happy-dom)
npm run test:watch     # vitest watch mode
```
