# MCP Chaos Test — Implementation Plan

**Date**: 2026-03-16
**Branch**: `studiofixes`
**Source**: 5-persona blind user testing → root cause analysis → independent review → deep research

---

## Overview

21 issues found across 5 personas (all completed their forms). 9 bugs, 8 UX issues, 4 confusion points. After 3 rounds of analysis, all have confirmed root causes and verified designs.

---

## Implementation Groups

### Group 1: Engine — FEL & Coercion (B4/B6, U7)

#### B4/B6: Repeat-scope-aware path resolution
- **File**: `packages/formspec-engine/src/fel/interpreter.ts`
- **What**: `candidateLookupPaths` fails for `$group.field` references inside repeat groups. ALL FEL expressions using qualified group paths in repeat context are silently broken (shapes, constraints, required, readonly, calculate).
- **Root cause**: Only two resolution strategies exist (prepend parent, root-relative). Neither handles the case where the reference's leading segment matches an enclosing repeat group.
- **Fix**:
  1. Add static `parseRepeatScopes(itemPath)` helper — parses `"outer[0].inner[1].field"` into a scope chain: `[{ groupKey: "outer", prefix: "outer[0]" }, { groupKey: "inner", prefix: "outer[0].inner[1]" }]`
  2. Add Strategy 2 to `candidateLookupPaths` between sibling resolution (Strategy 1) and root-relative fallback (Strategy 3): walk scopes innermost-to-outermost, if the reference's leading segment matches a scope's `groupKey`, rebase the reference to use that scope's indexed prefix.
- **Verified scenarios**: Single-level repeat, nested repeats, cross-level references, cross-group aggregation, bare siblings, bare self-ref, wildcard aggregates, existing nested aggregates — all 8 traced correctly.
- **Lines changed**: ~30 (one method modified, one helper added)
- **Risk**: Medium-high. Core path resolution. Extensive testing needed.
- **Tests**:
  - RED: Shape rule `$line_items.amount > 0` with negative amount → currently passes, should fail
  - RED: `$line_items.category = 'other'` with `category = 'meals'` → currently required, should not be
  - EXPAND: Multiple instances (only offending instance fails), nested repeats, calculate expressions, cross-group still aggregates, `$sibling` still works, `$` still works

#### U7: `number("")` returns 0 instead of null
- **File**: `packages/formspec-engine/src/fel/interpreter.ts`, line 617
- **What**: JavaScript `Number("")` returns `0`. The `number()` FEL function should return null for empty/unparseable strings per spec.
- **Fix**: Replace one-liner with explicit type dispatch:
  - `null`/`undefined` → `null`
  - `boolean` → `0`/`1`
  - `number` → passthrough
  - `string` → trim, empty → null, parse → number or null
  - anything else → null
- **Lines changed**: ~10
- **Risk**: Medium. Changes FEL semantics. `sum()` already skips nulls, so calculated totals become correct (smaller when fields empty).
- **Tests**: `number("")` → null, `number(null)` → null, `number("123")` → 123, `number("abc")` → null, `number("  42  ")` → 42, `number(true)` → 1, `number(false)` → 0

---

### Group 2: Core — Reconciler & Search (B9, U4)

#### B9: Submit button drifts inward after field additions
- **File**: `packages/formspec-core/src/tree-reconciler.ts`
- **What**: Reconciler snapshots `_layout` nodes (SubmitButton, Grid, Card, Panel) with absolute index. After rebuild adds new nodes, the old absolute index is no longer at the end. Button gets spliced before the last field.
- **Root cause**: Phase 3 re-insertion uses `Math.min(snap.position, children.length)` — doesn't preserve "was at end" invariant.
- **Fix**:
  1. Add `wasLast: boolean` to `WrapperSnapshot` interface
  2. In `snapshotWrappers`: set `wasLast: i === children.length - 1`
  3. In Phase 3 re-insertion: `const idx = snap.wasLast ? parentNode.children.length : Math.min(snap.position, parentNode.children.length)`
