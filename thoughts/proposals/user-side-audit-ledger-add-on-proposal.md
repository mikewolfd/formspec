# User-Side Audit Change Tracking Ledger Add-On Proposal

**Status:** Proposal  
**Date:** 2026-03-22  
**Audience:** Product, platform engineering, spec editors, runtime implementers  
**Scope:** Respondent-facing change tracking for draft, resume, amend, and submit flows  
**Positioning:** Optional standalone add-on layered over Formspec core and Response, without turning the base spec into a workflow platform

---

## 1. Executive summary

This proposal adds an **optional audit change tracking ledger** for the **people filling out forms**, not for studio authors or internal reviewers.

The design goal is to preserve what is elegant about Formspec today:

- the **Definition** stays the truth for structure and behavior,
- the **Response** stays the canonical submission payload,
- the new ledger layer stays **optional**, **portable**, and **append-only**,
- implementers can adopt it incrementally for save/resume, amendment, and dispute-sensitive flows.

The add-on should feel like a companion spec rather than a rewrite of the core. It reaches all the way down into the lowest layers of the spec by reusing existing Formspec concepts such as pinned definition versions, response status transitions, item paths, validation snapshots, extensions, and changelog/migration semantics. But it does **not** require every Formspec processor to become a hosted case-management system.

---

## 2. What the existing Formspec design already gives us

The existing Formspec model is already close to supporting a respondent ledger:

1. A **Response** is already the unit of filled-in form data and is pinned to an immutable `(definitionUrl, definitionVersion)` pair. That gives us a stable semantic baseline for replay and verification.  
2. Response lifecycle states already distinguish `in-progress`, `completed`, `amended`, and `stopped`, which is exactly the lifecycle where respondent-visible change tracking matters.  
3. The response schema already includes `id`, `authored`, `author`, `subject`, `validationResults`, and `extensions`, which gives us attachment points without disturbing the base data model.  
4. The changelog companion spec already defines structural diffs between definition versions, which can be reused when a saved draft or amendment crosses form versions.  
5. The platform ADRs already call for append-only material audit events, respondent sessions/drafts, canonical submissions, evidence lineage, and organization-scoped audit records.

That combination means we should **not** redesign Response into an event stream. We should keep Response as the canonical state snapshot and define a **parallel event ledger** that explains how that state evolved over time.

---

## 3. Problem to solve on the user side

For respondent-facing flows, the platform will need more than a final response blob.

We need to answer questions like:

- What changed between draft saves?
- What exactly did the respondent change after reopening an amended submission?
- Which answers were user-entered versus pre-populated versus system-derived?
- Which attachments were added, replaced, or removed before completion?
- Which validation failures or warnings were shown at the time of a save or submit attempt?
- Can we produce a clean human-readable history for an appeal, dispute, or support investigation?
- Can we do all of that **without** forcing ordinary implementations to store every keystroke forever?

The user-side requirement is therefore **material respondent history**, not exhaustive UI telemetry.

---

## 4. Design principles

### 4.1 Optional, not mandatory

This must be a **standalone companion spec**. A processor can be fully conformant to Formspec core/extended without implementing this ledger.

### 4.2 State plus history, not history instead of state

The canonical saved submission remains the current Response snapshot. The ledger records the meaningful transitions that produced that state.

### 4.3 Material events, not keystroke surveillance

Default capture should focus on save, resume, submit, amend, attachment changes, prepopulation hydration, major recalculation changes, and system-side merge/conflict outcomes.

### 4.4 Path-native and schema-native

Every change record should use normal Formspec paths and item identities so implementations can map changes directly onto the definition tree, validation output, and reviewer UI.

### 4.5 Human-legible first, cryptographically stronger second

The first value is understandable respondent history. Cryptographic sealing, identity assurance integration, and platform-ledger anchoring come after the event model is clear.

### 4.6 Privacy-bounded

The ledger must support redaction/minimization policies. It should not require retention of unnecessary sensitive old values when policy only requires proof that a field changed.

