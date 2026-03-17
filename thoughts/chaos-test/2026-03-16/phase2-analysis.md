# Phase 2: Root Cause Analysis

## Layer Heatmap

| Layer | Issues Rooted Here | Issues |
|-------|--------------------|--------|
| **spec** | 0 | — |
| **schema** | 0 | — |
| **types** | 0 | — |
| **engine** | 2 | B4/B6 (shared root), U7 |
| **core** | 2 | B9, U4 |
| **studio-core** | 7 | B2, B3, B5, B7, U2, U3, U5, U6, U8 |
| **mcp** | 6 | B1, B8, U1, C1, C2, C3 |

Studio-core is the hottest layer (7 issues), followed by MCP (6). Engine has 2 but they're the highest-severity bugs.

---

## Issues Grouped by Root Layer

### Engine (2 issues — HIGH severity)

#### B4 + B6: `candidateLookupPaths` fails for `$group.field` in repeat context
- **Root file**: `packages/formspec-engine/src/fel/interpreter.ts`, `candidateLookupPaths` method
- **Root cause**: When `currentItemPath = "line_items[0].amount"` and reference is `$line_items.amount`, the method produces candidates `["line_items[0].line_items.amount", "line_items.amount"]` — neither matches a signal. Falls through to repeat-expansion, returning an array instead of a scalar.
- **Impact**: ALL FEL expressions using `$group.field` inside repeat groups are broken — shapes, constraints, required, readonly, calculate. Only `$` (bare self-ref) and `$field` (bare sibling) work.
- **B4 manifestation**: Shape rules silently pass because `[false]` is truthy
- **B6 manifestation**: `$group.field = 'value'` always true because array comparison returns truthy `[false]`
- **Fix**: Add repeat-group rebasing to `candidateLookupPaths` — when reference starts with a repeat group name in scope, substitute the current instance index
- **One fix resolves two bugs**

#### U7: `number("")` returns 0 instead of null
- **Root file**: `packages/formspec-engine/src/fel/interpreter.ts`, line 617
- **Root cause**: JavaScript `Number("")` returns `0`. The `number()` function uses `Number(v)` without checking for empty string.
- **Fix**: Replace with explicit type dispatch: empty string → null, null/undefined → null, boolean → 0/1, string → parse or null

### Core (2 issues — LOW severity)

#### B9: SubmitButton positioned before last field in component nodes
- **Root file**: `packages/formspec-core/src/tree-reconciler.ts`
- **Root cause**: Positional snapshot uses absolute index; wrappers at end drift forward on reconciliation
- **Fix**: Add `wasLast` flag to preserve intended ordering

#### U4: Search results don't include full dot-paths
- **Root file**: `packages/formspec-core/src/queries/field-queries.ts`, line 130
- **Root cause**: `searchItems` walks tree without tracking parent path
- **Fix**: Return `SearchResult[]` with `path` property including full dot-path

### Studio-core (7 issues — mixed severity)

#### B2: `page` prop doesn't resolve to parentPath
- **Root file**: `packages/formspec-studio-core/src/project.ts`, `addField`/`addContent`
- **Root cause**: `page` prop only wires theme-tier region (`pages.assignItem`), doesn't resolve page → group for definition-tier `parentPath`
- **Fix**: Add `_resolvePageGroup(pageId)` helper that looks up the page's primary region key and uses it as `parentPath`

#### B3: Page group path derived from title, not page_id
- **Root file**: `packages/formspec-studio-core/src/project.ts`, `addPage`, line 1677
- **Root cause**: Group key always snake_cases the title: `title.toLowerCase().replace(...)`. Custom `page_id` is only used for theme page ID.
- **Fix**: Prefer `page_id` for group key when provided. Also add `groupPath` to `listPages()` output.

#### B5: Validate error paths are 1-indexed
- **Root file**: `packages/formspec-studio-core/src/evaluation-helpers.ts`, `validateResponse`
- **Root cause**: Returns raw engine report without normalizing paths. `previewForm` in the same file already does this with `toInternalPath`.
- **Fix**: Apply `toInternalPath` to all result paths before returning

#### B7: Branch overwrites when multiple arms target same show
- **Root file**: `packages/formspec-studio-core/src/project.ts`, `branch()`, lines 667-689
- **Root cause**: Emits one `definition.setBind { relevant }` per arm per target. Two arms sharing a target → second overwrites first. The `otherwise` arm already correctly OR-s expressions.
- **Fix**: Accumulate `Map<target, expr[]>`, OR expressions per target before emitting commands

#### U2: Move summary message misleading
- **Root file**: `packages/formspec-studio-core/src/project.ts`, line 1130
- **Root cause**: `moveItem` summary computes `newPath` identically to input when reordering within same parent
- **Fix**: Include index and parent in message

#### U3: `requiredFields` includes hidden fields
- **Root file**: `packages/formspec-studio-core/src/evaluation-helpers.ts`, lines 170-174
- **Root cause**: Iterates `requiredSignals` without filtering by `engine.isPathRelevant(path)`
- **Fix**: Add `&& engine.isPathRelevant(path)` to the filter

