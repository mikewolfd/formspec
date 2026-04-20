# Formspec — Consolidated TODO

**Validated 2026-04-19.** Items #29, #30, #31, #32 all landed in the 2026-04-19 batch. All 29 previously-draft lint rules now graduated (37 total tested, 0 draft). See "Resolved" section below and git log.

## Open

_(No open items.)_

## Track / Monitor

### 14. `materializePagedLayout` — by design
- **Source**: editor/layout split review
- **File**: `packages/formspec-studio/src/workspaces/layout/LayoutCanvas.tsx:361-380`
- **Status**: Guarded by `useRef<boolean>` flag — no-op after first call. Negligible overhead.

### 19. Component tree reconciles on every dispatch
- **Source**: editor/layout split review
- **File**: `packages/formspec-core/src/raw-project.ts:350-373`
- **Action**: Monitor. Resolution path documented: add dirty flag. Not yet implemented.

### LayoutContainer dual-droppable
- **Source**: layout DnD review (2026-04-07)
- **File**: `packages/formspec-studio/src/workspaces/layout/LayoutContainer.tsx:194-209`
- **Status**: `useSortable` + `useDroppable(container-drop)` on same element. No code change until a mis-hit is reproduced.

## Resolved

<details>
<summary>Resolved 2026-04-19 batch (click to expand)</summary>

- **#30** — Changelog snake→camel boundary hardened. `generate_changelog` Python binding now accepts `wire_style="snake" | "camel"`; `change_to_object` in `crates/formspec-core/src/json_artifacts.rs` skips None for optional string fields so camel output matches `changelog.schema.json` directly. `_changelog_snake_to_camel` helper + 52 LOC of private allowlist deleted from `validate.py`. 8 new tests (5 Python, 3 Rust) pin the contract.
- **#31** — Release-pipeline scripts now have 22 tests across `scripts/tests/` (8 filter + 10 placement + 4 CLI subprocess). Scripts refactored to export pure `filterForTier` / `restoreFromScratch` / `checkPlacement` functions with CLI guards. CLI behavior preserved byte-for-byte.
- **#32** — Registry assertion at `tests/unit/test_lint_rule_registry.py` extracted into `_check_diagnostics_against_registry` that iterates all matching diagnostics instead of picking `matching[0]`. 5 new unit tests pin divergent-emission detection with per-emission locator.
- **#29 fully closed** — all 29 previously-draft lint rules graduated to `tested` with triggering fixtures and `with_metadata`-wrapped emission sites. Six sub-batches over the 2026-04-19 session:
  1. Structural (5): E200, E201, E301, E302, E710.
  2. FEL parse failure (1): E400.
  3. Theme value + paired-artifact (7): W700, W701, W708, W705, W706, W707, W711.
  4. Component (7): E800, E801, E802, E803, E806, E807, W801.
  5. Document type + extension lifecycle (3): E100, E601, E602.
  6. Final six decision-blocked graduations: W702/W703 via platform-token catalog extension (`font.weight.*`, `font.lineHeight.*` added to `crates/formspec-lint/schemas/token-registry.json`); W709 via title+fix correction (per-token semantic now matches the Rust emission); W803 via title correction ("Multiple editable inputs bind to the same field"); W804 via title correction + README fix (Python never emitted it — the "Summary/DataTable" reference was stale doc); E804 via `variant: "plain" | "richtext" | "markdown"` prop added to TextInput schema + spec §5.6 + Rust rewrite.
- **Registry bug fixes landed alongside:**
  - E806 title: "Duplicate bind in component tree" → "Custom component instance missing required param" (copy-paste fossil from W804).
  - W801 title: "Input component missing required bind" → "Layout/container component should not declare a bind" (same fossil class).
  - W709 suggestedFix: removed misleading "remove it from the registry" clause.
- **Harness extensions:** `_registryDocuments` opt-in added to `tests/unit/test_lint_rule_registry.py` for E601/E602; obsolete `draft_codes_return_none` and `with_metadata_passes_draft_codes_through` Rust unit tests removed (no drafts remain; invariant noted in-source).
- **Schema additions:** `variant: "plain" | "richtext" | "markdown"` on TextInput in both `schemas/component.schema.json` and `crates/formspec-lint/schemas/component.schema.json`. Spec §5.6 documents serialization semantics for each variant.
- **Baselines:** 300 Rust lint tests green, 13/13 registry tests green, 1986 Python tests green.

</details>

<details>
<summary>Resolved 2026-04-17 parallel-craftsman batch (click to expand)</summary>

- **#22** — FEL trace bridge through WASM → Python → TS → MCP. 5 commits (`e72f9843`, `9a46698c`, `b890ec5c`, `edbe2ca3`, `058e385d`). New MCP tool `formspec_fel_trace` returns `TraceStep[]` byte-identical to Rust.
- **#23** — `benchmarks/run_mcp_loop.py`. Commit `a4b7dd1c`. Verified end-to-end: converged to `score=1.0 / validates=true` in one round on the invoice task.
- **#24** — Tier-split release pipeline with scripted partitioning + per-tier sequential CI. Commits `78f8fc7b`, `95912f6e`, `364d3a96`. Four-tier dry-run matches COMPAT.md membership.
- **#25** — CI gate verified (test already in `python-tests` job); 8 on-disk fixtures + generic registry-driven assertion (commit `42004918`). Replaces 3 hand-crafted per-rule tests.
- **#26** — 29 draft rules carry verified `specRef` + `suggestedFix` (commit `003cd229`). State intentionally stays `draft`; graduation tracked in item #29 above.
- **#27** — Changelog E100 fix: `$formspecChangelog` envelope marker in generator + snake→camel translation at lint boundary + 4 round-trip conformance tests + benchmark widening (commits `2e110a54`, `78f82b1b`, `81df0d6d`, `67685ecf`). `grant-report` benchmark validates clean on base + long + short.
- **#28** — ADR-0064 landed in earlier session (`2fe42175` + `7ec2093e`); submodule pointer already current.