### 4.7 Tiered privacy, not one-size-fits-all identity

Identity-sensitive workflows should separate **assurance** from **disclosure**. A respondent may need to prove they are a real person, or satisfy a program-specific identity rule, without forcing every workflow to expose a full real-world identity everywhere the ledger travels.

### 4.8 Decouple identity from implementation and storage choice

The same response and audit model should work whether storage is local-only, server-side, anchored to a chain, or split across those modes. Identity proofing should be a compatible layer on top of that model, not something that forces every response or every audit event to become identity-native.

---

## 5. Proposed architecture

## 5.1 Add a companion spec

Create a new companion specification, tentatively:

- `specs/audit/respondent-ledger-spec.md`
- `schemas/respondent-ledger.schema.json`
- optionally `schemas/respondent-ledger-event.schema.json`

This spec is **additive** and versioned separately, for example:

```json
{
  "$formspecRespondentLedger": "1.0"
}
```

## 5.2 Keep three layers distinct

### Layer A: Core Formspec Definition
Defines form structure, field semantics, binds, shapes, migration hooks, and item paths.

### Layer B: Response snapshot
Represents the current saved or submitted state at a pinned definition version.

### Layer C: Respondent ledger add-on
Records append-only change events that describe how a respondent session or submission evolved.

That gives us a clean separation:

- **Definition** = what the form means.
- **Response** = what the current answer state is.
- **Ledger** = how that answer state changed over time.

---

## 6. Canonical objects in the add-on

The proposal introduces four objects.

## 6.1 `RespondentLedger`

A top-level object scoped to one respondent-facing intake record.

Suggested fields:

- `ledgerId`
- `responseId`
- `definitionUrl`
- `definitionVersion`
- `organizationId` or implementation-local owner reference
- `environment`
- `sessionId` or `draftId` when applicable
- `status`
- `createdAt`
- `lastEventAt`
- `eventCount`
- `headEventId`
- `checkpointRef` (optional)
- `events[]` or externalized event stream reference

## 6.2 `RespondentLedgerEvent`

An append-only event describing one meaningful respondent-side change or lifecycle transition.

Suggested fields:

- `eventId`
- `sequence`
- `occurredAt`
- `recordedAt`
- `eventType`
- `actor`
- `source`
- `responseRef`
- `sessionRef`
- `amendmentRef` (optional)
- `changes[]`
- `validationSnapshotRef` or embedded summary
- `priorEventHash`
- `eventHash`
- `extensions`

## 6.3 `ChangeSetEntry`

The atomic unit of field/document/status change.

Suggested fields:

- `op`: `set | unset | add | remove | replace | reorder | status-transition`
- `path`: Formspec response path such as `household.members[1].income`
- `itemKey` when resolvable
- `valueClass`: `user-input | prepopulated | calculated | imported | attachment | system-derived`
- `before` (optional or policy-controlled)
- `after` (optional or policy-controlled)
- `beforeHash` / `afterHash` for sensitive values
- `semanticDelta` for normalized values
- `reasonCode` such as `user-edit`, `resume-merge`, `amendment`, `system-normalization`

## 6.4 `LedgerCheckpoint`

A cryptographic sealing object compatible with the broader platform audit ledger.

Suggested fields:

- `checkpointId`
- `ledgerId`
- `fromSequence`
- `toSequence`
- `batchHash`
- `previousCheckpointHash`
- `signedAt`
- `signature`
- `keyId`
- `anchorRef` (optional)

---

## 7. Event model focused on respondents

The event taxonomy should stay tight.

### 7.1 Required event types

- `session.started`
- `draft.saved`
- `draft.resumed`
- `response.completed`
- `response.amendment-opened`
- `response.amended`
- `response.stopped`
- `attachment.added`
- `attachment.replaced`
- `attachment.removed`
- `prepopulation.applied`
- `system.merge-resolved`
- `validation.snapshot-recorded`