- **Lines changed**: ~6
- **Risk**: Low-medium. Localized to reconciler. Affects all `_layout` nodes at end of containers.
- **Tests**: Add field after submit button → button stays at end. Add field before submit button → button stays at its index. Multiple `_layout` nodes, only the last one has `wasLast`.

#### U4: Search results don't include full dot-paths
- **File**: `packages/formspec-core/src/queries/field-queries.ts`, ~line 130
- **What**: `searchItems` returns `key` but not the full dot-notation path. Can't distinguish same-named fields in different groups.
- **Fix**: Track parent path during tree walk, include `path` property in results.
- **Lines changed**: ~10
- **Risk**: Low.
- **Tests**: Search for field that exists in two different groups → results include distinguishing full paths.

---

### Group 3: Studio-core — Branch, Page, Validation (B7, B3, B2, B5, U3, U5, U6, U2, U8)

#### B7: Branch silently overwrites when multiple arms target same show [HIGH PRIORITY]
- **File**: `packages/formspec-studio-core/src/project.ts`, `branch()` method
- **What**: Two branch arms targeting the same `show` item → second `definition.setBind { relevant }` command overwrites first. Silent data loss.
- **Fix**: Replace per-arm command emission with `Map<target, expr[]>` accumulator. OR expressions per target before emitting. One `definition.setBind` per target with combined expression.
- **Lines changed**: ~20
- **Risk**: Medium. Restructures branch logic. The `otherwise` arm already demonstrates the correct OR-ing pattern.
- **Tests**:
  - RED: Two `when` values targeting same `show` → bind should have `expr1 or expr2`, currently only has `expr2`
  - EXPAND: Single target (no change), 3+ arms same target, mixed shared/unique targets, `contains` mode, otherwise still negates all, RELEVANT_OVERWRITTEN warning still fires for pre-existing binds

#### B3: Page group path derived from title, not page_id
- **File**: `packages/formspec-studio-core/src/project.ts`, `addPage` ~line 1677
- **What**: `page_id: "attendee_info"` with `title: "Attendee Information"` produces group key `"attendee_information"` (from title), not `"attendee_info"`.
- **Fix**:
  1. `addPage`: prefer `page_id` for group key: `const rawKey = id ?? title;` then sanitize
  2. `listPages`: add `groupPath` to output (look up first region key)
- **Lines changed**: ~15
- **Risk**: Low. Only affects new pages. Greenfield project.
- **Tests**: `addPage("Attendee Info", undefined, "attendee_info")` → `affectedPaths[0] === "attendee_info"`. Title fallback still works. `listPages()` includes `groupPath`.

#### B2: `page` prop doesn't resolve to parentPath
- **File**: `packages/formspec-studio-core/src/project.ts`, `addField`/`addContent`
- **What**: `props: { page: "page_id" }` only wires theme region, doesn't resolve to definition group.
- **Depends on**: B3 (predictable group keys make resolution cleaner)
- **Fix**: Add `_resolvePageGroup(pageId)` private method — looks up page's primary region key from theme pages, verifies it's a group, returns as parentPath. Call in `addField` and `addContent` when `props.page` is set and `parentPath` is not.
- **Lines changed**: ~20
- **Risk**: Low-medium.
- **Tests**: Create wizard page, `addField` with only `props: { page: pageId }` → field is child of correct group. Explicit `parentPath` takes precedence. Works for content items too.

#### B5: Validate error paths are 1-indexed
- **File**: `packages/formspec-studio-core/src/evaluation-helpers.ts`, `validateResponse`
- **What**: Returns raw engine report with 1-based paths. `previewForm` in same file already normalizes with `toInternalPath`.
- **Fix**: Apply `toInternalPath` to all result paths:
  ```typescript
  return { ...report, results: report.results.map(r => ({ ...r, path: toInternalPath(r.path) })) };
  ```
