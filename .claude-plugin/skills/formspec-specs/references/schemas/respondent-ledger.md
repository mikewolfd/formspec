# Respondent Ledger & Event -- Grouped Schema Reference Map

These two schemas are documented together because the **ledger** (`respondent-ledger.schema.json`) references the **event** document and shared `$defs` (`events[]` items, `currentIdentityAttestation` → `IdentityAttestation`). Navigating material history, integrity checkpoints, and per-event semantics normally requires both files; this map keeps property tables, enums, and cross-refs in one place.

---

# Formspec Respondent Ledger Reference Map

> `schemas/respondent-ledger.schema.json` -- **205 lines** -- Append-only respondent-side audit ledger layered on top of a canonical Formspec Response.

## Overview

The Respondent Ledger schema defines an optional add-on document that tracks material history for a Formspec Response without changing core Response semantics. It records drafts, resumes, attachments, submissions, amendments, stops, migrations, and validation snapshots as an append-only event stream. The ledger references a Response by `responseId` and pins a Definition by the `(definitionUrl, definitionVersion)` tuple. It may optionally embed the event stream and integrity checkpoints inline, or reference them externally. The schema enforces `additionalProperties: false` at the top level and on nested checkpoint objects.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecRespondentLedger` | `string` (const `"0.1"`) | Yes | Respondent Ledger add-on specification version. MUST be `"0.1"`. |
| `ledgerId` | `string` (minLength: 1) | Yes | Stable identifier for this ledger document. |
| `responseId` | `string` (minLength: 1) | Yes | Identifier of the current canonical Formspec Response described by this ledger. |
| `definitionUrl` | `string` (format: `uri`) | Yes | Canonical URL of the pinned Definition currently associated with the response. |
| `definitionVersion` | `string` (minLength: 1) | Yes | Exact pinned Definition version currently associated with the response. |
| `status` | `string` (enum) | Yes | Current lifecycle status of the response/ledger pair. |
| `createdAt` | `string` (format: `date-time`) | Yes | Timestamp of the first recorded event in the ledger. |
| `lastEventAt` | `string` (format: `date-time`) | Yes | Timestamp of the most recent recorded event in the ledger. |
| `eventCount` | `integer` (minimum: 0) | Yes | Total number of retained events in the ledger. |
| `organizationId` | `string` | No | Organization or tenant identifier when the implementation is multi-tenant. |
| `environment` | `string` | No | Environment label such as production, staging, or sandbox. |
| `currentResponseHash` | `$ref` → `HashString` | No | Algorithm-prefixed digest of the current Response. |
| `currentResponseAuthored` | `string` (format: `date-time`) | No | Most recent `Response.authored` timestamp known to the ledger. |
| `headEventId` | `string` | No | Identifier of the newest retained event in the ledger. |
| `identityRefs` | `array` of `string` (minLength: 1, `uniqueItems`) | No | Identifiers for identity, DID, or proof-of-personhood attestations materially associated with this ledger. |
| `currentIdentityAttestation` | `$ref` → `respondent-ledger-event.schema.json#/$defs/IdentityAttestation` | No | Current identity attestation shape (shared with the event schema). |
| `sessionRefs` | `array` of `string` (minLength: 1, `uniqueItems`) | No | Identifiers for known session segments that contributed events to this ledger. |
| `checkpointRefs` | `array` of `string` (minLength: 1, `uniqueItems`) | No | Identifiers for checkpoints covering contiguous ranges of ledger events. |
| `events` | `array` of Respondent Ledger Event (`$ref` → `respondent-ledger-event.schema.json`) | No | Optional embedded event stream retained with the ledger document. |
| `checkpoints` | `array` of `LedgerCheckpoint` | No | Optional embedded integrity checkpoints for contiguous event ranges. |
| `extensions` | `$ref` → `Extensions` | No | Implementation-specific extension data; keys MUST match `^x-`. |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties | Used By |
|---|---|---|---|
| **LedgerCheckpoint** | Integrity checkpoint sealing a contiguous range of ledger events | `checkpointId`, `ledgerId`, `fromSequence`, `toSequence`, `batchHash`, `signedAt` (required); `previousCheckpointHash`, `signature`, `keyId`, `anchorRef`, `algorithm`, `extensions` | `checkpoints[]` |
| **HashString** | Algorithm-prefixed digest or integrity token (e.g. `sha256:...`) | pattern | `currentResponseHash`, `LedgerCheckpoint.batchHash`, `LedgerCheckpoint.previousCheckpointHash` |
| **Extensions** | Namespaced extension bag | `propertyNames`: `^x-`, `additionalProperties`: true | top-level `extensions`, `LedgerCheckpoint.extensions` |

