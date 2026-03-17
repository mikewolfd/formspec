# Response Schema Reference Map

> schemas/response.schema.json -- 203 lines -- Captures a completed or in-progress form submission pinned to a specific Definition version.

## Overview

The Response schema represents a filled-in form -- the unit of data capture in Formspec. It references exactly one Definition by the immutable tuple `(definitionUrl, definitionVersion)`, enforcing the Response Pinning Rule (VP-01): a Response is always validated against its pinned Definition version, never a newer one. The schema enforces `additionalProperties: false` and carries lifecycle status, form data, timestamps, optional author/subject metadata, embedded validation results, and an extension point.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `definitionUrl` | `string` (format: `uri`) | Yes | Canonical URL of the Definition this Response was created against. Stable logical-form identifier shared across versions. |
| `definitionVersion` | `string` (minLength: 1) | Yes | Exact version of the Definition. Immutable after creation. Interpretation governed by the Definition's `versionAlgorithm`. |
| `status` | `string` (enum) | Yes | Lifecycle status: `in-progress`, `completed`, `amended`, `stopped`. |
| `data` | `object` (additionalProperties: true) | Yes | Primary Instance -- the form data. Structure mirrors the Definition's item tree. |
| `authored` | `string` (format: `date-time`) | Yes | ISO 8601 last-modified timestamp. Updated on every save. |
| `id` | `string` | No | Globally unique identifier (e.g., UUID v4). Implementations SHOULD generate one. |
| `author` | `object` | No | Person or system that authored the Response. |
| `subject` | `object` | No | Entity the Response is about (grant, patient, project, etc.). Distinct from author. |
| `validationResults` | `array` of ValidationResult | No | Most recent validation findings. Snapshot that may be stale. |
| `extensions` | `object` | No | Implementor-specific data. Keys MUST start with `x-`. |

## Key Type Definitions ($defs)

This schema has no `$defs` block. The `author` and `subject` sub-objects are defined inline.

| Inline Object | Description | Key Properties | Used By |
|---|---|---|---|
| `author` | Author of the Response | `id` (required, string), `name` (optional, string) | Top-level `author` property |
| `subject` | Entity the Response describes | `id` (required, string), `type` (optional, string) | Top-level `subject` property |

## Required Fields

- `definitionUrl`
- `definitionVersion`
- `status`
- `data`
- `authored`

Within `author`: `id` is required.
Within `subject`: `id` is required.

## Enumerations

| Property | Allowed Values |
|---|---|
| `status` | `in-progress`, `completed`, `amended`, `stopped` |

## Cross-References

| Property | $ref Target |
|---|---|
| `validationResults[*]` | `https://formspec.org/schemas/validationResult/1.0` (validationResult.schema.json) |

## Validation Constraints

- `additionalProperties: false` at top level, on `author`, and on `subject`.
- `data` has `additionalProperties: true` -- it is an open object whose shape is governed by the Definition's item tree.
- `definitionVersion` enforces `minLength: 1`.
- `definitionUrl` enforces `format: uri`.
- `authored` enforces `format: date-time`.
- `extensions` enforces `propertyNames.pattern: "^x-"` -- all keys must start with `x-`.
- Semantic invariant (not schema-enforceable): a Response with error-severity results MUST NOT have `status: "completed"`. Saving data MUST never be blocked by validation status (VE-05).

---

# Changelog Schema Reference Map

> schemas/changelog.schema.json -- 194 lines -- Enumerates differences between two versions of a Formspec Definition for migration and governance.

## Overview

