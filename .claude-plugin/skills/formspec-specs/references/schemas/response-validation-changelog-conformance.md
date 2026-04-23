# Response, Validation, Changelog, and Conformance Schema Reference Maps

This grouped reference covers the five schemas that deal with form output, validation findings, version change tracking, and cross-runtime conformance testing. They form the "data capture and quality" layer of Formspec:

- **Response** -- the filled-in form, pinned to a Definition version, with optional authored signature evidence.
- **ValidationResult** -- a single structured validation finding.
- **ValidationReport** -- an aggregate snapshot of all validation findings for a Response.
- **Changelog** -- a diff document between two Definition versions.
- **Conformance Suite** -- the cross-runtime test case contract for Python/TypeScript parity.

---

# Response Schema Reference Map

> `schemas/response.schema.json` -- 409 lines -- Formspec Response document: completed or in-progress Instance pinned to a specific Definition version (§2.1.6).

## Overview

The Response schema is the canonical record of captured form data. It references exactly one Definition by the immutable tuple `(definitionUrl, definitionVersion)` (Response Pinning Rule VP-01): conformant processors must reject a Response whose `definitionVersion` does not match a known Definition at `definitionUrl`. The tuple identifies a canonical Response record across systems; optional `id` adds correlation. The document may embed validation snapshots and provider-neutral **authored signature** evidence (`authoredSignatures`), distinct from respondent-ledger attestations.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecResponse` | `string` (const: `"1.0"`) | Yes | Response specification version. MUST be `"1.0"`. |
| `definitionUrl` | `string` (format: `uri`) | Yes | Canonical URL of the Definition. MUST match the Definition's `url`. |
| `definitionVersion` | `string` (minLength: 1) | Yes | Exact pinned Definition version; immutable for the life of the Response. |
| `status` | `string` (enum) | Yes | Lifecycle: `in-progress`, `completed`, `amended`, `stopped`. |
| `data` | `object` (`additionalProperties: true`) | Yes | Primary Instance -- form data shaped by the Definition item tree. |
| `authored` | `string` (format: `date-time`) | Yes | Last modified (RFC 3339); updated on every save. |
| `id` | `string` | No | Globally unique id (e.g. UUID). **Required when `authoredSignatures` is present** (`dependentRequired`). |
| `author` | `object` | No | Person or system that authored the Response. |
| `subject` | `object` | No | Entity the Response is about (distinct from `author`). |
| `validationResults` | `array` of ValidationResult (`$ref` validationResult/1.0) | No | Most recent validation findings; may be stale vs. current `data`. |
| `authoredSignatures` | `array` (minItems: 1) of AuthoredSignature | No | Canonical authored-signature evidence per signer/document act. |
| `extensions` | `object` | No | Implementor data; property names MUST match `^x-`. |

### author Object

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique author identifier in the host system. |
| `name` | `string` | No | Display name (e.g. full name for humans). |

### subject Object

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Unique subject entity identifier. |
| `type` | `string` | No | Subject type label (e.g. Grant, Patient). |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties | Used By |
|---|---|---|---|
| **AuthoredSignatureIdentityBinding** | Provider-neutral identity-binding evidence for a signature. | `method`, `assuranceLevel` (required); `providerRef`, `externalAttestationRef` (optional, `uri`) | `AuthoredSignature.identityBinding` |
| **AuthoredSignature** | Canonical authored-signature evidence binding one signer act to the envelope. | See AuthoredSignature properties table | `authoredSignatures[]` |

### AuthoredSignature Properties

| Property | Type | Required | Description |
|---|---|---|---|
| `documentId` | `string` (pattern) | Yes | Id of document/signing surface affirmed. |
| `signatureValue` | `string` (minLength: 1) | Yes | Opaque evidence or reference (not sufficient intent alone). |
| `signatureMethod` | `string` (pattern) | Yes | How evidence was captured: `drawn`, `typed`, `cryptographic`, `provider-managed`, or `x-` extension. |
| `signerId` | `string` | No | Stable signer id when available. |
| `signerName` | `string` (minLength: 1) | Yes | Human-readable signer name. |
| `signedAt` | `string` (format: `date-time`) | Yes | When the signing act completed. |
| `consentAccepted` | `boolean` | Yes | Signer accepted declared consent text. |
| `consentTextRef` | `string` (format: `uri`) | Yes | URI ref to consent text. |
| `consentVersion` | `string` (minLength: 1) | Yes | Version of consent text accepted. |
| `affirmationText` | `string` (minLength: 1) | Yes | Affirmation shown and accepted. |
| `documentHash` | `string` (pattern) | Yes | Hex digest (64–128 hex chars). |
| `documentHashAlgorithm` | `string` (pattern) | Yes | `sha-256`, `sha-384`, `sha-512`, or `x-` extension. |
| `responseId` | `string` (minLength: 1) | Yes | MUST match top-level `id` when persisted. |
| `identityProofRef` | `string` (format: `uri`) | No | URI ref to identity-proofing artifact. |
| `identityBinding` | AuthoredSignatureIdentityBinding | No | Structured identity-binding evidence. |
| `signatureProvider` | `string` (minLength: 1) | Yes | Provider/adapter for ceremony evidence. |
| `ceremonyId` | `string` (minLength: 1) | Yes | Ceremony or provider session id. |

### AuthoredSignatureIdentityBinding Properties

| Property | Type | Required | Description |
|---|---|---|---|
| `method` | `string` (pattern) | Yes | Binding method (built-ins + `x-` extension). |
| `assuranceLevel` | `string` (enum) | Yes | `none`, `low`, `standard`, `high`, `very-high`. |
| `providerRef` | `string` (format: `uri`) | No | Identity/signature provider URI. |
| `externalAttestationRef` | `string` (format: `uri`) | No | External attestation URI. |

## Required Fields

- `$formspecResponse`, `definitionUrl`, `definitionVersion`, `status`, `data`, `authored`
- `author`: `id`
- `subject`: `id`
- **Dependent:** if `authoredSignatures` is present, `id` is required at top level.
- **AuthoredSignature:** all properties listed as required in the table above (see schema `required` array).
- **AuthoredSignatureIdentityBinding:** `method`, `assuranceLevel`

## Enums and Patterns

| Property Path | Type | Values/Pattern | Description |
|---|---|---|---|
| `$formspecResponse` | const | `"1.0"` | Response document version pin. |
| `status` | enum | `in-progress`, `completed`, `amended`, `stopped` | Lifecycle; only `completed` forbids error-severity validation (semantic). |
| `extensions` (propertyNames) | pattern | `^x-` | Extension keys prefix. |
| `AuthoredSignature.documentId` | pattern | `^[a-zA-Z][a-zA-Z0-9_-]*$` | Document id token. |
| `AuthoredSignature.signatureMethod` | pattern | `^(drawn\|typed\|cryptographic\|provider-managed\|x-[a-z0-9][a-z0-9-]*)$` | Signature capture method. |
| `AuthoredSignature.documentHash` | pattern | `^[A-Fa-f0-9]{64,128}$` | Document digest hex length. |
| `AuthoredSignature.documentHashAlgorithm` | pattern | `^(sha-256\|sha-384\|sha-512\|x-[a-z0-9][a-z0-9-]*)$` | Hash algorithm id. |
| `AuthoredSignatureIdentityBinding.method` | pattern | `^(none\|email-otp\|sms-otp\|knowledge-based\|oidc\|webauthn\|credential\|in-person\|notary\|x-[a-z0-9][a-z0-9-]*)$` | Identity binding method. |
| `AuthoredSignatureIdentityBinding.assuranceLevel` | enum | `none`, `low`, `standard`, `high`, `very-high` | Assurance tier. |

## Cross-References

- `validationResults[*]` → `https://formspec.org/schemas/validationResult/1.0` (`validation-result.schema.json`).
- Core: Response pinning VP-01; VE-05 (saving not blocked by validation); processing model / Response semantics in Core spec §2.1.6.