### 7.2 Optional event types

- `calculation.material-change`
- `nonrelevant.pruned`
- `autosave.coalesced`
- `device-linked`
- `identity-verified`
- `attestation.captured`

### 7.3 Explicit non-goals

Do **not** require events for:

- every keystroke,
- every focus/blur interaction,
- every render pass,
- every intermediate recalculation unless it materially changed persisted state,
- studio authoring actions.

---

## 8. How it reaches down into the bottom of the spec

This proposal only works well if it is anchored in existing low-level Formspec semantics.

### 8.1 Response pinning

Every ledger event must carry the same immutable definition reference as the Response snapshot, or a stable reference to it. That preserves replay semantics.

### 8.2 Item paths and repeat structure

Change entries should use Formspec response paths, not ad hoc UI control IDs. That allows replay against the item tree and validation results.

### 8.3 Definition migrations

If a draft is resumed under a newer form version, the ledger should record:

- the source version,
- the target version,
- the changelog reference,
- any migration map used,
- any dropped, renamed, or default-filled values.

This lets the ledger explain version jumps instead of hiding them behind a new snapshot.

### 8.4 Non-relevant behavior

When fields disappear due to relevance rules, the ledger should distinguish:

- value explicitly cleared by the respondent,
- value hidden but retained because `nonRelevantBehavior = keep`,
- value pruned because `nonRelevantBehavior = remove`,
- value nulled because `nonRelevantBehavior = empty`.

That is a major source of confusion in appeals and support.

### 8.5 Prepopulation and calculated values

The ledger must label whether a changed value came from:

- direct respondent input,
- prepopulation from an instance,
- calculation,
- system normalization/import.

Without that distinction, history becomes technically complete but operationally misleading.

### 8.6 Validation snapshots

A material save or submit attempt should optionally persist the validation state seen at that moment, especially warnings and errors the respondent encountered.

This should be a snapshot reference or summarized digest, not a requirement to duplicate every validation result on every event.

### 8.6A Identity/framework decoupling

A clean way to express this is to separate the framework into three planes:

- a **response plane** for the current Formspec `Response`,
- an **audit plane** for respondent-ledger events, hashes, checkpoints, and optional chain anchoring,
- and an **identity plane** for personhood, DID, delegation, or provider-proofing evidence.

Those planes can share a stable pseudonymous `subjectRef`, but they should not be collapsed into one object model. That lets a deployment keep form state and audit state anonymous or pseudonymous — even on-chain — while attaching identity proofs only when policy, eligibility, or legal signature requirements demand it.

### 8.6B Tiered privacy inspiration

The TPIF white paper is useful less as a literal dependency and more as a design prompt: the same respondent ledger should support a spectrum from anonymous-but-real-person interactions to strongly identified regulated flows. That suggests a few concrete improvements to this proposal:

- identity evidence should carry a declared `privacyTier` in addition to an assurance level,
- subject continuity should be represented separately from identity proof evidence,
- selective disclosure should be profile-driven so review bundles can reveal less than server-side custody records,
- proof-of-personhood should establish baseline humanity without forcing a durable public identity binding,
- and third-party adapters should normalize into those shared tiers rather than inventing provider-native workflow branches.

That is a good fit for Formspec because it preserves one canonical ledger while allowing different deployments to enable different reveal policies.

### 8.7 Identity, Proof of Personhood, and DID compatibility

Identity-sensitive events should be treated as first-class audit facts from the beginning, not hidden inside authentication logs.

That means:

- `identity-verified` records the material result of a proofing or DID verification flow,
- `attestation.captured` records the durable binding of a credential, delegation assertion, or proof-of-personhood result,
- provider-specific responses (such as an **ID.me** verification session) should be normalized behind an adapter boundary,
- canonical fields such as `provider`, `adapter`, `did`, `credentialRef`, and `personhoodCheck` should be preferred over raw vendor-native payloads,
- and privacy-sensitive identity evidence should live in encrypted reveal bundles rather than the normal respondent timeline payload.