</details>

<details>
<summary>Resolved items from editor/layout split review (click to expand)</summary>

### Studio-core extraction review (batch)
- ~~Non-spec dataTypes in TYPE_MAP~~ — replaced with spec-normative types
- ~~`(project as any).core.dispatch()` x3~~ — added typed methods to Project
- ~~Missing `text` (Long Text) entry in FIELD_TYPE_CATALOG~~ — added
- ~~`item.choices` non-spec fallback~~ — removed, uses `options` only
- ~~Cross-package `default-theme.json` import~~ — added sub-path export
- ~~Unnecessary `@formspec-org/layout` dependency~~ — imports from `@formspec-org/types`
- ~~Incomplete re-export wrapper (`field-helpers.ts`)~~ — added missing exports
- ~~14 direct imports into `formspec-studio-core/src/`~~ — redirected
- ~~Duplicate test files~~ — deleted, canonical copies in studio-core

### Individual items
- **1.** ~~Screener `required` literal-only~~ — evaluates FEL via `evalFEL`
- **2.** ~~PascalCase widgetHints~~ — corrected to camelCase
- **3.** ~~JSON adapter `pretty` default~~ — changed to spec default `false`
- **4.** ~~Screener route heuristic fallback~~ — heuristic documented with trade-off comment
- **5.** ~~`lib/` re-export wrappers~~ — eliminated
- **6.** ~~`src/chat/` v1 dead code~~ — deleted
- **7.** ~~`PropertiesPanel.tsx` dead prototype~~ — deleted
- **8.** ~~`Spacer` invalid widgetHint~~ — moved to layout
- **9.** ~~ITEM_TYPE_WIDGETS missing `Tabs`~~ — added
- **10.** ~~Row summaries secondary bind properties~~ — `nonRelevantBehavior` pill added (keep/empty)
- **11.** ~~Missing CSV `encoding` option~~ — added
- **12.** ~~`isStudioGeneratedComponentDoc` comment~~ — JSDoc added
- **13.** ~~Story fixtures PascalCase~~ — corrected
- **15.** ~~`@faker-js/faker` prod dep~~ — removed
- **16.** ~~`COMPONENT_TO_HINT` Collapsible→accordion~~ — removed
- **17.** ~~Test file naming ambiguity~~ — renamed
- **18.** ~~Orphaned E2E spec~~ — moved
- **20.** ~~`SubmitButton` spec prose~~ — S5.19 added
- **21.** ~~`as any` casts in `project.ts`~~ — all 33 casts eliminated

</details>

<details>
<summary>Resolved items from chaos-test + DnD review + studio plans (click to expand)</summary>

- ~~ARCH-3: `analyze_fel_with_field_types` end-to-end~~ — full chain wired
- ~~Sigil hint ($name vs @name)~~ — `expression-index.ts:129` emits `FEL_SIGIL_HINT`
- ~~BUG-5: Shape per-row evaluation~~ — `shapes.rs:117-227` evaluates per-instance
- ~~UX-5: Theme token validation/listing~~ — `theme.ts:64`/`:73`
- ~~CONF-3: Variables in bind expressions~~ — `parseFEL` includes variables
- ~~addPage standalone-only refactor~~ — code matches plan
- ~~BUG-1: `parentPath` doubles path~~ — fixed in `_resolvePath`
- ~~BUG-2: Date comparison with `today()`~~ — coerces dates
- ~~BUG-4: Conditional required on calculated fields~~ — re-evaluates after calculate
- ~~BUG-6: Required fires on repeat template at 0 instances~~ — clears children
- ~~BUG-7: `remove_rule` ambiguous~~ — `removeValidation` normalizes target
- ~~BUG-8: `sample_data` ignores scenario~~ — `generateSampleData(overrides?)` added
- ~~BUG-9: Cross-document audit leaf key~~ — removed
- ~~BUG-10: Content items not findable by `placeOnPage`~~ — `_nodeRefForItem()` added
- ~~BUG-12: Save omits `status`~~ — includes `status: 'draft'`
- ~~BUG-13: Unknown `Checkbox` component~~ — mapped to `Toggle`
- ~~BUG-14: Unevaluated `widgetHint` on component nodes~~ — allowlist strips it
- ~~BUG-16: Repeat component unevaluated props~~ — allowlist strips them
- ~~UX-1 through UX-10~~ — all resolved (see git log)
- ~~CONF-1: Three parent-context mechanisms~~ — precedence notes in tool descriptions
- ~~CONF-2 / BUG-3: Money diagnostic gap~~ — `moneyAmount()` suggestions added
- ~~FIX 8: FEL rewrite for repeat wildcard shapes~~ — `rewriteFELReferences`/`rewriteMessageTemplate`
- ~~Sortable-only E2E test gap~~ — skip reasons documented
- ~~Layout DnD Findings 1, 3, 5~~ — all resolved

</details>
