# Layout Workspace Direct Manipulation Redesign

**Date:** 2026-04-02
**Status:** Approved
**Scope:** `packages/formspec-studio/src/workspaces/layout/`

## Summary

Rewrite the Layout workspace from a flat-list canvas with a sidebar property editor into a direct-manipulation authoring surface. Containers render with real CSS layout (Grid, Flexbox). Fields show proportional sizing. Users drag edges to resize column spans, row spans, panel widths, and grid column counts. Common properties surface as inline toolbars; rare ones as popovers. The right sidebar becomes a live `<formspec-render>` preview. The Preview tab stays unchanged.

## Design Decisions

- **Approach A (Full Canvas Rewrite)** chosen over progressive enhancement or split canvas. The existing layout components are thin (~50-175 lines each) and weren't designed for spatial rendering. A focused rebuild of 6-8 components is cleaner than fighting the existing abstractions.
- **Proportional grid canvas** — containers apply real CSS layout matching their component type. The canvas IS the layout.
- **All numeric spatial properties are drag-resizable** — column span, row span, grid column count, panel width.
- **Mixed inline editing strategy** — zero-click indicators, one-click toolbars, two-click popovers. Best tool for the job.
- **Right sidebar = live preview** — `<formspec-render>` webcomponent, not a property editor.
- **Preview tab unchanged** — the sidebar preview is a convenience; the tab is for deliberate testing with viewport/mode switching.

## Section 1: Canvas Architecture

Replace the current flat-list canvas with a structural canvas that mirrors real CSS layout.

The new `LayoutCanvas` renders the component tree using actual CSS Grid and Flexbox matching each container's semantics:

- **Grid** container: CSS `display: grid` with `grid-template-columns: repeat(N, 1fr)` where N is the node's `columns` prop.
- **Stack** container: CSS `display: flex` with `flex-direction` matching the node's `direction` prop, `flex-wrap` matching `wrap`.
- **Card**: A bordered card wrapper with its padding/elevation.
- **Panel**: Positioned sidebar with percentage width.
- **Collapsible/Accordion**: Collapsible section with open/closed state.

Field blocks inside a Grid render with `grid-column: span N` matching their `gridColumnSpan`, so a field spanning 2 of 3 columns visually occupies 2/3 width. Fields inside a Stack flow according to the stack's direction.

The canvas is no longer a flat `flex-col gap-1.5` list. Each `LayoutContainer` component applies the real CSS layout its component type dictates. The canvas IS the layout.

The existing `render-tree.tsx` recursive renderer stays as the pattern but gets rewritten — each container type gets its own CSS treatment rather than the current uniform dashed-border box.

## Section 2: Direct Manipulation — Resize Handles

Every numeric spatial property gets a drag handle.

Resize interactions use pointer events (no library needed):

- **Grid column span**: Drag the right edge of a field/container block. Snap points at each column boundary. Visual guides show the grid columns as the user drags. A field in a 3-column grid can drag from span-1 to span-2 to span-3.
- **Grid row span**: Drag the bottom edge. Same snap behavior.
- **Grid columns count**: Drag the right edge of a Grid container itself to add/remove columns (or a dedicated handle in the container header). Snaps to integers 1-12.
- **Panel width**: Drag the Panel's edge. Shows percentage as a tooltip while dragging.
- **Stack gap**: Drag the space between items in a Stack to adjust gap visually. (Stretch goal — gap is less intuitive to drag.)

### Implementation

A shared `useResizeHandle` hook that takes `{ axis, min, max, snap, onResize }`. The hook attaches `pointerdown/pointermove/pointerup` handlers, calculates delta, applies snapping, and calls back with the new value. Each block type wires it up with its specific constraints.

### Visual Feedback During Drag

- Ghost overlay showing the target size.
- Column guides (light dashed lines) appear on the parent Grid during column-span drags.
- Numeric tooltip near the cursor showing the current value.

### Disambiguation with Drag Reorder

Resize handles live on the edges (right edge, bottom edge). Drag-to-reorder initiates from the body interior. The existing `PointerActivationConstraints.Distance({ value: 5 })` prevents accidental drags. Resize handles use their own pointer event listeners (not dnd-kit) so there's no conflict — they're separate DOM elements that stop propagation.

## Section 3: Inline Editing — Toolbar & Popover Strategy

Properties surface based on frequency of use and interaction cost. Three tiers:

### Tier 1 — Always Visible (zero clicks)

When a container or field is selected, its most-used properties show directly on the element:

- **Grid**: column count badge, gap indicator
- **Stack**: direction arrow icon, wrap icon
- **Card**: elevation indicator
- **Field block**: column span badge, widget type label
- **All containers**: a small component-type label (already exists)

These are read-only indicators — they tell you the current state at a glance.

### Tier 2 — Inline Toolbar (one click to select, then immediate access)

Selecting a container reveals a compact toolbar row at the top of the container (inside the border, replacing the current bare label badge):

- **Grid**: columns stepper (+/-), gap dropdown, padding dropdown
- **Stack**: direction toggle (row/column), wrap toggle, gap dropdown, align dropdown
- **Card**: elevation dropdown, padding dropdown
- **Panel**: position dropdown (left/right/float), width input
- **Collapsible/Accordion**: title inline text input, default-open toggle
- **Field block**: widget type dropdown (if multiple compatible), column span stepper
- **All**: a "..." overflow button for Tier 3

The toolbar uses icon buttons and compact dropdowns — similar in density to a rich text editor toolbar. One row, no scrolling.

### Tier 3 — Popover (two clicks: select + "...")

The overflow button opens a floating popover anchored to the element containing:

- Visual Condition (FEL expression `when`)
- Accessibility (ARIA label, role)
- Appearance (theme cascade, style overrides)
- Actions (Unwrap, Remove from Tree)

