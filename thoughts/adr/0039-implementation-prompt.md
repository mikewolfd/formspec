# Implementation Prompt: ADR-0039 Seamless Page Management

Use this prompt to generate an implementation plan for ADR-0039. It contains the full design context, the architectural reasoning that led to it, and the specific codebase knowledge needed to execute.

---

## Prompt

You are implementing ADR-0039: Seamless Page Management in Studio-Core for the Formspec project. Read the spec at `thoughts/adr/0039-seamless-page-management.md` and generate a step-by-step implementation plan.

### Architecture Context

Formspec Studio is a generative authoring tool for non-technical users. Users edit **the form**, not JSON documents. Studio-core produces three JSON documents as output artifacts: Definition (Tier 1), Theme (Tier 2), Component (Tier 3). Studio-core is the sole writer — there is no bidirectional sync, no forking, no tier conflicts. The component tree is rebuilt from scratch on every relevant dispatch.

This architecture was chosen after evaluating and rejecting two alternatives:
1. Bidirectional sync (rejected: distributed consistency problem between structurally incompatible data models)
2. One-way propagation with forking (rejected: fuzzy fork boundary, divergent state, destructive recovery)

The key insight: the sync/fork problems only exist when multiple independent writers touch the same documents. Since Studio is the sole writer, they vanish.

### What Needs to Change

**1. Rewrite `packages/formspec-studio-core/src/page-resolution.ts` from scratch.**
- New return type adds `unassignedItems`, `itemPageMap`, enriched `ResolvedRegion` with `exists` flag
- Removes `controllingTier`, `wizardSynced`, `SHADOWED_THEME_PAGES` diagnostic
- Fixes: property path `item.presentation?.layout?.page` (not `item.layout?.page`), component name `'Page'` (not `'WizardPage'`), "attach to preceding page" rule
- Resolution reads from `theme.pages` as the canonical source

**2. Fix `packages/formspec-studio-core/src/handlers/pages.ts`.**
- `pages.setMode`: non-destructive — preserve pages on mode switch, never clear theme.pages
- `pages.addPage`: preserve existing mode (don't force wizard when in tabs)
- `pages.deletePage`: don't reset mode when deleting last page
- `pages.autoGenerate`: fix property path `item.presentation?.layout?.page`
- All handlers: change `rebuildComponentTree: false` to `true`
- New handlers: `pages.reorderRegion` (targetIndex-based), `pages.setRegionProperty` (span/start)

**3. Extend `_rebuildComponentTree()` in `packages/formspec-studio-core/src/project.ts`.**
- Currently generates a flat `Stack` root. Extend to:
  - wizard mode + theme.pages → `Wizard` root with `Page` children, items distributed by region assignment
  - tabs mode + theme.pages → `Stack` root with `Page` children, same distribution
  - single mode or no pages → flat `Stack` (current behavior)
- The existing `hasAuthoredComponentTree()` guard is correct — skip rebuild when an imported/authored tree exists

**4. Rewrite tests.**
- `tests/page-resolution.test.ts` — existing tests use wrong property paths and wrong component name
- `tests/pages-handlers.test.ts` — test non-destructive mode switching, mode preservation, new handlers

### Critical Codebase Details

- **Handler pattern**: `registerHandler('pages.addPage', (state, payload) => { ... })` in `handlers/pages.ts`. Handlers mutate a cloned state and return `{ rebuildComponentTree: boolean }`.
- **`theme.*` page handlers exist in parallel** (`handlers/theme.ts` lines 356-561): `theme.addPage`, `theme.deletePage`, `theme.addRegion`, etc. These are low-level primitives. `pages.*` is the user-facing API. Don't remove `theme.*` handlers; they serve programmatic/import use cases.
- **`_rebuildComponentTree()`** is at `project.ts` ~line 1799. It runs conditionally: `if (result.rebuildComponentTree && !hasAuthoredComponentTree(this._state.component))`.
- **`hasAuthoredComponentTree()`** is in `component-documents.ts`. Returns true when `component.tree` has been explicitly set.
- **Region key cascading on rename/delete** already works (commit `e339982`). Don't re-implement.
- **`generatePageId()`** uses `Date.now()` + counter. Non-deterministic but schema-valid. Not in scope to change.
- **Undo is snapshot-based**: entire `ProjectState` cloned before dispatch. Rebuild is captured atomically.

### Existing Bugs to Fix (verified against schemas)

| Bug | Location | Current | Correct |
|-----|----------|---------|---------|
| Property path | `page-resolution.ts:71`, `handlers/pages.ts:162` | `item.layout?.page` | `item.presentation?.layout?.page` |
| Component name | `page-resolution.ts:46` | `'WizardPage'` | `'Page'` |
| Mode destruction | `handlers/pages.ts:78-81` | Clears `theme.pages` on single | Preserve pages |
| Mode override | `handlers/pages.ts:49` | Forces `pageMode = 'wizard'` | Preserve tabs mode |
| Last page reset | `handlers/pages.ts:64-66` | Resets mode to single | Preserve mode |

### TDD Requirement

This project follows strict red-green-refactor. For each change:
1. Write a failing test first (RED)
2. Make it pass with minimal code (GREEN)
3. Clean up (REFACTOR)
4. Expand with edge cases and repeat

### Constraints

- Follow existing patterns. Don't introduce new abstractions.
- `CLAUDE.md` says: "All code is ephemeral. Prefer starting over to refactoring." The page-resolution rewrite is a from-scratch rewrite, not a surgical fix.
- Don't modify `theme.*` handlers, definition schema, component schema, or mapping handlers.
- Don't add features beyond what the ADR specifies. No widget selection, theme cascade editing, or import reconciliation.

### Deliverables

1. Rewritten `page-resolution.ts` with new types and correct behavior
2. Fixed and extended `handlers/pages.ts` with all handler changes
3. Extended `_rebuildComponentTree()` with page-aware generation
4. Rewritten `tests/page-resolution.test.ts`
5. Updated `tests/pages-handlers.test.ts`
6. All existing tests pass (`npx vitest run` in `packages/formspec-studio-core`)