- **Lines changed**: 3
- **Risk**: Low.
- **Tests**: Validate response with repeat group errors → paths are 0-based. Non-repeat paths unchanged.

#### U3: `requiredFields` includes hidden fields
- **File**: `packages/formspec-studio-core/src/evaluation-helpers.ts`, lines 170-174
- **What**: `requiredFields` lists ALL fields with true required signal, ignoring visibility.
- **Fix**: Add `&& engine.isPathRelevant(path)` to the filter.
- **Lines changed**: 1
- **Risk**: Low.
- **Tests**: Conditionally required field inside hidden group → not in `requiredFields`. Visible required field → still included.

#### U5: Undo requires two steps for widget change
- **File**: `packages/formspec-core/src/handlers/component-properties.ts` (~line 141) + `packages/formspec-studio-core/src/project.ts` `updateItem`
- **What**: `component.setFieldWidget` throws on missing node, forcing separate `dispatch()`. Two dispatches = two undo snapshots.
- **Research confirmed**: `dispatch()` already accepts arrays with single-snapshot semantics. Only 3 of ~50 helpers have this issue.
- **Fix**:
  1. `component-properties.ts`: Replace `throw` with result flag `{ rebuildComponentTree: false, nodeNotFound: true }`
  2. `project.ts` `updateItem`: Move widget command into main `commands` array, check result for `nodeNotFound` flag, emit warning if set
- **Lines changed**: ~10
- **Risk**: Low. No other code depends on the throw.
- **Tests**: Change widget on field with component node → one undo restores both. Change widget on field without component node → warning emitted, definition still updated.

#### U6: Email regex too weak
- **File**: `packages/formspec-studio-core/src/field-type-aliases.ts`, line 34
- **What**: `matches($, '.*@.*')` accepts `"a@b"`.
- **Fix**: Replace with `'^[^\s@]+@[^\s@]+\.[^\s@]+$'`
- **Lines changed**: 1
- **Risk**: Low. Only affects new fields using email alias.
- **Tests**: `"a@b"` → fails. `"user@example.com"` → passes. `"@@"` → fails.

#### U2: Move summary message misleading
- **File**: `packages/formspec-studio-core/src/project.ts`, ~line 1130
- **What**: "Moved X to X" when reordering within same parent.
- **Fix**: Include target parent and index in message.
- **Lines changed**: ~3
- **Risk**: Low.

#### U8: Content/group missing insertIndex
- **File**: `packages/formspec-studio-core/src/project.ts` + `helper-types.ts`
- **What**: `ContentProps` and `GroupProps` omit `insertIndex` that `FieldProps` has.
- **Fix**: Add `insertIndex` to `ContentProps` and `GroupProps` interfaces, wire through to `definition.addItem` payload.
- **Lines changed**: ~10
- **Risk**: Low.
- **Tests**: Add content with `insertIndex: 0` → appears at beginning.

---

### Group 4: MCP — Schemas, Descriptions, Workflow (B1, B8, U1, C1, C2, C3, C4)

#### B1: `formspec_content` single-item props missing `parentPath`
- **File**: `packages/formspec-mcp/src/server.ts`, lines 301-303
- **What**: Inline Zod `props` schema only has `page`. Batch `contentItemSchema` has both `page` and `parentPath`. Zod strips unknown keys silently.
- **Fix**: Reference `contentItemSchema.shape.props` instead of inline schema.
- **Lines changed**: 2
- **Risk**: Low.

#### B8: componentNodeCount off by 1
- **File**: `packages/formspec-mcp/src/tools/query.ts`
- **What**: `statistics.componentNodeCount` counts all nodes; `componentNodes` array is filtered.
- **Fix**: Override stat with actual array length.
- **Lines changed**: 1
- **Risk**: Low.

