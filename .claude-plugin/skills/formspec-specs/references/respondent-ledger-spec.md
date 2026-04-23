# Respondent Ledger Specification Reference Map

> specs/audit/respondent-ledger-spec.md -- 1070 lines, ~55K -- Add-On (Audit): optional respondent-facing audit change-tracking ledger (v0.2.0-draft)

## Overview

The Respondent Ledger Add-On Specification (v0.2.0-draft) defines an optional, append-only audit trail of material respondent-side history -- drafts, saves, submissions, amendments, and abandonment -- layered on Formspec core without replacing the canonical `Response`. It specifies four object types (`RespondentLedger`, `RespondentLedgerEvent`, `ChangeSetEntry`, `LedgerCheckpoint`), an event taxonomy, materiality rules, provider-neutral identity attestation, normative assurance levels (L1–L4), independence of disclosure tier from assurance level, distinction between authored signatures and recorded attestations, `EvidenceAttachmentBinding` for attachment integrity (including Trellis envelope alignment), privacy-tiered disclosure, integrity checkpointing, deployment profiles, and legal-sufficiency caveats. Wire literal `$formspecRespondentLedger` remains `"0.1"` per changelog; spec document version is 0.2.0-draft.

## Section Map

### Front matter and purpose (Lines 1-33)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| (header) | Respondent Ledger Add-On Specification v0.2 | Draft status, audience, RFC 2119/8174 normative language. | draft, RFC 2119, RFC 8174 | Confirming normative keywords and document status |
| 1 | Purpose | Optional respondent-facing audit ledger records material history (draft/submit/reopen/amend/abandon) without altering the core `Response` contract. Enumerates five audit questions (material deltas, reopening, user vs prepopulated, validation at boundaries, verifiability). | respondent-facing audit, material history, Response contract, verification | Understanding scope and the questions the ledger answers |

### Relationship to Formspec core (Lines 35-84)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 2.1 | Layering model | Three layers: Definition, Response (pinned tuple), Respondent Ledger (append-only material events). | Definition, Response, Respondent Ledger, append-only | Explaining how ledger relates to definition and response |
| 2.2 | What remains canonical | Response stays canonical snapshot; MUST/MUST NOT/MAY rules: no ledger replay required, core semantics unchanged, MAY support audit/dispute/forensics. | canonical Response, ledger replay prohibited, additive semantics | Confirming ledger never replaces Response |
| 2.3 | Optionality and conformance boundary | Conformance to add-on is optional for core-only processors; claiming conformance requires produce/preserve per spec, additive semantics, SHOULD discovery, MAY `Response.extensions` pointer. | conformance, discovery, `x-respondentLedger`, extensions | Linking responses to ledgers and conformance claims |
| 2.4 | Legal sufficiency | Integrity/chaining/anchoring improve evidentiary quality but do not guarantee admissibility; MUST NOT imply admissibility from integrity alone; MAY make stronger claims only with disclosed process/signature/records/law basis. | legal admissibility, evidentiary claims, disclosure | Compliance copy, marketing claims, legal review |

### Design goals and non-goals (Lines 87-117)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 3.1 | Goals | Twelve goals: optional, append-only, material, path-native, portable, identity-portable, tier-aware disclosure, identity-decoupled, privacy-bounded, human-legible first, integrity-ready. | append-only, materiality, path-native, privacy-bounded | Product or architecture alignment with spec intent |
| 3.2 | Non-goals | Explicitly excludes keystroke capture, focus/blur telemetry, mandated storage/crypto/UI, studio-author tracking, reviewer workflow history. | non-goals, telemetry exclusions | Scoping what the spec deliberately omits |

### Core model (Lines 119-138)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 4.1 | Top-level document | One ledger per current `responseId`; MAY span sessions and amendment cycles. | ledger document, responseId, session segments | Cardinality ledger ↔ response |
| 4.2 | Canonical objects | Four primary types: RespondentLedger, RespondentLedgerEvent, ChangeSetEntry, LedgerCheckpoint. | canonical object names | Data model vocabulary |

