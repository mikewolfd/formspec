# ADR-0021: Holistic Kitchen-Sink E2E Conformance Plan

**Status**: Proposed
**Date**: 2026-02-24
**Authors**: Codex (AI), exedev
**Deciders**: exedev

---

## 1. Context and Problem Statement

The project has strong point coverage across schema contracts, runtime behavior, and focused Playwright flows, but no single end-to-end scenario that proves the system works holistically across:

- authoring contracts (`definition`, `theme`, `component`, `mapping`, `registry`, `changelog`)
- runtime behavior (engine + web component + FEL + validation)
- response artifacts (`response`, `validationReport`)
- migration and cross-version behavior
- cross-implementation parity (TypeScript runtime vs Python runtime/tooling)

This ADR defines a kitchen-sink E2E plan for a greenfield codebase with zero backward-compatibility constraints.

## 2. Decision Drivers

- One authoritative holistic scenario, not only fragmented focused tests.
- Direct traceability to normative specs and `schemas/*.json`.
- Coverage aligned to `thoughts/feature-implementation-matrix.md`.
- Deterministic, reproducible outputs suitable for CI gating.
- Explicit separation of user action, system processing, and validation assertions.

## 3. Decision

Create a single orchestrated kitchen-sink E2E program with ordered phases. Each phase must define:

1. user steps (what the tester/author does)
2. system steps (what Formspec processors/renderers must do)
3. validation steps (what must be asserted and why)

This scenario complements, not replaces, focused integration/component tests.

## 4. Scope

The kitchen-sink bundle will include:

- `definition.v1.json` and `definition.v2.json`
- `theme.json`
- `component.json`
- `mapping.json`
- `registry.json`
- `changelog.json`
- canonical expected artifacts (`response` and `validationReport` snapshots)
- one deterministic event trace reusable by TS and Python parity runners

## 5. Normative References

### 5.1 Specifications

- Core: `specs/core/spec.llm.md`
- Definition: `specs/core/definition-spec.llm.md`
- Response: `specs/core/response-spec.llm.md`
- ValidationReport: `specs/core/validation-report-spec.llm.md`
- FEL grammar: `specs/fel/fel-grammar.llm.md`
- Theme: `specs/theme/theme-spec.llm.md`
- Component: `specs/component/component-spec.llm.md`
- Mapping: `specs/mapping/mapping-spec.llm.md`
- Extension registry: `specs/registry/extension-registry.llm.md`
- Changelog: `specs/registry/changelog-spec.llm.md`

### 5.2 Schemas

- `schemas/definition.schema.json`
- `schemas/response.schema.json`
- `schemas/validationReport.schema.json`
- `schemas/theme.schema.json`
- `schemas/component.schema.json`
- `schemas/mapping.schema.json`
- `schemas/registry.schema.json`
- `schemas/changelog.schema.json`

### 5.3 Coverage Matrix

- `thoughts/feature-implementation-matrix.md` (primary rough validation matrix)

## 6. Kitchen-Sink Phase Plan

### Phase 0: Bundle Contract Validation

User steps:
- author creates the full bundle (`definition/theme/component/mapping/registry/changelog`).

System steps:
- validate each artifact against the matching JSON Schema.
- resolve cross-document references (`targetDefinition`, `definitionRef`, version links).

Validation steps:
- hard-fail on schema violations or unresolved references.
- produce a contract report by artifact type.

Specs/schemas:
- definition/response/validation core references + all `schemas/*.json` listed in section 5.2.

### Phase 1: Static Semantic and Lint Gate

User steps:
- run semantic validator/lint on the authored bundle.

System steps:
- enforce checks not representable in JSON Schema (duplicate keys/paths, bind target resolution, shape target resolution, FEL syntax, dependency cycles, component structural constraints).

Validation steps:
- assert no blocking semantic errors.
- warnings remain visible and categorized.

Specs/schemas:
- `specs/core/spec.llm.md`, `specs/fel/fel-grammar.llm.md`, `specs/component/component-spec.llm.md`.
- matrix section 10 (Python validator codes).

### Phase 2: Browser Runtime Journey (User-Visible Flow)

User steps:
- complete a multi-page form flow with conditional sections, repeats, all key field types, and core+progressive components.

