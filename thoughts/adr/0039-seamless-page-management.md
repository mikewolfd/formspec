# ADR-0039: Seamless Page Management in Studio-Core

**Date:** 2026-03-14
**Status:** Proposed
**Branch:** `studiofixes`

## Context

### The Problem

Studio-core manages form structure across three Formspec tiers — Definition (Tier 1: what data to collect), Theme (Tier 2: where to lay it out), and Component (Tier 3: how to render it). Each tier is an independent JSON document with its own schema, and higher tiers override lower ones. Pages are expressed differently in each:

- **Definition**: Groups declare `presentation.layout.page` hints (bottom-up: items say which page they belong to)
- **Theme**: `pages[]` array with `regions[]` referencing item keys on a 12-column grid (top-down: pages say which items they contain)
- **Component**: `Wizard > Page > children` with bound widget nodes (top-down: pages contain components)

The current implementation leaks this three-tier complexity to the user. The Pages workspace becomes read-only when a Wizard component exists. Switching between single/wizard/tabs modes destroys pages. Property path bugs mean definition-tier page hints never resolve on spec-conformant data. The resolution function returns page metadata but not the item-to-page mapping the UI actually needs.

### How We Got Here

We explored several architectures before arriving at the current design:

**Attempt 1 — Bidirectional sync.** `theme.pages` as "single source of truth" with reverse sync from Component Tree edits back to theme.pages. A red-team review revealed this creates a distributed consistency problem between structurally incompatible data models (theme regions vs. component tree nodes). Every system that has tried bidirectional sync between different schemas has regretted it (Angular 1.x two-way binding → one-way in Angular 2+, Backbone model-view binding → Redux unidirectional store).

**Attempt 2 — One-way generative propagation with forking.** theme.pages generates a Wizard downstream. If the user hand-edits the component tree, it "forks" — auto-generation stops. A red-team review identified that the fork boundary is fuzzy (what counts as a manual edit?), post-fork divergence creates a confusing state where the Pages workspace shows pages that don't render, and the recovery path (regenerate) destroys customization work.

**Attempt 3 — The eureka.** Studio is a generative authoring tool for non-technical users. They don't edit documents — they edit the *form*. The three JSON documents are output artifacts, not input surfaces. Studio-core is the sole writer. This eliminates the entire sync/fork problem: there's nothing to sync because one system manages all three documents coherently. There's nothing to fork because users never directly touch documents.

## Design Principles

1. **The user edits the form, not documents.** Studio exposes operations like "add a page," "assign this field to page 2," "switch to tabs mode." Studio-core translates these into writes across whichever documents need updating. The user never thinks about which JSON file is being modified.

2. **Documents are output artifacts.** Definition, Theme, and Component documents are produced by Studio and exported as a bundle. They conform to their respective schemas and can be consumed by any Formspec processor. But within Studio, they are internal state — not user-facing surfaces.

3. **Studio-core is the sole writer.** Every mutation goes through the dispatch pipeline. Because there is only one writer, all three documents are always consistent. No sync logic is needed — just rebuild the downstream artifacts after each operation.

4. **Mode is rendering style, not structure.** Single, wizard, and tabs are different renderings of the same page structure. Switching modes never destroys pages.

5. **One-way data flow.** Information flows Definition → Theme → Component. Higher tiers read from lower tiers during generation. Edits at any tier never propagate back up. The dispatch pipeline may update multiple documents in a single operation, but the user's intent flows through `pages.*` commands, not document-level edits.

## Changes

### 1. Rewrite `resolvePageStructure` — Full Item-to-Page Mapping

**File:** `page-resolution.ts`

Rewrite from scratch. The current implementation has three bugs (wrong property path, wrong component name, missing "attach to preceding" rule) and returns page metadata without the item-to-page mapping the UI needs.

New return type:

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

export interface PageDiagnostic {
  code: 'UNKNOWN_REGION_KEY' | 'PAGEMODE_MISMATCH';
  severity: 'warning' | 'error';
  message: string;
}

