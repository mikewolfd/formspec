# ADR 0049: Tailwind CSS Adapter — Reference Implementation

**Status:** Accepted
**Date:** 2026-03-19

## Context

The adapter architecture (ADR 0046) was designed for design-system interop, and the USWDS adapter proves it works for a structured, opinionated design system with BEM class conventions and strict DOM patterns. But USWDS represents one end of the design-system spectrum — prescriptive, government-specific, heavy. The architecture needs validation against the other end: a utility-first framework where the adapter *defines* the visual language rather than conforming to an existing one.

Tailwind CSS is the most widely adopted utility-first CSS framework. Unlike USWDS, it has:

- **No predefined component DOM patterns.** There's no `tw-form-group` or `tw-radio__input`. The adapter decides what classes go where.
- **No CSS to fight.** Tailwind utilities are low-specificity, composable, and don't set opinions that conflict with formspec layout primitives. Integration CSS should be near-zero.
- **Broad ecosystem familiarity.** Most frontend developers have Tailwind experience. A Tailwind adapter serves as the most accessible reference implementation for anyone building a custom adapter.

Additionally, formspec needs a worked reference example that demonstrates the adapter contract end-to-end. The USWDS adapter works but its complexity (BEM naming, USWDS-specific DOM requirements, Sass build pipeline) obscures the adapter API itself. A Tailwind adapter is simpler — it's just utility classes on standard HTML elements — making it ideal as a teaching implementation.

### What this is NOT

This is not a production design system. It's a reference adapter that:

1. Validates the adapter contract works for utility-first CSS
2. Provides copy-paste starter code for custom adapter authors
3. Demonstrates every behavior hook and `FieldRefs` contract
4. Ships a good-looking form out of the box for demos and prototyping

## Decision

### Add a Tailwind CSS adapter to `formspec-adapters`

Create `packages/formspec-adapters/src/tailwind/` alongside the existing `src/uswds/` directory. The adapter implements all 15 component types (13 field + Wizard + Tabs) using Tailwind utility classes on semantic HTML elements.

### Adapter structure

```
src/tailwind/
  index.ts              ← RenderAdapter barrel export
  shared.ts             ← createTailwindFieldDOM(), error helper
  text-input.ts
  number-input.ts
  radio-group.ts
  checkbox-group.ts
  select.ts
  checkbox.ts
  toggle.ts
  date-picker.ts
  money-input.ts
  slider.ts
  rating.ts
  file-upload.ts
  signature.ts
  wizard.ts
  tabs.ts
  integration-css.ts    ← Minimal integration CSS (if any)
```

Mirrors the USWDS adapter structure exactly. Anyone comparing the two sees a 1:1 mapping of how the same behavior contract produces different DOM.

### DOM strategy — semantic HTML with utility classes

Unlike USWDS (which requires specific wrapper elements and BEM class names), the Tailwind adapter uses the simplest DOM structure that satisfies each behavior's `FieldRefs` contract:

| FieldRefs slot | Tailwind DOM |
|---|---|
| `root` | `<div class="mb-4">` (form group wrapper) |
| `label` | `<label class="block text-sm font-medium text-gray-700 mb-1">` |
| `control` | Native `<input>`, `<select>`, `<textarea>` with utility classes |
| `hint` | `<p class="mt-1 text-sm text-gray-500">` |
| `error` | `<p class="mt-1 text-sm text-red-600" role="alert">` |

Error states toggle classes on the control (e.g., `border-red-500 focus:ring-red-500`) via the `onValidationChange` callback — same pattern as USWDS but with Tailwind utilities instead of BEM modifiers.

Radio and checkbox groups use the same wrapper-per-option pattern as USWDS but with Tailwind classes: `<div class="flex items-center gap-2"><input class="h-4 w-4 ..."><label class="text-sm ...">`.

### CSS loading strategy

Tailwind CSS is loaded via the theme's `stylesheets` array. Two supported approaches:

**Option A — Tailwind CDN (Play CDN).** For prototyping and demos:
```json
"stylesheets": ["https://cdn.tailwindcss.com"]
```
Zero build step. The Play CDN scans the DOM and generates styles on the fly. Not suitable for production but perfect for examples and getting-started flows.