### LedgerCheckpoint (nested)

| Property | Type | Required | Description |
|---|---|---|---|
| `checkpointId` | `string` (minLength: 1) | Yes | Stable identifier for the checkpoint object. |
| `ledgerId` | `string` (minLength: 1) | Yes | Identifier of the ledger sealed by this checkpoint. |
| `fromSequence` | `integer` (minimum: 1) | Yes | First event sequence included in the sealed contiguous range. |
| `toSequence` | `integer` (minimum: 1) | Yes | Last event sequence included in the sealed contiguous range. |
| `batchHash` | `HashString` | Yes | Digest of the sealed event batch. |
| `signedAt` | `string` (format: `date-time`) | Yes | Timestamp when the checkpoint was signed or otherwise sealed. |
| `previousCheckpointHash` | `HashString` | No | Prior checkpoint hash (hash chain). |
| `signature` | `string` | No | Opaque signature or detached proof blob for the checkpoint. |
| `keyId` | `string` | No | Identifier of the signing key used for this checkpoint. |
| `anchorRef` | `string` | No | External anchor reference (e.g. org audit ledger, transparency log entry). |
| `algorithm` | `string` | No | Signature or hashing algorithm identifier for checkpoint material. |
| `extensions` | `Extensions` | No | Implementation-specific extension data (`x-` keys). |

## Required Fields

- `$formspecRespondentLedger`
- `ledgerId`
- `responseId`
- `definitionUrl`
- `definitionVersion`
- `status`
- `createdAt`
- `lastEventAt`
- `eventCount`

**LedgerCheckpoint:** `checkpointId`, `ledgerId`, `fromSequence`, `toSequence`, `batchHash`, `signedAt`.

## Enums and Patterns

| Property path | Type | Values / pattern | Description |
|---|---|---|---|
| `$formspecRespondentLedger` | const | `"0.1"` only | Ledger add-on version marker. |
| `status` | enum | `in-progress`, `completed`, `amended`, `stopped` | Lifecycle status of the response/ledger pair. |
| `HashString` ($defs) | pattern | `^[A-Za-z0-9._:+-]+:.+$` | Non-empty digest after `prefix:` |

## Cross-References

- **Normative behavior:** Respondent Ledger add-on semantics (drafts, amendments, attachments, validation snapshots, hash chains) are defined in the **Respondent Ledger** specification; use that spec for processing rules beyond JSON Schema.
- **`currentIdentityAttestation`:** `respondent-ledger-event.schema.json#/$defs/IdentityAttestation`.
- **`events[]`:** full top-level event object per `respondent-ledger-event.schema.json`.
- **Validation details inside events:** `ValidationSnapshot.results[]` references `https://formspec.org/schemas/validationResult/1.0` (see event schema section).

## Extension Points

- Top-level `extensions` and `LedgerCheckpoint.extensions`: object with `propertyNames.pattern: "^x-"` and `additionalProperties: true`.

## Validation Constraints

- Top-level and `LedgerCheckpoint`: `additionalProperties: false`.
- `$formspecRespondentLedger`: `const: "0.1"`.
- `ledgerId`, `responseId`, `definitionVersion`: `minLength: 1`.
- `definitionUrl`: `format: uri`.
- `createdAt`, `lastEventAt`, `currentResponseAuthored`, `LedgerCheckpoint.signedAt`: `format: date-time`.
- `eventCount`: `integer`, `minimum: 0`.
- `LedgerCheckpoint.fromSequence` / `toSequence`: `integer`, `minimum: 1`.
- `identityRefs`, `sessionRefs`, `checkpointRefs`: `uniqueItems: true`, items `minLength: 1`.

