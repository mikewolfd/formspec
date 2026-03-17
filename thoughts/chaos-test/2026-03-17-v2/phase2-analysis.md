# Phase 2: Root Cause Analysis

## Root Cause Summary Table

| Issue | Root Layer | Root File | Root Cause | Status |
|-------|-----------|-----------|------------|--------|
| **B1** | studio-core | `project.ts:247` `_resolvePath()` | Dot-path + parentPath computes wrong effective parent | Open |
| **B2** | studio-core | `evaluation-helpers.ts` `flattenToSignalPaths` | Multichoice arrays treated as repeat group arrays | **Already fixed** (commit 739f54f) |
| **B3** | MCP | `behavior.ts` + `server.ts` | `update_rule` not wired; user tried wrong tool (`formspec_edit`) | Open |
| **B4** | MCP | `query.ts:108-119` | Trace handler only has field/expression branches, no `@variable` | Open |
| **B5** | Engine | `interpreter.ts:537-543` | Comparison operators return null for money-vs-number; arithmetic already handles money | Open |
| **B6** | MCP | `server.ts` Zod schemas | `insertIndex` missing from content/group props schemas (Zod strips it) | Open |
| **U1** | MCP (docs) | `server.ts` tool descriptions | Page=group duality not communicated | Open |
| **U2** | Core | `expression-index.ts:156` | `parseFEL` doesn't check screener fields for specific diagnostic | Open |
| **U3** | MCP + studio-core | `server.ts` Zod + `project.ts` addGroup | Group Zod schema missing `page`; addGroup missing `pages.assignItem` | Open |
| **U4** | studio-core | Same as B1 | Same root as B1 | Covered by B1 |
| **U5** | MCP | Same as B6 | Same root as B6 | Covered by B6 |
| **U6** | MCP | `query.ts:41-44` | `handleDescribe` doesn't include shapes/variables in output | Open |

---

## Layer Heatmap

```
spec         ░░░░░░░░░░  0 issues
schema       ░░░░░░░░░░  0 issues
types        ░░░░░░░░░░  0 issues
engine       ██░░░░░░░░  1 issue  (B5 money comparison)
core         ██░░░░░░░░  1 issue  (U2 screener FEL diagnostic)
studio-core  ████░░░░░░  2 issues (B1 path resolution, B2 already fixed)
mcp          ██████████  7 issues (B3, B4, B6, U1, U3, U5, U6)
```

**The MCP layer is the primary problem area.** 7 of 10 open issues root there — mostly Zod schema drift (properties missing that studio-core supports) and incomplete wiring (capabilities exist deeper but aren't exposed).

---

## Issues Grouped by Root Layer

### Engine (1 issue)
**B5: Money comparison operators** — `applyScalarBinaryOp` in interpreter.ts handles money for arithmetic and equality but not `<`/`>`/`<=`/`>=`. Fix: add money-aware comparison mirroring existing `applyMoneyArithmetic` pattern. ~15 lines in one function.

### Core (1 issue)
**U2: Screener FEL diagnostic** — `parseFEL` in expression-index.ts doesn't know about screener fields, so `$screener_field` silently resolves to null. Fix: check screener keys on unknown reference and emit `FEL_SCREENER_SCOPE` diagnostic. ~20 lines. Also update MCP `formspec_screener` description.

### Studio-core (1 open issue)
**B1: Path resolution** — `_resolvePath` combines dot-path segments with parentPath, doubling the nesting. Fix: reject the combination with `PATH_CONFLICT` error when both dot-path and parentPath express nesting. ~10 lines. Three existing tests for relative addressing need updating (they test the buggy feature).

### MCP (7 issues, 4 distinct fixes)

**Fix Group A: Zod schema drift (B6 + U5 + U3-partial)**
`contentItemSchema.props` missing `insertIndex`. `groupItemSchema.props` missing `insertIndex` and `page`. Fix: add the missing properties to match studio-core's TypeScript interfaces. ~6 lines total.

**Fix Group B: Behavior tool completeness (B3)**
`update_rule` action exists in studio-core (`updateValidation`) but isn't wired through MCP. Fix: add `update_rule` to behavior action enum and switch. ~15 lines. Also clarify in `formspec_edit` description that shapes use `formspec_behavior`.

**Fix Group C: Trace handler variable support (B4)**
Trace handler only classifies input as field or expression. Fix: add third branch for `@`-prefixed variable refs that looks up the variable expression and traces its dependencies. Also add `variableDependents` delegation in studio-core. ~25 lines.

**Fix Group D: Describe handler completeness (U6)**
`handleDescribe` returns only item + bind for field targets. Fix: also include shapes targeting the field and variables. For overview mode, include shape/variable lists not just counts. ~20 lines.

**Fix Group E: Tool descriptions (U1)**
Page/group duality not explained. Fix: update `formspec_page`, `formspec_field`, and `formspec_group` descriptions to explain that pages create definition groups and fields get nested paths. Text-only changes.

---

## Tech Debt Patterns

### Pattern 1: MCP Zod Schema Drift
Three separate Zod schemas (`fieldPropsSchema`, `contentItemSchema.props`, `groupItemSchema.props`) hand-duplicate properties from studio-core TypeScript interfaces with no automated sync check. When `insertIndex` and `page` were added to studio-core types, only `fieldPropsSchema` was updated.

**Systemic fix (future):** Extract shared props into a base Zod object and compose via `z.intersection()`. Or add a build-time check that MCP Zod schemas cover all studio-core HelperType properties.

### Pattern 2: Shapes/Variables as Second-Class MCP Citizens
Shapes and variables can be created via `formspec_behavior`/`formspec_data` but lack inspection, modification, and tracing support. The MCP layer was designed primarily around the item tree.

**Systemic fix:** The 4 fixes (B3, B4, U6, plus describe enrichment) together elevate shapes/variables to parity.

---

## Dependency Violations
None found. All proposed fixes respect dependency direction (deeper layers don't know about shallower ones).

---

## Recommended Fix Order

1. **B1** (studio-core path resolution) — deepest open fix, may prevent confusion during other testing
2. **B5** (engine money comparison) — deepest layer, self-contained, enables correct preview testing
3. **U2** (core screener diagnostic) — self-contained, improves error messages
4. **B6/U5/U3** (MCP Zod schemas) — batch fix, all in server.ts + addGroup
5. **B3** (MCP behavior update_rule) — small, self-contained
6. **B4** (MCP trace variable support) — needs studio-core delegation addition
7. **U6** (MCP describe enrichment) — depends on knowing what shapes/variables look like after other fixes
8. **U1** (MCP descriptions) — text-only, do last after all behavior is finalized

**Masking effects:** B5 (money comparison) masks preview reliability for money-based forms. Fixing B5 first ensures preview testing is trustworthy for verifying other fixes. B1 (path resolution) prevents orphaned items that confuse all subsequent operations.