**Option B — Prebuilt Tailwind CSS.** For production use, consumers run the Tailwind CLI against their content paths (which include the adapter's classes). The adapter documents which utility classes it uses so they can be included in the `content` configuration. This is standard Tailwind workflow — no adapter-specific build step required.

### Integration CSS

Minimal to none. Tailwind utilities don't set `max-width` on inputs, don't add `margin-top` to form groups, and don't conflict with formspec's grid/stack layout. The adapter may export a small integration CSS string for edge cases discovered during implementation, but the expectation is an empty or near-empty string.

This validates the ADR 0047 design: adapters that don't fight formspec layout need little to no integration CSS.

### Example theme

Create `examples/tailwind-demo/` with a definition and theme that uses the Tailwind adapter. The theme uses the CDN approach for zero-config demos:

```json
{
  "$formspecTheme": "1.0",
  "name": "tailwind-demo",
  "stylesheets": ["https://cdn.tailwindcss.com"],
  "tokens": {
    "color.primary": "#3b82f6",
    "color.error": "#ef4444",
    "color.success": "#22c55e",
    "typography.family": "'Inter', system-ui, sans-serif"
  }
}
```

### Adapter package export

The adapter package exports both adapters:

```typescript
// packages/formspec-adapters/src/index.ts
export { uswdsAdapter } from './uswds/index';
export { tailwindAdapter } from './tailwind/index';
```

### Scope

The Tailwind adapter implements the same 15 component types as USWDS:

| Category | Components |
|---|---|
| **Text inputs** | TextInput, NumberInput, MoneyInput |
| **Choice inputs** | RadioGroup, CheckboxGroup, Select |
| **Toggle inputs** | Checkbox, Toggle |
| **Specialized** | DatePicker, Slider, Rating, FileUpload, Signature |
| **Interactive** | Wizard, Tabs |

Layout components (Grid, Stack, Page, etc.) are not in scope — formspec's layout CSS handles them universally per ADR 0046.

## Consequences

### Positive

- **Validates adapter generality.** Proves the behavior/adapter split works for utility-first CSS, not just BEM design systems. If both USWDS (prescriptive, component-oriented) and Tailwind (flexible, utility-first) work cleanly, the architecture is sound.
- **Accessible reference implementation.** Most adapter authors are more likely to start from a Tailwind example than a USWDS one. The DOM patterns are simpler, the class strategy is transparent, and there's no design-system-specific knowledge required.
- **Near-zero integration CSS.** Demonstrates that the integration CSS mechanism (ADR 0047) scales down gracefully — adapters that don't conflict need no overrides.
- **Demo-ready out of the box.** The CDN loading strategy means anyone can drop in the Tailwind adapter and get a styled form with zero build configuration.

### Negative

- **Second adapter to maintain.** Every behavior contract change requires updates to both USWDS and Tailwind adapters. Mitigated by the adapters being structurally identical — changes are mechanical.
- **Tailwind CDN is not production-grade.** The Play CDN scans the DOM at runtime, is larger than a purged build, and Tailwind explicitly discourages it for production. The adapter must document this clearly and guide users toward the CLI build for production use.
- **Class string maintenance.** Tailwind utility strings are long (`"block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"`). Changes to the visual design require editing string literals across multiple files. This is inherent to Tailwind's approach and acceptable for a reference implementation.

## Alternatives Considered

### Bootstrap adapter instead of Tailwind

Bootstrap is component-oriented (like USWDS) with predefined DOM patterns (`form-group`, `form-control`, `form-check`). It would be a closer analog to USWDS and wouldn't test the utility-first axis of the adapter architecture. Tailwind provides more architectural signal.

### Tailwind + headless UI library (e.g., Headless UI, Radix)

Overkill for a reference implementation. Those libraries own behavior — which is exactly what formspec's behavior hooks already provide. Using both would create a confusing double-behavior layer. The adapter should demonstrate direct DOM creation, not delegation to another headless library.

### Ship as a separate package (`formspec-adapter-tailwind`)

Considered but rejected for now. Keeping both adapters in `formspec-adapters` simplifies cross-adapter testing, shares helpers (`el()`, `applyCascadeClasses()`), and reduces the number of packages to manage. If the adapter grows significantly or attracts external contributors, it can be extracted later.