---

# Formspec Respondent Ledger Event Reference Map

> `schemas/respondent-ledger-event.schema.json` -- **492 lines** -- Single append-only respondent-side audit event for the Respondent Ledger add-on.

## Overview

The Respondent Ledger Event schema defines one append-only audit record: material milestones (drafts, sessions, submissions, amendments, attachment lifecycle, prepopulation, merge resolution, validation snapshots, calculation changes, pruning, autosave, device/identity flows, submit attempts, migrations) without redefining the Formspec Response as an event stream. Each event has a monotonic `sequence`, `actor` and `source`, optional `changes`, optional validation and identity payloads, optional Trellis/hash-chain fields, and `allOf` rules that tighten requirements for attachment-related `eventType` values. `additionalProperties: false` applies at the root and on each `$defs` object type.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `eventId` | `string` (minLength: 1) | Yes | Unique identifier for this event within the ledger. |
| `sequence` | `integer` (minimum: 1) | Yes | Monotonic sequence number within the ledger. |
| `eventType` | `$ref` → `EventType` | Yes | Canonical event classification. |
| `occurredAt` | `string` (format: `date-time`) | Yes | When the underlying material action occurred. |
| `recordedAt` | `string` (format: `date-time`) | Yes | When the processor durably recorded the event. |
| `responseId` | `string` (minLength: 1) | Yes | Formspec Response this event belongs to. |
| `definitionUrl` | `string` (format: `uri`) | Yes | Canonical URL of the pinned Definition in force for this event. |
| `definitionVersion` | `string` (minLength: 1) | Yes | Exact pinned Definition version in force for this event. |
| `actor` | `$ref` → `Actor` | Yes | Who initiated or is attributed with the event. |
| `source` | `$ref` → `Source` | Yes | Capture channel or subsystem that produced the event. |
| `changes` | `array` of `ChangeSetEntry` (`minItems: 1` when array present) | No* | Ordered atomic material changes (*conditionally required for some `eventType`; see **Conditional requirements**). |
| `validationSnapshot` | `$ref` → `ValidationSnapshot` | No | Validation finding counts (and optional detailed results) at the event boundary. |
| `identityAttestation` | `$ref` → `IdentityAttestation` | No | Identity / proof-of-personhood attestation for this event. |
| `attachmentBinding` | `$ref` → `EvidenceAttachmentBinding` | No* | Attachment integrity binding (*required for `attachment.added` / `attachment.replaced` under `allOf`). |
| `priorAttachmentBindingHash` | `HashString` | No* | Prior binding hash for `attachment.removed` (*required then; forbidden for added/replaced under `allOf`). |
| `sessionRef` | `string` (minLength: 1) | No | Respondent session segment id for this event. |
| `amendmentRef` | `string` (minLength: 1) | No | Amendment cycle id when applicable. |
| `priorEventHash` | `oneOf`: `HashString` \| `null` | No | Previous event hash in the respondent-ledger chain, or `null` for the first event in a Trellis-wrapped chain. |
| `eventHash` | `HashString` | No | Hash of this event payload for integrity. |
| `extensions` | `$ref` → `Extensions` | No | Implementation-specific extension data (`x-` keys). |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties | Used By |
|---|---|---|---|
| **EventType** | Canonical event type string (21 enum values) | (enum) | `eventType` |
| **Actor** | Actor attribution | `kind` (required); `id`, `display`, `assuranceLevel`, `privacyTier`, `did`, `identityProviderRef`, `subjectRef`, `extensions` | `actor` |
| **Source** | Capture channel | `kind` (required); `channelId`, `deviceId`, `ipAddressRef`, `userAgentRef`, `extensions` | `source` |
| **ChangeSetEntry** | One atomic material change | `op`, `path`, `valueClass` (required); optional value hashes, display strings, `reasonCode`, `dataPointer`, `extensions` | `changes[]` |
| **IdentityAttestation** | Normalized attestation | `provider`, `credentialType` (required); DID, binding, personhood, privacy, evidence refs, `extensions` | `identityAttestation`; **also** ledger `currentIdentityAttestation` |
| **EvidenceAttachmentBinding** | Attachment bytes + Trellis hashes | `attachment_id`, `slot_path`, `media_type`, `byte_length`, `attachment_sha256`, `payload_content_hash`, `filename`, `prior_binding_hash` (all required keys on object) | `attachmentBinding` when attachment events |
| **ValidationSnapshot** | Validation counts (+ optional results) | `errors`, `warnings`, `infos` (required); `results`, `extensions` | `validationSnapshot` |
| **PrivacyTier** | Disclosure tier enum | (enum) | `Actor.privacyTier`, `IdentityAttestation.privacyTier` |
| **DidString** | DID syntax | pattern | `Actor.did`, `IdentityAttestation.did` |
| **HashString** | Prefixed digest | pattern | hashes on event, changes, attachment binding |
| **Extensions** | `x-` namespaced bag | `propertyNames`: `^x-` | root, Actor, Source, ChangeSetEntry, IdentityAttestation, ValidationSnapshot |