#### U5: Undo granularity wrong (two undos for one action)
- **Root file**: `packages/formspec-studio-core/src/project.ts`, lines 1104-1118 + core `component-properties.ts`
- **Root cause**: Two separate `dispatch()` calls = two undo snapshots. Component handler throws on missing node, preventing batch.
- **Fix**: Make component handler non-throwing, merge into single dispatch

#### U6: Email regex too weak
- **Root file**: `packages/formspec-studio-core/src/field-type-aliases.ts`, line 34
- **Root cause**: `matches($, '.*@.*')` accepts "a@b"
- **Fix**: Replace with `'^[^\s@]+@[^\s@]+\.[^\s@]+$'`

#### U8: Content/group missing insertIndex
- **Root file**: `packages/formspec-studio-core/src/project.ts` + `helper-types.ts`
- **Root cause**: `ContentProps` and `GroupProps` omit `insertIndex` that `FieldProps` has
- **Fix**: Wire `insertIndex` through to `definition.addItem` payload for content and groups

### MCP (6 issues — mixed severity)

#### B1: `formspec_content` single-item props missing `parentPath`
- **Root file**: `packages/formspec-mcp/src/server.ts`, lines 301-303
- **Root cause**: Inline Zod `props` schema only has `page`. Batch `contentItemSchema` correctly has both `page` and `parentPath`. Zod strips unknown keys.
- **Fix**: Reference `contentItemSchema.shape.props` instead of inline schema

#### B8: componentNodeCount off by 1
- **Root file**: `packages/formspec-mcp/src/tools/query.ts`
- **Root cause**: `statistics.componentNodeCount` counts all nodes; `componentNodes` array is filtered. Count doesn't match array.
- **Fix**: Override stat with actual array length

#### U1: Batch `formspec_edit` requires top-level `action`
- **Root file**: `packages/formspec-mcp/src/server.ts`, line 371
- **Root cause**: Zod schema has `action` as required, not optional. Handler already supports items overriding.
- **Fix**: Make `action` optional, add validation that either `action` or `items` is present

#### C1: Bootstrap phase unnecessary for blank projects
- **Root file**: `packages/formspec-mcp/src/tools/lifecycle.ts`, `handleCreate`
- **Root cause**: `formspec_create` always enters bootstrap, requiring `formspec_load` even for blank projects
- **Fix**: Auto-transition to authoring in `handleCreate` for blank projects

#### C2: `string` vs `text` unclear in tool description
- **Root file**: `packages/formspec-mcp/src/server.ts`, type field description
- **Fix**: Change to `"string" (single-line text)`, `"text" (multi-line textarea)`

#### C3: `@` prefix for variables not in behavior tool description
- **Root file**: `packages/formspec-mcp/src/server.ts`, formspec_behavior description
- **Fix**: Add `@` prefix mention to behavior and data tool descriptions

---

## Tech Debt Patterns

1. **Repeat group FEL scoping (engine)**: B4 and B6 are the same bug. All `$group.field` references inside repeat context are broken. This is the highest-impact single fix.

2. **Preview/validate path consistency (studio-core)**: `previewForm` normalizes paths with `toInternalPath`; `validateResponse` doesn't. Same file, same pattern, inconsistent application.

3. **Zod schema drift (MCP)**: B1 is caused by inline Zod schema diverging from the shared batch schema. The pattern of duplicating schemas instead of referencing shared definitions causes silent property stripping.

4. **Page → group resolution gap (studio-core)**: B2 and B3 both stem from the page/group relationship not being fully surfaced. The page creates a group, but the group key is unpredictable and `page` prop doesn't resolve to it.

---

## Dependency Violations

None found. All proposed fixes respect dependency direction.

---

## Recommended Fix Order

1. **B4/B6** (engine — `candidateLookupPaths`) — Highest severity. Silent failures in all repeat group FEL expressions. Fixes two bugs with one change.
2. **B7** (studio-core — `branch()` consolidation) — Silent data loss in branching.
3. **B1** (MCP — Zod schema) — Two-line fix, unblocks content placement in wizard mode.
4. **B3** (studio-core — `addPage` key derivation) — Makes page IDs predictable.
5. **B2** (studio-core — page→group resolution) — Builds on B3 fix.
6. **B5** (studio-core — `validateResponse` path normalization) — Three-line fix.
7. **U3** (studio-core — `requiredFields` visibility filter) — One-line fix.
8. **U7** (engine — `number("")`) — Spec conformance fix.
9. **C1** (MCP — auto-transition blank projects) — UX improvement.
10. **U6** (studio-core — email regex) — One-line fix.
11. **B8** (MCP — componentNodeCount) — Minor stat mismatch.
12. **U1** (MCP — batch edit action optional) — Schema fix.
13. **U5** (studio-core + core — undo granularity) — Requires handler refactor, more complex.
14. **B9** (core — submit button ordering) — Low visibility impact.
15. **U2, U4, U8** (various — move message, search paths, insertIndex) — QoL improvements.
16. **C2, C3, C4** (MCP descriptions) — Documentation-only.