### RespondentLedger object (Lines 142-206)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 5.1 | Required fields | MUST include: ledgerId, `$formspecRespondentLedger`, responseId, definitionUrl, definitionVersion, status, createdAt, lastEventAt, eventCount. | required fields, spec version string | Validating top-level ledger shape |
| 5.2 | Recommended fields | SHOULD include where available: organizationId, environment, currentResponseHash, currentResponseAuthored, headEventId, sessionRefs, checkpointRefs, extensions. | recommended fields, headEventId | Optional metadata and indexing |
| 5.3 | Field semantics | Defines each field: spec version string, lifecycle alignment, hashes, authored timestamp, event counts. | field semantics, currentResponseHash | Interpreting ledger document fields |
| 5.4 | Example | JSON example with status in-progress, four events, storage extension. | JSON example | Wire-shape illustration |

### RespondentLedgerEvent object (Lines 210-417)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 6.1 | Required fields | MUST: eventId, sequence, eventType, occurredAt, recordedAt, responseId, definitionUrl, definitionVersion, actor, source. | required event fields | Minimal valid event |
| 6.2 | Conditional fields | changes MUST for material deltas; validationSnapshot SHOULD at boundaries; identityAttestation SHOULD for identity events; priorEventHash/eventHash SHOULD when chaining enabled -- with Trellis wrap: MUST present; priorEventHash null only for first wrapped event; attachmentBinding MUST for attachment.added/replaced; priorAttachmentBindingHash MUST for attachment.removed (no new binding); sessionRef/amendmentRef SHOULD when applicable. | changes, validationSnapshot, Trellis, eventHash, priorEventHash, attachmentBinding, priorAttachmentBindingHash | Conditional field matrix and Trellis rules |
| 6.3 | Field semantics | Semantics for all event fields including attachment binding hashes, privacyTier, extensions. | occurredAt vs recordedAt, monotonic sequence, attachmentBinding | Reading or implementing event serialization |
| 6.4 | Actor object | MUST include kind; SHOULD stable id when available. kinds: respondent, delegate, system, support-agent, unknown. Recommended: id, display, assuranceLevel, did, identityProviderRef, subjectRef. | actor, actor.kind, subjectRef | Who is attributed |
| 6.5 | Source object | MUST identify channel. kinds: web, mobile, api, import, system-job, unknown. Sensitive metadata SHOULD be refs/derivatives. | source.kind, channelId, ipAddressRef | Provenance channel |
| 6.6 | Identity attestation object | Provider-neutral identity/PoP/VC/delegation evidence; SHOULD normalize vendor payloads to common shape. Recommended field list (provider, adapter, subjectRef, did, verificationMethod, credentialType, credentialRef, personhoodCheck, subjectBinding, assuranceLevel, privacyTier, selectiveDisclosureProfile, evidenceRef). | identityAttestation, provider-neutral, DID, selective disclosure | Identity integration |
| 6.6.1 | Assurance levels | MUST support ordered L1–L4 (self-asserted → corroborated → verified → in-person-equivalent). MAY extend with declared ordering; MUST NOT silently downgrade; upgrades forward-only; prior events MUST NOT be rewritten. | L1, L2, L3, L4, assuranceLevel, upgrade | Normative assurance taxonomy |
| 6.6A | Identity and implementation decoupling | Three concerns: response/audit continuity, subject continuity (subjectRef), identity proofing. Anonymous/pseudonymous default compatible with later binding; MUST NOT collapse signature chain, identity attestation, and authored assent into one field/step. | subjectRef, decoupling, export separation | Privacy-first vs later identity binding |
| 6.7 | Disclosure tier and assurance are independent | MUST NOT conflate privacyTier and assuranceLevel or derive one from the other; four combinations valid; profile constraints MUST be independent predicates; attestation upgrades MUST NOT implicitly change disclosure tier; re-identification MUST NOT imply assurance upgrade. | privacyTier, assuranceLevel, independence invariant | Review/export policy design |
| 6.8 | Authored signatures vs. recorded attestations | Response MAY carry authored signature (defined with Response spec). Ledger records attestation.captured / identityAttestation as audit observation. MUST NOT substitute recorded event for authored signature; verifiers MUST verify authored signature. | authored signature, attestation.captured, verifier | Distinguishing legal/cryptographic binding from audit log |
| 6.9 | EvidenceAttachmentBinding object | Canonical attachment-binding record (ADR 0072). For added/replaced: MUST carry exact field set (attachment_id, slot_path, media_type, byte_length, attachment_sha256, payload_content_hash, filename, prior_binding_hash). Semantics: stable attachment_id, RFC 6838 media_type, byte rules for digests, Trellis alignment for payload_content_hash, prior_binding_hash rules per op; removed events use priorAttachmentBindingHash only. Trellis: metadata in EventPayload.extensions key. | EvidenceAttachmentBinding, attachment_sha256, payload_content_hash, prior_binding_hash, Trellis, slot_path | Attachment audit chain and Trellis wiring |