## Extension Points

- Top-level `extensions`: keys `^x-`; processors ignore unknown keys and preserve on round-trip; MUST NOT alter core semantics.
- `data`: `additionalProperties: true` -- shape from Definition + `nonRelevantBehavior`.

## Validation Constraints

- Top-level `additionalProperties: false` (except `data` openness above).
- `author`, `subject`, `AuthoredSignature`, `AuthoredSignatureIdentityBinding`: `additionalProperties: false`.
- `dependentRequired`: `authoredSignatures` → requires `id`.
- `authoredSignatures`: `minItems: 1` when present.
- Formats: `uri` on `definitionUrl`, consent/attestation refs; `date-time` on `authored`, `signedAt`.
- Semantic (not JSON Schema): error-severity results block `status: completed`; saving not blocked by validation (VE-05).

---

# ValidationResult Schema Reference Map

> `schemas/validation-result.schema.json` -- 178 lines -- Single structured validation finding from the Revalidate phase (§2.4 Phase 3).

## Overview

One failed constraint yields one ValidationResult: severity, resolved instance path, message, and optional machine codes. Absence of a result for a path means constraints passed there. Six `constraintKind` values partition built-in mechanisms plus external injection. Only `error` severity blocks completion.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecValidationResult` | `string` (const: `"1.0"`) | Yes | Validation result document version. MUST be `"1.0"`. |
| `path` | `string` | Yes | Resolved instance path; concrete indexes; no `*` wildcards. |
| `severity` | `string` (enum) | Yes | `error`, `warning`, `info`. |
| `constraintKind` | `string` (enum) | Yes | Mechanism category (see enums). |
| `message` | `string` | Yes | User-facing text; `{{expression}}` resolved for Shapes. |
| `code` | `string` | No | Machine-readable id; seven reserved built-in codes (see below). |
| `shapeId` | `string` | No | Validation Shape `id` when `constraintKind` is `shape`. |
| `source` | `string` (enum) | No | `bind`, `shape`, `external`. |
| `sourceId` | `string` | No | Origin within category (e.g. external system id). |
| `value` | any | No | Value at failure time; any JSON type. |
| `constraint` | `string` | No | Failed FEL expression; diagnostic only, not for end users. |
| `context` | `object` | No | Structured diagnostics (Shape-evaluated or external metadata). |
| `extensions` | `object` | No | Per-result extensions; keys `^x-`. |

## Key Type Definitions ($defs)

None -- all top-level properties inline.

## Required Fields

- `$formspecValidationResult`, `path`, `severity`, `constraintKind`, `message`

## Enums and Patterns

| Property Path | Type | Values/Pattern | Description |
|---|---|---|---|
| `$formspecValidationResult` | const | `"1.0"` | Version pin. |
| `severity` | enum | `error`, `warning`, `info` | Strict order error > warning > info. |
| `constraintKind` | enum | `required`, `type`, `cardinality`, `constraint`, `shape`, `external` | Validation mechanism. |
| `source` | enum | `bind`, `shape`, `external` | Producing subsystem. |
| `extensions` (propertyNames) | pattern | `^x-` | Extension key prefix. |

### Reserved built-in `code` values (normative in schema description)

| Code | Typical `constraintKind` |
|---|---|
| `REQUIRED` | `required` |
| `TYPE_MISMATCH` | `type` |
| `MIN_REPEAT` | `cardinality` |
| `MAX_REPEAT` | `cardinality` |
| `CONSTRAINT_FAILED` | `constraint` |
| `SHAPE_FAILED` | `shape` (default when no specific code) |
| `EXTERNAL_FAILED` | `external` (default when no specific code) |

Shape-specific and external-specific codes (e.g. `BUDGET_SUM_MISMATCH`, `EIN_NOT_FOUND`) are allowed beyond these seven.

## Cross-References

- Referenced from Response (`validationResults`) and ValidationReport (`results`).
- Core: Revalidate phase §2.4 Phase 3; §5.6 (non-relevant fields must not produce results).

## Extension Points

- `extensions` with `propertyNames.pattern: "^x-"`.

## Validation Constraints

- Top-level `additionalProperties: false`.
- `context` is open object (no `additionalProperties: false` in schema).
- Semantic: `shapeId` presence rules; only `error` blocks completion; reserved codes for built-in kinds.

---

# ValidationReport Schema Reference Map

> `schemas/validation-report.schema.json` -- 169 lines -- Standalone aggregate of validation results at a point in time (§5.4).

## Overview

Output of Revalidate: sole conformance input: `valid` iff zero `error`-severity results. Merges bind, type, cardinality, shapes, and external results. Non-relevant fields absent from `results`. May be stale vs. later `Response.authored`.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecValidationReport` | `string` (const: `"1.0"`) | Yes | Report document version. MUST be `"1.0"`. |
| `definitionUrl` | `string` (format: `uri`) | No | Definition URL validated against (matches Response). |
| `definitionVersion` | `string` | No | Pinned Definition version (VP-01). |
| `valid` | `boolean` | Yes | `true` iff no error-severity results. |
| `results` | `array` of ValidationResult | Yes | Full ordered findings set. |
| `counts` | `object` | Yes | Severity counts; invariants with `valid` and `results.length`. |
| `timestamp` | `string` (format: `date-time`) | Yes | When this run completed. |
| `extensions` | `object` | No | Report-level extensions; keys `^x-`. |

