# ADR-0039: Seamless Page Management in Studio-Core

**Date:** 2026-03-14
**Status:** Proposed
**Branch:** `studiofixes`

## Context

Studio-core manages form page structure across three tiers (Definition presentation hints, Theme pages, Component Wizard) with different storage formats and override semantics. The current implementation exposes this tier complexity to the Studio UI — the Pages workspace becomes read-only when a Wizard component exists, tier conversion requires explicit commands, and switching between single/wizard/tabs modes is lossy (clearing pages on mode switch).

The user should never think about tiers. They think "pages."

## Design Principles

1. **`theme.pages` is the single source of truth** for page structure. All `pages.*` commands write there.
2. **Mode is just rendering style.** Single, wizard, and tabs are different renderings of the same page structure. Switching modes never destroys pages.
3. **Wizard auto-sync.** If a Wizard component exists in the component tree, it's automatically kept in sync with theme.pages via post-dispatch normalization.
4. **Resolution normalizes all tiers into one shape.** The UI gets the same output regardless of which tier contributes pages.

## Changes

### 1. Rewrite `resolvePageStructure` — Full Item-to-Page Mapping

**File:** `page-resolution.ts`

Rewrite from scratch. New return type:

```typescript
export interface ResolvedRegion {
  key: string;
  span: number;       // default 12
  start?: number;
  exists: boolean;     // key exists in definition items?
}

export interface ResolvedPage {
  id: string;
  title: string;
  description?: string;
  regions: ResolvedRegion[];
}

export interface ResolvedPageStructure {
  mode: 'single' | 'wizard' | 'tabs';
  pages: ResolvedPage[];
  controllingTier: 'component' | 'theme' | 'definition' | 'none';
  diagnostics: PageDiagnostic[];
  wizardConfig: { showProgress: boolean; allowSkip: boolean };
  wizardSynced: boolean;                // true when a Wizard exists and is auto-managed
  unassignedItems: string[];            // item keys not on any page
  itemPageMap: Record<string, string>;  // item key → page id
}
```

**Behavioral changes:**

- **Fix property path**: Read `item.presentation?.layout?.page` (not `item.layout?.page`). Both `page-resolution.ts` (line 71: `item.layout?.page`) and `handlers/pages.ts` (line 162: `(item as any).layout?.page`) have this same bug and both must be fixed.
- **Fix component name**: Filter Wizard children by `component === 'Page'` (not `'WizardPage'`). The component schema defines `Page` as the Wizard child component. The current code at `page-resolution.ts` line 46 incorrectly uses `'WizardPage'`.
- **Implement "attach to preceding page"**: Definition groups without a `page` hint join the last declared page (per spec: "Groups without a page attach to the preceding page").
- **Normalize Tier 3**: Walk `Wizard > Page > children`, extract `bind` values as regions. Component-tier pages produce the same `ResolvedPage` shape as theme-tier pages.
- **Compute mapping**: Diff resolved region keys against root-level definition item keys to produce `unassignedItems` and `itemPageMap`.
- **`controllingTier`**: Informational only. Tells the UI which tier is providing the page data. Does NOT affect editability — the Pages workspace is always editable. When a Wizard exists and is auto-synced from theme.pages, `controllingTier` reports `'theme'` (since theme.pages is canonical) and `wizardSynced: true` indicates the Wizard is being auto-managed.

**Tier cascade priority for resolution read path** (unchanged): Wizard component (Tier 3) → theme.pages (Tier 2) → definition groups with `presentation.layout.page` (Tier 1) → none. This determines what the _renderer_ sees; the Pages workspace always edits theme.pages.

### 2. Fix `pages.setMode` — Non-Destructive Mode Switching

**File:** `handlers/pages.ts`

Current behavior clears `theme.pages` when switching to `'single'`. New behavior:

```
pages.setMode({ mode: 'single' })  → sets formPresentation.pageMode = 'single'
                                    → theme.pages PRESERVED (dormant but intact)

pages.setMode({ mode: 'wizard' })  → sets formPresentation.pageMode = 'wizard'
                                    → ensures theme.pages array exists (empty if new)

pages.setMode({ mode: 'tabs' })    → sets formPresentation.pageMode = 'tabs'
                                    → ensures theme.pages array exists (empty if new)
```

Switching single → wizard → tabs → single → wizard preserves all pages throughout.

**`pages.deletePage` behavior**: When deleting the last page, `formPresentation.pageMode` is NOT reset to `'single'`. The mode is preserved. The user explicitly chose wizard/tabs mode; deleting all pages leaves them in that mode with an empty page list, ready to add new pages. To switch back to single, the user uses `pages.setMode('single')`.

### 3. Fix `pages.autoGenerate` — Correct Property Path

**File:** `handlers/pages.ts`

Change `(item as any).layout?.page` to `(item as any).presentation?.layout?.page` so auto-generation works on spec-conformant definition data. The same property path bug exists in `page-resolution.ts` and is fixed there too (Section 1).

### 4. Add Missing Convenience Commands

**File:** `handlers/pages.ts`