System steps:
- execute engine processing model (rebuild -> recalculate -> revalidate -> notify) on each mutation.
- apply Tier 1 + Theme + Component presentation precedence for rendering decisions.

Validation steps:
- assert DOM state and engine state alignment after each major interaction.
- assert relevance/required/readonly transitions and repeat cardinality behavior.

Specs/schemas:
- `specs/core/spec.llm.md` (processing model/MIPs), `specs/theme/theme-spec.llm.md`, `specs/component/component-spec.llm.md`.
- `schemas/definition.schema.json`, `schemas/theme.schema.json`, `schemas/component.schema.json`.

### Phase 3: FEL and Constraint Stress Path

User steps:
- trigger calculations with repeats, wildcard refs, null/coalesce behavior, and date/money/string/numeric function paths.

System steps:
- evaluate FEL according to grammar and type/null semantics.
- propagate evaluation errors as diagnostics with null semantics where required.

Validation steps:
- assert deterministic calculated values and constraint outcomes.
- assert no silent evaluator failure and correct error-to-null handling.

Specs/schemas:
- `specs/fel/fel-grammar.llm.md`, FEL sections in `specs/core/spec.llm.md`.
- matrix sections 4, 4.5, and 11.

### Phase 4: Response and ValidationReport Artifacts

User steps:
- save draft while invalid, then resolve errors and complete submission.

System steps:
- emit pinned response with `(definitionUrl, definitionVersion)`.
- emit standalone validation report snapshot.

Validation steps:
- assert save never blocked by validation state.
- assert completion only succeeds when error count is zero.
- assert `response` and `validationReport` both pass schema validation.

Specs/schemas:
- `specs/core/response-spec.llm.md`, `specs/core/validation-report-spec.llm.md`.
- `schemas/response.schema.json`, `schemas/validationReport.schema.json`.

### Phase 5: Mapping Forward/Reverse and Adapter Boundaries

User steps:
- export response to target schemas and attempt reverse import/round-trip.

System steps:
- execute mapping rule pipeline (priority, conditions, transforms, coercions, array modes, reverse overrides).
- apply adapter-specific serialization after structured mapping.

Validation steps:
- reversible paths round-trip exactly.
- non-reversible/lossy reverse paths are explicitly rejected.
- all mapping artifacts remain schema-valid.

Specs/schemas:
- `specs/mapping/mapping-spec.llm.md`.
- `schemas/mapping.schema.json`.

### Phase 6: Extension Registry Lifecycle Checks

User steps:
- load registry with stable and deprecated extension entries.

System steps:
- resolve extension metadata, category semantics, compatibility windows, and lifecycle notices.

Validation steps:
- malformed or conflicting registry entries are rejected.
- deprecated entries surface non-blocking diagnostics with required notices.

Specs/schemas:
- `specs/registry/extension-registry.llm.md`.
- `schemas/registry.schema.json`.

### Phase 7: Version Evolution and Migration

User steps:
- migrate a v1 pinned response to v2 using declared migration/changelog artifacts.

System steps:
- apply migration transforms/defaults to produce new response instance.
- retain original response unchanged.

Validation steps:
- migrated response is pinned to v2 and revalidated.
- original response remains pinned to v1.
- changelog `semverImpact` and change records are internally consistent.

Specs/schemas:
- `specs/registry/changelog-spec.llm.md`, migration/versioning sections in `specs/core/spec.llm.md`.
- `schemas/changelog.schema.json`, `schemas/response.schema.json`.

### Phase 8: TS vs Python Parity Replay

User steps:
- replay the exact same input event trace through TS and Python implementations.

System steps:
- run both evaluators/processors independently on the same scenario.

Validation steps:
- assert parity for data, computed values, and validation results.
- where numeric precision differs, require explicit tolerance documentation and deterministic comparison rules.

Specs/schemas:
- parity expectations in matrix section 11.
- FEL/core behavior from `specs/core/spec.llm.md` and `specs/fel/fel-grammar.llm.md`.

## 7. Matrix-to-Phase Mapping

- Matrix sections 1.1-1.9 (core definition/binds/shapes/instances/processing): phases 0-4
- Matrix section 2 (response): phase 4
- Matrix section 3 (validation report): phase 4
- Matrix sections 4 and 4.5 (FEL + stdlib): phases 3 and 8
- Matrix section 5 (theme): phase 2
- Matrix section 6 (component): phase 2
- Matrix section 7 (mapping): phase 5
- Matrix section 8 (registry): phase 6
- Matrix section 9 (changelog): phase 7
- Matrix section 10 (validator codes): phase 1
- Matrix section 11 (TS/Python parity): phase 8