### ChangeSetEntry object (Lines 421-528)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 7.1 | Purpose | Atomic respondent-visible change; stable for analysis, readable on timelines, compact. | ChangeSetEntry, atomic change | Concept of one delta unit |
| 7.2 | Required fields | MUST: op, path, valueClass. | op, path, valueClass | Minimal change entry |
| 7.3 | Recommended fields | SHOULD: itemKey, before, after, hashes, display values, reasonCode, dataPointer. | beforeHash, semanticDelta, dataPointer | Richer audit without full response copies |
| 7.4 | Supported operations | ops: set, unset, add, remove, replace, reorder, status-transition with interpretations. | status-transition, reorder | Choosing op |
| 7.5 | Value classes | valueClass enum: user-input, prepopulated, calculated, imported, attachment, system-derived, migration-derived. | valueClass | Classifying value origin |
| 7.6 | Path requirements | path MUST match logical response path model; SHOULD itemKey; repeated structures SHOULD stable discriminator, MAY JSON Pointer dataPointer; SHOULD NOT index-only when stable id exists. | path, itemKey, stable row discriminator | Repeat groups and paths |
| 7.7 | Sensitive values and minimization | MAY omit before/after; SHOULD then use hashes, display, semanticDelta, redactionPolicy. | minimization, redactionPolicy | PII handling |
| 7.8 | Example | replace on nested path with user-input and reasonCode. | example JSON | Concrete change entry |

### Event taxonomy (Lines 532-593)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 8.1 | Required event types | MUST support when applicable: session.started, draft.saved, draft.resumed, response.completed, response.amendment-opened, response.amended, response.stopped, attachment.added/replaced/removed, prepopulation.applied, system.merge-resolved, validation.snapshot-recorded. | required event types | Minimum event type support |
| 8.2 | Optional event types | MAY: calculation.material-change, nonrelevant.pruned, autosave.coalesced, device-linked, identity-verified, attestation.captured, response.submit-attempted, response.migrated. | optional event types | Extended telemetry |
| 8.3 | Event type guidance | Per-type behavior including attachment events with attachmentBinding constraints and submit-attempt semantics. | draft.saved coalescing, attachmentBinding, identity-verified | Exact firing semantics |
| 8.4 | Explicit exclusions | Not required: keystrokes, focus/blur, page nav, every calc tick, rendering lifecycle. | exclusions | What not to log |

### Materiality rules (Lines 596-626)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 9.1 | General rule | Material history only; MUST NOT emit durable events for every ephemeral UI action. | materiality, ephemeral UI | Filtering noise |
| 9.2 | Material changes | Criteria: persisted state, lifecycle, attachments, persisted calculated outcome, validation at boundaries, NRB/migration/merge retained values, attestation/DID/assurance relied on for completion. | material change criteria | Whether to record |
| 9.3 | Autosave coalescing | MAY coalesce; MUST final persisted state; SHOULD stable ordering and policy indication. | autosave coalescing | Autosave implementation |

### Interaction with Formspec response semantics (Lines 629-688)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 10.1 | Response pinning | Every event MUST record definitionUrl/definitionVersion at event time; MUST NOT reinterpret historically. | definition pinning, version drift | Migration and replay safety |
| 10.2 | Response status transitions | MUST align to Response.status: in-progress, completed, amended, stopped; SHOULD ChangeSetEntry op status-transition. | lifecycle, status-transition | Status change representation |
| 10.3 | Validation snapshots | SHOULD snapshot at boundaries with valid, counts, generatedAt, resultRefs/summary; MUST NOT alter validation meaning. | validationSnapshot, capture not validator | Validation at save/submit |
| 10.4 | Non-relevant fields | SHOULD record material event when shape/retained values change; nonrelevant.pruned or draft.saved + reasonCode nonrelevant-prune. | nonrelevant.pruned, NRB | NRB-driven changes |
| 10.5 | Calculated values | SHOULD NOT log every reeval; record only when persisted, materially different, and audit-meaningful. | calculated values, materiality triple | Calc change logging |
| 10.6 | Prepopulation | SHOULD prepopulation.applied with prepopulated/imported; edits SHOULD user-input + user-edit-over-prepopulation. | prepopulation, reasonCode | Hydration vs override audit |