**`pages.reorderRegion`** — Move an item to a target position within a page's region list:
```typescript
payload: { pageId: string, key: string, targetIndex: number }
```
Moves the region to the specified index. Clamps to valid range.

**`pages.setRegionProperty`** — Change span or start on an existing region:
```typescript
payload: { pageId: string, key: string, property: 'span' | 'start', value: number | undefined }
```
Setting `value: undefined` removes the property (reverts to default span 12, natural flow).

### 5. Wizard Auto-Sync (Post-Dispatch Normalization)

**File:** `project.ts` (dispatch pipeline) or new `normalization/pages-wizard-sync.ts`

Page-Wizard sync runs as a direct state mutation during the existing post-dispatch normalization pass (alongside URL sync, breakpoint sync), NOT as a dispatched command. This avoids re-entrant dispatch loops. Because undo is snapshot-based (the entire state is cloned before each dispatch), both the theme.pages change and the Wizard sync are captured in a single atomic undo step.

After any `pages.*` command, if a Wizard component exists in `component.tree`:

1. **Match pages to Page children** by position (theme.pages order = Wizard `Page` child order).
2. **Add missing Pages**: If theme.pages has more entries than Wizard `Page` children, append new `Page` children with `title`/`description` from theme.pages.
3. **Remove extra Pages**: If Wizard has more `Page` children than theme.pages, remove trailing `Page` children. Orphaned component subtrees from removed Pages are moved into the last remaining `Page`'s children array.
4. **Sync metadata**: Update each `Page` child's `title` and `description` to match its corresponding theme page.

**Region-level sync is NOT performed.** Assigning/unassigning items through the Pages workspace modifies theme.pages regions only. The Wizard's Page children contain component nodes that are managed through the Component Tree workspace. Keeping these two concerns separate avoids the complexity of mapping between region keys and component node binds during sync. The Pages workspace controls information architecture (which items go where); the Component Tree workspace controls rendering (which widgets render those items).

**Does NOT sync:**
- Component nodes within Page children (managed by Component Tree)
- Widget types, styles, or props
- Component nodes that aren't bound to any item (layout elements, spacers)

**Reverse sync (Component Tree → theme.pages):** When `component.*` commands add or remove `Page` children from a Wizard, the post-dispatch normalization updates theme.pages to match — adding or removing theme page entries. This keeps both in sync regardless of which workspace the user edits from. Page title/description changes on `Page` components propagate to theme.pages; structural changes (adding/removing Pages) propagate as page add/delete.

### 6. Rewrite Tests

**Files:** `tests/page-resolution.test.ts`, `tests/pages-handlers.test.ts`

The existing tests use incorrect property paths (`layout: { page: '...' }` instead of `presentation: { layout: { page: '...' } }`) and the wrong component name (`WizardPage` instead of `Page`). These must be corrected alongside the implementation fixes.

Rewrite tests to cover:

- **Resolution**: All three tiers with correct property paths, unassigned items computation, itemPageMap, "attach to preceding page" rule, `wizardSynced` flag
- **Mode switching**: Non-destructive single ↔ wizard ↔ tabs round-trip, deletePage of last page preserves mode
- **Auto-generate**: Correct property path, fallback when no page hints
- **Convenience commands**: reorderRegion (targetIndex), setRegionProperty
- **Wizard sync**: Adding/removing pages syncs Wizard Page children, metadata propagation, reverse sync from Component Tree edits, orphan handling on Page removal

## Decisions

- **theme.pages is canonical.** The Wizard component is a derived rendering artifact, not a separate source of truth. This eliminates the need for explicit tier conversion commands (`generateWizard`, `fromWizard`).

- **Mode switching preserves pages.** The previous behavior of clearing pages on `setMode('single')` was lossy and forced users to recreate pages when switching back. Pages are dormant in single mode, not destroyed. Deleting the last page also does NOT reset mode.

- **controllingTier reports source, wizardSynced reports sync state.** When theme.pages is canonical and a Wizard is auto-managed, `controllingTier` is `'theme'` and `wizardSynced` is `true`. This avoids the contradiction of claiming the Wizard "controls" when it's actually derived. `controllingTier: 'component'` only appears when a user has an independently-authored Wizard that is NOT being synced from theme.pages (no theme.pages exist).

- **Wizard sync is page-level only.** The sync manages Page structure (add/remove/reorder Pages, sync titles) but does NOT move component nodes between Pages based on region assignments. This separation keeps Pages workspace and Component Tree workspace independent, each managing its own concern.

- **No Tabs component.** The component schema has no `Tabs` component. Tabs mode uses theme.pages with a different renderer layout, not a dedicated component. Wizard sync only applies when a Wizard component exists in the tree.

## Verification

```bash
# Studio-core tests
cd packages/formspec-studio-core && npx vitest run \
  tests/page-resolution.test.ts \
  tests/pages-handlers.test.ts

# Full suite (regression)
npx vitest run

# E2E (pages workspace)
cd packages/formspec-studio && npx playwright test tests/e2e/playwright/pages-workspace.spec.ts
```
