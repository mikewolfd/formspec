# Intake Handoff Schema Reference Map

> schemas/intake-handoff.schema.json -- 249 lines -- Formspec Intake Handoff: boundary object when a validated intake session is handed to a workflow or case system.

## Overview

The Intake Handoff schema defines the JSON object emitted at the boundary between Formspec intake (validated response + evidence) and an external workflow or case host (for example WOS). It pins the definition used for capture, points at the canonical response and validation snapshot, binds the respondent-ledger head, and records initiation topology (`workflowInitiated` vs `publicIntake`) without assigning case lifecycle authority to Formspec. The normative prose lives in Core **§2.1.6.1** (`specs/core/spec.md`) and the companion intake-handoff specs under `specs/core/intake-handoff-spec.*.md`; this schema is the co-authoritative structural contract.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecIntakeHandoff` | `string` (const: `"1.0"`) | Yes | Intake Handoff specification version. MUST be `"1.0"`. |
| `handoffId` | `string` (minLength: 1) | Yes | Stable identifier for this handoff; should be idempotent for the same submitted intake session. |
| `initiationMode` | `string` (enum) | Yes | Case initiation topology: existing workflow/case vs open public intake (see Enumerations). |
| `caseRef` | `Ref` \| `null` (conditional) | Conditional | Governed case handle when one already exists; required as non-null `Ref` for `workflowInitiated`; MUST be absent or `null` for `publicIntake` (see if/then below). |
| `definitionRef` | `DefinitionRef` | Yes | Pinned Formspec Definition identity (`url` + `version`) used to interpret `responseRef`. |
| `responseRef` | `Ref` | Yes | Reference to the persisted canonical Formspec Response from the intake session. |
| `responseHash` | `HashString` | Yes | Digest of the canonical Response envelope referenced by `responseRef`. |
| `validationReportRef` | `Ref` | Yes | Reference to the immutable ValidationReport snapshot evaluated before handoff. |
| `intakeSessionId` | `string` (minLength: 1) | Yes | Identifier for the intake session that produced the response and ledger evidence. |
| `actorRef` | `Ref` \| `null` | No | Optional reference to the actor who submitted or caused the handoff. |
| `subjectRef` | `Ref` \| `null` | No | Optional reference to the person, organization, asset, or matter the intake concerns. |
| `ledgerHeadRef` | `Ref` | Yes | Reference to the respondent-ledger head event or checkpoint at handoff time. |
| `occurredAt` | `string` (format: `date-time`) | Yes | RFC 3339 timestamp when the handoff was produced. |
| `extensions` | `Extensions` | No | Implementation-specific extension data; keys MUST match `^x-`. |

### DefinitionRef Object (`definitionRef`)

| Property | Type | Required | Description |
|---|---|---|---|
| `url` | `string` (format: `uri`) | Yes | Canonical Definition URL. |
| `version` | `string` (minLength: 1) | Yes | Exact pinned Definition version. |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties | Used By |
|---|---|---|---|
| **DefinitionRef** | Pinned Definition identity for interpreting and validating the Response | `url`, `version` (both required) | Top-level `definitionRef` |
| **Ref** | Opaque non-empty reference string owned by the producing system | Pattern: `minLength: 1` only | `caseRef` (non-null branch), `responseRef`, `validationReportRef`, `ledgerHeadRef`, `actorRef`, `subjectRef` |
| **HashString** | Algorithm-prefixed digest or integrity token (e.g. `sha256:...`) | Pattern-validated string | `responseHash` |
| **Extensions** | Implementation-specific extension object | `propertyNames.pattern: "^x-"`, open `additionalProperties` | Top-level `extensions` |

## Required Fields

- `$formspecIntakeHandoff`
- `handoffId`
- `initiationMode`
- `definitionRef`
- `responseRef`
- `responseHash`
- `validationReportRef`
- `intakeSessionId`
- `ledgerHeadRef`
- `occurredAt`

Within **DefinitionRef**: `url`, `version`.

**Conditional (allOf):**

- When `initiationMode` is **`publicIntake`**: `caseRef` MUST be `null` (schema `then` constrains `caseRef` to type `null`).
- When `initiationMode` is **`workflowInitiated`**: `caseRef` is **required** and MUST satisfy `#/$defs/Ref` (non-null governed-case handle string carried on the handoff).

## Enums and Patterns

| Property Path | Type | Values / Pattern | Description |
|---|---|---|---|
| `$formspecIntakeHandoff` | const | `"1.0"` only | Version pin for intake handoff documents. |
| `initiationMode` | enum | `workflowInitiated`, `publicIntake` | Whether a governed case already exists vs public/open intake. |
| `responseHash` (`HashString`) | pattern | `^[A-Za-z0-9._:+-]+:.+$` | Non-empty algorithm prefix, colon, then digest body. |

## Cross-References

- **Core §2.1.6.1** -- Intake Handoff semantics, initiation modes, and processor obligations (`specs/core/spec.md`).
- **`specs/core/intake-handoff-spec.bluf.md`**, **`intake-handoff-spec.semantic.md`**, **`intake-handoff-spec.llm.md`** -- BLUF, semantic, and LLM-oriented summaries aligned to this schema.
- **Response** -- `responseRef` / `responseHash` bind to the canonical captured payload (Core response processing, e.g. S6.4).
- **ValidationReport** -- `validationReportRef` points at the pre-handoff validation snapshot.
- **Respondent Ledger** -- `ledgerHeadRef` ties the handoff to respondent-side material history (respondent-ledger add-on).
- **WOS / workflow hosts** -- Schema description notes that governed case identity and case-created events are owned by the host, not Formspec.

## Extension Points

- Top-level **`extensions`**: object with `propertyNames.pattern: "^x-"` and `additionalProperties: true` (see `#/$defs/Extensions`).
- No other `additionalProperties` at the document root (`additionalProperties: false`).

## Validation Constraints

- **Root** `additionalProperties: false` -- only listed properties are allowed.
- **`$formspecIntakeHandoff`** -- `const: "1.0"` (only that literal string is valid).
- **`handoffId`**, **`intakeSessionId`** -- `minLength: 1`.
- **`occurredAt`** -- `format: date-time`.
- **`definitionRef`** -- `additionalProperties: false`; `url` uses `format: uri`; `version` uses `minLength: 1`.
- **`caseRef`** -- top-level schema uses `oneOf`: `#/$defs/Ref` or JSON `null`; combined with **allOf** branches above for mode-specific enforcement.
- **`actorRef`**, **`subjectRef`** -- optional `oneOf` `Ref` or `null`.
- **Polymorphism** -- Two `allOf` items: (1) if `initiationMode` const `publicIntake` then `caseRef` type `null`; (2) if `initiationMode` const `workflowInitiated` then `required` includes `caseRef` and `caseRef` is `$ref` to `Ref`.
