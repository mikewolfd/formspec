# ADR 0033: Core Semantics Conformance Matrix

## Status
Accepted

## Decision

Use a small, explicit conformance matrix to track the highest-risk
cross-runtime semantics from the canonical Formspec Core specification.

The machine-readable inventory at
`tests/conformance/core-semantics-matrix.json` is canonical for:

- case IDs,
- priority,
- runtime status,
- and concrete test linkage.

This ADR records:

- what the matrix is for,
- which spec text governs it,
- which row-level contracts are currently in scope,
- and which design choices are now canonical for the previously ambiguous areas.

As of matrix version `2026-03-05`, the inventory contains 25 rows total:

- 6 P0 rows,
- 16 P1 rows,
- 3 P2 rows.

The current JSON inventory marks:

- 22 rows as `implemented` in both runtimes,
- and 3 rows as `planned` in both runtimes.

This ADR treats that as the declared inventory state, not as a substitute for
running the suites.

## Why

The fragile parts of Formspec are not top-level schema shape. They are runtime
contracts where the TypeScript engine and Python evaluator can plausibly drift:

- repeat-targeted Shape expansion,
- row-scoped FEL evaluation,
- non-relevant suppression,
- `nonRelevantBehavior` versus `excludedValue`,
- creation-time initialization versus re-relevance defaults,
- severity-driven validity,
- repeat cardinality reporting,
- variable scope,
- and FEL null/type/repeat semantics.

The canonical spec is also dense enough that drift can come from the document
itself, not only from implementation bugs. The rule sections in `specs/core/spec.md`
and the example sections in the same file do not always say the same thing.
That makes a narrow, explicit matrix more useful than a broad "we cover the
spec" claim.

## Canonical Source Rule

The normative source for this ADR is the canonical markdown:

- `specs/core/spec.md`
- `specs/fel/fel-grammar.md`

The generated `*.llm.md` artifacts are convenience views, not alternate
authorities. If a generated file, summary table, or example fragment disagrees
with the canonical rule sections, the matrix MUST resolve the behavior in favor
of the canonical rule sections and record the inconsistency explicitly.

This matrix is therefore a policy for interpreting the current spec, not merely
an extraction of whichever wording happens to be easiest to cite.

## Scope

This matrix is intentionally bounded. It is not a full Core or Extended
conformance checklist for §1.4 of the spec. It still centers on the runtime
semantics most likely to drift between Python and the TypeScript engine, but it
now also carries a small, explicitly prioritized set of planned rows for
adjacent Core and Extended conformance obligations.

Anything not named in the inventory remains out of scope by default. The matrix
still does not attempt to mirror the entire specification mechanically.

## Current Inventory

The table below restates the current 25 matrix rows in canonical-spec language.
Case IDs and statuses come from the JSON inventory; the contract wording here
is normalized to the canonical prose where the JSON summaries are looser or
example-shaped.