The Changelog schema describes a diff document comparing two versions of a Formspec Definition. Each atomic Change record describes an addition, removal, modification, move, or rename of a definition element. Impact classification (`breaking`/`compatible`/`cosmetic`) drives semver governance and migration generation. The document-level `semverImpact` must equal the maximum impact across all changes.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$schema` | `string` (format: `uri`) | No | JSON Schema self-reference. |
| `definitionUrl` | `string` (format: `uri`) | Yes | Canonical URL of the Definition whose versions are compared. |
| `fromVersion` | `string` (minLength: 1) | Yes | Base version (before changes). |
| `toVersion` | `string` (minLength: 1) | Yes | Target version (after changes). |
| `generatedAt` | `string` (format: `date-time`) | No | ISO 8601 timestamp when this changelog was generated. |
| `semverImpact` | `string` (enum) | Yes | Maximum impact across all changes: `major`, `minor`, or `patch`. |
| `summary` | `string` | No | Human-readable summary for release notes. |
| `changes` | `array` of Change | Yes | Ordered array of atomic Change objects. |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties | Used By |
|---|---|---|---|
| `Change` | A single atomic modification to a definition element | `type`, `target`, `path`, `impact` (all required); `key`, `description`, `before`, `after`, `migrationHint` (optional) | `changes` array items |

### Change Object Detail

| Property | Type | Required | Description |
|---|---|---|---|
| `type` | `string` (enum) | Yes | Kind of change: `added`, `removed`, `modified`, `moved`, `renamed`. |
| `target` | `string` (enum) | Yes | Category of affected element. |
| `path` | `string` (minLength: 1) | Yes | Dot-path to the affected element within the definition. |
| `key` | `string` | No | Item's key property when target is `item`. Stable identifier for cross-version matching. |
| `impact` | `string` (enum) | Yes | Severity: `breaking`, `compatible`, `cosmetic`. |
| `description` | `string` | No | Human-readable description for release notes. |
| `before` | any | No | Previous value/structural fragment. Present for `modified`, `removed`, `renamed`, `moved`. Omitted for `added`. |
| `after` | any | No | New value/structural fragment. Present for `added`, `modified`, `renamed`, `moved`. Omitted for `removed`. |
| `migrationHint` | `string` | No | Suggested transform: `drop`, `preserve`, or a FEL expression referencing `$old`. |

## Required Fields

- Top level: `definitionUrl`, `fromVersion`, `toVersion`, `semverImpact`, `changes`
- Each Change: `type`, `target`, `path`, `impact`

## Enumerations

| Property | Allowed Values |
|---|---|
| `semverImpact` | `major`, `minor`, `patch` |
| `Change.type` | `added`, `removed`, `modified`, `moved`, `renamed` |
| `Change.target` | `item`, `bind`, `shape`, `optionSet`, `dataSource`, `screener`, `migration`, `metadata` |
| `Change.impact` | `breaking`, `compatible`, `cosmetic` |

## Cross-References

None -- the Changelog schema is self-contained. The `Change` type is defined in `$defs` and referenced internally.

## Validation Constraints

- `additionalProperties: false` at top level and on `Change`.
- `fromVersion` and `toVersion` enforce `minLength: 1`.
- `Change.path` enforces `minLength: 1`.
- `before` and `after` have no type constraint -- any JSON value is valid (structural fragments).
- Semantic invariant (not schema-enforceable): `semverImpact` must equal the maximum `impact` across all changes (`breaking` -> `major`, `compatible` -> `minor`, `cosmetic` -> `patch`).
- Impact classification rules: `breaking` covers item removal, key rename, dataType change, required added to existing field, repeat toggled, itemType changed, option removed from closed set. `compatible` covers optional item added, option added, constraint relaxed, item moved, new shape/bind. `cosmetic` covers label/hint/description/help changes, display order changes.

---

# Validation Result Schema Reference Map

> schemas/validationResult.schema.json -- 168 lines -- A single structured validation finding produced during constraint evaluation.

## Overview

The ValidationResult schema defines the structure of an individual validation finding. Every failed constraint -- bind constraint, required check, type check, cardinality violation, validation shape, or external injection -- produces exactly one ValidationResult. Results are structured JSON objects carrying severity, a resolved instance path, a human-readable message, and machine-readable codes. The absence of a result for a given path means all constraints on that path passed. Six `constraintKind` values partition results into categories mapping 1:1 to the validation mechanisms.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `path` | `string` | Yes | Resolved instance path with concrete repeat indexes (dot-notation, 1-based brackets). Never wildcards. |
| `severity` | `string` (enum) | Yes | `error`, `warning`, or `info`. Only `error` blocks submission. |
| `constraintKind` | `string` (enum) | Yes | Category of constraint that produced this result. |
| `message` | `string` | Yes | Human-readable description, suitable for end users. All `{{expression}}` interpolation fully resolved. |
| `code` | `string` | No | Machine-readable identifier. Seven built-in codes are RESERVED. |
| `shapeId` | `string` | No | ID of the Validation Shape that produced this result. Present only when `constraintKind` is `shape`. |
| `source` | `string` (enum) | No | Origin category: `bind`, `shape`, or `external`. |
| `sourceId` | `string` | No | Specific origin identifier within the source category. |
| `value` | any | No | Actual value at validation failure time. Any JSON type. |
| `constraint` | `string` | No | FEL constraint expression that failed. Diagnostic only -- MUST NOT be shown to users. |
| `context` | `object` | No | Additional structured diagnostic data. For shapes: propagated context with FEL evaluated. For external: system metadata. |
| `extensions` | `object` | No | Extension data. Keys MUST start with `x-`. |

## Key Type Definitions ($defs)

This schema has no `$defs` block. All properties are defined inline at the top level.

## Required Fields

- `path`
- `severity`
- `constraintKind`
- `message`

## Enumerations

| Property | Allowed Values |
|---|---|
| `severity` | `error`, `warning`, `info` |
| `constraintKind` | `required`, `type`, `cardinality`, `constraint`, `shape`, `external` |
| `source` | `bind`, `shape`, `external` |

### Reserved Built-In Codes

| Code | constraintKind | Description |
|---|---|---|
| `REQUIRED` | `required` | Required field has null or empty string |
| `TYPE_MISMATCH` | `type` | Value doesn't conform to declared dataType |
| `MIN_REPEAT` | `cardinality` | Fewer repeat instances than minRepeat |
| `MAX_REPEAT` | `cardinality` | More repeat instances than maxRepeat |
| `CONSTRAINT_FAILED` | `constraint` | Bind constraint returned false |
| `SHAPE_FAILED` | `shape` | Shape constraint returned false (generic default) |
| `EXTERNAL_FAILED` | `external` | External system reported failure (generic default) |

## Cross-References

None -- the ValidationResult schema is self-contained. It is referenced by both the Response schema and the ValidationReport schema.

## Validation Constraints

- `additionalProperties: false` at top level.
- `path` uses concrete indexed paths (e.g., `lineItems[3].quantity`), not definition-time wildcards.
- `value` has no type constraint -- any JSON type is valid (string, number, boolean, null, object, array).
- `extensions` enforces `propertyNames.pattern: "^x-"`.
- Semantic constraints (not schema-enforceable):
  - `shapeId` MUST be present when `constraintKind` is `shape` and MUST be absent for other constraint kinds.
  - Severity ordering: `error` > `warning` > `info`. Only `error` blocks completion.
  - Message interpolation MUST be fully resolved before surfacing to consumers.
  - Processors MUST use the seven reserved codes for corresponding built-in constraints.

---

# Validation Report Schema Reference Map

> schemas/validationReport.schema.json -- 159 lines -- Aggregates all validation results for a Response at a point in time.

## Overview

The ValidationReport schema defines a standalone validation summary document produced by the Revalidate phase. It aggregates all validation results from bind constraints, required checks, type checks, cardinality checks, validation shapes, and external validation injections. The report is the sole input to conformance determination: `valid = (zero error-severity results)`. Reports may be persisted alongside a Response as a snapshot but may become stale if data changes after the timestamp.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `definitionUrl` | `string` (format: `uri`) | No | Canonical URL of the Definition validated against. |
| `definitionVersion` | `string` | No | Version of the Definition validated against. Always the pinned version (VP-01). |
| `valid` | `boolean` | Yes | `true` iff zero error-severity results. Sole conformance indicator. |
| `results` | `array` of ValidationResult | Yes | Complete ordered set of validation findings across all sources. |
| `counts` | `object` | Yes | Pre-aggregated counts by severity level. |
| `timestamp` | `string` (format: `date-time`) | Yes | ISO 8601 timestamp of validation run. Used for staleness detection. |
| `extensions` | `object` | No | Implementor-specific data. Keys MUST start with `x-`. |

### Counts Object Detail

| Property | Type | Required | Description |
|---|---|---|---|
| `error` | `integer` (minimum: 0) | Yes | Count of error-severity results. When > 0, `valid` MUST be `false`. |
| `warning` | `integer` (minimum: 0) | Yes | Count of warning-severity results. Never blocks submission. |
| `info` | `integer` (minimum: 0) | Yes | Count of info-severity results. Informational only. |

## Key Type Definitions ($defs)

This schema has no `$defs` block. The `counts` sub-object is defined inline.

| Inline Object | Description | Key Properties | Used By |
|---|---|---|---|
| `counts` | Pre-aggregated severity breakdown | `error`, `warning`, `info` (all required integers >= 0) | Top-level `counts` property |

## Required Fields

- `valid`
- `results`
- `counts`
- `timestamp`

Within `counts`: `error`, `warning`, `info` are all required.

## Enumerations

This schema defines no enumerations directly. Enumerations are inherited from the referenced ValidationResult schema.

## Cross-References

| Property | $ref Target |
|---|---|
| `results[*]` | `https://formspec.org/schemas/validationResult/1.0` (validationResult.schema.json) |

