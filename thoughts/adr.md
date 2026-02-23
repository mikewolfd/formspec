# THOUGHTS.md — Document Audit & Review

**Generated:** 2026-02-23
**Scope:** All planning docs, proposals, ADRs, and audit files — now consolidated in `docs/adr/`.

---

## Table of Contents

| ADR | File | Status Header | Notes |
|-----|------|---------------|-------|
| 0001 | [0001-linter-policy-and-modes.md](docs/adr/0001-linter-policy-and-modes.md) | Accepted | Active; fully implemented |
| 0002 | [0002-presentation-layer-approach-a.md](docs/adr/0002-presentation-layer-approach-a.md) | Superseded | Adopted as Tier 1 in `spec.md` §4.2.5 |
| 0003 | [0003-presentation-layer-approach-b.md](docs/adr/0003-presentation-layer-approach-b.md) | Superseded | Adopted as `theme-spec.md` |
| 0004 | [0004-presentation-layer-approach-c.md](docs/adr/0004-presentation-layer-approach-c.md) | Superseded | Adopted as `component-spec.md` |
| 0005 | [0005-tier1-presentation-hints-plan.md](docs/adr/0005-tier1-presentation-hints-plan.md) | Implemented | All 22 tasks complete |
| 0006 | [0006-tier1-revised-plan.md](docs/adr/0006-tier1-revised-plan.md) | Implemented | 111 tests passing |
| 0007 | [0007-tier2-theme-revised-plan.md](docs/adr/0007-tier2-theme-revised-plan.md) | Implemented | 201 tests; runtime cascade gap |
| 0008 | [0008-tier2-theme-implementation-plan.md](docs/adr/0008-tier2-theme-implementation-plan.md) | Implemented | Simplifications vs plan (flat tokens, 3-level cascade) |
| 0009 | [0009-tier3-component-plan.md](docs/adr/0009-tier3-component-plan.md) | Implemented | Test gap: 111 of ~450 planned |
| 0010 | [0010-tier3-component-revised-plan.md](docs/adr/0010-tier3-component-revised-plan.md) | Implemented | `accessibility` spec-schema drift |
| 0011 | [0011-hardening-plan.md](docs/adr/0011-hardening-plan.md) | Partially Implemented | PathResolver stub + innerHTML wipe remain |
| 0012 | [0012-schema-review.md](docs/adr/0012-schema-review.md) | Implemented | 3 spec example fixes remain |
| 0013 | [0013-audit-spec-vs-schema.md](docs/adr/0013-audit-spec-vs-schema.md) | Implemented | 200 FULL, 9 PARTIAL, 3 MISSING |
| 0014 | [0014-llm-spec-generation-plan.md](docs/adr/0014-llm-spec-generation-plan.md) | Implemented | CI enforcement not yet wired |
| 0015 | [0015-e2e-testing-plan.md](docs/adr/0015-e2e-testing-plan.md) | Implemented | 4 missing FEL functions remain |

---

## Cross-Cutting Findings

Before the per-file reviews, here are the **recurring themes** that surfaced across multiple documents:

### Runtime gaps in the web component
The single biggest finding across all reviews: the TypeScript web component (`packages/formspec-webcomponent/`) accepts theme and component documents but **barely uses them at render time**. Specifically:
- Theme cascade (defaults -> selectors -> items) is **not implemented** in the renderer. Only `$token.` resolution works.
- Page/region layout from the theme spec has no runtime implementation.
- 12 of 33 spec'd components have no renderer implementation (FileUpload, Divider, Collapsible, Columns, Accordion, MoneyInput, Slider, Rating, Signature, ProgressBar, Panel, Modal).
- Presentation hints from Tier 1 are stored but not consumed during rendering.

### Test coverage shortfalls
Multiple plans projected ambitious test counts that were partially delivered:
- Component tests: ~111 delivered vs ~450 planned (tier3-component-plan) / ~229 planned (tier3-revised)
- Missing categories: repeatable group binding, cross-tier interaction, responsive merge, exhaustive compatibility matrix

### Spec example drift
The canonical `spec.md` (particularly §7 / spec-part3 examples) still contains stale patterns:
- `"choices"` instead of `"options"`
- `"targets"` (plural array) instead of `"target"` (singular string)
- Boolean `required`/`readonly` instead of string `"true"`/`"false"`
- `derivedFrom` as array of strings vs the schema's string-or-object

### Duplicate `validator/` package
Both `/home/exedev/formspec/validator/` and `/home/exedev/formspec/src/validator/` contain identical copies of 13 source files. This violates DRY and creates drift risk.

