# formspec-webcomponent

`<formspec-render>` is a custom element that binds a `FormEngine` to the DOM. It ships 37 built-in components, a plugin registry, a 5-level theme cascade, reactive ARIA attributes, and responsive breakpoint support.

## Install

```bash
npm install formspec-webcomponent
```

The package is ESM-only. It requires `formspec-engine` and `formspec-layout` as peer dependencies.

## Quick Start

```js
import { FormspecRender } from 'formspec-webcomponent';
import 'formspec-webcomponent/formspec-base.css';

customElements.define('formspec-render', FormspecRender);

const el = document.createElement('formspec-render');
document.body.appendChild(el);

// Set registryDocuments BEFORE definition — the engine is created on `set definition`.
el.registryDocuments = myRegistryDoc;
el.definition = myDefinition;
el.componentDocument = myComponentDoc;
el.themeDocument = myTheme;
```

The element is exported but not auto-registered. Call `customElements.define()` with your preferred tag name.

## Properties

| Property | Type | Description |
|---|---|---|
| `definition` | `object` | Formspec definition JSON. Creates a new `FormEngine` and schedules a render. |
| `componentDocument` | `object` | Component document JSON (layout tree, tokens, breakpoints). Schedules a render. |
| `themeDocument` | `ThemeDocument \| null` | Theme document. Loads and unloads external stylesheets and schedules a render. |
| `registryDocuments` | `object \| object[]` | One or more extension registry documents. Builds an internal extension-name-to-entry map. **Set this before `definition`** — the engine reads registry entries at construction time. |

Setting any property schedules a coalesced re-render via microtask.

## Methods

```ts
// Engine access
getEngine(): FormEngine | null

// Diagnostics
getDiagnosticsSnapshot(options?: { mode?: 'continuous' | 'submit' }): object | null

// Replay
applyReplayEvent(event: object): { ok: boolean; event: object; error?: string }
replay(events: object[], options?: { stopOnError?: boolean }): { applied: number; results: object[]; errors: object[] }

// Runtime context (inject `now`, user metadata, etc.)
setRuntimeContext(context: object): void

// Validation and submission
touchAllFields(): void
submit(options?: { mode?: 'continuous' | 'submit'; emitEvent?: boolean }): { response: object; validationReport: object } | null
resolveValidationTarget(resultOrPath: any): ValidationTargetMetadata

// Field focus
focusField(path: string): boolean

// Submit pending state
setSubmitPending(pending: boolean): void
isSubmitPending(): boolean

// Wizard navigation
goToWizardStep(index: number): boolean

// Screener
getScreenerState(): ScreenerStateSnapshot
getScreenerRoute(): ScreenerRoute | null
skipScreener(): void
restartScreener(): void

// Force synchronous re-render
render(): void
```

## Events

All events bubble and are composed.

| Event | When | `detail` |
|---|---|---|
| `formspec-submit` | `submit()` called with `emitEvent !== false` | `{ response, validationReport }` |
| `formspec-submit-pending-change` | Submit pending state toggles | `{ pending: boolean }` |
| `formspec-screener-state-change` | Screener state changes (definition set, skip, restart, route selected) | `{ hasScreener, completed, routeType, route, reason }` |
| `formspec-screener-route` | Screener evaluates a route | `{ route, answers, routeType, isInternal }` |
| `formspec-page-change` | Wizard navigates to a step | `{ index, total, title }` |

## Component Registry

All 37 built-in components register automatically on import. Add custom components by registering a plugin on the global registry singleton.

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

Each plugin implements `ComponentPlugin`:

```ts
interface ComponentPlugin {
  type: string;
  render(comp: any, parent: HTMLElement, ctx: RenderContext): void;
}
```

`RenderContext` provides engine access, path resolution, theme helpers, signal cleanup tracking, and recursive child rendering. See [`src/types.ts`](src/types.ts) for the full interface.

### Built-in Components

| Category | Components |
|---|---|
| **Layout** (10) | Page, Stack, Grid, Divider, Collapsible, Columns, Panel, Accordion, Modal, Popover |
| **Input** (13) | TextInput, NumberInput, Select, Toggle, Checkbox, DatePicker, RadioGroup, CheckboxGroup, Slider, Rating, FileUpload, Signature, MoneyInput |
| **Display** (9) | Heading, Text, Card, Spacer, Alert, Badge, ProgressBar, Summary, ValidationSummary |
| **Interactive** (3) | Wizard, Tabs, SubmitButton |
| **Special** (2) | ConditionalGroup, DataTable |

## Theme Cascade

The renderer resolves presentation through a 5-level cascade (lowest to highest priority):

1. Form-wide `formPresentation` hints in the definition
2. Per-item `presentation` hints in the definition item
3. Theme `defaults`
4. Theme `selectors` (document order; later wins)
5. Theme `items[key]` per-item overrides

Tokens (`$token.spacing.lg`) resolve from the component document and theme document, then emit as CSS custom properties (`--formspec-spacing-lg`) on the form container.

Theme documents may declare a `stylesheets` array of CSS URLs. The renderer injects `<link>` elements with ref-counting so multiple `<formspec-render>` instances sharing a theme do not duplicate loads.

## Rendering Pipeline

1. **Cleanup** — dispose all previous signal effects and remove event listeners.
2. **Breakpoints** — wire `matchMedia` listeners from `componentDocument.breakpoints`.
3. **Tokens** — emit CSS custom properties onto `.formspec-container`.
4. **Screener gate** — render the screener if one is defined and not yet completed.
5. **Plan** — call `planComponentTree()` (from `formspec-layout`) to produce a layout node tree.
6. **Emit** — walk the tree, create DOM elements, and wire Preact Signal effects for reactivity (relevance, validation, repeat instances).

Each input component receives a fully wired field wrapper with label, hint, error display, ARIA attributes, and touch tracking driven by signals from the engine.

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
