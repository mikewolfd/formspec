# Layout Workspace Direct Manipulation Redesign

**Date:** 2026-04-02
**Status:** Approved
**Scope:** `packages/formspec-studio/src/workspaces/layout/`

## Summary

Rewrite the Layout workspace from a flat-list canvas with a sidebar property editor into a direct-manipulation authoring surface with two modes. **Layout mode**: Containers render with real CSS layout (Grid, Flexbox). Fields show proportional sizing. Users drag edges to resize column spans, row spans, panel widths, and grid column counts. Common properties surface as inline toolbars; rare ones as popovers. The right sidebar becomes a live `<formspec-render>` preview. **Theme mode**: The live preview takes over the full main area. Form-wide theme settings (tokens, rules, breakpoints) live in the Blueprint sidebar. Clicking a field in the preview opens a popover for per-item theme overrides. The standalone Theme tab is eliminated. The Preview tab stays unchanged.

## Design Decisions

- **Approach A (Full Canvas Rewrite)** chosen over progressive enhancement or split canvas. The existing layout components are thin (~50-175 lines each) and weren't designed for spatial rendering. A focused rebuild of 6-8 components is cleaner than fighting the existing abstractions.
- **Proportional grid canvas** — containers apply real CSS layout matching their component type. The canvas IS the layout.
- **All numeric spatial properties are drag-resizable** — column span, row span, grid column count, panel width.
- **Mixed inline editing strategy** — zero-click indicators, one-click toolbars, two-click popovers. Best tool for the job.
- **Right sidebar = live preview** — `<formspec-render>` webcomponent, not a property editor.
- **Preview tab unchanged** — the sidebar preview is a convenience; the tab is for deliberate testing with viewport/mode switching.
- **Theme mode merges into layout workspace** — two-mode toggle (Layout/Theme). Theme mode shows full-width live preview with popover per-item overrides. Form-wide settings in sidebar. Eliminates standalone Theme tab.
- **Per-item theme overrides via popover** — clicking a field in the theme preview opens a floating panel with cascade provenance and override controls. No right sidebar in Theme mode.

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
| `LayoutPreviewPanel.tsx` | Right sidebar live preview wrapper (Layout mode) and full-width preview (Theme mode) |
| `useResizeHandle.ts` | Shared hook for drag-to-resize with snapping |
| `InlineToolbar.tsx` | Compact property toolbar rendered inside containers/fields |
| `PropertyPopover.tsx` | Overflow popover for Tier 3 layout properties (absorbs current `properties/` content) |
| `ThemeOverridePopover.tsx` | Per-item theme cascade popover shown when clicking a field in Theme mode preview |
| `LayoutThemeToggle.tsx` | Mode toggle between Layout and Theme modes |

### Deleted

| File | Absorbed By |
|------|-------------|
| `properties/ComponentProperties.tsx` | Inline toolbar + popover |
| `properties/ContainerSection.tsx` | `InlineToolbar` per-container-type rendering |
| `properties/LayoutSection.tsx` | Resize handles + field toolbar |
| `properties/WidgetSection.tsx` | Field toolbar dropdown |
| `properties/AppearanceSection.tsx` | `ThemeOverridePopover` (Theme mode) + `PropertyPopover` (Layout mode Tier 3) |

### Relocated (not rewritten)

These components stay in `workspaces/theme/` (no file move needed) but get registered in `SIDEBAR_COMPONENTS` and rendered in the Blueprint sidebar when the Layout workspace is in Theme mode. `ThemeTab.tsx` is the only file deleted from that directory.

| File | Sidebar Section Name |
|------|---------------------|
| `ColorPalette.tsx` | "Colors" |
| `TypographySpacing.tsx` | "Typography" |
| `DefaultFieldStyle.tsx` | "Field Defaults" |
| `FieldTypeRules.tsx` | "Field Rules" |
| `ScreenSizes.tsx` | "Breakpoints" |
| `AllTokens.tsx` | "All Tokens" |

### Deleted (Theme tab)

| File | Reason |
|------|--------|
| `workspaces/theme/ThemeTab.tsx` | Eliminated — functionality absorbed into Layout workspace Theme mode |