### counts Object

| Property | Type | Required | Description |
|---|---|---|---|
| `error` | `integer` (minimum: 0) | Yes | Error count; if > 0, `valid` must be false (semantic). |
| `warning` | `integer` (minimum: 0) | Yes | Warning count. |
| `info` | `integer` (minimum: 0) | Yes | Info count. |

## Key Type Definitions ($defs)

None -- `counts` inline only.

## Required Fields

- `$formspecValidationReport`, `valid`, `results`, `counts`, `timestamp`
- Inside `counts`: `error`, `warning`, `info`

## Enums and Patterns

| Property Path | Type | Values/Pattern | Description |
|---|---|---|---|
| `$formspecValidationReport` | const | `"1.0"` | Version pin. |
| `extensions` (propertyNames) | pattern | `^x-` | Extension keys. |

Enumerations on nested results come from ValidationResult.

## Cross-References

- `results[*]` → `https://formspec.org/schemas/validationResult/1.0`.
- Core: §2.4 Phase 3, §5.4, §5.5 (modes), §5.6, VP-01.

## Extension Points

- `extensions` (`^x-`); must not alter `valid` or core semantics (semantic).

## Validation Constraints

- Top-level and `counts`: `additionalProperties: false`.
- `counts.*`: type `integer`, `minimum: 0`.
- `timestamp`, optional `definitionUrl`: formats as in schema.
- Semantic: `valid === (counts.error === 0)`; `counts.error + counts.warning + counts.info === results.length`; non-relevant suppression.

