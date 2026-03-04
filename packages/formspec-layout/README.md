# formspec-layout

Pure layout planning utilities for Formspec. Transforms definition items and component document trees into renderer-agnostic `LayoutNode` trees — no DOM, no signals, no side effects.

## What it does

Given a Formspec definition and optional theme/component documents, this package produces a JSON-serializable tree of `LayoutNode` objects that any renderer (web component, React, PDF, SSR) can consume. The planner handles:

- **Theme cascade resolution** — 5-level merge (form hints → item hints → theme defaults → selectors → per-item overrides)
- **Token resolution** — `$token.space.lg` references resolved against component and theme token maps
- **Responsive breakpoint merging** — active breakpoint overrides shallow-merged onto component descriptors
- **Custom component expansion** — `{param}` interpolation in component document templates with recursion detection
- **Default widget mapping** — `dataType` → component type fallback when no theme/component doc is provided
- **Repeat group marking** — template nodes flagged for renderers to stamp per instance

## Install

```bash
npm install formspec-layout
```

## API

### `planComponentTree(tree, ctx, prefix?, customComponentStack?): LayoutNode`

Plans a component document tree node into a `LayoutNode` tree. Resolves responsive props, tokens, custom components, and theme presentation. Marks `when` conditions and repeat groups for the renderer.

### `planDefinitionFallback(items, ctx, prefix?): LayoutNode[]`

Fallback planner when no component document is provided. Walks definition items, runs the theme cascade, selects default widgets, and emits `LayoutNode` arrays.

### `resolvePresentation(theme, item, tier1?): PresentationBlock`

Resolves the effective presentation block for an item through the 5-level theme cascade.

### `resolveWidget(presentation, isAvailable): string | null`

Selects the best available widget from the presentation's preference + fallback chain.

### `resolveToken(val, componentTokens, themeTokens): any`

Resolves `$token.` references. Component tokens take precedence over theme tokens.

### `resolveResponsiveProps(comp, activeBreakpoint): any`

Merges responsive breakpoint overrides onto a component descriptor.

### `interpolateParams(node, params): void`

Replaces `{param}` placeholders in a component tree node (mutates in place).

### `getDefaultComponent(item): string`

Maps a definition item's `dataType` to a default component type string.

## LayoutNode output format

The planner emits a tree of `LayoutNode` objects. This is the contract renderers consume — every property is JSON-serializable plain data.

```ts
interface LayoutNode {
  // ── Identity ──
  id: string;                    // Stable ID for diffing/keying ("stack-1", "field-3")
  component: string;             // Resolved component type: "Stack", "TextInput", "Wizard", etc.
  category: 'layout' | 'field' | 'display' | 'interactive' | 'special';

  // ── Visual properties (all tokens resolved, responsive merged) ──
  props: Record<string, unknown>; // Component-specific props (gap, title, bind, columns, etc.)
  style?: Record<string, string | number>; // Inline styles, tokens resolved
  cssClasses: string[];          // Merged from theme cascade + component doc

  // ── Accessibility ──
  accessibility?: { role?: string; description?: string; liveRegion?: string };

  // ── Tree structure ──
  children: LayoutNode[];

  // ── Field binding (present on category='field' nodes) ──
  bindPath?: string;             // Full path, e.g. "applicantInfo.orgName"
  fieldItem?: {                  // Snapshot of the definition item
    key: string;
    label: string;
    hint?: string;
    dataType?: string;
  };
  presentation?: PresentationBlock; // Resolved theme cascade result
  labelPosition?: 'top' | 'start' | 'hidden';

  // ── Conditional rendering (renderer subscribes reactively) ──
  when?: string;                 // FEL expression string
  whenPrefix?: string;           // Path prefix for evaluating the expression
  fallback?: string;             // Content when when=false

  // ── Repeat groups (renderer stamps children per instance) ──
  repeatGroup?: string;          // Group name for repeat signals
  repeatPath?: string;           // Full path of the repeat group
  isRepeatTemplate?: boolean;    // If true, children are a template to stamp

  // ── Scope ──
  scopeChange?: boolean;         // This node's bindPath creates a new prefix for children
}
```

### Renderer responsibilities

The planner resolves everything it can statically. Three things are deferred to the renderer because they require runtime reactivity:

1. **Conditional visibility** — nodes with `when` need the renderer to subscribe to the FEL expression and show/hide the subtree.
2. **Repeat stamping** — nodes with `isRepeatTemplate` need the renderer to clone children for each repeat instance, substituting the `[0]` index placeholder.
3. **Field binding** — nodes with `bindPath` need the renderer to wire up engine signals for value, validation, required, readonly, and relevance.

### PlanContext input

```ts
interface PlanContext {
  items: any[];                                    // Definition items array
  formPresentation?: any;                          // Definition-level formPresentation block
  componentDocument?: any;                         // Component document (tree, components, tokens, breakpoints)
  theme?: any;                                     // Theme document
  activeBreakpoint?: string | null;                // Currently active breakpoint name
  findItem: (key: string) => any | null;           // Item lookup (supports dotted paths)
  isComponentAvailable?: (type: string) => boolean; // Component registry check
}
```

## Build

```bash
npm run build   # tsc
npm run test    # vitest
```