This is essentially the current `ComponentProperties` content, but as a popover instead of a sidebar panel. Dismisses on click-away or Escape.

## Section 4: Right Sidebar — Live Preview

Replace `ComponentProperties` in the right sidebar with a live `<formspec-render>` preview.

The Shell already has the right sidebar wired up for the Layout tab (Shell.tsx lines 489-524). Swap the content:

- **Old**: `<ComponentProperties />` — a property editor
- **New**: `<LayoutPreviewPanel />` — wraps `FormspecPreviewHost` with minimal chrome

The preview panel:

- Mounts `<formspec-render>` using the same `FormspecPreviewHost` pattern from the Preview tab.
- No viewport switcher, no mode switcher — just the rendered form at the sidebar's width.
- Updates reactively as the user edits (debounced 300ms, same as the existing preview).
- A small label at the top: "Live Preview" with a subtle border-bottom.

**Selection sync** (future enhancement, not in v1): clicking a field in the preview could highlight it in the canvas. For now, they're independent.

**Compact/tablet layout**: On small screens, the preview hides (same as how the editor hides FormHealthPanel on compact). The compact properties modal for the Layout tab gets removed since properties are now inline.

## Section 5: DnD Changes

Existing dnd-kit infrastructure stays, with two adjustments.

### Reorder Becomes Spatial

Currently reorder is linear (up/down). With real CSS layout, dropping a field in a Grid should place it at the grid cell nearest the drop point, not just "above" or "below." The `handleTreeReorder` function gets a richer target: instead of just `direction: 'up' | 'down'`, it receives `{ targetContainer, insertIndex }` computed from the drop position relative to the container's grid/flex layout.

### Drop-Into-Container

Dragging a field onto a container (not next to a sibling inside it) should place it as the last child of that container. The existing `useDroppable` on `LayoutContainer` already has this wiring — it just needs the handler to call `project.moveToContainer(sourceRef, targetContainerId)` or equivalent.

### Tray-to-Canvas

Stays unchanged — drag an unassigned item from the tray onto the canvas to bind it.

## Section 6: Component Inventory

### Rewritten (new implementations replacing old)

| File | Reason |
|------|--------|
| `LayoutCanvas.tsx` | New top-level canvas with structural CSS layout rendering |
| `FieldBlock.tsx` | Proportional sizing, resize handles, inline toolbar, Tier 1 indicators |
| `LayoutContainer.tsx` | Per-container-type CSS layout (Grid/Stack/Card/Panel/Collapsible/Accordion), inline toolbar, overflow popover |
| `render-tree.tsx` | Recursive renderer passes layout context (parent container type, grid columns) to children |
| `LayoutDndProvider.tsx` | Spatial reorder logic, drop-into-container |

### Kept As-Is

| File | Reason |
|------|--------|
| `LayoutPageSection.tsx` | Page sections are structural wrappers |
| `LayoutStepNav.tsx` | Page navigation |
| `LayoutContextMenu.tsx` | Right-click menu |
| `ModeSelector.tsx` | Flow mode selector |
| `UnassignedTray.tsx` | Tray stays |
| `DisplayBlock.tsx` | Updated: adds resize handles for span, but retains current structure and selection behavior |
| `useLayoutPageStructure.ts` | Unchanged |

### New Components

| File | Purpose |
|------|---------|
| `LayoutPreviewPanel.tsx` | Right sidebar live preview wrapper |
| `useResizeHandle.ts` | Shared hook for drag-to-resize with snapping |
| `InlineToolbar.tsx` | Compact property toolbar rendered inside containers/fields |
| `PropertyPopover.tsx` | Overflow popover for Tier 3 properties (absorbs current `properties/` content) |

### Deleted

| File | Absorbed By |
|------|-------------|
| `properties/ComponentProperties.tsx` | Inline toolbar + popover |
| `properties/ContainerSection.tsx` | `InlineToolbar` per-container-type rendering |
| `properties/LayoutSection.tsx` | Resize handles + field toolbar |
| `properties/WidgetSection.tsx` | Field toolbar dropdown |
| `properties/AppearanceSection.tsx` | `PropertyPopover` |

### Shell.tsx Changes

- Swap `<ComponentProperties />` for `<LayoutPreviewPanel />` in the Layout tab's right sidebar slot.
- Remove the compact properties modal for the Layout tab.

## Section 7: Testing Strategy

### Unit Tests

- `useResizeHandle` — snap math, min/max clamping, axis constraint.
- Inline toolbar rendering per container type — correct controls surface for Grid vs Stack vs Card etc.
- Popover content — Tier 3 properties render and commit correctly.

### Integration Tests (Vitest + jsdom)

- Canvas renders Grid containers with actual CSS grid and correct `grid-template-columns`.
- Canvas renders Stack containers with correct flex-direction.
- Field blocks inside a Grid get `grid-column: span N` matching their gridColumnSpan.
- Selection of a container shows the inline toolbar with the right controls for that type.
- Overflow button opens popover with Tier 3 properties.
- Property changes via toolbar/popover propagate to the project state.

### E2E Tests (Playwright)

- Drag-resize a field's right edge in a Grid, verify column span updates.
- Drag-resize a Grid container to change column count.
- Drag-reorder a field within a Grid (spatial placement).
- Drag a tray item into a specific container.
- Change container direction via toolbar, verify canvas re-lays out.
- Verify right sidebar shows live preview and updates when layout changes.
- Existing layout E2E tests updated to work with new component structure.

### What We Don't Test

- Exact pixel positions of resize snapping (fragile, renderer-dependent).
- Preview rendering fidelity (that's the webcomponent's responsibility).