This keeps the respondent ledger portable while still allowing future adapters for ID.me, wallet-based DID flows, or internal personhood systems.

---

## 9. Recommended storage model

## 9.1 Store snapshot and ledger separately

Recommended tables / objects:

- `respondent_session`
- `draft_submission`
- `submission`
- `respondent_ledger`
- `respondent_ledger_event`
- `respondent_ledger_checkpoint`

The submission remains the current canonical state. The ledger is append-only and query-optimized for timeline reconstruction.

## 9.2 Use event coalescing for autosave

Autosave-heavy flows should not emit one event per individual field mutation. Instead:

- collect local changes in memory,
- coalesce them into a `draft.saved` event at save boundary,
- optionally produce one summary event per time window or explicit save.

## 9.3 Separate value retention from proof retention

For sensitive deployments, retain:

- field path,
- operation,
- classification,
- old/new hashes,
- redaction policy marker,

without always retaining raw old and new values in the ledger itself.

That preserves proof of change while limiting duplicate sensitive payload retention.

---

## 10. Proposed schema shape

A minimal event example:

```json
{
  "$formspecRespondentLedger": "1.0",
  "ledgerId": "ledger_01HV...",
  "responseId": "resp-2026-00421",
  "definitionUrl": "https://example.gov/forms/housing-intake",
  "definitionVersion": "2.3.0",
  "status": "in-progress",
  "events": [
    {
      "eventId": "evt_01HV...",
      "sequence": 12,
      "eventType": "draft.saved",
      "occurredAt": "2026-03-22T13:14:55Z",
      "actor": {
        "actorType": "respondent",
        "id": "user-1982"
      },
      "source": {
        "channel": "web",
        "mode": "authenticated-resume"
      },
      "changes": [
        {
          "op": "set",
          "path": "household.monthlyIncome",
          "itemKey": "monthlyIncome",
          "valueClass": "user-input",
          "before": 4200,
          "after": 4500,
          "reasonCode": "user-edit"
        },
        {
          "op": "replace",
          "path": "attachments.paystub[0]",
          "valueClass": "attachment",
          "beforeHash": "sha256:...",
          "afterHash": "sha256:...",
          "reasonCode": "user-edit"
        }
      ],
      "validationSummary": {
        "errors": 0,
        "warnings": 1,
        "infos": 0
      },
      "priorEventHash": "sha256:...",
      "eventHash": "sha256:..."
    }
  ]
}
```

---

## 11. UX expectations for elegance

If this is going to be an elegant add-on, it cannot just be a backend ledger. It needs a restrained user-facing expression.

### 11.1 Minimal respondent timeline

Expose a simple timeline like:

- Draft saved at 1:14 PM
- Income updated
- Pay stub replaced
- Warning still unresolved
- Submitted at 1:26 PM

### 11.2 Plain-language change summaries

Summaries should be generated from schema-aware paths and labels:

- “Household monthly income changed from $4,200 to $4,500.”
- “Attachment ‘Pay stub’ was replaced.”
- “Application reopened for amendment after reviewer request.”

### 11.3 Progressive disclosure

Most users should see summaries, not raw diffs. Raw path-level details belong in support, appeal, or advanced review screens.

### 11.4 No punitive vibe

The design should communicate continuity and trust, not surveillance. The ledger is there to help the respondent resume, verify, and explain changes.

---

## 12. Integration with the platform audit ledger

The respondent ledger should not compete with the platform-wide tamper-evident audit ledger from ADR-0003. It should feed it.

Recommended relationship:

- respondent ledger events are the **domain-specific local history**,
- platform audit ledger records the **material audit envelope**,
- checkpoints or event-batch hashes from the respondent ledger are appended into the broader platform ledger.

That gives two useful views:

1. a respondent/change-tracking timeline optimized for product use, and  
2. a cryptographically verifiable platform audit trail optimized for trust and investigation.