---

## Per-File Reviews

### 1. `docs/adr/0012-schema-review.md`

**What it is:** A cross-reference audit (2025-07-11) of `definition.schema.json` and `response.schema.json` against the core spec. Catalogues 18 issues across four categories with a prioritized action list.

**Implementation status:** ~85% resolved. All high-priority structural schema fixes are done (Group `$ref`/`keyPrefix`, separate response fields, `derivedFrom` type evolution, Instance `description`/`source` format, `extensions` `propertyNames`, `validationReport.schema.json` created, Shape `id` pattern expanded).

**What's NOT done:**
- `spec-part3.md` examples still use `"choices"` (not `"options"`) at lines 95, 808, 819
- `spec-part3.md` still uses `"targets"` (plural array) instead of `"target"` (singular string) at lines 160, 511, 518, 525, 718, 1246
- `spec-part3.md` still has boolean `required`/`readonly` in Bind examples

**Assessment:** Excellent, well-executed review. The schemas are now sound. Only spec example cleanup remains.

**Verdict:** **Act on it** — fix the three remaining spec example issues, regenerate `*.llm.md`, then archive.

---

### 2. `docs/adr/0003-presentation-layer-approach-b.md`

**What it is:** Proposal for a sidecar theme document architecture — separate `.theme.json` files governing widget selection, design tokens, page layout, and styling.

**Implementation status:** Core proposal adopted and substantially implemented. The Theme Specification (`specs/theme/theme-spec.md`), JSON Schema (`schemas/theme.schema.json`), and 201 Python conformance tests all exist. Token syntax changed from `{token.path}` to `$token.<key>`. Path-pattern selectors were dropped. Widget names are camelCase (not kebab-case).

**What's NOT done:** Theme cascade is not applied at runtime in the web component. Theme inheritance (`extends`) was deferred.

**Assessment:** Good proposal, well-executed. Superseded by the formal spec which is strictly better.

**Verdict:** **Archive** — superseded by `specs/theme/theme-spec.md`.

---

### 3. `docs/adr/0008-tier2-theme-implementation-plan.md`

**What it is:** Detailed implementation plan for building the Tier 2 Theme specification. 4 phases, targeting ~447 tests across 16 test files.

**Implementation status:** Executed with deliberate simplifications. Spec: 1,110 lines (plan projected 2,800–3,400). Schema: 287 lines (plan projected 550–700). Tests: 171 (plan projected ~447). Flat tokens replaced DTCG format. 3-level cascade replaced 4-level. Theme inheritance (`extends`) deferred.

**What's NOT done:** Path-pattern selectors, theme inheritance, E2E Playwright tests for themes, runtime cascade in the web component.

**Assessment:** The simplifications were improvements. The plan served its purpose.

**Verdict:** **Archive** — the spec is the canonical source now.

---

### 4. `docs/adr/0006-tier1-revised-plan.md`

**What it is:** Detailed plan for adding presentation hints to the core spec — `formPresentation` root object and per-item `presentation` object.

**Implementation status:** **Fully implemented.** `definition.schema.json` has `formPresentation` and `$defs/Presentation`. `spec.md` has §4.1.1 and §4.2.5. `test_presentation_hints.py` has 111 passing tests. AD-02 rewritten. Requirements PR-01 through PR-07 tracked.

**Assessment:** Good idea, well executed. The `additionalProperties: true` at the top-level `presentation` object is the correct forward-compatibility call.

**Verdict:** **Archive / mark done.** Nothing left to implement.

---

### 5. `docs/adr/0005-tier1-presentation-hints-plan.md`

**What it is:** Earlier version of the Tier 1 presentation hints plan, framing them as one of three competing approaches (A/B/C).

**Implementation status:** **Fully implemented.** All concepts are normative in `spec.md`, `definition.schema.json`, and referenced by both Theme and Component specs. The three-tier cascade (hints < theme < component) is the adopted architecture.

**Assessment:** Sound design, correctly adopted. The "90% solution" framing was accurate — it handles most cases with minimal complexity.

**Verdict:** **Archive** — move to `docs/adr/` as a decision record.

---

### 6. `docs/adr/0011-hardening-plan.md`

**What it is:** Post-prototype pivot document. Identified four categories of technical debt in the spike implementation and proposed replacements: AST interpreter for FEL, component registry, JSON Pointer paths, reactive diffing engine.