## 8. Compensating Checks for Known Schema Limitations

The matrix identifies accepted partial/missing schema-representable rules. Kitchen-sink E2E must include explicit compensating runtime/lint checks for:

- `initialValue` literal vs `=expression` distinction
- mapping `definitionVersion` semantic range validity
- registry reserved prefix and `(name, version)` uniqueness
- registry lifecycle transition legality
- theme `widgetConfig` and component `responsive` policy constraints

## 9. Consequences

Positive:
- one holistic confidence signal for release readiness
- direct traceability from failure to spec clause and schema contract
- lower risk of passing isolated suites while failing integrated behavior

Tradeoffs:
- higher setup complexity than focused tests
- stricter fixture governance (single scenario change can impact many assertions)
- longer runtime unless split into gated stages for CI

## 10. Acceptance Criteria

- one command executes the full kitchen-sink program and emits a phase-by-phase report
- each phase emits assertion IDs mapped to matrix sections
- all produced artifacts are retained for triage (response/report/mapping outputs/parity diffs)
- failures are explicit and non-silent, with phase and contract reference in output

## 11. Non-Goals

- replacing focused integration/component unit suites
- introducing backward-compatibility shims for legacy fixtures
- broadening v1.0 semantics beyond existing normative specs

## 12. Implementation Follow-Up

If approved, implement in three increments:

1. fixture bundle + schema/semantic gate runner
2. browser kitchen-sink scenario + response/report assertions
3. mapping/registry/changelog/parity replay integration

## 13. Canonical User-Centric Superflow (Exhaustive)

This section treats the kitchen-sink scenario as one real user journey with intentional error/recovery loops.

### 13.1 User Persona

- Primary actor: operations coordinator completing a complex intake/order/compliance form.
- Secondary actor: reviewer submitting external validation findings.
- System actor: migration tool upgrading responses from v1 to v2.

### 13.2 Scripted Journey (KS IDs)

Each KS step must log: user action, engine state delta, validation delta, and emitted artifacts.