## Validation Constraints

- `additionalProperties: false` at top level and on `counts`.
- `counts.error`, `counts.warning`, `counts.info` all enforce `minimum: 0` and `type: integer`.
- `extensions` enforces `propertyNames.pattern: "^x-"`.
- Structural invariants (not schema-enforceable):
  - `valid = (counts.error === 0)` -- processors MUST ensure this.
  - `counts.error + counts.warning + counts.info = results.length` -- processors MUST ensure this.
  - A Response with `valid: false` MUST NOT transition to `completed` status.
  - Non-relevant fields are guaranteed absent from results.
- Three validation modes (`continuous`, `deferred`, `disabled`) control when reports are generated but not their structure.

---

# Conformance Suite Schema Reference Map

> schemas/conformance-suite.schema.json -- 136 lines -- Defines shared conformance test cases executed by both Python and TypeScript runners.

## Overview

The Conformance Suite schema defines the canonical contract for cross-runtime conformance test cases. Each case is executed by both the Python and TypeScript test runners to ensure behavioral parity between implementations. Cases are identified by a stable `id`, categorized by `kind` (determining execution mode), and carry expected outputs for assertion. The schema uses conditional validation (`allOf` with `if/then`) to require different properties based on the `kind` value.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (minLength: 1, pattern: `^[a-z0-9][a-z0-9._-]*$`) | Yes | Stable, unique case identifier. Lowercase alphanumeric with dots, underscores, hyphens. |
| `kind` | `string` (enum) | Yes | Execution mode for this case. |
| `definitionPath` | `string` (minLength: 1) | Conditional | Repository-relative path to the form definition fixture. Required for ENGINE_PROCESSING, VALIDATION_REPORT, RESPONSE_VALIDATION. |
| `registryPaths` | `array` of `string` (minItems: 1) | No | Repository-relative registry fixtures to load. |
| `payloadPath` | `string` (minLength: 1) | Conditional | Repository-relative path to the input payload fixture. Required (or `inputData`) for non-FEL kinds. |
| `inputData` | any | Conditional | Inline input payload. Alternative to `payloadPath` for non-FEL kinds. |
| `mode` | `string` (enum) | No | Validation mode: `continuous` or `submit`. For processing/report/response kinds. |
| `skipScreener` | `boolean` | No | When true, skip screener entry before evaluating the main definition. |
| `expression` | `string` (minLength: 1) | Conditional | FEL expression to evaluate. Required for FEL_EVALUATION. |
| `comparator` | `string` (enum) | Conditional | Comparison strategy. Required for FEL_EVALUATION. |
| `fields` | `array` of field objects | No | Field declarations and values for FEL_EVALUATION cases. |
| `compareResponseData` | `boolean` | No | When true, RESPONSE_VALIDATION also compares normalized response.data. |
| `expected` | `object` | Yes | Canonical expected output after shared normalization. |
| `legacyCoverage` | `array` (minItems: 1) | Yes | Mapping of this case to replaced legacy test surfaces. |

