# Pages Tab Redesign

**Date:** 2026-03-17
**Status:** Draft
**Branch:** studiofixes

## Problem

The Pages tab exposes implementation details (theme tiers, regions as raw keys, diagnostic codes, "Generate from Groups") that violate the studio's principle of being data-agnostic and behavior-driven. Additionally, `resolvePageStructure` returns empty pages because the project seeds a definition without theme pages, creating a visible inconsistency with the sidebar which reads definition groups directly.

Page management is scattered across three surfaces (Pages tab, sidebar "WIZARD PAGES", Theme tab's `PageDefinitions.tsx`) with no clear ownership.

## Design Principles

1. **Behavior-driven**: Show users what they need to know (page order, titles, layout), hide how it works (theme tiers, region keys, diagnostic codes).
2. **Mode is a rendering toggle**: Switching between single/wizard/tabs never creates or destroys page data. Pages persist as dormant structural data regardless of mode.
3. **Single source of truth**: The Pages tab is THE surface for page management. The sidebar is navigation only. The Theme tab does not manage pages.
4. **No leaking internals**: No page IDs as display text, no "Generate from Groups", no tier status banners, no `d.code` error codes.

## Validated Against

- **Spec**: `formPresentation.pageMode` is advisory, MUST NOT affect data semantics. Pages (theme tier) and pageMode (definition tier) are independent. No spec language couples mode to page lifecycle.
- **Schema**: `theme.schema.json` has no `if/then` or `dependencies` tying `pages` to `pageMode`. A theme with `pageMode: "single"` and a non-empty `pages` array is valid.
- **Implementation**: `pages.setMode` handler already preserves pages on mode switch. Comment in handler: "Pages are preserved in single mode (dormant, not destroyed)."

## Design

### Sticky Header

Mode selector only (Single / Wizard / Tabs pill toggle). No "PAGES" heading — the tab label in the top nav already communicates location. Removes the redundant `<h2>` and saves vertical space.

Minor cleanup on ModeSelector: remove redundant `role="button"` and `aria-label` on native `<button>` elements.

### Single Mode States

**No pages exist**: Empty state below mode selector. Calm message: "Switch to Wizard or Tabs to organize your form into pages." No page list rendered.

**Pages exist (user switched back from wizard)**: Show pages in a dimmed/readonly state. Info bar: "Pages are preserved but not active in single mode." Users need to see their pages still exist — hiding them causes panic ("did my pages get deleted?"). Dimming communicates dormancy without jargon.

### Page List (Wizard/Tabs Mode)

Ordered cards. One card expanded at a time (accordion). Expanding a card auto-collapses the previous.

**Collapsed card**:
- Number badge (1, 2, 3...) for ordinal context
- Title — inline-editable. Hover reveals a pencil icon; clicking it enters edit mode (input field, commit on blur/Enter, cancel on Escape). Double-click on title text also enters edit mode as a power-user shortcut.
- Item count badge — "5 items" (muted). Shows "Empty" (muted, italic) when count is 0.
- 12-column region grid preview — 16px tall, readable labels. Visual-only in collapsed state.
- Chevron for expand/collapse

**Expanded card**:
- Description (read-only, shown if present)
- 12-column region grid — 32px tall, readable labels. Regions with `exists: false` (broken key reference) shown with amber border/warning indicator.
- Region list below the grid:
  - Each region shows: resolved item label (from definition, not raw key), span control (number input 1-12)
  - Add / remove / reorder region controls
- Footer: Reorder Up/Down buttons + Delete page button

**Bottom action**: "+ Add Page" button. Calls `project.addPage('New Page')` (not empty string).

### Accessibility

- Expand/collapse triggers are `<button>` elements with `aria-expanded`
- Reorder up/down buttons for keyboard-accessible page reordering
- Region span inputs are labeled number inputs

### Data Flow

**`buildLabelMap`** — new utility function to write:
```ts
function buildLabelMap(items: ItemNode[]): Map<string, string>
```
Walks the definition item tree recursively. Maps each item's `key` to its `label` (falling back to `key` if no label). Returns a flat `Map<string, string>`. This replaces `flattenItemKeys` — the key list for `resolvePageStructure` is derived via `Array.from(labelMap.keys())`.

**Component state**:
```
PagesTab
  state = useProjectState()
  definition = state.definition
  labelMap = useMemo(buildLabelMap(definition.items), [definition.items])
  allItemKeys = useMemo(Array.from(labelMap.keys()), [labelMap])
  structure = usePageStructure(allItemKeys)  ← reads theme.pages via resolvePageStructure
  expandedPageId: string | null             ← lifted state for accordion behavior

  → PageCard(page, labelMap, isExpanded, onToggle, callbacks)
      region.key → labelMap.get(region.key) ?? region.key   ← display label
      region.exists → amber warning indicator when false (both collapsed and expanded)
```

`PageCard` receives `isExpanded: boolean` and `onToggle: () => void` as props — it does not manage its own expand state. `PagesTab` holds `expandedPageId` and passes the derived boolean. This enables accordion behavior (one card open at a time).

Collapsed grid preview: broken regions (`exists: false`) show with amber fill instead of the normal accent fill, consistent with expanded treatment.

Title editing commits via `project.updatePage(page.id, { title: draft })` — this updates `page.title`, not page ID. Separate from `renamePage` which changes the ID.

Region editing uses existing studio-core helpers: `addRegion`, `updateRegion`, `deleteRegion`, `reorderRegion`, `setRegionKey`.

`DiagnosticsPanel` is removed entirely. The `PAGEMODE_MISMATCH` diagnostic (pages exist but mode is single) is represented by the single-mode info bar "Pages are preserved but not active in single mode" — not by a diagnostic code display.

### usePageStructure Fix

Fix `useMemo` dependency: change `[state, allItemKeys]` to `[state.theme, state.definition, allItemKeys]` to avoid recomputation on unrelated state changes (mapping, component tree edits).

### Sidebar Changes

In `StructureTree.tsx`:
- Rename "WIZARD PAGES" → "PAGES"
- Keep: navigate (click to select page), add (+ button)
- The sidebar continues to read from `definition.items` filtered by `type === 'group'` — this is correct for now since `addPage` creates a paired group+page and the bootstrap sync ensures alignment at project creation. The sidebar section remains empty in single mode (the `isPaged` guard stays); dormant page visibility is the Pages tab's responsibility, not the sidebar's. Full reconciliation to read from `theme.pages` is deferred to Fast-Follow 8.

### Bootstrap Fix

In `createStudioProject()` in `StudioApp.tsx`, after calling `createProject`:
```
if theme.pages is empty AND definition has groups → call autoGeneratePages()
```

One-time sync at project creation. Never re-triggered. `autoGeneratePages()` is destructive (`pages.length = 0`) so it must only run when pages are genuinely empty.

`autoGeneratePages()` auto-promotes `pageMode` from `single` to `wizard` when pages are created (this is existing behavior in the `pages.autoGenerate` handler). This is correct — the example definition has groups with page hints, and the bootstrap should produce a ready-to-use wizard form. No separate `setFlow` call needed.

### Cleanup

- Delete orphaned `PageDefinitions.tsx` from `workspaces/theme/` (already not imported by `ThemeTab.tsx`)
- Delete `flattenItemKeys` from `usePageStructure.ts` — replaced by `buildLabelMap` which serves both purposes (label resolution and key list via `Array.from(labelMap.keys())`)
- Remove `hasWizardComponent` branching and associated `TierStatusBanner` jargon

## Files Changed

| File | Action |
|---|---|
| `packages/formspec-studio/src/workspaces/pages/PagesTab.tsx` | Rewrite from scratch |
| `packages/formspec-studio/src/workspaces/pages/usePageStructure.ts` | Fix useMemo deps, add itemLabelMap |
| `packages/formspec-studio/src/components/blueprint/StructureTree.tsx` | Rename "WIZARD PAGES" → "PAGES" |
| `packages/formspec-studio/src/studio-app/StudioApp.tsx` | Add bootstrap auto-sync |
| `packages/formspec-studio/src/workspaces/theme/PageDefinitions.tsx` | Delete |
| `packages/formspec-studio/tests/e2e/playwright/pages-workspace.spec.ts` | Update: replace `tier-status-banner` and `PAGEMODE_MISMATCH` tests with new info-bar and dormant-pages assertions |
| `packages/formspec-studio/tests/workspaces/pages/pages-tab.test.tsx` | Update: replace `tier-status-banner` wizard-component test with new behavior |

## Fast-Follows

Work deferred from this pass to keep scope focused. Each is a standalone follow-up.

### 1. Drag-to-Reorder Pages
Add `DragHandle` (grip dots, hover-visible) to collapsed page cards. Use existing `@dnd-kit/react` infrastructure from the editor canvas. Button reorder stays as the accessibility fallback.

### 2. Unassigned Items Section
Show items not assigned to any page in a persistent section below the page list. `resolvePageStructure` already computes `unassignedItems`. Critical for the "split 12 fields across 3 pages" workflow — users need to see what's orphaned.

### 3. Interactive Grid Bar
Graduate the 32px expanded grid bar from visual-only to interactive. Click a segment to select it; inline controls appear (span adjustment, remove). Collapses the grid preview and region list into a single spatial metaphor.

### 4. Drag Items onto Pages
Drag items from the sidebar (or unassigned section) onto page cards to assign them. Extends the drag-to-reorder infrastructure.

### 5. Page Description Editing
Add an inline-editable description field in the expanded card. Currently read-only.

### 6. Region `start` Property
Expose the `start` column (1-12) property for explicit grid positioning. Schema supports it, no UI exists anywhere yet.

### 7. Region Responsive Overrides
Expose breakpoint-keyed `responsive` overrides on regions (span/start/hidden per breakpoint). Schema supports it, no handler exists yet — needs handler work in `formspec-core` first.

### 8. Sidebar Source Reconciliation
The sidebar currently derives pages from `definition.items.filter(type === 'group')` while the Pages tab reads `theme.pages`. After the bootstrap sync these agree for the initial load, but they can drift if a user adds a plain group that isn't a page. Reconcile the sidebar to read from `theme.pages` as the canonical source.

### 9. Fix setRegionKey Position Bug
`setRegionKey` dispatches `unassignItem` + `assignItem`, which removes and re-appends the region at the end of the array instead of preserving its position. Pre-existing bug in `project.ts` lines 2201-2213.

### 10. Sidebar ↔ Pages Tab Sync
Clicking a page in the sidebar should highlight the corresponding card in the Pages tab. Expanding a card should select that page in the sidebar. Both should use the same `useActivePage` context.
