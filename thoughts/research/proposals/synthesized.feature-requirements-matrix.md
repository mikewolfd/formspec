# Formspec (Synthesized) -- Feature Requirements Matrix

## Proposal Summary

The synthesized Formspec proposal unifies the best ideas from three source proposals -- Claude/UDF, GPT/JDFM, and Gemini/UDFA -- into a single JSON-native declarative form standard organized around four conceptual layers: Identity, Instance, Bind, and Presentation Hints. Its key design decisions include: (1) adopting XForms' full five-MIP bind model with a reactive dependency graph, (2) SHACL-inspired composable shapes as the primary cross-field validation unit, (3) FHIR R5-style canonical URL + semver identity and response pinning, and (4) a purpose-built expression language (FEL) with an explicit `Missing` type, `??` null-coalescing operator, and first-class `money` composite type. What distinguishes it from the source proposals is the careful integration of targeted improvements: GPT/JDFM's `whenExcluded` policy object, `money` type, four-tier lifecycle-oriented validation modes, and dual `path`/`dataPointer` addressing; the `activeWhen` rename for shape gating; and a new `explain` object on shapes and mandatory `formspec` version field -- producing a more coherent and complete specification than any single source.

## Requirements Coverage

| Req ID | Requirement | Coverage | Proposal Mechanism | Notes |
|--------|-------------|----------|-------------------|-------|
| **FT-01** | Standard types -- text, numeric, date, select, multi-select, narrative/long-text, boolean | **Full** | S3.2 Core Field Types table: `string`, `integer`, `decimal`, `boolean`, `date`, `dateTime`, `time`, `select`, `multiSelect`, `text` (narrative/multi-line) | All required types present. `text` explicitly called out as "Narrative / multi-line text" distinct from `string` (single line). |
| **FT-02** | Financial fields with currency formatting and decimal precision | **Full** | S3.2 `money` composite type: `{ "amount": string, "currency": string }` with ISO 4217 currency codes; `precision` property on numeric fields; S5.4 Money Functions (`money()`, `moneyAmount()`, `moneyCurrency()`, `moneyAdd()`, `moneySub()`, `moneySum()`, `moneyMul()`); S11 conformance requirement: decimal (not binary floating-point) arithmetic | Major improvement over source proposals. The `money` type stores amounts as decimal strings to prevent IEEE 754 precision loss, and all money functions enforce currency consistency with a `CURRENCY_MISMATCH` error code. |
| **FT-03** | File attachment fields (models the field; storage is external) | **Full** | S3.2 `attachment` type: `{ "filename", "mediaType", "url", "size" }` | Storage is explicitly external; the type models the metadata reference only. |
| **FT-04** | Auto-calculated fields with formula expressions referencing other fields | **Full** | S4.2 `calculate` MIP: FEL expression sets field value; S4.4 reactive dependency graph with topological re-evaluation; S4.5 repeat context resolution; S9.1 worked example with `moneySub()` and `moneySum()` per-row and cross-row calculations | Calculated fields are implicitly readonly. Dependency graph detects cycles at load time. |
| **FT-05** | Pre-populated fields from external data sources, with editable vs locked distinction | **Full** | S3.5 `prePopulate` object: `source` (URI template), `field` (JSON path extraction), `editable` (default `true`; `false` = locked); S9.1 example shows `"editable": false` for award amount | `editable: false` is distinguished from `readonly` MIP -- `prePopulate.editable: false` is described as "a stronger signal that the value is authoritative." |
| **FM-01** | Field metadata -- human label, description/help text, alternative display labels per context | **Full** | S3.1 Field Definition: `label` (primary), `description` (help text), `labels` map keyed by context name (e.g., `column_header`, `pdf_label`); S1.2 Presentation Hints layer | The `labels` map for alternative display labels per context is a clean design that avoids fixed label slots. |
| **FM-02** | Default value when field is excluded by conditional logic | **Full** | S3.1 `whenExcluded` policy object with `submission` (`"prune"`, `"null"`, `"default"`), `evaluation` (`"null"`, `"default"`), and `default` value; S4.3 non-relevant data exclusion semantics | Significant improvement from GPT/JDFM. Separates submission behavior from expression evaluation behavior, with a configurable default value. See Synthesis Improvements section for detailed analysis. |
| **FL-01** | Conditional visibility -- fields/sections appear or hide based on other values | **Full** | S4.2 `relevant` MIP: FEL expression evaluating to boolean; S4.3 non-relevant semantics; S4.4 reactive dependency graph ensures `relevant` is re-evaluated when dependencies change; S9.2 worked example | `relevant` can be applied to individual fields or entire groups. When a group is non-relevant, all children are non-relevant. |
| **FL-02** | Non-relevant data exclusion -- hidden fields excluded from submitted data, not just from display | **Full** | S4.3 Non-Relevant Data Exclusion: five enumerated behaviors; `whenExcluded.submission` controls pruning/null/default in serialized output; S1.4 "submit" verb: "Serialize the instance, excluding non-relevant data"; S11.2 conformance #8 | Enhanced beyond XForms with the `whenExcluded` policy. Validation is suspended on non-relevant fields (S6.7). Value retention in memory for re-relevance is specified. |
| **FL-03** | Repeatable sections -- dynamically add/remove groups of fields (one-to-many) | **Full** | S3.3 Groups: `repeatable: true`, `minRepeat`, `maxRepeat`; `[]` path syntax for template, `[0]` for indexed, `[*]` for wildcard aggregation; S4.5 repeat context in binds; S9.1, S9.6 worked examples | `minRepeat`/`maxRepeat` have corresponding built-in validation codes (`MIN_REPEAT`, `MAX_REPEAT`). Nested repeatable groups are implied by group nesting. |
| **FL-04** | Cross-form field dependencies via shared identifiers | **Full** | S3.6 Secondary Instances: named data sources (URI or inline); S5.2 `$instances.name.path` reference syntax; S5.4 `prior()` and `external()` functions; S6.12 `$cross` validation scope | Secondary instances enable cross-form references. The `prior()` shorthand simplifies year-over-year comparisons. `$cross` scope allows cross-form validation shapes. |
| **FL-05** | Screener/routing logic -- direct users to the correct form variant based on answers | **Full** | S7.3 Screener Routing: `screener` object with `fields` and `routes`; routes evaluated in order, first match wins; `condition` is a FEL expression; `target` is canonical URL with version; S9.4 worked example | Original to Formspec (S10.8). Clean design with `$screener.` prefix namespace for screener fields. Default fallback via `"condition": "true"`. |
| **VR-01** | Three severity levels -- error (blocks submission), warning (advisory), info (informational) | **Full** | S6.5 Severity Semantics table: `error` (blocks, `isValid: false`), `warning` (no effect on `isValid`), `info` (no effect on `isValid`); S6.2 `severity` property on shapes | Direct adoption from SHACL with simpler naming (S10.2). |
| **VS-01** | Field-level validation (individual field -- required, type, min/max, pattern) | **Full** | S4.2 `required` MIP (dynamic expression or literal); `constraint` MIP with inline expression + message; S6.10 built-in codes: `REQUIRED`, `TYPE_MISMATCH`, `FIELD_CONSTRAINT_FAILED`; S5.4 `matches()` for pattern validation; S9.6 per-row field constraint example | `required` can be a dynamic FEL expression (e.g., `"required": "reporting_type = 'final'"`). Min/max for numeric fields would use inline constraints. |
| **VS-02** | Field-group-level validation (related fields together -- sum checks, "line items must total") | **Full** | S6.1 Shapes with group path targeting; S6.12 Group scope: `"path": "budget_lines"`; S6.3 constraint composition (`and`, `or`, `not`, `xone`); S9.6 effort-sum-check example: `"total_effort = 100"` | Shapes can target groups and validate across fields within a group. |
| **VS-03** | Form-level validation (cross-section checks -- "Section A + Section B = Grand Total") | **Full** | S6.12 Form scope: `"path": "$form"`; S6.1 shape example `budget-balance-check` comparing total_expended vs award_amount across sections; S9.1 worked example | `$form` is the sentinel path for form-level shapes. |
| **VS-04** | Cross-form validation (prior-year comparison, identifier consistency across submissions) | **Full** | S6.12 Cross-form scope: `"path": "$cross"`; S3.6 secondary instances; S5.4 `prior()` function; S9.3 year-over-year warning example with `$instances.prior_year` | `$cross` scope is original to Formspec (S10.8). Depends on secondary instances being populated at runtime. |
| **VE-01** | Real-time incremental re-evaluation -- expression engine supports partial recalculation when a single field changes | **Full** | S4.4 Reactive Dependency Graph: DAG construction, pertinent dependency subgraph on field change, topological re-evaluation order; step 4: "compute the pertinent dependency subgraph -- all binds reachable from F -- and re-evaluate them in topological order" | Adapted from XForms Appendix C. Explicit re-evaluation order: calculate -> relevant -> required/readonly -> constraint. |
| **VE-02** | Formula-based validation rules using the same expression language as calculated fields | **Full** | S6.1 Shape `constraint` property is a FEL expression; S4.2 `constraint` MIP uses FEL; same FEL used in `calculate`, `relevant`, `required`, `readonly`, `constraint`, `activeWhen` | Unified expression language for all logic -- a core design principle. |
| **VE-03** | Prior-year comparison rules -- flag values that differ significantly from previous submission | **Full** | S9.3 Year-over-Year Change Warning: complete worked example; `prior()` function; secondary instance `prior_year`; `activeWhen` guard for when prior data is available; warning severity | Concrete example shows 25% threshold check with division-by-zero protection. |
| **VE-04** | Inline explanatory messages tied to specific constraint failures | **Full** | S6.2 `message` property on shapes with `{field_path}` interpolation; S6.4 `explain` object with `showFields` and `context`; S4.2 `constraint` MIP has inline `message`; S6.9 `context` map on ValidationResult | The `explain` property is an improvement over all source proposals -- it provides structured hints for renderers to display richer inline explanations. |
| **VE-05** | Saving incomplete sections must never be blocked by validation -- validation modes control when rules execute | **Full** | S6.6 Four-tier validation modes: `draft` (advisory), `save` (non-blocking), `submit` (blocking), `audit` (post-submission); per-shape `validationMode` property; S11.2 conformance #9 and #10: "MUST NOT block data persistence in draft/save modes" | Improvement over source proposals. Lifecycle-oriented (not UI-event-oriented). Shapes declare their minimum firing mode. Explicit conformance requirement that draft/save never block persistence. |
| **VE-06** | External validation (e.g., third-party API checks) injected into the same result pipeline as schema-derived errors | **Full** | S6.11 External Validation Injection: same `ValidationResult` structure; `constraintComponent: "external"`; merged into report; affects `isValid`; S9.5 worked example with SAM.gov DUNS check; S6.10 `EXTERNAL_VALIDATION_FAILED` built-in code | External results MUST include dual addressing (`path` + `dataPointer`). Clear worked example shows external and schema-derived errors coexisting. |
| **VX-01** | Structured validation results -- field path, severity, human message, machine-readable code, context data | **Full** | S6.9 ValidationResult Properties: `path`, `dataPointer`, `severity`, `message`, `code`, `shapeId`, `constraintComponent`, `value`, `context`; S6.8 full JSON example | Exceeds requirements: adds `dataPointer` (RFC 6901), `shapeId`, `constraintComponent`, and `value` beyond what was requested. |
| **VX-02** | Results partitioned by severity -- is_valid considers only errors, not warnings or info | **Full** | S6.5: "`isValid` is `true` if and only if there are zero results with severity `error`"; S6.8 `counts` object with per-severity tallies | Clean and unambiguous. |
| **VX-03** | Results consumable by any system (UI, API, PDF, analytics) without importing validation internals | **Full** | S6.8 ValidationReport is a standalone JSON structure; S6.9 dual addressing for different consumers (UI uses `path`, API uses `dataPointer`); S6.10 machine-readable codes; no engine-specific types in the report | The dual addressing design explicitly serves different consumer types. The report is pure JSON with no engine-specific types. |
| **VC-01** | Multiple definition versions coexisting simultaneously | **Full** | S2.1 Canonical Identity: `url` (stable) + `version` (changes); S2.2 Version Semantics (semver); S2.3 Lifecycle: active/retired versions coexist | Multiple versions with the same `url` but different `version` strings can coexist. |
| **VC-02** | Responses pinned to the definition version they were created with | **Full** | S2.5 Response Pinning: `definitionUrl` + `definitionVersion`; S11.2 conformance: "Engines MUST use `definitionVersion` (not the latest version) for validation and display"; "MUST report an error rather than silently substituting another version" | Strong conformance language prevents silent version substitution. |
| **VC-03** | Definitions evolve without breaking existing responses | **Full** | S2.2 Version Semantics: patch (cosmetic), minor (additive), major (breaking with migration); S1.4 "migrate" verb; S2.5 response pinning ensures old responses validate against their original version | Migration verb is listed but not fully specified (no migration map format defined). Minor gap. |
| **VC-04** | Form variants derived from a common base (long form / short form) | **Full** | S2.4 Derivation and Variants: `derivedFrom` field with `url|version` notation; S9.4 screener routing between sf-425 and sf-425-short | Derived definition is standalone (not a diff). Relationship is informational for tooling. |
| **VC-05** | Year-over-year pre-population from prior responses | **Full** | S3.6 Secondary Instances: `prior_year` example with URI source; S5.4 `prior()` function shorthand; S9.3 complete worked example | `prior()` is syntactic sugar for `$instances.prior_year.{path}`. |
| **VC-06** | Definition lifecycle -- draft, active, retired | **Full** | S2.3 Definition Lifecycle: `draft` -> `active` -> `retired` with defined semantics for each; `status` is required on FormDefinition | Direct adoption from FHIR R5. |
| **AD-01** | Schema-driven -- definitions are data (JSON), not code | **Full** | S1.1 Design Principle #1: "Data is JSON"; S1.1 #2: "Declarations, not procedures"; entire spec is JSON documents | Core design principle. |
| **AD-02** | Must support future visual/no-code authoring tools | **Full** | S1.1 Design Principle #2: declarative definitions; S1.2 four independent layers; S3.1 structured field definitions; all metadata is data, not code | The separation into independent layers (Identity, Instance, Bind, Presentation Hints) naturally supports visual authoring tools that can manipulate each layer independently. |
| **AD-03** | Program-agnostic -- not tied to any specific domain | **Full** | S1.1 Design Principle #6: extensibility without forking; core types are domain-neutral; examples use government grants but the spec is not grant-specific; S8 Extension Points for domain-specific additions | The specification is domain-neutral by design. Domain-specific concerns go through extension points. |
| **AD-04** | Extensible for domain-specific field types, validation rules, and expression functions without modifying the core standard | **Full** | S8.1 Custom Field Types (URI-based); S8.2 Custom Expression Functions; S8.3 Custom Constraint Components; S8.4 Extension Namespacing with `mustUnderstand` semantics; S11.1 Conformance Extended level | Three distinct extension points covering all three requested categories. URI namespacing prevents collisions. `mustUnderstand` allows critical extensions to be enforced. |