export interface ResolvedPageStructure {
  mode: 'single' | 'wizard' | 'tabs';
  pages: ResolvedPage[];
  diagnostics: PageDiagnostic[];
  wizardConfig: { showProgress: boolean; allowSkip: boolean };
  unassignedItems: string[];            // item keys not on any page
  itemPageMap: Record<string, string>;  // item key → page id
}
```

**What changed from the old type:**

- **Removed `controllingTier`** — Studio is the sole writer; there is no tier conflict to report. The resolution function reads from the internal state that Studio-core manages holistically.
- **Removed `wizardSynced`** — No sync/fork concept. Studio always keeps documents consistent.
- **Removed `SHADOWED_THEME_PAGES` diagnostic** — Theme pages and the Wizard component are never in conflict because Studio manages both.
- **Added `unassignedItems`** — Item keys not referenced by any page region. Lets the UI show "unassigned items" for drag-and-drop.
- **Added `itemPageMap`** — Flat lookup from item key to page id. Lets the UI highlight which page an item belongs to.
- **`regions` is non-optional** with `exists` flag — Tells the UI whether a region key actually exists in the definition (vs. stale reference after an item rename/delete).

**Bug fixes:**

- **Property path**: Read `item.presentation?.layout?.page` (not `item.layout?.page`). Both `page-resolution.ts` line 71 and `handlers/pages.ts` line 162 have this bug.
- **Component name**: Filter Wizard children by `component === 'Page'` (not `'WizardPage'`). The component schema (`schemas/component.schema.json`) defines `Page` as the Wizard child. Current code at `page-resolution.ts` line 46 uses the wrong name.
- **Attach to preceding page**: Definition groups without a `presentation.layout.page` hint join the last declared page (per core spec: "Groups without a page attach to the preceding page"). Currently these groups are silently dropped.

**Resolution reads from internal state.** Since Studio manages all documents, the resolution function reads `theme.pages` (the canonical page structure Studio maintains). It does NOT implement a tier cascade — there is no independent Wizard or definition hints to cascade from, because Studio keeps everything derived from the same source.

### 2. Fix `pages.setMode` — Non-Destructive Mode Switching

**File:** `handlers/pages.ts`

Current behavior clears `theme.pages` when switching to `'single'`. This is destructive — switching wizard → single → wizard loses all pages.

New behavior: mode switching ONLY changes `formPresentation.pageMode`. Pages are always preserved.

```
pages.setMode({ mode: 'single' })  → pageMode = 'single', pages preserved (dormant)
pages.setMode({ mode: 'wizard' })  → pageMode = 'wizard', ensures pages array exists
pages.setMode({ mode: 'tabs' })    → pageMode = 'tabs', ensures pages array exists
```

**`pages.deletePage`**: Deleting the last page does NOT reset mode. The user explicitly chose wizard/tabs; an empty page list means "ready to add pages," not "switch to single." Use `pages.setMode('single')` to go back.

### 3. Fix `pages.autoGenerate` — Correct Property Path

**File:** `handlers/pages.ts`

Change `(item as any).layout?.page` to `(item as any).presentation?.layout?.page`. Same bug as in `page-resolution.ts` — both read the wrong schema path.

### 4. Add Missing Convenience Commands

**File:** `handlers/pages.ts`

**`pages.reorderRegion`** — Move an item to a target position within a page:
```typescript
payload: { pageId: string, key: string, targetIndex: number }
```

**`pages.setRegionProperty`** — Change span or start on an existing region:
```typescript
payload: { pageId: string, key: string, property: 'span' | 'start', value: number | undefined }
```
Setting `value: undefined` removes the property (reverts to default span 12, natural flow).

### 5. Component Tree Rebuild on Page Changes

**File:** `project.ts` (dispatch pipeline)

Since Studio manages all documents, the component tree must reflect page structure changes. The `pages.*` handlers should return `{ rebuildComponentTree: true }` so the existing `_rebuildComponentTree()` pipeline incorporates page structure when generating the component tree.

The rebuild logic (already in `project.ts`) should be extended to:

1. **When `theme.pages` exists and `pageMode` is `'wizard'`**: Generate a `Wizard` root with `Page` children, one per theme page. Each `Page` gets `title` and `description` from the theme page. Item-bound component nodes are placed into the `Page` corresponding to their region assignment.

2. **When `theme.pages` exists and `pageMode` is `'tabs'`**: Generate a `Stack` root with `Page` children (the renderer interprets `Page` as a tab based on `pageMode`). Same distribution logic as wizard.

3. **When `pageMode` is `'single'` or no pages exist**: Generate a flat `Stack` root with all component nodes (current behavior).

This replaces the Wizard-sync normalization step from the previous design iteration. Because Studio is the sole writer, there is no separate component tree to "sync" — there is only the generated tree, which is rebuilt from the current state on every relevant dispatch.

**Undo**: Because undo is snapshot-based (the entire `ProjectState` is cloned before each dispatch), the rebuild is captured atomically. Undoing a page operation restores both `theme.pages` and the generated component tree.

### 6. Rewrite Tests

**Files:** `tests/page-resolution.test.ts`, `tests/pages-handlers.test.ts`

Existing tests use wrong property paths (`layout: { page: '...' }` instead of `presentation: { layout: { page: '...' } }`) and the wrong component name (`WizardPage` instead of `Page`). These must be corrected.

Rewrite tests to cover:

- **Resolution**: Correct property paths, `unassignedItems`, `itemPageMap`, "attach to preceding page" rule
- **Mode switching**: Non-destructive single ↔ wizard ↔ tabs round-trip; deletePage of last page preserves mode
- **Auto-generate**: Correct property path, fallback when no page hints
- **Convenience commands**: `reorderRegion` (targetIndex), `setRegionProperty`
- **Component tree rebuild**: Wizard generated when pages + wizard mode; tabs mode uses Page children; single mode flat Stack; items distributed to correct Pages based on region assignments

## Decisions

- **Studio is the sole document author.** Users edit the form through Studio's workspaces. The three JSON documents (Definition, Theme, Component) are generated output. This eliminates all sync, fork, and tier-conflict complexity. The previous designs (bidirectional sync, one-way propagation with forking) were solving problems that only exist when multiple independent writers touch the same documents.

- **No `controllingTier` concept.** There is no tier conflict to report because Studio manages all tiers. The resolution function reads from the holistically-managed internal state. The previous `controllingTier` field encouraged the UI to treat tiers as competing authorities; in reality, Studio is the single authority.

- **`theme.pages` is the internal representation for page structure.** Of the three tiers' page representations, theme.pages is the richest (id, title, description, regions with grid layout). It stores the user's intent. The component tree (Wizard with Page children) is derived from it during rebuild.

- **Component tree rebuild, not sync.** The previous design had a normalization step that "synced" theme.pages changes into an existing Wizard. The new design simply rebuilds the component tree from scratch. This is simpler (no positional matching, no orphan handling, no incremental patching) and correct by construction (the tree always reflects current state). The rebuild is already fast because it runs on every `rebuildComponentTree: true` dispatch.

- **Mode switching preserves pages.** Pages are dormant in single mode, not destroyed. Deleting the last page does not reset mode. These are separate user intents: "I don't want pages right now" vs. "I want this to be a single-page form."

- **Export produces independent, spec-conformant documents.** Even though Studio manages all documents internally, the exported artifacts are independent JSON files that conform to their respective schemas. A Formspec processor can consume any combination of Definition, Theme, and Component documents — they don't need Studio to work. Power users who want to hand-edit exported documents can do so; that's outside Studio's scope.

## What This ADR Does NOT Cover

- **Widget selection UI** — How the user picks widgets for fields (Component Tree workspace concern)
- **Theme cascade editing** — How the user sets tokens, selectors, per-item overrides (Theme workspace concern)
- **Import of external documents** — What happens when someone loads a hand-authored component.json into Studio (future work; may need a reconciliation pass)
- **Collaborative editing** — Multiple users editing the same form simultaneously

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