### Amendments, migration, and version evolution (Lines 690-716)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 11.1 | Amendment cycles | SHOULD amendment-opened, amendmentRef on subsequent events, amended on durable completion; status to amended or workflow-specific. | amendmentRef, response.amended | Reopen flows |
| 11.2 | Migration across definition versions | Prior events MUST stay interpretable on original pins; SHOULD response.migrated with provenance; SHOULD migration-derived valueClass. | response.migrated, fromDefinitionVersion | Version upgrades |
| 11.3 | Interaction with changelog semantics | SHOULD retain reference to changelog/migration artifact; format out of scope here. | changelog reference | Linking migration tooling |

### Storage and retention model (Lines 720-757)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 12.1 | Storage separation | SHOULD separate ledger from canonical response for retrieval, retention, append-only, sealing. | storage separation | System design |
| 12.2 | Append-only requirement | Logical append-only; MAY physical compaction; MUST NOT misrepresent history; suppression MUST show redaction/minimization evidence. | append-only, redaction evidence | Tamper and retention policy |
| 12.3 | Retention and redaction | SHOULD retention classes; redaction SHOULD preserve fact of change, path identity, time, actor/source category, policy basis. | retention classes, redaction metadata | Minimization |

### Integrity checkpoints (Lines 761-796)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 13.1 | Purpose | LedgerCheckpoint: optional tamper-evident seal over contiguous event range. | LedgerCheckpoint, batch sealing | Why checkpoints exist |
| 13.2 | Minimum fields | Checkpoint SHOULD contain: checkpointId, ledgerId, fromSequence, toSequence, batchHash, signedAt. | batchHash, signedAt | Checkpoint payload (note SHOULD not MUST) |
| 13.3 | Recommended fields | MAY: previousCheckpointHash, signature, keyId, anchorRef, algorithm. | anchorRef, signature | Stronger sealing |
| 13.4 | Integrity behavior | When chaining: SHOULD per-event hashes; SHOULD contiguous checkpoint ranges; MAY external anchor; no mandated suite. | priorEventHash, eventHash, transparency log | Crypto profile flexibility |

### Recommended JSON shape (Lines 800-963)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 14 | Recommended JSON shape | Non-exhaustive full-document example: six events from session through completion including prepopulation, draft.save with validationSnapshot, attachment.added with attachmentBinding and hashes, submit-attempted, completion with status-transition. | full example, attachmentBinding in JSON | End-to-end wire example |

### Implementation guidance (Lines 967-996)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 15.1 | Timeline UX | SHOULD group changes, label prepopulation, distinguish attachments, show validation at boundaries. | timeline UX | Respondent/support UI |
| 15.2 | Diff generation | SHOULD diff last durable snapshot vs new, emit material deltas only. | snapshot diff | Efficient changeset emission |
| 15.3 | Support and dispute workflows | SHOULD answer six audit questions (create, resume, field deltas, amended, validation state, attachments). | audit questions | Support readiness |
| 15.4 | Interoperability recommendation | SHOULD namespaced extensions, preserve unknown on round-trip. | extensions, interoperability | Cross-system exchange |

### Recommended deployment profiles (Lines 999-1036)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 15A.1 | Profile A -- local/server ledger only | Ordinary custody, no anchoring, local auth only, value minimization. | Profile A, low friction | Default enterprise pattern |
| 15A.2 | Profile B -- pseudonymous integrity-anchored | subjectRef continuity, signed checkpoints, optional identity, off-chain response + anchored commitments. | Profile B, tamper-evidence | Pseudonymous high-integrity |
| 15A.3 | Profile C -- identity-bound high-assurance | Regulated flows; identity events; governed tiers; externalized evidence; stronger controls; SHOULD NOT force C into A/B. | Profile C, over-collection warning | Regulated / eligibility |

### Conformance summary (Lines 1038-1052)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 16 | Conformance summary | Eleven numbered rules (MUST/MUST NOT/SHOULD): canonical Response, additive append-only meaning, pinned versions, required event types, ChangeSetEntry shape, no keystroke telemetry, no core semantic alteration via ledger, validation snapshots, identity attestation preservation, privacy-bounded retention, optional integrity chaining. | conformance checklist | Implementation audit |