---

# Changelog Schema Reference Map

> `schemas/changelog.schema.json` -- 204 lines -- Differences between two Definition versions for semver and migrations.

## Overview

Atomic **Change** records describe add/remove/modify/move/rename on items, binds, shapes, option sets, data sources, screeners, migrations, or metadata. `semverImpact` is the max semver bump implied by per-change `impact`.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecChangelog` | `string` (const: `"1.0"`) | Yes | Changelog document version. MUST be `"1.0"`. |
| `$schema` | `string` (format: `uri`) | No | JSON Schema meta URI. |
| `definitionUrl` | `string` (format: `uri`) | Yes | Definition `url` being compared. |
| `fromVersion` | `string` (minLength: 1) | Yes | Base version. |
| `toVersion` | `string` (minLength: 1) | Yes | Target version. |
| `generatedAt` | `string` (format: `date-time`) | No | Generation time. |
| `semverImpact` | `string` (enum) | Yes | `major`, `minor`, or `patch` -- max across changes. |
| `summary` | `string` | No | Release-notes summary. |
| `changes` | `array` of Change (`$ref` #/$defs/Change) | Yes | Ordered change list. |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties | Used By |
|---|---|---|---|
| **Change** | One atomic definition-element change. | `type`, `target`, `path`, `impact` (required); `key`, `description`, `before`, `after`, `migrationHint` (optional) | `changes[]` |

### Change Object

| Property | Type | Required | Description |
|---|---|---|---|
| `type` | `string` (enum) | Yes | `added`, `removed`, `modified`, `moved`, `renamed`. |
| `target` | `string` (enum) | Yes | `item`, `bind`, `shape`, `optionSet`, `dataSource`, `screener`, `migration`, `metadata`. |
| `path` | `string` (minLength: 1) | Yes | Dot-path to affected element. |
| `key` | `string` | No | Item key when `target` is `item`. |
| `impact` | `string` (enum) | Yes | `breaking`, `compatible`, `cosmetic`. |
| `description` | `string` | No | Human-readable change description. |
| `before` | any | No | Prior fragment per `type` rules in schema description. |
| `after` | any | No | New fragment per `type` rules. |
| `migrationHint` | `string` | No | `drop`, `preserve`, or FEL with `$old` for §6.7 fieldMap hints. |

## Required Fields

- Top-level: `$formspecChangelog`, `definitionUrl`, `fromVersion`, `toVersion`, `semverImpact`, `changes`
- Each Change: `type`, `target`, `path`, `impact`

## Enums and Patterns

| Property Path | Type | Values/Pattern | Description |
|---|---|---|---|
| `$formspecChangelog` | const | `"1.0"` | Version pin. |
| `semverImpact` | enum | `major`, `minor`, `patch` | Aggregate semver gate. |
| `Change.type` | enum | `added`, `removed`, `modified`, `moved`, `renamed` | Change kind. |
| `Change.target` | enum | `item`, `bind`, `shape`, `optionSet`, `dataSource`, `screener`, `migration`, `metadata` | Affected subsystem. |
| `Change.impact` | enum | `breaking`, `compatible`, `cosmetic` | Per-change severity. |

### Impact vs semver (semantic)

| `impact` | Drives `semverImpact` |
|---|---|
| `breaking` | `major` |
| `compatible` | `minor` |
| `cosmetic` | `patch` |

Document-level `semverImpact` must equal the maximum across `changes[]` (not expressible in JSON Schema alone).

## Cross-References

- Changelog spec / Core §6.7 migrations and `migrationHint` → `fieldMap`.
- Self-contained: Change only via `#/$defs/Change`.

