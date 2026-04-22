# ADR 0072: Stack Contract — Evidence Integrity and Attachment Binding

**Status:** Accepted
**Date:** 2026-04-21
**Scope:** Cross-layer — Formspec + WOS + Trellis
**Related:** [STACK.md Open Contracts](../../STACK.md#open-contracts); [ADR 0066 (amendment and supersession)](./0066-stack-amendment-and-supersession.md) (correction/amendment composition on replacement); [ADR 0068 (tenant and scope composition)](./0068-stack-tenant-and-scope-composition.md) (`attachment_id` scope); [ADR 0070 (failure and compensation)](./0070-stack-failure-and-compensation.md) (commit semantics); Formspec Respondent Ledger attachment events (`attachment.added`, `attachment.replaced`, `attachment.removed`); Trellis Core §6.4 (`PayloadExternal`), §18 (export package), §19 (verification algorithm); [Trellis TODO](../../trellis/TODO.md); [WOS TODO](../../wos-spec/TODO.md)

## Context

Files attached during intake — pay stubs, ID photos, supporting documents,
medical records, signed exhibits — are load-bearing evidence in
rights-impacting workflows. The stack currently has storage adapters for
large blobs and Trellis already has a `PayloadExternal` carriage shape, but
the cross-layer contract is missing: what exactly is the claim that lands in
the chain, how does that claim bind to the encrypted payload bytes Trellis
seals, and how do attachment bytes and attachment metadata travel together in
an offline export bundle.

Without this contract, each layer can invent a different meaning for
"attachment integrity":

- Formspec can treat attachment changes as UI-visible events with no stable
  cross-layer attachment identity.
- WOS can cite evidence by local storage key or application path rather than
  by a chain-bound integrity claim.
- Trellis can preserve ciphertext bytes under `PayloadExternal` without any
  portable statement of what document those bytes were supposed to be.

The missing primitive is not "blob storage." Storage is an adapter. The
missing primitive is an **attachment-binding claim**: a record that states
which attachment occupied which slot, with what media type, at what byte
length, under what digest(s), and which encrypted payload bytes Trellis must
treat as the carried body of that claim.

Listed in [STACK.md Open Contracts](../../STACK.md#open-contracts) as a cheap
event-shape gap — adapters exist; the missing work is the center shape they
emit.

## Decision

The stack adopts a two-part contract for attachments:

1. **A chain-bound attachment-binding record** emitted by the originating
   layer whenever attachment bytes are introduced or replaced.
2. **A deterministic attachment manifest in export bundles** that makes those
   bindings discoverable offline without changing the ratified `v1.0.0`
   Trellis top-level event shape.

The originating layer owns *what the attachment means*. Trellis owns *how the
encrypted bytes, their ciphertext hash, and the export-bundle carriage are
sealed and verified*.

### D-1. Attachment-binding record shape (center declaration)

Whenever attachment bytes are first introduced into the record — or replaced
with new bytes — the originating layer emits an authored record carrying this
shape:

```text
EvidenceAttachmentBinding {
  attachment_id: string,                 // stable logical id within the origin scope
  slot_path: string,                    // field / evidence slot path at the originating layer
  media_type: string,                   // RFC 6838 media type of the attachment bytes
  byte_length: uint,                    // exact attachment byte length before envelope encryption
  attachment_sha256: Hash,              // SHA-256 over the exact attachment bytes before envelope encryption
  payload_content_hash: Hash,           // MUST equal Trellis EventPayload.content_hash / PayloadExternal.content_hash
  filename: string | null,              // display-only filename; not identity
  prior_binding_hash: Hash | null, // prior binding event hash when this is a replacement
}
```

Semantics:

- `attachment_id` is stable across replacement within the same logical slot, scoped to the origin layer's case and tenant boundary per [ADR 0068](./0068-stack-tenant-and-scope-composition.md) D-2. Cross-case attachment identity is not implied by `attachment_id` equality; the same ID photo uploaded to two cases yields distinct `attachment_id` values.
- `slot_path` is the origin-layer location where the attachment was bound
  (for example, a Formspec attachment field path or a WOS evidence slot).
- `attachment_sha256` is over the exact attachment bytes as submitted or
  stored by the originating layer **before** Trellis payload encryption.
  No canonicalization, transcoding, image normalization, or MIME-based
  reinterpretation is permitted inside this hash.
- `payload_content_hash` is the Trellis ciphertext hash. It exists because
  Trellis integrity is pinned over ciphertext (`content_hash`), not plaintext.
- `filename` is informational only. Identity is `attachment_id` +
  `attachment_sha256`, not the human filename.
- `prior_binding_hash` is `null` for first bind and points at the prior
  attachment-binding event's `canonical_event_hash` for replacement. This field
  names within-chain binding lineage; it is distinct from [ADR 0066](./0066-stack-amendment-and-supersession.md)
  case-level supersession, which operates across chains.

**Hash algorithm (Phase 1).** Both `attachment_sha256` and `payload_content_hash`
are SHA-256 in Phase 1, matching the Phase-1 Trellis envelope commitment. The
field name `attachment_sha256` pins the Phase-1 algorithm explicitly; hash-algorithm
agility is a Phase 2+ scoping concern and lands via additive field evolution, not
by renaming existing fields.

This is the stack-level shape. Concrete `event_type` identifiers remain
origin-layer owned.

### D-2. Lifecycle mapping

Three lifecycle acts matter:

| Act | Bytes present? | Emits `EvidenceAttachmentBinding`? | Notes |
|---|---|---|---|
| **Add** | yes | yes | first introduction of attachment bytes |
| **Replace** | yes | yes | new binding carries `prior_binding_hash` |
| **Remove** | no | no | remove event references prior binding hash; no new bytes to bind |

Removal is intentionally not a new binding object. The attachment-binding
contract exists to bind bytes into the chain. When no bytes are present, the
originating layer records the removal under its own lifecycle semantics while
referencing the prior binding hash.

**The removal record shape is an origin-layer concern and is not pinned by this
ADR.** Formspec, WOS, or any other originating layer declares its own removal
event type (for example, Formspec `attachment.removed` or a WOS evidence-withdrawal
record); this ADR only requires that the removal record reference the prior
binding's `canonical_event_hash`.

### D-3. Trellis carriage contract

Attachment-binding events use the existing Trellis event envelope unchanged.
The chain-authored binding metadata is represented as:

- `EventPayload.extensions["trellis.evidence-attachment-binding.v1"] = EvidenceAttachmentBinding`

The carried attachment ciphertext body is represented as:

- `EventPayload.payload_ref = PayloadExternal`
- `EventPayload.content_hash = EvidenceAttachmentBinding.payload_content_hash`
- `PayloadExternal.content_hash = EvidenceAttachmentBinding.payload_content_hash`

For attachment-binding events, `PayloadInline` is NOT the preferred carriage
mode for the attachment body. The default and intended carriage is
`PayloadExternal`, even when the bytes are later bundled into the export ZIP,
because the contract is about portable evidence artifacts rather than
small in-envelope payloads. The `EvidenceAttachmentBinding` metadata remains
inside the canonical event payload under the registered extension key above;
the attachment ciphertext bytes are what `payload_ref` names.

`PayloadExternal.availability` keeps its existing Trellis meanings:

- `InExport` — ciphertext bytes are present under `060-payloads/`
- `External` — ciphertext bytes live in a content-addressed external store
- `Withheld` — bytes intentionally omitted from the bundle
- `Unavailable` — bytes absent; verifier reports omitted checks

### D-4. Origin-layer ownership

**Formspec** is the default origin for intake attachments. When a respondent
adds or replaces an attachment, the Formspec-originated record carries
`EvidenceAttachmentBinding` and the Respondent Ledger event type expresses the
lifecycle act (`attachment.added`, `attachment.replaced`).

**WOS** MAY originate the same shape for evidence introduced after intake
(for example, agency-uploaded corroborating exhibits, hearing artifacts, or
evidence packets assembled during review). In that case WOS owns the
`event_type`, but the carried `EvidenceAttachmentBinding` shape is the same.

**Trellis** does not define what qualifies as evidence, which slot path is
legally load-bearing, or when a replacement is permissible. It only defines
how the bytes and their binding claims are sealed and exported.

### D-5. Export-bundle contract (Trellis-owned)

Attachment ciphertext bytes continue to use the existing payload directory:

- `060-payloads/<payload_content_hash>.bin`

To make attachment claims discoverable offline, exports gain a new optional
top-level member:

- `061-attachments.cbor`

Its payload is:

```text
AttachmentManifestEntry = {
  binding_event_hash:    Hash,
  attachment_id:         string,
  slot_path:             string,
  media_type:            string,
  byte_length:           uint,
  attachment_sha256:     Hash,
  payload_content_hash:  Hash,
  filename:              string | null,
  prior_binding_hash: Hash | null,
}
```

The export manifest binds `061-attachments.cbor` through
`ExportManifestPayload.extensions` using a new registered identifier:

- `trellis.export.attachments.v1`

Extension payload:

```text
{
  attachment_manifest_digest: digest,
  inline_attachments: bool,
}
```

Semantics:

- `inline_attachments = true` means every manifest entry whose corresponding
  event carries `PayloadExternal.availability = InExport` MUST have a sibling
  ciphertext file under `060-payloads/<payload_content_hash>.bin`.
- `inline_attachments = false` means the attachment manifest is present but
  at least one attachment body is external, withheld, or unavailable.
- The attachment manifest is derived from chain-authored binding records; it
  does not introduce new authority.

### D-6. Verifier obligations (Trellis-owned)

The verifier gains four obligations:

1. If `trellis.export.attachments.v1` is present in the manifest extensions,
   it MUST verify `SHA-256(061-attachments.cbor)` against
   `attachment_manifest_digest`.
2. For each `AttachmentManifestEntry`, `binding_event_hash` MUST resolve to
   exactly one canonical event in `010-events.cbor` whose
   `EventPayload.extensions` carries
   `trellis.evidence-attachment-binding.v1`.
3. For each manifest entry, `payload_content_hash` MUST equal the resolved
   event's `EventPayload.content_hash`. Mismatch is an integrity failure.
4. When `inline_attachments = true`, every `PayloadExternal` attachment body
   listed in the manifest MUST exist under `060-payloads/<payload_content_hash>.bin`
   and MUST satisfy the existing ciphertext-hash verification rule.
5. For each `AttachmentManifestEntry` with a non-null `prior_binding_hash`,
   that hash MUST resolve to a prior canonical event on the same chain.
   Unresolved `prior_binding_hash` references and cycles in the
   binding-lineage graph are integrity failures.

If the verifier can decrypt and read the attachment payload bytes under the
declared posture, it SHOULD compute SHA-256 over the decrypted attachment
bytes and compare to `attachment_sha256`. If attachment readability is
omitted under the declared posture, a mismatch is not assumed — the verifier
reports an omitted attachment-readability check, parallel to existing omitted
payload checks.

### D-7. Relationship to other open contracts

- **Identity attestation shape** remains separate. Identity proofing that an
  uploaded ID document belongs to the subject is not part of attachment
  integrity; it cites attachment bindings as evidence.
- **Signature attestation shape** remains separate. A signed PDF's legal
  significance belongs in the signature-attestation contract; the attachment
  contract only binds the file bytes and metadata.
- **Actor authorization** remains separate. Who was allowed to upload,
  replace, or remove evidence is a governance authorization question, not an
  attachment-integrity question.
- **Amendment and correction** ([ADR 0066](./0066-stack-amendment-and-supersession.md))
  compose via attachment replacement. A `ResponseCorrection` or
  `DeterminationAmended` event whose effect includes replacing an attachment
  emits a new `EvidenceAttachmentBinding` with `prior_binding_hash` referencing
  the replaced binding. The attachment contract does not itself authorize
  replacement — that authority comes from the governance act. Supersession
  across chains ([ADR 0066](./0066-stack-amendment-and-supersession.md) D-1)
  does not use `prior_binding_hash`; the superseding chain re-binds its
  attachments from scratch or references the prior chain via the
  `supersession-graph.json` manifest.

## Consequences

**Positive.**

- Attachments gain a stable, portable binding claim instead of being "just a
  blob in storage."
- The chain binds both the attachment's raw-byte digest
  (`attachment_sha256`) and the Trellis ciphertext digest
  (`payload_content_hash`), which keeps crypto-shredding semantics intact.
- Export bundles become discoverable offline: a verifier can enumerate
  attachment bindings without reverse-engineering origin-layer payloads.
- Works with ratified Trellis `v1.0.0` surfaces by adding an export-manifest
  extension and an optional archive member rather than redefining the event
  envelope.

**Negative.**

- Adds one new derived bundle member (`061-attachments.cbor`) and one new
  export-manifest extension registration.
- Requires the originating layer to carry attachment metadata explicitly
  instead of assuming it can be reconstructed from storage.
- Introduces a dual-hash model (`attachment_sha256` plaintext,
  `payload_content_hash` ciphertext), which is conceptually heavier but
  necessary because Trellis integrity is ciphertext-based.

**Neutral.**

- Does not require a specific blob store, CDN, or retrieval mechanism.
- Does not define whether a given attachment is admissible evidence — only how
  its bytes are bound and exported.

## Implementation plan

**Formspec.**

- Extend the Respondent Ledger attachment lifecycle path so `attachment.added`
  and `attachment.replaced` carry `EvidenceAttachmentBinding`.
- Add a stable `attachment_id` convention for attachment slots and revisions.
- `attachment.removed` references the prior binding hash but carries no new
  binding object.

**WOS.**

- Define an evidence-intake / evidence-reference shape that can cite a
  Formspec or WOS attachment-binding event by `canonical_event_hash`.
- Where WOS itself introduces evidence files, emit the same binding shape in
  WOS-owned event types.

**Trellis.**

- Register `trellis.export.attachments.v1` in the export-manifest extension
  registry.
- Add `061-attachments.cbor` to the export generator when attachment-binding
  events are present.
- Extend the verifier with D-6 obligations.
- Land fixture coverage:
  - `append/018-attachment-bound`
  - `export/005-attachments-inline`
  - `verify/013-export-005-missing-attachment-body`
  - `tamper/013-attachment-manifest-digest-mismatch`

## Open questions

1. **Should `attachment_sha256` be mandatory when the attachment is never
   readable under the declared posture?** Default: yes. The origin layer knows
   the bytes at bind time; omitting the digest throws away portable evidence
   identity.
2. **Should `filename` survive into the exported attachment manifest?**
   Default: yes, nullable and informational-only. Alternative: omit entirely
   to minimize metadata leakage.
3. **Do we need a distinct attachment-manifest file per origin layer?**
   Default: no. A single `061-attachments.cbor` is simpler; `binding_event_hash`
   and event-type resolution identify the origin.

## Alternatives considered

**Treat attachments as ordinary `PayloadExternal` events with no additional
shape.** Rejected — preserves ciphertext bytes but loses portable semantics
about media type, slot, and stable attachment identity.

**Bind only the plaintext attachment hash and ignore Trellis `content_hash`.**
Rejected — breaks crypto-shredding-compatible verification; Trellis integrity
is pinned over ciphertext and cannot be rewritten around plaintext-only
digests.

**Bind only the ciphertext hash and no plaintext attachment digest.**
Rejected — too weak for document-centric workflows. A portable evidence claim
needs a digest over the actual attachment bytes, not just the encrypted
carrier.

**Put attachment metadata only in `061-attachments.cbor` and not in the chain.**
Rejected — that would make the export generator the source of truth rather
than the chain-authored record. The manifest is derived; the chain remains
authoritative.