### Open follow-on work (Lines 1056-1070)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 17 | Open follow-on work | Deferred: audit table mappings, conformance fixtures, hash/signature canonicalization, disclosure-profile registries. Companion schemas at schemas/respondent-ledger.schema.json and schemas/respondent-ledger-event.schema.json encode wire shape without narrowing normative model beyond prose. | companion schemas, future work | Roadmap / gaps |
| 17.1 | Changelog | 0.2.0-draft: §6.6.1 assurance, normative §6.7 independence, §6.8 authored vs recorded, §2.4 legal sufficiency; wire literal unchanged at 0.1. 0.1.0-draft: initial. | version history, wire vs doc version | What changed between draft revisions |

## Cross-References

- **Formspec Core `Response`**: Canonical current-state document; status values in §10.2; `Response.authored` per §5.3; authored signature property referenced in §6.8 (defined with Response spec, not this add-on).
- **Formspec Core response pinning / paths / item keys**: §10.1 pinning; §7.6 paths and itemKey alignment with response addressing.
- **Formspec Core validation**: §10.3 snapshots MUST NOT change validation meaning.
- **Formspec Core non-relevance / calculated / prepopulation**: §10.4–10.6.
- **Formspec migrations / changelog**: §11.2–11.3 (migration provenance; changelog artifact reference).
- **`Response.extensions`**: Recommended `x-respondentLedger` pointer §2.3.
- **ADR 0072** (`thoughts/adr/0072-stack-evidence-integrity-and-attachment-binding.md`): Normative source for `EvidenceAttachmentBinding` §6.9.
- **Trellis**: Wrapped events require `eventHash`/`priorEventHash` §6.2; `payload_content_hash` aligns with Trellis `EventPayload`/`PayloadExternal` §6.9; extension key `trellis.evidence-attachment-binding.v1` §6.9.
- **`schemas/respondent-ledger.schema.json`**, **`schemas/respondent-ledger-event.schema.json`**: Companion wire schemas §17.
- **RFC 2119 / RFC 8174**: Normative keywords (header).
- **RFC 6838**: Media type of attachment bytes §6.9.
- **DID / OpenID Connect / ID.me**: Examples in identity attestation normalization §6.6–6.6.1.

## Event Type Quick Reference

| Event Type | Required? | Category | When It Fires |
|---|---|---|---|
| `session.started` | MUST | Session | First usable interaction in a respondent session |
| `draft.saved` | MUST | Draft | Explicit save or materialized coalesced autosave |
| `draft.resumed` | MUST | Draft | Resume of existing draft after inactivity or across devices |
| `response.completed` | MUST | Lifecycle | Successful transition to `Response.status = completed` |
| `response.amendment-opened` | MUST | Amendment | Previously completed response reopened for editing |
| `response.amended` | MUST | Amendment | Durable completion of an amendment cycle |
| `response.stopped` | MUST | Lifecycle | Response marked abandoned or intentionally stopped |
| `attachment.added` | MUST | Attachment | First introduction of attachment bytes (with `attachmentBinding`, `prior_binding_hash = null`) |
| `attachment.replaced` | MUST | Attachment | Replacement of logical attachment (binding with prior hash) |
| `attachment.removed` | MUST | Attachment | Removal (`priorAttachmentBindingHash`, no new binding) |
| `prepopulation.applied` | MUST | Data | External or parent-response data hydrated into the response |
| `system.merge-resolved` | MUST | System | Platform resolved concurrent changes, conflicts, or resume merges |
| `validation.snapshot-recorded` | MUST | Validation | Explicit audit capture of validation state independent of save/submit |
| `response.submit-attempted` | MAY | Lifecycle | Attempted completion, whether or not it succeeds |
| `response.migrated` | MAY | Migration | Response transformed to a new definition version |
| `calculation.material-change` | MAY | Data | Calculated value changed materially in persisted response |
| `nonrelevant.pruned` | MAY | Data | Non-relevance caused value removal/nulling/retention |
| `autosave.coalesced` | MAY | Draft | Frequent autosaves coalesced into a durable event |
| `device-linked` | MAY | Session | Device linked to respondent session |
| `identity-verified` | MAY | Identity | Identity provider or proof-of-personhood flow updated assurance state |
| `attestation.captured` | MAY | Identity | Credential, delegation, or personhood proof durably bound |

## Operation and Value Class Enums

**`op` values (ChangeSetEntry.op):**