In practice:

- `draft.saved` may be stored locally in the respondent ledger,
- `response.completed`, `response.amended`, and attachment replacement should also emit material platform audit events,
- checkpoints should allow export packages to prove respondent history integrity when needed.

---

## 13. Rollout plan

### Phase 1: Spec and local implementation

- define companion schemas,
- implement append-only respondent ledger events,
- emit events on explicit save, submit, amend, and attachment operations,
- render basic timeline summaries,
- no cryptographic sealing required yet.

### Phase 2: Material diff quality

- add field classification (`user-input`, `prepopulated`, `calculated`, etc.),
- add migration/version-jump events,
- add validation summary snapshots,
- add policy controls for storing raw before/after values versus hashes.

### Phase 3: Platform integrity integration

- batch and hash respondent ledger events,
- create signed checkpoints,
- anchor respondent checkpoints into the platform audit ledger,
- support exportable proof bundles for disputes and appeals.

### Phase 4: Advanced flows

- multi-device resume and merge history,
- multi-party completion event attribution,
- derived narrative/extraction provenance folded into the same model.

---

## 13A. Where configuration should differ

Yes — some things should be configured differently, because the trust, privacy, and operational cost goals are different across deployments.

### 13A.1 Keep the event model stable

The **event model should stay the same** across deployments so portability is preserved.

### 13A.2 Let policy vary by profile

The following should vary by configuration profile:

- whether checkpoints are signed and externally anchored,
- whether `subjectRef` continuity is required,
- whether identity proofing events are mandatory, optional, or disallowed,
- whether prior values are retained, hashed, summarized, or omitted,
- and which `selectiveDisclosureProfile` values are available for exports and review bundles.

### 13A.3 Why this matters

If these are not profile-driven, low-friction deployments will become overbuilt and privacy-invasive, while high-assurance deployments will end up under-specified. The right move is one canonical ledger model with different operational profiles layered on top.

---

## 14. Recommended boundaries

### Put in this add-on

- respondent draft/save/resume/submit/amend history,
- attachment change history,
- migration/version-jump history,
- validation snapshot summaries,
- optional cryptographic checkpointing.

### Keep out of this add-on

- studio authoring history,
- reviewer/internal workflow history,
- generic analytics clickstream,
- arbitrary product event logging,
- full support-access auditing.

Those belong in separate but linkable ledgers.

---

## 15. Concrete implementation recommendation

My recommendation is to implement this as **an optional respondent-ledger companion spec plus instance-level persistence**, not as a mutation of the core Response schema.

### Recommended technical shape

1. **Do not add required fields to `Response`.** Keep base interoperability intact.  
2. **Optionally add one extension pointer in `Response.extensions`**, e.g. `x-respondentLedgerRef`, for implementations that want discoverability.  
3. **Define a standalone ledger document and event schema** with path-based changes, append-only sequencing, and provider-neutral identity / proof-of-personhood attestation hooks.  
4. **Emit one coalesced event per meaningful persistence boundary**, not per keystroke.  
5. **Use Formspec item paths, pinned definition references, and changelog/migration metadata** so the add-on reaches down into the bottom of the spec rather than floating above it.  
6. **Bridge checkpoints into the platform audit ledger** only after the respondent event model is stable and human-legible.

This gets the layering right:

- **bottom of spec:** definition semantics, paths, versioning, relevance, migration,
- **middle:** response snapshots,
- **top add-on:** elegant respondent history and optional audit integrity.

---

## 16. Why this is the right fit

This approach matches the existing Formspec and platform architecture because it:

- respects the engine/instance/platform separation,
- keeps the core spec portable,
- helps the form-filling user first,
- supports amendment and appeal use cases,
- allows stronger tamper evidence later,
- and avoids overengineering the base standard into a workflow blockchain.

In short: **make respondent history a first-class optional layer, not a hidden implementation detail and not a burden on every conformant processor.**
