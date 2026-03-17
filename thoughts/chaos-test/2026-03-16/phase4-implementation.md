# Phase 4: Implementation Report

## Summary

All 21 issues implemented across 4 parallel agents. 55 new tests added. All test suites pass.

## Changes by Layer

### Engine (2 issues, 2 files)

| Issue | File | Change |
|-------|------|--------|
| B4/B6 | `packages/formspec-engine/src/fel/interpreter.ts` | Added `parseRepeatScopes()` + Strategy 2 to `candidateLookupPaths` for repeat-scope-aware path resolution |
| U7 | `packages/formspec-engine/src/fel/interpreter.ts` | Replaced `number()` stdlib with explicit type dispatch (empty string → null) |

**Tests**: 23 new (8 repeat scope + 15 number coercion) in 2 new test files
**Suite**: 492 tests, 0 failures

### Core (2 issues, 7 files)

| Issue | File | Change |
|-------|------|--------|
| B9 | `packages/formspec-core/src/tree-reconciler.ts` | Added `wasLast` to wrapper snapshots; end-positioned layout nodes stay at end after reconciliation |
| U4 | `packages/formspec-core/src/queries/field-queries.ts` + types | `searchItems` returns `ItemSearchResult[]` with full dot-path |

**Tests**: 10 new (5 reconciler + 5 search) in 2 existing test files
**Suite**: 488 tests, 0 failures

### Studio-core (9 issues, 5 files)

| Issue | File | Change |
|-------|------|--------|
| B7 | `project.ts` `branch()` | `Map<target, expr[]>` accumulator; OR expressions before emitting |
| B3 | `project.ts` `addPage()` + `listPages()` | Group key from `id ?? title`; `listPages()` returns `groupPath` |
| B2 | `project.ts` `addField()`/`addContent()` | `_resolvePageGroup()` auto-resolves `page` prop to `parentPath` |
| B5 | `evaluation-helpers.ts` `validateResponse()` | Apply `toInternalPath()` to result paths (0-based) |
| U3 | `evaluation-helpers.ts` `previewForm()` | Filter `requiredFields` by `engine.isPathRelevant()` |
| U5 | `project.ts` `updateItem()` + core `component-properties.ts` | Handler returns `nodeNotFound` flag instead of throwing; single dispatch |
| U6 | `field-type-aliases.ts` | Email regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` |
| U2 | `project.ts` `moveItem()` | Summary includes parent and index |
| U8 | `project.ts` + `helper-types.ts` | `insertIndex` wired through for content and groups |

**Tests**: 18 new (14 project-methods + 4 evaluation-helpers)
**Suite**: 337 studio-core tests + 488 core tests, 0 failures

### MCP (7 issues, 8 files)

| Issue | File | Change |
|-------|------|--------|
| B1 | `server.ts` | Content single-item props references shared `contentItemSchema.shape.props` |
| B8 | `tools/query.ts` | `componentNodeCount` overridden with filtered array length |
| U1 | `server.ts` + `tools/structure.ts` | `action` optional in Zod; validation + `default:` cases |
| C1 | `tools/lifecycle.ts` + `server.ts` | `handleCreate` auto-transitions to authoring |
| C2 | `server.ts` | Type description: `"string" (single-line text)`, `"text" (multi-line textarea)` |
| C3 | `server.ts` | Added `@` prefix to behavior and data tool descriptions |
| C4 | `server.ts` | Branch/show_when note: same property, last writer wins |

**Tests**: 4 new
**Suite**: 239 tests, 0 failures

## Deviations from Plan

| Issue | Deviation | Reason |
|-------|-----------|--------|
| U6 (email) | Required 4 backslashes in TS source | FEL has its own escape layer; proposed 2-backslash pattern would have broken |
| B8 | Conditional override (only when componentNodes > 0) | Avoids zeroing stat when no user-added components |
| U1 | Error handling via `editMissingAction()` export | Cleaner Zod→handler boundary than inline validation |
| MCP query.test.ts | Fixed pre-existing stale assertion | `listPages()` now returns `groupPath`, breaking old `toEqual` |

## New Issues Discovered

- Core agent noted 4 pre-existing test failures in studio-core `project-methods.test.ts` on the `studiofixes` branch (not caused by these changes)
- The `addSubmitButton` and `applyLayout` methods also have double-dispatch (like U5) but with serial data dependencies — different fix pattern needed (separate ticket)

## Verification Commands

```bash
# All packages
cd packages/formspec-engine && npm test     # 492 tests
cd packages/formspec-core && npm test       # 488 tests
cd packages/formspec-studio-core && npm test # 337 tests
cd packages/formspec-mcp && npx vitest run  # 239 tests

# Type checking
npx tsc --noEmit

# Full build
npm run build

# E2E (optional)
npx playwright test tests/e2e/playwright/
```