### Shell.tsx Changes

- Swap `<ComponentProperties />` for `<LayoutPreviewPanel />` in the Layout tab's right sidebar slot (Layout mode only).
- Hide right sidebar in Theme mode.
- Remove the compact properties modal for the Layout tab.
- Remove `Theme` from the `WORKSPACES` map and Header tab bar.
- Update `BLUEPRINT_SECTIONS_BY_TAB` for Layout to include theme sidebar sections when in Theme mode.

## Section 8: Theme Mode — Visual Styling Workspace

The layout workspace gets a mode toggle (like the editor's Build/Manage/Screener). Two modes:

- **Layout mode** (Sections 1-7): Direct manipulation canvas with structural editing, resize handles, inline toolbars, live preview in the right sidebar.
- **Theme mode**: The live `<formspec-render>` preview takes over the full main area. No structural blocks, no resize handles — just the rendered form. You edit how it looks, not how it's structured.

### Main Area — Full-Width Live Preview

The `<formspec-render>` webcomponent renders in the main canvas area at full width. This is the same preview the right sidebar shows in Layout mode, but now it's the primary surface. Updates reactively as you change tokens, rules, or per-item overrides.

### Form-Wide Settings — Blueprint Sidebar

The Blueprint sidebar already switches content per tab via `BLUEPRINT_SECTIONS_BY_TAB`. In Theme mode, the sidebar shows the form-wide theme editors:

- Color Palette (token editors with color pickers)
- Typography & Spacing (token inputs)
- Default Field Style (label position, default widget, CSS class)
- Field Type Rules (selector rule list with match/apply)
- Screen Sizes (breakpoint editor)
- All Tokens (full token reference)

These are the existing components from `workspaces/theme/` — they move into sidebar sections rather than being a standalone workspace tab. No rewrite needed, just re-parenting.

### Per-Item Theme Overrides — Popover on Preview

Clicking a field in the live preview opens a floating popover anchored to that field showing:

- Theme cascade provenance (where each property value comes from: Default, Selector Rule, or Item Override)
- Override controls for label position, compact mode, help text position, error display, input size, floating label
- Style overrides (add custom CSS properties)
- Clear Override button

This is the current `AppearanceSection` content, rendered as a popover. Dismisses on click-away or Escape.

**Implementation note**: The `<formspec-render>` webcomponent needs to emit click events with the field key so the studio can identify which item was clicked. If this isn't wired yet, we add a click handler that walks up the DOM from the click target looking for `data-bind` or `data-key` attributes that the webcomponent renderer sets on field wrappers.

### Right Sidebar in Theme Mode

Hidden. No right sidebar in Theme mode — the preview IS the main area and per-item editing is via popover. The sidebar collapse button stays available but defaults to collapsed.

### Mode Toggle

Add a new toggle similar to `BuildManageToggle` in the editor workspace. Two modes:

- **Layout** — structural editing (default)
- **Theme** — visual styling

This toggle sits in the sticky header area of the layout workspace, next to the existing toolbar buttons.

### Theme Tab Elimination

The standalone `ThemeTab.tsx` and its entry in the `WORKSPACES` map in `Shell.tsx` get removed. The Header tab bar drops from Editor/Layout/Theme/Mapping/Preview to Editor/Layout/Mapping/Preview. All theme functionality lives in the Layout workspace's Theme mode.

`BLUEPRINT_SECTIONS_BY_TAB` for Layout gets updated to include the theme sidebar sections when in Theme mode.

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
- Toggle to Theme mode, verify full-width preview renders.
- Click a field in Theme mode preview, verify override popover appears with cascade info.
- Change a color token in the sidebar, verify the preview updates.
- Add a selector rule, verify it applies to matching fields in the preview.
- Existing layout E2E tests updated to work with new component structure.
- Verify Theme tab is no longer in the header tab bar.

### What We Don't Test

- Exact pixel positions of resize snapping (fragile, renderer-dependent).
- Preview rendering fidelity (that's the webcomponent's responsibility).