**Implementation status:**
- **FEL AST Interpreter: DONE** — Full Chevrotain pipeline, zero `eval`/`new Function`.
- **Component Registry: DONE** — Clean `register()`/`get()` pattern in `registry.ts`.
- **JSON Pointer Path Resolver: PARTIALLY DONE** — `PathResolver` exists but still splits on dots/brackets with TODO comments. Does not implement RFC 6901.
- **Reactive Reconciliation: NOT DONE** — Web component still calls `this.innerHTML = ''` on every render. No `lit-html` or Preact templates. Focus loss and re-render thrashing remain.

**Assessment:** The problems it identified were real. 2 of 4 pillars are fully resolved, 2 have significant gaps.

**Verdict:** **Act on it** — the PathResolver stub and innerHTML wipe are the most significant residual technical debt. Fix or consciously defer with documented rationale.

---

### 7. `docs/adr/0009-tier3-component-plan.md`

**What it is:** Pre-implementation plan for the Component Specification. 33 built-in components, `if/then` schema discrimination, slot binding, ~450-test suite.

**Implementation status:** Substantially implemented with refinements. Spec exists (3,227 lines). Schema exists (715 lines). Components split into Core (18) + Progressive (15). Discriminator changed from `"type"` to `"component"`. `AccessibilityBlock` added (not in plan).

**What's NOT done:**
- `Popover` component missing from schema and renderer
- Test coverage: 111 delivered vs ~450 planned (~75% gap)
- 12 Progressive components have no renderer implementation
- Missing test categories: repeatable group binding, responsive merge, cross-tier, exhaustive compatibility matrix

**Assessment:** Good plan, well executed. The Core/Progressive split was an improvement over the flat four-category approach.

**Verdict:** **Archive** — extract `Popover` gap and test coverage shortfall as separate tasks.

---

### 8. `docs/adr/0007-tier2-theme-revised-plan.md`

**What it is:** Post-review execution plan for the Theme Specification. 24-task sequence, ~200 tests target, deliberate scope reduction from an overengineered first draft.

**Implementation status:** **Fully executed.** Spec: 1,110 lines. Schema: 287 lines. Tests: 201 (exceeding the ~200 target). All four phases complete. Cross-references in `spec.md` present.

**What's NOT done:** Runtime cascade in the web component (token resolution works, but defaults/selectors/items merge does not).

**Assessment:** Excellent execution. The post-review scope reduction was the right call.

**Verdict:** **Archive** — runtime cascade gap should be tracked separately.

---

### 9. `docs/adr/0010-tier3-component-revised-plan.md`

**What it is:** Post-review implementation plan for the Component Specification. Scope-reduced from a draft that received 14 review issues. 25 tasks, 4 phases, ~229 tests target.

**Implementation status:** Substantially implemented. Spec, schema, and initial tests all exist and pass. 111 tests delivered (vs ~229 planned). `AccessibilityBlock` added to all components post-plan.

**What's NOT done:**
- Test gap: ~118 missing tests (bind resolution, repeatable groups, cross-tier, conformance levels)
- 12 components missing from web component renderer
- `accessibility` documented in schema but NOT in spec §3.1 base properties table (spec-schema drift)
- Debug `console.log` on line 229 of `index.ts` (cycle detection)

**Assessment:** Sound design decisions (global-key binding, Core/Progressive split, structural cycle detection). The `{param}` ABNF grammar prevents injection issues.

**Verdict:** **Archive** — extract the three follow-up items as tasks.

---

### 10. `docs/adr/0002-presentation-layer-approach-a.md`

**What it is:** Original proposal for inline presentation hints in the Definition. Four sub-objects: `widgetHint`, `layout`, `styleHints`, `accessibility`.

**Implementation status:** **Fully adopted** as normative Tier 1. Schema, spec, and tests all implement it. Theme and Component specs both reference it as the cascade baseline.

**Assessment:** Aged well. Clean design, correctly scoped as "90% solution." The `x-` extension mechanism is consistent with the rest of the spec.

**Verdict:** **Archive** — move to `docs/adr/` as a historical decision record.

---

### 11. `docs/adr/0004-presentation-layer-approach-c.md`

**What it is:** Proposal for a full component-tree-based presentation layer. ~30 built-in components, slot binding, custom component registry, FEL conditionals, responsive breakpoints, design tokens.

**Implementation status:** **Adopted** as the Component Specification. All core concepts implemented. Refinements: `Popover` dropped, `Signature` added, `AccessibilityBlock` added universally, `ConditionalGroup.fallback` simplified from children array to string.