## Extension Points

None (`additionalProperties: false` everywhere).

## Validation Constraints

- Top-level and Change: `additionalProperties: false`.
- `fromVersion`, `toVersion`, `Change.path`: `minLength: 1`.
- `definitionUrl`, `$schema`: `format: uri`; `generatedAt`: `date-time`.
- `before` / `after`: unconstrained JSON types.

---

# Conformance Suite Schema Reference Map

> `schemas/conformance-suite.schema.json` -- 158 lines -- Shared-case contract for cross-runtime conformance (Python + TypeScript).

## Overview

Each case has stable `id`, execution `kind`, `expected` payload after normalization, and mandatory `legacyCoverage` mapping. `allOf` + `if`/`then` adds requirements for `FEL_EVALUATION` vs processing/report/response kinds. `$defs.standardValidationCode` fixes the vocabulary for codes both runtimes must agree on (extends built-in list with registry-related codes).

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (minLength: 1, pattern) | Yes | Stable unique case id. |
| `kind` | `string` (enum) | Yes | Execution mode (see enums). |
| `definitionPath` | `string` (minLength: 1) | Conditional | Repo-relative Definition fixture; required for ENGINE_PROCESSING, VALIDATION_REPORT, RESPONSE_VALIDATION. |
| `registryPaths` | `array` of `string` (each minLength: 1, minItems: 1) | No | Optional registry fixtures to load. |
| `payloadPath` | `string` (minLength: 1) | Conditional | Repo-relative payload file; with `inputData`, part of `oneOf` for non-FEL kinds. |
| `inputData` | any | Conditional | Inline payload alternative to `payloadPath`. |
| `mode` | `string` (enum) | No | `continuous` or `submit` for validation-related kinds. |
| `skipScreener` | `boolean` | No | Skip screener before main definition when true. |
| `expression` | `string` (minLength: 1) | Conditional | FEL for FEL_EVALUATION. |
| `comparator` | `string` (enum) | Conditional | FEL comparison strategy. |
| `fields` | `array` of field object | No | Field declarations/values for FEL_EVALUATION. |
| `compareResponseData` | `boolean` | No | If true, RESPONSE_VALIDATION also compares normalized `response.data`. |
| `expected` | `object` | Yes | Expected output after shared normalization (shape depends on `kind`). |
| `legacyCoverage` | `array` (minItems: 1) of coverage object | Yes | Maps case to replaced legacy tests. |