1. `KS-001` Open form from canonical `url/version`; assert pinned identity visible in debug metadata.
2. `KS-002` Verify initial hydration from definition-level `initialValue` and bind-level `default` semantics (default applies on re-relevance, not initial load).
3. `KS-003` Confirm secondary instances are loaded from inline data and URL source; reject writes to secondary instances.
4. `KS-004` Trigger `formspec-fn:` data source; assert callback wiring and read-only access.
5. `KS-005` Fill `string` and `text` fields with leading/trailing/multi-space data to exercise `whitespace` modes (`preserve`, `trim`, `normalize`, `remove`).
6. `KS-006` Fill `integer`, `decimal`, and conceptual numeric expression paths; assert type constraints and decimal behavior.
7. `KS-007` Toggle `boolean` fields controlling `relevant`, `readonly`, and `required` MIPs.
8. `KS-008` Enter `date`, `dateTime`, and `time`; assert valid parse and comparison binds.
9. `KS-009` Fill `uri` field with valid and invalid values; assert validation results.
10. `KS-010` Upload/attach file (`attachment`) and assert payload shape (`url/contentType/size`) in response data.
11. `KS-011` Select `choice` values from inline options.
12. `KS-012` Select `multiChoice` values and assert `selected()` function behavior.
13. `KS-013` Use top-level `optionSet` referenced by field; assert resolution and compatibility checks.
14. `KS-014` Exercise `optionSet` from external source and verify unmapped/empty behavior.
15. `KS-015` Navigate grouped and nested fields; verify dot-path bind resolution.
16. `KS-016` Add/remove repeat instances to hit `minRepeat` and `maxRepeat` boundaries.
17. `KS-017` In nested repeats, assert lexical scope for `$field`, `@current`, `@index`, and `@count`.
18. `KS-018` Use repeat wildcard refs (`[*]`) for element-wise math and aggregate calculations.
19. `KS-019` Use repeat navigation functions (`prev`, `next`, `parent`) in valid repeat context.
20. `KS-020` Force repeat navigation call outside repeat context and assert runtime diagnostic behavior.
21. `KS-021` Trigger calculate chain requiring multi-step stabilization; assert deterministic convergence and iteration guardrails.
22. `KS-022` Trigger one evaluation error each: divide-by-zero, invalid regex, index out-of-range, date overflow.
23. `KS-023` Assert evaluation errors become diagnostics with null-style propagation and form processing continues.
24. `KS-024` Exercise operator precedence, ternary, null coalescing, membership, and unary operators through authored expressions.
25. `KS-025` Exercise `if` short-circuit branch behavior (only selected branch evaluated).
26. `KS-026` Validate null semantics in MIP contexts (`relevant` null->true, `required` null->false, `readonly` null->false, `constraint` null->true).
27. `KS-027` Assert `required` fails for both `null` and empty-string where specified.
28. `KS-028` Assert `constraintMessage` appears in validation result payloads.
29. `KS-029` Validate shape constraints with `error`, `warning`, and `info` severities.
30. `KS-030` Validate shape composition (`and`, `or`, `not`, `xone`) including nested combinations.
31. `KS-031` Validate shape `activeWhen` gating.
32. `KS-032` Validate shape `timing` (`continuous`, `submit`, `demand`) under each global validation mode.
33. `KS-033` Inject external validation results and verify merge/idempotent replacement by path+code.
34. `KS-034` Flip controlling relevance off; verify non-relevant fields produce no validation results.
35. `KS-035` For non-relevant fields, verify `nonRelevantBehavior` modes (`remove`, `empty`, `keep`) including per-bind override.
36. `KS-036` For non-relevant fields, verify downstream expression visibility with `excludedValue` (`preserve` vs `null`).
37. `KS-037` Verify UI handling for `disabledDisplay` (`hidden` vs `protected`) without semantic drift.
38. `KS-038` Validate Tier 1 presentation hints are advisory only and do not alter data/validation semantics.
39. `KS-039` Apply theme cascade (`defaults -> selectors -> items`) and verify deterministic effective presentation.
40. `KS-040` Validate token resolution and fallback diagnostics for unresolved tokens.
41. `KS-041` Render component tree with core and progressive components; verify fallback substitution where needed.
42. `KS-042` Verify category rules (layout/container/input/display) and bind constraints.
43. `KS-043` Validate editable bind uniqueness (single editable component per key; display mirrors allowed).
44. `KS-044` Validate component `when` behavior versus core `relevant` behavior.
45. `KS-045` Validate responsive overrides across viewport breakpoints without changing component identity/bind semantics.
46. `KS-046` Validate custom component parameter interpolation and recursion/cycle rejection.
47. `KS-047` Save invalid response as `in-progress`; assert persistence is not blocked.
48. `KS-048` Attempt `completed` with error-level findings; assert rejection to completed state.
49. `KS-049` Resolve errors and submit; assert successful `completed` response.
50. `KS-050` Validate response artifact against `response.schema.json`.
51. `KS-051` Validate standalone validation report against `validationReport.schema.json`.
52. `KS-052` Export via mapping (forward JSON) with priorities, conditions, and mixed transforms.
53. `KS-053` Export via XML and CSV adapters; verify format-specific options and deterministic output.
54. `KS-054` Execute reverse mapping for reversible rules; assert round-trip fidelity.
55. `KS-055` Attempt reverse through lossy/non-reversible path; assert explicit rejection.
56. `KS-056` Validate mapping document and outputs against `mapping.schema.json` constraints.
57. `KS-057` Load extension registry entries for all categories (`dataType`, `function`, `constraint`, `property`, `namespace`).
58. `KS-058` Assert registry lifecycle behavior (`draft`, `stable`, `deprecated`, `retired`) and deprecation notices.
59. `KS-059` Assert malformed/duplicate/conflicting registry entries are rejected with diagnostics.
60. `KS-060` Validate changelog artifact (`fromVersion` -> `toVersion`) and `semverImpact` max-impact consistency.
61. `KS-061` Migrate pinned v1 response to v2 using declared migration rules/defaults.
62. `KS-062` Assert original response immutability and migrated response reset to `in-progress`.
63. `KS-063` Revalidate migrated response under v2 definition semantics.
64. `KS-064` Replay the exact same event trace in TS and Python processors.
65. `KS-065` Compare outputs for parity (data + validation + calculated fields) with explicit numeric tolerance policy.
66. `KS-066` Emit final conformance report mapped to matrix sections and phase IDs.
67. `KS-067` Run screener routes with ordered rule matching (`first match wins`) and assert screener fields do not persist into instance data.
68. `KS-068` Assemble modular definition via `$ref` + `keyPrefix`; assert collision prevention and resolved key/path integrity.
69. `KS-069` Execute identical user mutations in unbatched and batched mode; assert identical final values, MIP states, and validation outputs.
70. `KS-070` Assert response semantics: `valid`/completion decision is driven by error-level findings only (warnings/info non-blocking).
71. `KS-071` Assert validation-report semantics: `counts` exactly matches `results` severities and non-relevant paths are absent.
72. `KS-072` Attempt extension-driven override of core semantics (e.g., changing required/relevant/calculate meaning); assert rejection or ignore with diagnostics.
73. `KS-073` Execute run with deterministic harness controls (fixed clock/timezone/locale/seeded randomness and frozen external fixtures).
74. `KS-074` Repeat `KS-073` across two separate executions and assert byte-stable canonicalized artifacts.
75. `KS-075` Apply parity comparator profile (exact/normalized/tolerant classes) and assert classification-aware TS/Python diff reporting.