**Assessment:** Correctly identified that hint-based approaches can't handle structural reorganization. Sound proposal, faithfully adopted.

**Verdict:** **Archive** — move to `docs/proposals/` alongside approach-a for consistency. Currently inconsistently placed at `docs/` root.

---

### 12. `docs/adr/0013-audit-spec-vs-schema.md`

**What it is:** Comprehensive gap analysis (2026-02-22) comparing all specs against their JSON Schemas. 261 tracked features. Final tally: 200 FULL, 9 PARTIAL, 3 MISSING, 49 N/A.

**Implementation status:** All 11 original top issues verified as resolved. 3 remaining MISSING items are JSON Schema fundamental limitations (acknowledged). 9 PARTIAL items are accepted trade-offs.

**Key decisions documented:** `mustUnderstand` removed, `labelOverride`/`hintOverride` removed, `bind` removed from layout containers, `null` replaced by `"none"` sentinel, `derivedFrom` changed to oneOf, `changelog.schema.json` created.

**Assessment:** Thorough and accurate. No drift between audit claims and actual codebase state.

**Verdict:** **Archive** — move to `docs/adr/` as a completed audit record.

---

### 13. `docs/adr/0001-linter-policy-and-modes.md` (unchanged)

**What it is:** ADR establishing a two-mode severity policy for the linter: `authoring` (lenient) and `strict` (CI-grade). Four escalation codes: W800, W802, W803, W804.

**Implementation status:** **Fully implemented.** `policy.py`, `component_matrix.py`, CLI `--mode` flag, and targeted tests all present and passing.

**Assessment:** Strong architectural decision. Centralized policy transform is the correct pattern — individual passes emit at natural severity, policy layer applies mode transforms.

**Concern:** Duplicate `validator/` tree (root-level copy + `src/` copy) is a maintenance smell.

**Verdict:** **Keep** — still relevant, actively used. Fix the duplicate `validator/` tree separately.

---

### 14. `docs/adr/0014-llm-spec-generation-plan.md`

**What it is:** Design and execution plan for the LLM doc generation workflow. AST-based markdown extraction with `<!-- llm:omit -->` markers, `*.llm.md` output, CI enforcement.

**Implementation status:** **Fully implemented.** `scripts/generate-llm-specs.mjs` exists. All 4 npm scripts work. All 7 specs have markers and generated companions. Budget system (`llm-budgets.json`) added beyond the plan.

**What's NOT done:** CI enforcement (no `.github/` directory exists at all).

**Assessment:** Sound design, well executed. The budget system is a welcome addition.

**Verdict:** **Archive** — move to `docs/adr/` as `0002-llm-spec-generation.md`.

---

### 15. `docs/adr/0015-e2e-testing-plan.md`

**What it is:** Phased roadmap for E2E testing. Three-layer architecture (FormEngine, web component, Playwright). Six phases, five marked complete.

**Implementation status:** Phase 6 is marked "PENDING" but is ~90% complete. Most stdlib functions are implemented in `interpreter.ts`. Cyclic dependency detection is implemented (with a stale `console.log`).

**What's genuinely NOT done:**
- `countWhere` function
- `string()`, `boolean()`, `date()` cast functions
- Remote REST API binding for `choice` components
- Debug `console.log` on line 229 of `index.ts`

**Assessment:** The document is significantly stale — claiming Phase 6 is PENDING when 90% of it is done is misleading.

**Verdict:** **Act on it** — implement the 4 missing functions, remove the debug log, then delete the file.

---

## Recommended Actions Summary

### Immediate (fix these now)
1. Remove debug `console.log` at `packages/formspec-engine/src/index.ts:229`
2. Fix stale spec examples in `spec-part3.md`: `choices` -> `options`, `targets` -> `target`, boolean -> string for `required`/`readonly`
3. Deduplicate `validator/` — keep one copy, fix imports

### Short-term (new tasks)
4. Implement theme cascade resolution in the web component renderer
5. Implement the 12 missing component renderers (or at minimum the 2 Core ones: Collapsible, Divider)
6. Add `accessibility` to component-spec.md §3.1 base properties table
7. Implement `countWhere`, `string()`, `boolean()`, `date()` in FEL interpreter
8. Replace `PathResolver` stub with proper implementation

### File disposition (DONE)
All 14 documents archived to `docs/adr/` with ADR-numbered filenames and consistent status headers.
`project/`, `project/plans/`, `project/proposals/`, `docs/proposals/` directories removed.
Only `docs/adr/0001-linter-policy-and-modes.md` kept in its original state.