#### U1: Batch `formspec_edit` requires top-level `action`
- **File**: `packages/formspec-mcp/src/server.ts`, line 371
- **What**: Zod `action` is required, but handler supports per-item override.
- **Fix**: Make `action` optional. Add validation: either `action` or `items` must be present. Add `default:` case to switch for safety.
- **Lines changed**: ~8
- **Risk**: Low.

#### C1: Bootstrap phase unnecessary for blank projects
- **File**: `packages/formspec-mcp/src/tools/lifecycle.ts`, `handleCreate`
- **What**: Blank projects require `formspec_create` + `formspec_load` two-step.
- **Fix**: Auto-transition to authoring in `handleCreate`. Update tool description.
- **Lines changed**: ~10
- **Risk**: Low-medium. Changes lifecycle state machine. `formspec_draft` + `formspec_load` path preserved for imports.

#### C2: `string` vs `text` unclear
- **File**: `packages/formspec-mcp/src/server.ts`, type field descriptions
- **Fix**: `"string" (single-line text)`, `"text" (multi-line textarea)` in descriptions.
- **Lines changed**: 2

#### C3: `@` prefix not in behavior tool description
- **File**: `packages/formspec-mcp/src/server.ts`, formspec_behavior + formspec_data descriptions
- **Fix**: Add `variables use @-prefix ("@total")` to description text.
- **Lines changed**: 2

#### C4: Branch/show_when interaction unclear
- **File**: `packages/formspec-mcp/src/server.ts`, formspec_flow description + `project.ts` warning message
- **Fix**: Clarify both write to same `relevant` property, last writer wins. Update RELEVANT_OVERWRITTEN warning to include guidance.
- **Lines changed**: ~5

---

## Execution Order

Fixes are grouped by layer. Within each layer, ordered by dependency and severity.

| # | Issue | Layer | Severity | Dependencies | Lines |
|---|-------|-------|----------|-------------|-------|
| 1 | B4/B6 | engine | **Critical** | none | ~30 |
| 2 | U7 | engine | Medium | none | ~10 |
| 3 | B9 | core | Medium | none | ~6 |
| 4 | U4 | core | Low | none | ~10 |
| 5 | B7 | studio-core | **High** | none | ~20 |
| 6 | B3 | studio-core | Medium | none | ~15 |
| 7 | B2 | studio-core | Medium | B3 | ~20 |
| 8 | B5 | studio-core | Medium | none | 3 |
| 9 | U3 | studio-core | Medium | none | 1 |
| 10 | U5 | studio-core + core | Medium | none | ~10 |
| 11 | U6 | studio-core | Low | none | 1 |
| 12 | U2 | studio-core | Low | none | ~3 |
| 13 | U8 | studio-core | Low | none | ~10 |
| 14 | B1 | mcp | Medium | none | 2 |
| 15 | B8 | mcp | Low | none | 1 |
| 16 | U1 | mcp | Low | none | ~8 |
| 17 | C1 | mcp | Medium | none | ~10 |
| 18 | C2 | mcp | Low | none | 2 |
| 19 | C3 | mcp | Low | none | 2 |
| 20 | C4 | mcp + studio-core | Low | B7 | ~5 |

**Total**: ~170 lines of changes across ~12 files.

## Parallel Agent Strategy

Launch 4 implementation agents by layer:

1. **Engine agent**: B4/B6, U7
2. **Core agent**: B9, U4
3. **Studio-core agent**: B7, B3, B2, B5, U3, U5, U6, U2, U8
4. **MCP agent**: B1, B8, U1, C1, C2, C3, C4

Engine and core agents can run in parallel. Studio-core depends on core (U5 touches both). MCP is independent.

## Verification

After all agents complete:

```bash
# Engine tests
npx playwright test tests/e2e/playwright/

# Python conformance
python3 -m pytest tests/ -v

# Studio-core tests
cd packages/formspec-studio-core && npm test

# Core tests
cd packages/formspec-core && npm test

# Full build
npm run build
```