| Op | Meaning |
|---|---|
| `set` | Assign or overwrite a scalar/object value at an existing path |
| `unset` | Clear a value while retaining the path's structural meaning |
| `add` | Introduce a new array entry, attachment, or object branch |
| `remove` | Remove an array entry, attachment, or object branch |
| `replace` | Substitute one value/document for another where replacement semantics matter |
| `reorder` | Reorder repeated elements without semantic value mutation |
| `status-transition` | Record a change to lifecycle state |

**`valueClass` values (ChangeSetEntry.valueClass):**

| Value Class | Meaning |
|---|---|
| `user-input` | Respondent-entered data |
| `prepopulated` | Hydrated from parent response or external source |
| `calculated` | Computed by FEL or engine calculation |
| `imported` | Loaded from an external record/import |
| `attachment` | File or document attachment |
| `system-derived` | Generated by the platform/system |
| `migration-derived` | Produced by definition version migration |

## Critical Behavioral Rules

1. **Response stays canonical**: The pinned Formspec `Response` remains the authoritative current-state document; ledger is explanatory; MUST NOT require ledger replay to interpret a valid `Response` (§2.2).

2. **Legal claims are bounded**: Ledger integrity does not equal legal admissibility; MUST NOT imply admissibility from integrity alone; stronger claims need disclosed basis (§2.4).

3. **Append-only is semantic**: Events MUST be logically append-only; physical compaction MAY occur; MUST NOT misrepresent history; suppression MUST preserve redaction/minimization evidence (§12.2).

4. **Every event pins the definition tuple**: MUST record `definitionUrl` and `definitionVersion` at event time; MUST NOT silently reinterpret past events against newer definitions (§10.1).

5. **Materiality gates volume**: MUST NOT emit durable events for ephemeral UI noise; seven materiality criteria in §9.2; calculated changes only when persisted, materially different, and audit-meaningful (§10.5).

6. **Autosave coalescing preserves truth**: MAY coalesce; MUST preserve final persisted state; SHOULD stable change ordering and policy visibility (§9.3).

7. **ChangeSetEntry minimum is three fields**: MUST have `op`, `path`, `valueClass`; sensitive values MAY be omitted with hashes/summaries (§7.2, §7.7).

8. **Paths must be stable across repeats**: SHOULD stable row discriminators; SHOULD NOT rely on array index alone when a stable repeated-row identifier exists (§7.6).

9. **Migration preserves interpretability**: Prior events and original version tuples MUST remain valid; migration deltas SHOULD use `migration-derived` (§11.2).

10. **Assurance levels L1–L4 are normative and monotonic in the forward direction**: MUST support base four-level ordering; MAY extend with declared order; MUST NOT silently downgrade; prior events MUST NOT be rewritten on upgrade (§6.6.1).

11. **`privacyTier` and `assuranceLevel` are independent**: MUST NOT conflate, derive, or couple transitions; profile rules MUST constrain them as separate predicates (§6.7).

12. **Authored signature ≠ recorded attestation**: Verifiers MUST validate the authored signature on the Response; `attestation.captured` is corroborating audit context, not a substitute (§6.8).

13. **Attachments use `EvidenceAttachmentBinding`**: Added/replaced events MUST carry the exact binding fields; digest rules forbid pre-hash canonicalization of bytes; `attachment.removed` MUST reference prior binding hash and MUST NOT emit a new binding; Trellis-wrapped events align `payload_content_hash` and envelope hashes (§6.9, §6.2).

14. **Trellis-wrapped chain hashing**: When an event is wrapped by a Trellis envelope, `eventHash` and `priorEventHash` MUST be present; only the first event in the wrapped chain uses `priorEventHash: null` (§6.2).

15. **Validation snapshots capture only**: MUST NOT alter underlying Formspec validation semantics (§10.3).

16. **Prepopulation lineage**: Prepopulated/imported vs subsequent `user-input` with `user-edit-over-prepopulation` preserves origin story (§10.6).

17. **One ledger per responseId**: Each ledger document MUST correspond to exactly one current `responseId` (§4.1).

18. **Profile C must not be forced on A/B**: SHOULD NOT impose high-assurance identity requirements on low-friction deployments (§15A.3).

19. **Checkpoint fields are SHOULD-level minimums**: §13.2 lists fields a checkpoint SHOULD contain (not a hard MUST list) -- plan conformance tests accordingly.
