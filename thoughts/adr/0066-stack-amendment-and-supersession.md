# ADR 0066: Stack Contract — Amendment and Supersession of Decisions

**Status:** Proposed
**Date:** 2026-04-21
**Scope:** Cross-layer — Formspec + WOS + Trellis
**Related:** [STACK.md Open Contracts](../../STACK.md#open-contracts); [ADR 0067 (statutory clocks)](./0067-stack-statutory-clocks.md); WOS kernel `caseRelationship`; WOS Workflow Governance §3; Trellis Core §22 (case ledger); Trellis ADR 0003 (envelope reservations); [WOS TODO](../../wos-spec/TODO.md); [Trellis TODO](../../trellis/TODO.md)

## Context

Append-only is correct until a decision is wrong. Rights-impacting workflows require bounded mechanisms for revisiting closed determinations: factual corrections, post-hoc amendments, supersession by appeal or new evidence, and outright rescission. None of these are currently defined across the three-spec stack. Each layer would, asked independently, invent its own concept of "undo," and the three concepts would not compose — Formspec intake would treat a re-submission as a fresh response, WOS governance would have no record-kind for "superseded," and Trellis would have no chain-to-chain linkage.

Listed in [STACK.md Open Contracts](../../STACK.md#open-contracts) as expensive — touches all three layers and every existing cross-layer seam.

Semantics differ sharply from "edit a field." The primitive is not mutation — it is *linkage*. Amendment is a governed act under due-process constraints. Integrity must preserve the prior record exactly. Intake must not silently mutate prior responses.

## Decision

**Four canonical modes** distinguish the kinds of revisit a decision can undergo. Each mode has a distinct shape across the three layers. They are mutually exclusive per event; a single revisit act emits exactly one mode.

| Mode | Same chain? | Prior record preserved? | Outcome |
|---|---|---|---|
| **Correction** | yes | yes (corrected-alongside) | factual record fixed; determination unchanged |
| **Amendment** | yes | yes | determination changed within the same case |
| **Supersession** | new chain, linked | yes | full replacement by a new case (typically appeal) |
| **Rescission** | yes | yes | determination withdrawn; no replacement |

### D-1. Per-mode event shape (center declaration)

Each mode emits a distinct canonical event. All four reference the prior event or chain by hash, never by human identifier. All four carry a `reason` field whose structure is mode-specific and an `authorization` field pointing at a WOS authorization record.

**Correction.**
- Formspec Respondent Ledger: `ResponseCorrection` event referencing prior `ResponseSubmitted.canonical_event_hash`. Narrows to a declared subset — does not rewrite the prior response.
- WOS: `CorrectionAuthorized` provenance record. Deontic constraint gate: who may correct, under what scope.
- Trellis: ordinary append to the existing ledger chain. No chain-linkage.

**Amendment.**
- Respondent Ledger: no respondent action (amendment is a governance act; respondent may have triggered it via appeal but does not sign the amendment).
- WOS: `AmendmentAuthorized` + `DeterminationAmended` records. Requires `AuthorizationAttestation.predicate: "amendment-authority"`.
- Trellis: append to existing chain. `DeterminationAmended.supersedes_event_hash` references the prior determination event by canonical hash.

**Supersession.**
- Respondent Ledger: a new ledger begins for the superseding case; its first event carries `supersedes_chain: { chain_id, checkpoint_hash }`.
- WOS: the superseding case's workflow instance carries `caseRelationship.type: "supersedes"` (extends existing kernel enum).
- Trellis: new envelope with `supersedes_chain_id` in the envelope header. Checkpoint of prior chain cited by hash. Phase-1 lint enforces `supersedes_chain_id` MUST NOT populate — reserved shape per Trellis ADR 0003; runtime activation deferred to the phase that admits chain-linkage (Phase 4 scoping).

**Rescission.**
- Respondent Ledger: no respondent action.
- WOS: `RescissionAuthorized` + `DeterminationRescinded` records. Determination state transitions to terminal-non-operative.
- Trellis: append to existing chain. Final checkpoint seals the chain as terminal; subsequent determination events on the chain are integrity violations (see D-3).

### D-2. Authorization shape (center declaration; WOS-owned)

All four modes require a WOS `AuthorizationAttestation` provenance record:

```
AuthorizationAttestation {
  mode: "correction" | "amendment" | "supersession" | "rescission",
  authorizing_actor_id: string,
  authority_basis: string,           // FEL reference to ActorPolicy or statute
  evidence_references: [EvidenceReference],  // §4.4 #38 shape
  statute_reference: URI | null,
  timestamp: RFC3339,
}
```

The deontic constraint lives in Workflow Governance under named policies — `amendmentPolicy`, `rescissionPolicy`, etc. — each binding an `AppealMechanism`-shaped gate to the mode. Impact-level floor follows the vision-model default: rights-impacting cases require `Assurance ≥ high` on the authorizing actor.

### D-3. Verifier obligations (Trellis-owned)

Trellis verifier gains three checks:

- **Chain-linkage resolution.** Given a bundle containing a superseded chain's checkpoint, the verifier MUST confirm the superseding chain's header cites the exact checkpoint hash by byte equality. Mismatch is an integrity failure.
- **Correction-preservation.** When a `ResponseCorrection` event appears, the verifier MUST surface both original and corrected field values in its report output. Original fields are never redacted from the chain; corrections are additive.
- **Rescission terminality.** When a `DeterminationRescinded` event appears, any subsequent determination event on the same chain is an integrity violation — signed but semantically invalid. Amendment-after-rescission is not permitted; a new case must be opened (supersession).

### D-4. Bundle format (Trellis-owned)

Export bundles for superseded cases MAY include predecessor chain(s) as additional top-level members. A new `supersession-graph.json` manifest at the bundle root enumerates the linkage:

```
{
  "head_chain_id": ChainId,
  "predecessors": [
    { "chain_id": ChainId, "checkpoint_hash": Hash }
  ]
}
```

The verifier walks this graph breadth-first to compose a complete case history. Cycles are integrity violations.

### D-5. Relationship to ADR 0067 (statutory clocks)

A statute-of-limitations question — "may this decision still be amended?" — is a governance-policy question, answered by a statute clock (ADR 0067) and the amendment deontic constraint (D-2 above). Integrity is unaffected by statute expiry: the chain records whatever the governance layer permits to happen. A rejected amendment is not recorded; a permitted amendment is recorded and its legality is an audit question, not an integrity one.

## Consequences

**Positive.**
- Append-only integrity preserved across all four modes. Nothing mutates.
- Every revisit carries an authorization attestation scoped by deontic constraint — governance auditability is structural, not convention.
- Respondent-facing acts (correction, supersession via appeal) are visible in the Respondent Ledger; governance-only acts (amendment, rescission) are not conflated with respondent acts.
- Composes with existing seams: `caseRelationship`, `EvidenceReference`, `ProvenanceKind`, Trellis envelope reservations.

**Negative.**
- Adds six WOS provenance record kinds (`CorrectionAuthorized`, `AmendmentAuthorized`, `DeterminationAmended`, `RescissionAuthorized`, `DeterminationRescinded`, `AuthorizationAttestation`) and one Formspec Respondent Ledger event (`ResponseCorrection`).
- Phase-1 Trellis reserves `supersedes_chain_id` but keeps runtime supersession restricted until Phase 4. Correction, amendment, rescission work in Phase 1.
- New conformance fixture set required in each layer.

**Neutral.**
- Does not resolve statute-of-limitations semantics — that is ADR 0067's scope.
- Does not define what evidence MUST accompany each mode — that is governance-policy, authored per deployment.

## Implementation plan

**Formspec.**
- Add `ResponseCorrection` event shape to Respondent Ledger §6; reference prior event by `canonical_event_hash`.
- Corrected field set is a strict subset of the prior response; schema enforces via `required` constraint pointing at a declared subset.

**WOS.**
- Add six record kinds to `ProvenanceKind` enum; `AuthorizationAttestation` tiers as Facts, the five mode-specific records tier as Narrative.
- Add `amendmentPolicy`, `rescissionPolicy` sidecar sections to Workflow Governance.
- Extend `caseRelationship.type` open enum with `supersedes`.
- Provenance exporters emit the six kinds as distinct event types in PROV-O / OCEL / XES.

**Trellis.**
- Reserve `supersedes_chain_id` in envelope header under Phase-1 MUST NOT populate discipline (ADR 0003).
- Land `append/011-correction`, `append/012-amendment`, `append/013-rescission` vectors (Phase 1).
- Draft `supersession-graph.json` spec; Phase 4 activation.
- Extend verifier with D-3 obligations.

## Open questions

1. **Rescission of a rescission.** Default: treated as amendment (a new determination replaces non-operative state). Alternative: rescission is terminal and a new case must be opened via supersession. Recommendation: default — avoids privileging the integrity layer with governance decisions.
2. **Multi-chain supersession webs.** Default: verifier walks `supersession-graph.json` breadth-first; cycles are integrity violations. Alternative: Phase-1 restricts to linear webs.
3. **Correction field-set scope.** Default: corrections narrow to a declared subset of fields. Alternative: unrestricted within the same case. Recommendation: default — prevents correction from being a backdoor amendment.

## Alternatives considered

**Pure append-only with no revisit concept.** Rejected — real workflows need the capability; deferring it produces three divergent per-layer implementations.

**Mutation-based amendment (overwrite in place).** Rejected — breaks Trellis integrity posture; violates vision-model Q3 (opinionated, closed taxonomies).

**Single `Revision` event covering all four modes.** Rejected — collapses deontically distinct acts. Correction does not deserve the same authorization burden as supersession; rescission does not share terminal semantics with amendment.

**Defer supersession to a post-1.0 phase.** Rejected — cross-chain linkage is the shape that most constrains the envelope. Reserving the header slot now and gating runtime to Phase 4 follows Trellis ADR 0003's maximalist-envelope / restrictive-runtime discipline, not the speed-gate discipline it superficially resembles.