### Actor (nested)

| Property | Type | Required | Description |
|---|---|---|---|
| `kind` | `string` (enum) | Yes | `respondent`, `delegate`, `system`, `support-agent`, `unknown`. |
| `id` | `string` | No | Stable actor identifier when available. |
| `display` | `string` | No | Human-readable label for timeline/support views. |
| `assuranceLevel` | `string` | No | Ordered assurance level per spec §6.6.1; base four often `L1`–`L4` (examples in schema). |
| `privacyTier` | `PrivacyTier` | No | Disclosure / linkability tier. |
| `did` | `DidString` | No | DID for this actor context. |
| `identityProviderRef` | `string` | No | Normalized provider/verifier/adapter reference. |
| `subjectRef` | `string` | No | Pseudonymous continuity id for the ledger. |
| `extensions` | `Extensions` | No | `x-` extensions. |

### Source (nested)

| Property | Type | Required | Description |
|---|---|---|---|
| `kind` | `string` (enum) | Yes | `web`, `mobile`, `api`, `import`, `system-job`, `unknown`. |
| `channelId` | `string` | No | Implementation channel id. |
| `deviceId` | `string` | No | Device id when tracked. |
| `ipAddressRef` | `string` | No | Protected derivative/ref for IP metadata. |
| `userAgentRef` | `string` | No | Protected derivative/ref for user-agent metadata. |
| `extensions` | `Extensions` | No | `x-` extensions. |

### ChangeSetEntry (nested)

| Property | Type | Required | Description |
|---|---|---|---|
| `op` | `string` (enum) | Yes | `set`, `unset`, `add`, `remove`, `replace`, `reorder`, `status-transition`. |
| `path` | `string` (minLength: 1) | Yes | Logical Formspec response path to the changed node. |
| `valueClass` | `string` (enum) | Yes | `user-input`, `prepopulated`, `calculated`, `imported`, `attachment`, `system-derived`, `migration-derived`. |
| `itemKey` | `string` | No | Stable item key when path maps to one item. |
| `before` | any | No | Prior value if retained per privacy policy. |
| `after` | any | No | New value if retained per privacy policy. |
| `beforeHash` | `HashString` | No | Hash of prior value. |
| `afterHash` | `HashString` | No | Hash of new value. |
| `displayBefore` | `string` | No | Safe human summary of prior value. |
| `displayAfter` | `string` | No | Safe human summary of new value. |
| `reasonCode` | `string` | No | Machine-readable reason for the change. |
| `dataPointer` | `string` | No | JSON Pointer or row discriminator in repeats. |
| `extensions` | `Extensions` | No | `x-` extensions. |

### IdentityAttestation (nested)