### 13.3 Static Negative Fixtures Required in the Same Program

These are load-time authoring failures and must run before interactive KS flow:

1. circular bind dependencies (definition error)
2. undefined field references in binds/shapes/variables
3. unknown instance or unknown function references
4. calculate target conflicts and read-only secondary-instance writes
5. malformed component tree (invalid root/category mismatch)
6. malformed mapping/registry/changelog structural contracts
7. invalid modular composition (`$ref` resolution failure, recursive/circular include, unresolved prefixed targets)

## 14. Exhaustive Coverage Checklist (Must Be Green)

The kitchen-sink run is considered passing only when all domains below are green:

1. Definition identity/versioning/lifecycle and response pinning
2. Item model (field/group/display), key rules, repeat model, nested paths
3. Full field dataType surface including attachment and money
4. All core MIPs plus extended bind options (`default`, `whitespace`, `excludedValue`, `nonRelevantBehavior`, `disabledDisplay`)
5. Variables, instances, optionSets, screener behavior
6. FEL grammar/operator/type/null semantics and stdlib coverage
7. Validation layers: bind constraints, shape constraints, composition, severities, timing, external results
8. Processing model semantics and deterministic notify outputs
9. Theme cascade and token behavior
10. Component conformance, fallbacks, custom components, responsive behavior
11. Response and ValidationReport schema conformance and lifecycle semantics
12. Mapping forward/reverse semantics and adapter outputs
13. Extension registry compatibility/lifecycle behavior
14. Changelog impact consistency and migration linkage
15. TS vs Python runtime parity checks
16. Compensating runtime/lint checks for matrix-known schema limitations

## 15. Determinism and Parity Control Profile (Normative for Kitchen-Sink)

To keep kitchen-sink results reproducible, all runs must apply the controls below.

### 15.1 Determinism Controls

1. Fixed clock for runtime date/time functions (including `now()`/`today()` dependent paths).
2. Fixed timezone and locale for date/number formatting and parsing behavior.
3. Seeded or disabled randomness for any host-level nondeterministic sources.
4. Frozen external data-source fixtures (no live network variance).
5. Stable ordering for emitted validation results and mapping outputs.
6. Canonicalized artifact serialization before snapshot comparison (sorted keys, normalized whitespace, deterministic line endings).

### 15.2 TS/Python Parity Comparator Classes

All parity comparisons must classify each asserted field/result into one comparator class:

1. `exact`: byte-for-byte equality required (strings, booleans, identifiers, paths, enum values).
2. `normalized`: semantic equality after canonical normalization (object key order, whitespace-insensitive formatting).
3. `tolerant-decimal`: numeric equality within explicitly documented tolerance profile for known TS float vs Python decimal differences.

Comparator class assignment must be declared in the parity fixture metadata. Any unclassified field defaults to `exact`.

### 15.3 Required Parity Report Shape

Parity output must include:

1. comparator class used per compared field/path
2. pass/fail status and diff payload
3. whether a failure is deterministic (reproducible on rerun) or nondeterministic (control profile breach)
4. matrix section and KS ID linkage for triage