### Field Object (within `fields` array)

| Property | Type | Required | Description |
|---|---|---|---|
| `key` | `string` (minLength: 1) | Yes | Field key identifier. |
| `dataType` | `string` (minLength: 1) | No | Data type of the field. |
| `value` | any | No | Value to assign to the field. |

### Legacy Coverage Entry

| Property | Type | Required | Description |
|---|---|---|---|
| `path` | `string` (minLength: 1) | Yes | Repository-relative path of the replaced legacy test surface. |
| `check` | `string` (minLength: 1) | Yes | Legacy test id/name/check this case replaces. |

## Key Type Definitions ($defs)

This schema has no `$defs` block. Field objects and legacy coverage entries are defined inline within property definitions.

## Required Fields

- Always required: `id`, `kind`, `expected`, `legacyCoverage`
- When `kind` is `FEL_EVALUATION`: `expression`, `comparator` (additional)
- When `kind` is `ENGINE_PROCESSING`, `VALIDATION_REPORT`, or `RESPONSE_VALIDATION`: `definitionPath`, and one of (`payloadPath` or `inputData`)

## Enumerations

| Property | Allowed Values |
|---|---|
| `kind` | `FEL_EVALUATION`, `ENGINE_PROCESSING`, `VALIDATION_REPORT`, `RESPONSE_VALIDATION` |
| `mode` | `continuous`, `submit` |
| `comparator` | `exact`, `normalized`, `tolerant-decimal` |

## Cross-References

None -- the Conformance Suite schema is self-contained. It references external fixture files by repository-relative path (strings), not by `$ref`.

## Validation Constraints

- `additionalProperties: false` at top level and on field objects and legacy coverage entries.
- `id` enforces both `minLength: 1` and `pattern: "^[a-z0-9][a-z0-9._-]*$"` -- must start with lowercase letter or digit, then only lowercase letters, digits, dots, underscores, hyphens.
- `registryPaths` enforces `minItems: 1` when present (if provided, must have at least one entry).
- `legacyCoverage` enforces `minItems: 1` -- every case must document at least one replaced legacy check.
- Conditional validation via `allOf` with `if/then`:
  - **FEL_EVALUATION cases**: `expression` and `comparator` become required. `fields` is allowed as an array.
  - **ENGINE_PROCESSING / VALIDATION_REPORT / RESPONSE_VALIDATION cases**: `definitionPath` becomes required. Exactly one of `payloadPath` or `inputData` must be present (`oneOf`).
- The `expected` property is an open object (`type: object` with no `additionalProperties` restriction on its contents) -- its structure depends on the `kind`.
- `inputData` has no type constraint -- any JSON value is valid.