| Property | Type | Required | Description |
|---|---|---|---|
| `provider` | `string` | Yes | Issuer/provider id (e.g. idme, login.gov, internal proofing service, DID issuer). |
| `adapter` | `string` | No | Adapter id normalizing provider-specific flows. |
| `subjectRef` | `string` | No | Pseudonymous subject bound to this attestation. |
| `did` | `DidString` | No | DID when applicable. |
| `verificationMethod` | `string` | No | DID URL / key id / verification method ref. |
| `credentialType` | `string` (enum) | Yes | See **Enums and Patterns**. |
| `credentialRef` | `string` | No | Ref to encrypted token/credential envelope (not raw secret). |
| `personhoodCheck` | `string` (enum) | No | Personhood/liveness outcome when applicable. |
| `subjectBinding` | `string` (enum) | No | Party the attestation is about. |
| `assuranceLevel` | `string` | No | Assurance level per spec §6.6.1 (examples `L1`–`L4`). |
| `privacyTier` | `PrivacyTier` | No | Disclosure tier. |
| `selectiveDisclosureProfile` | `string` | No | Named profile for selective disclosure. |
| `evidenceRef` | `string` | No | Ref to encrypted reveal / redacted export evidence. |
| `extensions` | `Extensions` | No | `x-` extensions. |

### EvidenceAttachmentBinding (nested)

| Property | Type | Required | Description |
|---|---|---|---|
| `attachment_id` | `string` (minLength: 1) | Yes | Stable logical attachment id in response scope. |
| `slot_path` | `string` (minLength: 1) | Yes | Response path or evidence slot for the attachment. |
| `media_type` | `string` (pattern) | Yes | RFC 6838 media type of bytes before Trellis envelope. |
| `byte_length` | `integer` (minimum: 0) | Yes | Byte length before Trellis encryption. |
| `attachment_sha256` | `HashString` | Yes | SHA-256 over raw attachment bytes (pre-envelope). |
| `payload_content_hash` | `HashString` | Yes | Trellis ciphertext hash; aligns with Trellis payload `content_hash` when wrapped. |
| `filename` | `string` \| `null` | Yes | Display-only filename (may be null). |
| `prior_binding_hash` | `HashString` \| `null` | Yes | Prior attachment-binding event hash for replacement, or `null` on first bind (see `allOf` for `attachment.replaced`). |

### ValidationSnapshot (nested)

| Property | Type | Required | Description |
|---|---|---|---|
| `errors` | `integer` (minimum: 0) | Yes | Count of error-severity findings. |
| `warnings` | `integer` (minimum: 0) | Yes | Count of warning-severity findings. |
| `infos` | `integer` (minimum: 0) | Yes | Count of info-severity findings. |
| `results` | `array` of ValidationResult | No | Optional detailed results (`$ref` external schema). |
| `extensions` | `Extensions` | No | `x-` extensions. |

## Required Fields

- `eventId`, `sequence`, `eventType`, `occurredAt`, `recordedAt`, `responseId`, `definitionUrl`, `definitionVersion`, `actor`, `source`

**Actor:** `kind`. **Source:** `kind`. **ChangeSetEntry:** `op`, `path`, `valueClass`. **IdentityAttestation:** `provider`, `credentialType`. **ValidationSnapshot:** `errors`, `warnings`, `infos`. **EvidenceAttachmentBinding:** all eight properties listed in its table (including `filename` typed as string or null, and `prior_binding_hash` as hash or null per `oneOf`).

## Conditional requirements (`allOf`)

| When | Additional requirements | Forbidden / constrained |
|---|---|---|
| `eventType` = `attachment.added` | `changes`, `attachmentBinding` | MUST NOT include `priorAttachmentBindingHash`. `attachmentBinding.prior_binding_hash` MUST be JSON `null`. |
| `eventType` = `attachment.replaced` | `changes`, `attachmentBinding` | MUST NOT include `priorAttachmentBindingHash`. `attachmentBinding.prior_binding_hash` MUST be a non-null `HashString` (required on nested object by `then`). |
| `eventType` = `attachment.removed` | `changes`, `priorAttachmentBindingHash` | MUST NOT include `attachmentBinding`. |

