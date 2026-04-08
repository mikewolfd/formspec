# Phase 2: Root Cause Analysis

**Date:** 2026-04-07

Investigation performed by 4 formspec-scout agents and 2 spec-expert agents in parallel.

---

## Major Finding: All "Feature Gaps" Are MCP Exposure Gaps

The spec-expert validated every reported feature gap (G1-G6) against the specification. **None are real spec gaps.** Every capability exists in the spec — the MCP tools just don't surface them:

| Gap | Spec Status | Spec Reference | Real Issue |
| --- | ----------- | -------------- | ---------- |
| G1: Conditional page skip | **Already specified** | `relevant` bind on page groups (S4.3.1) + `when` on Page components (S8.1) | MCP `formspec_flow(branch)` unclear about page-level relevance |
| G2: Computed display field | **Already specified** | `field` + `calculate` bind (S4.3.1) + `Text` component with bind (S5.14) | MCP doesn't document the calculate+Text pattern |
| G3: Summary/confirmation page | **Already specified** | `Summary` component (S6.12) — "useful for review pages" | MCP doesn't expose Summary + ValidationSummary composition |
| G5: Signature field | **Fully specified** | Core widgetHint, Theme widgetConfig, Component S6.8 | MCP doesn't expose Signature component/widget |
| G6: Checklist component | **Working as designed** | `CheckboxGroup` (S5.10) for multiChoice; group of boolean Toggles for independent items | Document the pattern |

**One minor spec explicitness gap:** Wizard + `relevant` interaction is implied but not explicitly stated. S4.1.2 could add: "When computing the wizard's page sequence, non-relevant pages MUST be excluded from navigation."

---

## Spec-Expert: FEL Behavioral Findings

| Question | Spec Answer | Implication |
| -------- | ----------- | ----------- |
| `$` prefix required? | **Yes** — normative grammar, no bare-path production | If Marcus's bare path worked, that's a **conformance bug** |
| Repeat scope | `$field` (unqualified) = current instance sibling; `$group[*].field` = all instances | U5 is a documentation gap, not a behavior gap |
| Humanize | **Not in spec** — purely tooling | B2 is a tooling quality issue, not a spec violation |
| Preview evaluation | **Not in spec** — implementation-defined | B1/B5/U8 are design choices, not spec violations |
| countWhere 2nd arg | **Predicate expression** with `$` rebound per element | U13 is wrong — the catalog description is misleading, not the behavior |
| "Did you mean?" | **Not in spec** — tooling concern | U12 is a nice-to-have, not a requirement |

---

## Confirmed Issues by Root Layer

### Layer 7 — MCP (tool descriptions, parameter schemas)

| ID | Issue | Root File:Line | Fix Type | Severity |
| -- | ----- | -------------- | -------- | -------- |
| **U1** | No FEL syntax guidance in `formspec_behavior` | `create-server.ts:396-411` | Description rewrite | HIGH |
| **U2** | Inconsistent nesting guidance across tools; `formspec_page` has zero guidance | `create-server.ts:248,350-366` | Description rewrite | HIGH |
| **U5** | No repeat scope documentation in `formspec_fel` | `create-server.ts:594-607` | Description rewrite | MEDIUM |
| **U3** | `formspec_save` error message unhelpful for new projects | `lifecycle.ts:154` | Error message + description | MEDIUM |
| **U4** | `formspec_guide` and `formspec_create` don't cross-reference | `create-server.ts:131,146` | Description rewrite | MEDIUM |
| **B3** | Screener responses show "undefined" (Zod schema marks required params as optional) | `create-server.ts:516` + `project.ts:4193,4244` | Code fix (per-action validation + defensive formatting) | LOW |
| **U7** | Accessibility audit flags self-explanatory fields | `audit.ts:155-165` | Code fix (add heuristic or soften wording) | LOW |
| **U9** | `formspec_update` lacks batch mode | `structure.ts:288-302` + `create-server.ts:282-296` | Code fix (add `items[]` overload) | LOW |
| **G1-G5** | Spec capabilities not exposed by MCP tools | Various tool descriptions | Description + possibly handler additions | MEDIUM |

### Layer 6 — Studio-core (Project helpers, evaluation)

| ID | Issue | Root File:Line | Fix Type | Severity |
| -- | ----- | -------------- | -------- | -------- |
| **B7** | Page status hardcoded to `'active'` | `evaluation-helpers.ts:312` | Code fix (derive from relevance/validation) | MEDIUM |
| **B8** | No global key uniqueness check at authoring time | `project.ts:694` | Code fix (check tree-wide key collisions) | MEDIUM |
| **B6** | Grid container hardcoded to `root` parent | `project.ts:2817` | Code fix (find common ancestor of targets) | LOW |
| **B2** | `humanizeFEL` is a regex stub matching only `$ref op value` | `authoring-helpers.ts:656-666` | Code fix (expand or document limitation) | MEDIUM |
| **B4** | `generateSampleData` ignores relevance | `project.ts:4347-4386` | Code fix (spin up engine or document limitation) | LOW |
| **B5** | Preview always uses `mode:'submit'` for validation | `evaluation-helpers.ts:250` | Design decision — add parameter option | LOW |
| **U8** | No validation control parameter on `previewForm` | `evaluation-helpers.ts:199` | Code fix (add options param) | LOW |
| **U10** | Layout response summary lacks target paths | `project.ts:2855` | Code fix (include paths in summary) | LOW |
| **U11** | `_SAMPLE_VALUES` is a static constant table | `project.ts:4326-4339` | Code fix (constraint-aware generation) | LOW |