| Case ID | Priority | Contract |
|---|---|---|
| `shape-repeat-targets` | P0 | Wildcard Shape targets resolve to concrete ValidationResult paths with concrete 0-based indexes, never `[*]`. |
| `shape-row-scope` | P0 | Repeat-targeted Shape `constraint` and `activeWhen` evaluate once per matched row using that row's lexical scope. |
| `nonrelevant-suppression` | P0 | Non-relevant nodes emit no ValidationResults, including required, type, constraint, and Shape findings, and stale results are removed when a node becomes non-relevant. |
| `nrb-vs-excluded-value` | P0 | `nonRelevantBehavior` controls serialized Response output; `excludedValue` controls what downstream FEL reads for non-relevant user-input fields while `calculate` continues in memory. |
| `shape-timing-submit` | P0 | `submit`-timed Shapes are skipped during continuous validation and enforced on submit, subject to the global validation mode override. |
| `response-pinning-version-substitution` | P0 | Responses validate only against their pinned definition version; processors must not silently substitute another version and must error when the pinned version is unavailable. |
| `bind-context-null-semantics` | P1 | Null results in Bind boolean contexts coerce per §3.8.1: `relevant` → `true`, `required` → `false`, `readonly` → `false`, `constraint` → pass. |
| `fel-null-and-logic-semantics` | P1 | General FEL uses null propagation, boolean-only logical and conditional semantics, and no host-language truthiness. |
| `fel-type-discipline-semantics` | P1 | FEL rejects cross-type and wrong-type operands, undeclared `@instance()` references, non-FEL operator aliases such as `div`, and bare aggregate field paths without the standard `$` field-reference sigil. |
| `fel-complex-value-semantics` | P1 | Money equality, membership, array element-wise execution, and scalar broadcast follow FEL value semantics rather than object identity or scalar-only evaluation. |
| `fel-repeat-navigation-semantics` | P1 | `@current`, `@index`, `@count`, `prev`, `next`, `parent`, and `countWhere` rebinding use repeat-row scope and collection-aware dependencies; `@index` is 0-based, and out-of-context navigation is a spec error, not an alternate access mode. |
| `fel-explicit-repeat-index-semantics` | P1 | Explicit repeat indices in FEL field references and MIP queries are 0-based at the spec surface, matching resolved ValidationResult paths and JSON array indexing. |
| `default-relevance-transition` | P1 | Bind `default` is a re-relevance action, not a reactive `calculate` and not a creation-time initializer. |
| `creation-time-initializers` | P1 | Item `initialValue` and `prePopulate` run once at Response or repeat-instance creation time and do not recalculate thereafter. |
| `cross-field-shapes-vs-bind-locality` | P1 | Bind `constraint` is field-local; aggregate, exclusivity, group, and form-wide rules belong to Shapes. |
| `severity-validity-aggregation` | P1 | Only error-severity results make a ValidationReport invalid or block `completed` status; warning and info remain reportable and counted. |
| `repeat-cardinality-results` | P1 | Repeat `minRepeat` and `maxRepeat` violations emit `cardinality` results using `MIN_REPEAT` and `MAX_REPEAT`. |
| `definition-schema-acceptance` | P1 | Schema-valid FormDefinition documents are accepted without spurious processor errors during load and validation setup. |
| `fel-builtin-availability-signaling` | P1 | Core FEL built-ins are implemented or rejected with an explicit unsupported-function error rather than being silently ignored. |
| `data-source-load-before-rebuild` | P1 | URL-backed data sources load before the first Rebuild phase, load failures surface as errors, and secondary instances remain read-only to calculate targets. |
| `screener-routing-first-match` | P1 | Screener routes evaluate in declaration order, the first true condition wins, and screener items stay out of the main instance data. |
| `extension-preservation-ignore-semantics` | P1 | Unknown extension properties are ignored semantically, preserved on round-trip, and must not alter core behavior. |
| `scoped-variables-lexical-scope` | P2 | Variables use `@name` references and `scope: "#"` for definition-wide visibility, recalculate continuously, and resolve by declared lexical scope plus nearest-scope ancestry rather than as flat globals. |
| `modular-ref-assembly-rewrite` | P2 | `$ref` assembly recursively imports referenced definitions, rewrites keys and dependent paths for `keyPrefix`, and errors on collisions or circular chains. |
| `version-migration-semantics` | P2 | Migration maps produce a new response pinned to the target version, preserve the original response, and apply carry-forward and status-reset rules deterministically. |

## Operational Rule

No new high-risk runtime semantic should be added without one matrix row.
No implementation change to an in-scope semantic should land without updating:

1. the machine-readable matrix,
2. at least one Python test,
3. at least one TypeScript engine test, or an explicit `planned` status in the matrix.

The ADR should be updated only when the JSON inventory changes in a way that
affects scope, interpretation policy, or maintenance rules. Per-case test file
lists and fine-grained anchors still belong in the JSON inventory.

## Current State

- The current machine-readable snapshot is `tests/conformance/core-semantics-matrix.json` version `2026-03-05`.
- That snapshot currently declares 22 rows implemented in both runtimes and 3 additional rows planned in both runtimes.
- The current JSON still uses a mix of canonical and generated spec anchors; the canonical markdown remains controlling.
- This ADR revision aligns the scope language with the canonical spec, folds the adopted design choices into the inventory rows themselves, and integrates the formerly out-of-scope items as a priority-ordered planned backlog.

## Next Expansions

1. Convert the new planned rows to `partial` or `implemented` in priority order instead of growing the matrix further by default.
2. Normalize JSON `specRefs` toward `specs/core/spec.md` and `specs/fel/fel-grammar.md` instead of relying primarily on generated `*.llm.md` anchors.
3. Split repeat-navigation happy-path semantics from out-of-context diagnostics if implementations begin diverging on definition-error behavior.
4. Keep future §7 example edits synchronized with the rule sections so the matrix does not become a backstop for spec drift again.