## Synthesis Improvements

This section evaluates each targeted improvement from the source proposals to determine whether it successfully addresses the weakness it was meant to fix.

### `whenExcluded` policy object (from GPT/JDFM)

**Assessment: Successfully integrated and well-specified.**

The `whenExcluded` policy object (S3.1, S4.3) fully replaces the simpler `defaultWhenExcluded` concept from the Claude/UDF proposal. It separates two independent concerns:

- `submission`: What happens to the field in serialized output (`"prune"`, `"null"`, `"default"`)
- `evaluation`: What value expressions see when the field is non-relevant (`"null"`, `"default"`)
- `default`: The literal JSON value used when either dimension is set to `"default"`

This is well-specified with clear defaults (`"prune"` for submission, `"null"` for evaluation) and explicit error handling (if `"default"` is specified but no `default` value is provided, the engine MUST use `null`). The five-step non-relevant handling algorithm in S4.3 is exhaustive. The worked example in S9.2 demonstrates the policy in context.

**Potential gap:** The spec does not address what happens to `whenExcluded` on a group -- does it cascade to child fields, or must each child declare its own policy? The S9.2 example shows individual field policies under a group, suggesting per-field declaration is expected, but this could be stated more explicitly.

### `money` composite type (from GPT/Gemini)

**Assessment: Successfully integrated and significantly more thorough than source proposals.**