### Field object (`fields[]`)

| Property | Type | Required | Description |
|---|---|---|---|
| `key` | `string` (minLength: 1) | Yes | Field key. |
| `dataType` | `string` (minLength: 1) | No | Declared data type. |
| `value` | any | No | Field value. |

### legacyCoverage entry

| Property | Type | Required | Description |
|---|---|---|---|
| `path` | `string` (minLength: 1) | Yes | Repo-relative path of replaced legacy surface. |
| `check` | `string` (minLength: 1) | Yes | Legacy test id/name/check replaced. |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties | Used By |
|---|---|---|---|
| **standardValidationCode** | Codes both runtimes MUST emit identically for shared validation assertions. | enum (14 values) | Normative vocabulary; not `$ref`'d by properties in this file |

### standardValidationCode (exhaustive enum)

| Value |
|---|
| `REQUIRED` |
| `TYPE_MISMATCH` |
| `MIN_REPEAT` |
| `MAX_REPEAT` |
| `CONSTRAINT_FAILED` |
| `PATTERN_MISMATCH` |
| `MAX_LENGTH_EXCEEDED` |
| `RANGE_UNDERFLOW` |
| `RANGE_OVERFLOW` |
| `SHAPE_FAILED` |
| `UNRESOLVED_EXTENSION` |
| `EXTENSION_COMPATIBILITY_MISMATCH` |
| `EXTENSION_RETIRED` |
| `EXTENSION_DEPRECATED` |

## Required Fields

- Always: `id`, `kind`, `expected`, `legacyCoverage`
- If `kind` = `FEL_EVALUATION`: `expression`, `comparator`
- If `kind` ∈ {`ENGINE_PROCESSING`, `VALIDATION_REPORT`, `RESPONSE_VALIDATION`}: `definitionPath` and **oneOf** `payloadPath` **or** `inputData`

## Enums and Patterns

| Property Path | Type | Values/Pattern | Description |
|---|---|---|---|
| `id` | pattern | `^[a-z0-9][a-z0-9._-]*$` | Case id syntax. |
| `kind` | enum | `FEL_EVALUATION`, `ENGINE_PROCESSING`, `VALIDATION_REPORT`, `RESPONSE_VALIDATION` | Runner mode. |
| `mode` | enum | `continuous`, `submit` | Validation timing for applicable kinds. |
| `comparator` | enum | `exact`, `normalized`, `tolerant-decimal` | FEL result comparison. |
| `$defs.standardValidationCode` | enum | (14 values, table above) | Cross-runtime code parity. |

## Cross-References

- Fixture paths are plain strings, not JSON Schema `$ref`.
- `standardValidationCode` aligns with `validation-result.schema.json` reserved codes where overlapping, plus extension-registry-related codes per schema description.

## Extension Points

None at document root.

## Validation Constraints

- `additionalProperties: false` on root, each `fields[]` item, each `legacyCoverage[]` item.
- `allOf` conditionals:
  1. **If** `kind` = `FEL_EVALUATION` **then** `required`: `expression`, `comparator`; `fields` may be array.
  2. **If** `kind` ∈ {ENGINE_PROCESSING, VALIDATION_REPORT, RESPONSE_VALIDATION} **then** `required`: `definitionPath`; **oneOf** `{ required: [payloadPath] }` or `{ required: [inputData] }`.
- `registryPaths`: when present, `minItems: 1` and each item `minLength: 1`.
- `legacyCoverage`: `minItems: 1`.
- `expected`: typed as object without further property restriction -- content is runner-defined.