### Layer 5 — Core (expression-index, tree operations)

| ID | Issue | Root File:Line | Fix Type | Severity |
| -- | ----- | -------------- | -------- | -------- |
| **U6** | No "did you mean" for partial path matches in repeat context | `expression-index.ts:87-95` | Code fix (~10 lines) | MEDIUM |
| **U12** | No fuzzy match for unknown function names | `expression-index.ts:147-161` | Code fix (~15 lines) | LOW |

### Layer 2 — Rust catalog (fel-core)

| ID | Issue | Root File:Line | Fix Type | Severity |
| -- | ----- | -------------- | -------- | -------- |
| **U13** | `countWhere` signature says "predicate" without explaining `$` rebinding | `extensions.rs:82-86` | Catalog description update (3 lines) | MEDIUM |

### Layer 0 — Spec

| ID | Issue | Fix Type | Severity |
| -- | ----- | -------- | -------- |
| Wizard+relevant | Implicit behavior not explicitly stated in S4.1.2 | Add one normative sentence | LOW |

---

## Reclassified: B1 (Calculated Fields Null in Preview)

**Original classification:** HIGH bug in studio-core.

**Investigation finding:** The architecture correctly evaluates `calculate` in preview. Tests at `evaluation-helpers.test.ts:298-309` prove `sum($expenses[*].amount)` works. The `FormEngine` constructor runs `_evaluate()`, then `loadDataIntoEngine` triggers re-evaluation for each scenario value.

**New classification:** **Cannot confirm as a bug.** Most likely cause: persona scenario data didn't include the dependency fields that the calculate expression references (causing correct `null` evaluation), OR the bind wasn't properly wired via `project.calculate()`. Needs a concrete reproduction with specific definition + scenario data to pinpoint.

**Action:** Downgrade to INVESTIGATE. Reproduce with one of the actual chaos-test definitions (e.g., David's budget request or Rina's faculty survey) against the preview handler.

---

## Layer Heatmap (Revised)

| Layer | Issues | Code Fixes | Description Fixes | Severity |
| ----- | ------ | ---------- | ----------------- | -------- |
| **MCP** (descriptions + schemas) | 14 | 3 | 11 | 2 HIGH, 7 MEDIUM, 5 LOW |
| **Studio-core** (Project/eval) | 9 | 9 | 0 | 0 HIGH, 3 MEDIUM, 6 LOW |
| **Core** (expression-index) | 2 | 2 | 0 | 0 HIGH, 1 MEDIUM, 1 LOW |
| **Rust** (fel-core catalog) | 1 | 1 | 0 | 0 HIGH, 1 MEDIUM |
| **Spec** | 1 | 0 | 1 | 0 HIGH, 0 MEDIUM, 1 LOW |

**Key insight:** MCP is the hottest layer by far, but most MCP fixes are **description rewrites** (11 of 14), not code changes. The studio-core layer has the most actual code bugs (9). The deepest layers (Core, Rust, Spec) have minimal issues.

---

## Tech Debt Patterns

1. **Preview is a second-class citizen.** Four studio-core issues (B5, B7, U8, U11) stem from the same root: `previewForm` and `generateSampleData` were built as quick utilities without the full engine-like rigor. Page status is hardcoded, validation timing isn't configurable, sample data is static.

2. **MCP tool descriptions are siloed.** Each tool's description was written independently. Cross-tool concepts (path syntax, nesting semantics, guide workflow) aren't documented consistently. This is the root of U1, U2, U4, U5.

3. **"Did you mean?" is missing throughout.** Both `expression-index.ts` reference resolution (U6) and function resolution (U12) lack suggestion logic. The Rust FEL parser also doesn't suggest alternatives. This is one class of improvement across two files.

4. **All "feature gaps" are MCP exposure gaps.** The spec is comprehensive. The MCP tool descriptions and handlers don't surface all capabilities (Signature, Summary, page-level relevant, calculate+Text pattern).

---

## Dependency Violations

None found. All proposed fixes respect layer direction. No deeper layer needs to know about shallower layers.

---

## Recommended Fix Order

**Phase A — Highest leverage, lowest risk (description rewrites):**
1. U1: Add FEL syntax guidance to `formspec_behavior`
2. U2: Standardize nesting guidance across all tools, especially `formspec_page`
3. U5: Add repeat scope documentation to `formspec_fel`
4. U4: Cross-reference guide and create
5. U3: Improve save error message
6. G1-G5: Expose spec capabilities in MCP tool descriptions

**Phase B — Studio-core code fixes (medium risk):**
7. B7: Derive page status from relevance/validation (evaluation-helpers.ts:312)
8. B8: Add global key uniqueness check (project.ts:694)
9. B6: Fix Grid parent to use common ancestor (project.ts:2817)
10. B2: Either expand humanizer or add `supported` boolean + document limitation

**Phase C — Core/Rust improvements (low risk, high value):**
11. U6 + U12: Add "did you mean" suggestions for paths and functions (expression-index.ts)
12. U13: Update countWhere catalog description (extensions.rs)

**Phase D — Preview improvements (batched, medium risk):**
13. B5 + U8: Add validation mode parameter to previewForm
14. B4 + U11: Improve generateSampleData (constraint-aware, relevance-aware)

**Phase E — Low priority:**
15. B3: Fix screener response formatting
16. U7: Soften accessibility audit noise
17. U9: Add batch mode to formspec_update
18. U10: Include paths in layout response summary