## Enums and Patterns

| Property path | Type | Values / pattern | Description |
|---|---|---|---|
| `eventType` | enum | `session.started`, `draft.saved`, `draft.resumed`, `response.completed`, `response.amendment-opened`, `response.amended`, `response.stopped`, `attachment.added`, `attachment.replaced`, `attachment.removed`, `prepopulation.applied`, `system.merge-resolved`, `validation.snapshot-recorded`, `calculation.material-change`, `nonrelevant.pruned`, `autosave.coalesced`, `device-linked`, `identity-verified`, `attestation.captured`, `response.submit-attempted`, `response.migrated` | Schema text: first **13** values (through `validation.snapshot-recorded`) are **required** event types for conformant implementations; the remainder are optional standardized extension points. |
| `actor.kind` | enum | `respondent`, `delegate`, `system`, `support-agent`, `unknown` | Actor classification. |
| `source.kind` | enum | `web`, `mobile`, `api`, `import`, `system-job`, `unknown` | Capture channel. |
| `ChangeSetEntry.op` | enum | `set`, `unset`, `add`, `remove`, `replace`, `reorder`, `status-transition` | Material change operation. |
| `ChangeSetEntry.valueClass` | enum | `user-input`, `prepopulated`, `calculated`, `imported`, `attachment`, `system-derived`, `migration-derived` | Provenance class of the value. |
| `IdentityAttestation.credentialType` | enum | `oidc-token`, `verifiable-credential`, `proof-of-personhood`, `delegation-assertion`, `provider-assertion`, `other` | Credential category. |
| `IdentityAttestation.personhoodCheck` | enum | `passed`, `failed`, `inconclusive`, `not-performed` | Personhood check outcome. |
| `IdentityAttestation.subjectBinding` | enum | `respondent`, `subject`, `delegate`, `other`, `unknown` | Who the attestation concerns. |
| `PrivacyTier` | enum | `anonymous`, `pseudonymous`, `identified`, `public` | Identity disclosure tier. |
| `HashString` | pattern | `^[A-Za-z0-9._:+-]+:.+$` | Prefixed digest token. |
| `DidString` | pattern | `^did:[A-Za-z0-9._:%-]+:.+$` | DID string syntax. |
| `EvidenceAttachmentBinding.media_type` | pattern | `^[A-Za-z0-9!#$&^_.+-]+/[A-Za-z0-9!#$&^_.+-]+$` | Type/subtype token shape. |

## Cross-References

- **Normative behavior:** Respondent Ledger add-on (event ordering, privacy, Trellis, amendment flows) -- **Respondent Ledger** specification.
- **`validationSnapshot.results[]`:** `https://formspec.org/schemas/validationResult/1.0`.
- **Ledger document:** `IdentityAttestation` is reused from `respondent-ledger-event.schema.json#/$defs/IdentityAttestation` on the ledger’s `currentIdentityAttestation`.
- **Embedded stream:** each ledger `events[]` element validates as the full event root schema `respondent-ledger-event.schema.json`.

## Extension Points

- `Extensions` on: root, `Actor`, `Source`, `ChangeSetEntry`, `IdentityAttestation`, `ValidationSnapshot` -- keys MUST match `^x-`, values unconstrained by schema.

## Validation Constraints

- Root, `Actor`, `Source`, `ChangeSetEntry`, `IdentityAttestation`, `EvidenceAttachmentBinding`, `ValidationSnapshot`: `additionalProperties: false`.
- `changes`: when present, `minItems: 1` (empty array invalid).
- `sequence`: integer ≥ 1; `ValidationSnapshot` counts: integer ≥ 0.
- `priorEventHash`: `oneOf` `HashString` or JSON `null`.
- `EvidenceAttachmentBinding.prior_binding_hash`: `oneOf` `HashString` or `null` (first bind vs replacement semantics coordinated with `allOf`).
- `ChangeSetEntry.before` / `after`: no JSON Schema `type` (any value allowed when present).