The `money` type (S3.2) is well-specified as `{ "amount": string, "currency": string }` where `amount` is a decimal string (preventing floating-point loss) and `currency` is an ISO 4217 code. The rationale paragraph explicitly explains why bare `number` is insufficient.

Key strengths:
- Seven dedicated money functions in S5.4 (`money()`, `moneyAmount()`, `moneyCurrency()`, `moneyAdd()`, `moneySub()`, `moneySum()`, `moneyMul()`)
- Currency consistency enforcement: all binary money operations MUST verify matching currencies, with a `CURRENCY_MISMATCH` error code (S6.10)
- Conformance requirement (S11.2 #5): "MUST NOT perform money arithmetic using binary floating-point" and "MUST NOT silently convert between currencies"
- `moneySum()` handles edge cases: ignores nulls, uses first non-null element's currency for empty-sum base

**Potential gap:** No `moneyDiv()` function for dividing a money value by a scalar (e.g., splitting an amount equally among N line items). `moneyMul()` exists for multiplication by a scalar, but division is absent. Also, no guidance on rounding behavior when money arithmetic produces results requiring precision beyond the decimal string representation.

### Four-tier validation modes (from GPT/JDFM)

**Assessment: Successfully integrated and improved over the source.**

The four-tier model (S6.6) -- `draft`, `save`, `submit`, `audit` -- is well-designed and oriented around the data lifecycle rather than UI events. Key improvements:

- Per-shape `validationMode` property allows fine-grained control (unlike a global setting)
- Cumulative firing semantics are clearly documented: shapes fire at their declared mode and all stricter modes above it
- The table in S6.6 explicitly lists which modes fire which shapes
- Conformance requirements (S11.2 #9, #10) enforce that draft/save never block persistence
- The rationale paragraph explains why this is better than UI-event-oriented modes (onChange/onBlur)
- `audit` mode for post-submission integrity checks is a valuable addition not present in any source proposal's original concept

**Potential gap:** The default `validationMode` is `submit`, meaning shapes without an explicit mode only fire during submission and audit. This is reasonable but means that `required` MIP (which is a bind, not a shape) does not have a validation mode. The spec should clarify whether `required` always fires at the engine level, or only during certain modes. The current text (S4.2) says required produces an error at "error severity" but does not specify when in the lifecycle that check runs.

### Dual addressing `path` + `dataPointer` (from GPT/JDFM)

**Assessment: Successfully integrated and consistently applied.**

Every `ValidationResult` includes both `path` (definition-time dot-notation, e.g., `budget_lines[2].expended`) and `dataPointer` (RFC 6901 JSON Pointer, e.g., `/budget_lines/2/expended`). The rationale in S6.9 clearly explains why both are needed: UI renderers match on `path`, API consumers use `dataPointer`.

The design is consistently applied:
- All examples in S6.8, S6.11, S9.5 include both fields
- External validation results MUST also include both (S6.11)
- Conformance requirement (S11.2 #6) mandates both on every result

**No gaps identified.** This is one of the cleanest integrations from the source proposals.

### `Missing` runtime type

**Assessment: Partially specified -- coercion table is present but Missing semantics need more edge-case coverage.**

The `Missing` type (S5.3) is well-motivated: distinguishing "path does not exist / never set" from "explicitly null." The coercion table includes `Missing` -> number (0), `Missing` -> string (""), `Missing` -> boolean (false).

Key strengths:
- `isMissing()`, `isNull()`, and `isEmpty()` functions for precise testing
- `??` operator treats both `Missing` and `null` as absent
- Comparison semantics: `Missing = Missing` is `true`, `Missing = null` is `false`

**Potential gaps:**
- The coercion table does not specify `Missing` -> `date`, `Missing` -> `money`, or `Missing` -> `attachment`. What happens when a date function receives a Missing value? What about `moneyAmount(Missing)`?
- The `coalesce()` function skips both `null` and `Missing`, but it is unclear whether `sum()` and `count()` treat `Missing` elements the same as `null` elements (the text says "ignores nulls" but does not mention Missing).
- In the comparison semantics, `Missing` coerces to 0 for `null < 5`, but the analogous `Missing < 5` case is not explicitly stated.

### `activeWhen` rename

**Assessment: Successfully integrated and used consistently.**

The `activeWhen` property (S6.2) replaces a bare `when` property for gating shape evaluation. It is clearly defined: "if present, the shape is only evaluated when this condition is `true`. If absent, the shape is always evaluated (for relevant fields)."

Consistent usage:
- S6.2 shape properties table lists `activeWhen` with full description
- S9.3 worked example: `"activeWhen": "$instances.prior_year != null"` gates the YOY warning
- S11.1 conformance lists `activeWhen` as a required feature
- S11.2 conformance #12: "Evaluate `activeWhen` expressions on shapes before evaluating the shape's constraint"

**No gaps identified.** The rename is cleaner than `when` and is used consistently throughout.

### `explain` object on shapes

**Assessment: Well-specified but advisory-only -- could benefit from more structured semantics.**

The `explain` property (S6.4) provides two sub-properties:
- `showFields`: array of field paths to highlight
- `context`: key-value map of additional structured data

Key strengths:
- Explicitly advisory: "engines MUST NOT alter validation logic based on `explain`"
- Consuming applications MAY ignore it
- Used in worked examples (S9.1, S9.3, S9.6)

**Potential gaps:**
- The `context` within `explain` (S6.4) and the `context` on `ValidationResult` (S6.9) serve overlapping purposes. The relationship between them is not specified. Does the shape's `explain.context` get copied into the `ValidationResult.context`? Or are they independent?
- No guidance on how `showFields` interacts with non-relevant fields. If a field listed in `showFields` is non-relevant, should the renderer still show it?
- The `explain` property is not on inline `constraint` objects within binds (S4.2), only on named shapes. This means field-level validation cannot benefit from `explain`.

### `formspec` version field

**Assessment: Successfully integrated and present in all examples.**

The `formspec` field (S2.1) is required on every FormDefinition and declares which version of the Formspec specification the definition conforms to. Processors MUST check it and MUST report an error for unsupported versions.

Consistent usage in examples:
- S2.1: `"formspec": "1.0.0"` in identity example
- S2.4: present in derivation example
- S9.1, S9.2, S9.3, S9.4: present in all worked examples

Conformance requirements:
- S11.2 #2: "Check the `formspec` version field and report an error if the specification version is not supported"
- S11.3 #1: "Include a valid `formspec` spec version field"

**No gaps identified.** This is cleanly integrated.

### `??` null-coalescing operator

**Assessment: Well-integrated in the grammar and coercion rules, with clear semantics.**

The `??` operator (S5.2) is:
- In the operator precedence table at precedence level 7 (between comparison and `and`)
- In the EBNF grammar (S5.5): `coalesce_expr = comparison { "??" comparison }`
- In the coercion rules (S5.3): treats both `null` and `Missing` as absent
- Documented relationship to `coalesce()`: semantically equivalent for two arguments, chainable for more

Usage examples:
- S5.2: `field_name ?? 0` and `$instances.prior_year.total ?? field_name ?? 0`

**Potential gap:** The precedence of `??` between comparison and `and` means that `a = b ?? c` parses as `a = (b ?? c)`, which is the expected behavior. However, the interaction with the `not` unary operator is ambiguous: does `not a ?? b` parse as `(not a) ?? b` or `not (a ?? b)`? Since `not` is in unary (precedence 2), it should bind tighter, giving `(not a) ?? b`, which is probably not what the user intended. This is a potential usability issue but not a specification bug.

## Summary

### Coverage Counts

| Coverage | Count |
|----------|-------|
| **Full** | 31 |
| **Partial** | 0 |
| **None** | 0 |

**All 31 requirements are fully covered.**

### Strengths

1. **Comprehensive type system.** The `money` composite type with decimal string storage, ISO 4217 currency codes, and seven dedicated functions is the most thorough financial type treatment of any source proposal. Currency mismatch errors are a built-in validation code.

2. **Principled non-relevant data handling.** The `whenExcluded` policy object is the most sophisticated mechanism for controlling what happens to hidden fields, separating submission serialization from expression evaluation with per-field granularity.

3. **Lifecycle-oriented validation modes.** The four-tier model (draft/save/submit/audit) with per-shape granularity and explicit non-blocking semantics for draft/save is well-designed and platform-agnostic.

4. **Structured validation output.** Dual addressing (`path` + `dataPointer`), machine-readable `code` on every result, `constraintComponent` typing, `context` maps, and the `explain` property on shapes produce the richest validation output of any source proposal.

5. **Complete worked examples.** Six hard-case examples (S9.1-S9.6) cover all the scenarios requested in the prompt, with full JSON definitions demonstrating the interplay of fields, binds, shapes, secondary instances, and validation modes.

6. **Strong conformance language.** The spec includes 12 MUST requirements and 5 MUST NOT requirements for engines, plus 8 MUST requirements for documents. This is standards-body-grade normative language.

7. **Clean integration of source improvements.** The synthesis successfully picks the best mechanism from each source proposal without introducing internal contradictions.

### Weaknesses and Gaps

1. **Migration semantics underspecified.** The "migrate" verb is listed in S1.4 but no migration map format is defined. VC-03 (evolution without breaking) is conceptually covered by semver + response pinning, but there is no concrete mechanism for transforming a response from v2.1.0 to v3.0.0 schema. This is a significant gap for long-lived form systems.

2. **`Missing` type coercion incomplete for non-primitive types.** The coercion table in S5.3 covers `Missing` -> number/string/boolean but not `Missing` -> date, `Missing` -> money, or `Missing` -> attachment. Money functions receiving `Missing` arguments have undefined behavior.

3. **`required` MIP and validation mode interaction unspecified.** The `required` MIP (S4.2) produces an error-severity result, but since `required` is a bind property (not a shape), it has no `validationMode`. It is unclear whether required-field validation fires in draft mode or only in submit mode.

4. **`explain` and `context` overlap.** Both shapes and ValidationResults have a `context` property, and shapes also have `explain.context`. The relationship and data flow between these is not specified.

5. **No `moneyDiv()` function.** Money can be multiplied by a scalar (`moneyMul`) but not divided. This is a minor but noticeable omission for common financial calculations like equal distribution.

6. **Group-level `whenExcluded` cascading unspecified.** When a group has `relevant: false`, do child fields use their own `whenExcluded` policies, the group's policy, or some cascade? The S9.2 example suggests per-field, but the spec does not state a rule.

7. **No explicit "variant inheritance" mechanism.** `derivedFrom` (S2.4) is informational only -- the derived definition is standalone. There is no mechanism to express "this form is the base form minus these fields" or "plus these fields." Form variant management relies entirely on external tooling.

8. **Assembly error handling sparse.** The `$include` mechanism (S7.1) does not specify what happens when a referenced definition is unavailable, when the fragment path does not exist, or when included content has conflicting paths with the host definition.

9. **Presentation Hints layer is thin.** While intentionally minimal (layout is out of scope), the layer only covers labels and descriptions. There is no hint mechanism for field ordering, grouping display, or widget type suggestions, which means consuming applications have very little to work with beyond raw field metadata.

10. **No explicit `name` on FormResponse.** While `FormResponse` includes `id`, `definitionUrl`, `definitionVersion`, `status`, `subject`, `authored`, and `data`, there is no discussion of response-level metadata like authorship, organization, or submission tracking beyond the basic `subject` object.
