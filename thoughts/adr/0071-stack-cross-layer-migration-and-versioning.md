# ADR 0071: Stack Contract — Cross-Layer Migration and Versioning

**Status:** Proposed
**Date:** 2026-04-21
**Scope:** Cross-layer — Formspec + WOS + Trellis
**Related:** [STACK.md Open Contracts](../../STACK.md#open-contracts); [ADR 0063 (WOS release trains by tier)](./0063-release-trains-by-tier.md); Trellis [ADR 0003 (envelope reservations)](../../trellis/thoughts/specs/2026-04-20-trellis-phase-1-mvp-principles-and-format-adrs.md) (phase cuts); Formspec `specs/registry/changelog-spec`; [ADR 0066 (amendment and supersession)](./0066-stack-amendment-and-supersession.md) (breaking-semantics supersession); WOS #3 migration routing (backlog); WOS #28 claim-check artifact references; [parent TODO](../../TODO.md) stack-wide section

## Context

Each project has its own changelog and migration mechanism:

- **Formspec** — changelog with migration generation ([`specs/registry/changelog-spec`](../../specs/registry/changelog-spec.llm.md)).
- **WOS** — release trains by tier ([ADR 0063](./0063-release-trains-by-tier.md)); Changesets + Actions for 1.0.
- **Trellis** — phased envelope ([ADR 0003](../../trellis/thoughts/specs/2026-04-20-trellis-phase-1-mvp-principles-and-format-adrs.md)); phase cuts at Phase 4 and beyond.

Each mechanism handles single-spec evolution. Cross-spec evolution — chains whose validity depends on *multiple* spec versions — is undefined.

Concrete failure shapes:

- An old Trellis chain was written under WOS governance v1.0. WOS evolves to v1.1 (adds a new provenance record kind, tightens a deontic constraint). Does the old chain still verify? Does re-running the evaluator against the chain's events produce the same decisions?
- A Formspec definition v2 lands a changelog migration from v1. A case mid-flight on v1 — does WOS continue to evaluate under v1 semantics through case-close, or hot-migrate to v2?
- Trellis cuts Phase 4 in 2027. A chain sealed in Phase 1 in 2026 — does the 2027 verifier still understand the Phase 1 envelope format?
- A case decision made in 2026 is audited in 2030. The 2030 verifier runs newer code. What does "the record survives the vendor" mean if the verifier interprets the record differently than the 2026 runtime did?

Each of these is the kind of silent drift that erodes the "offline-verifiable forever" claim. Named in [STACK.md Open Contracts](../../STACK.md#open-contracts) as an integration primitive.

## Decision

Five pins. The posture is **immutable-semantics-per-case** — a case opens under a version set and runs on that set to closure. Evolution happens between cases, not within them.

### D-1. Pin at case open

When a case opens, its scope bundle (per [ADR 0068](./0068-stack-tenant-and-scope-composition.md)) captures a *version pin tree* as a Facts-tier field on the first anchored event. Six dimensions, three groups:

```
CaseOpenPin {
  formspec: {
    definitionVersion: string
  },
  wos: {
    kernelVersion: string,
    governanceVersion: string | null,      // null if no governance doc
    aiVersion: string | null,              // null if no AI doc
    runtimeCompanionVersion: string
  },
  trellis: {
    envelopeVersion: string,               // "phase-1", "phase-2", ...
    conformanceClass: string               // "core" | "complete" | "x-*"
  }
}
```

All six are captured at case open. All six are immutable for the case's lifetime.

Rationale: cross-spec consistency is only guaranteed within a joint version set. Pinning the joint set per case makes the guarantee concrete.

### D-2. Verification is version-aware

The Trellis verifier, when replaying a chain, selects WOS and Formspec semantics bound at case open. A chain sealed in 2026 under `{formspec: 1.3, wos.kernel: 1.0, wos.governance: 1.0, wos.runtime: 1.2, trellis.envelope: phase-1}` verifies in 2030 against exactly those semantics.

This is a commitment on the verifier side: verifier implementations MUST carry historical semantics libraries. A 2030 verifier that refuses to interpret a 2026 pin is non-conformant.

Rationale: offline verifiability is meaningless if the verifier's own code evolution can invalidate prior records.

### D-3. Verifier supports prior phases for the envelope's lineage

Within an envelope phase lineage (Trellis Phase 1 → Phase 2 → Phase 3 → Phase 4), the verifier MUST understand every prior phase's format. [ADR 0003](../../trellis/thoughts/specs/2026-04-20-trellis-phase-1-mvp-principles-and-format-adrs.md) reserves envelope capacity for phase growth; this ADR binds that reservation to a verifier-compatibility commitment.

Additive evolution within a phase (new optional fields, new event kinds) does NOT break prior chains — they omit the new fields, and verifiers tolerate the omission. Breaking format changes require a new phase cut, and the verifier carries both formats indefinitely.

Rationale: phase cuts are the explicit breaking-change instrument. Within-phase evolution is backwards-compatible by design.

### D-4. Case mid-flight migration is opt-in, authorized, and emits a record

Default: a case runs on its pinned version set to closure. A deployment MAY opt in to migration policies (see WOS #3 migration-routing backlog) that hot-migrate a case to a newer version set mid-flight. When migration happens, the stack emits a `MigrationPinChanged` provenance record carrying:

```
MigrationPinChanged {
  caseId: TypeID,
  old_pin: CaseOpenPin,
  new_pin: CaseOpenPin,
  migration_policy_ref: URI,
  authorizing_actor_id: string,
  rationale: string,
  timestamp: RFC3339
}
```

The record is Facts-tier and anchored by Trellis. Post-migration, the case runs on the new pin set. The chain carries the pin-change event; verifier splits replay at the boundary.

Rationale: migration is a governance act, not a silent upgrade. Auditors can always see when and why a case's version set changed.

### D-5. Breaking-semantics changes require [ADR 0066](./0066-stack-amendment-and-supersession.md) supersession

A spec change that would retroactively invalidate a prior decision is NOT a migration — it is supersession. The criterion: if re-evaluating prior events under the new semantics would produce a different decision, the evolution is breaking and must flow through [ADR 0066](./0066-stack-amendment-and-supersession.md) D-1 supersession (new chain, linked to prior).

Migration (D-4) assumes the new semantics produce the *same* observable decisions for the case's prior events, just with additional capabilities available going forward. Breaking semantics fail that assumption and need explicit governance intervention.

This closes the loop: versioning (this ADR) handles *compatible* evolution; [ADR 0066](./0066-stack-amendment-and-supersession.md) handles *incompatible* evolution.

## Consequences

**Positive.**
- A case opened today verifies identically in 2030.
- Each spec can evolve without breaking existing chains.
- Migration is a first-class authorized act; silent upgrades are architecturally impossible.
- Breaking semantics has a clear path (supersession) separate from migration.
- Phase-cut compatibility is a verifier commitment, not a fragile convention.

**Negative.**
- Trellis verifier codebase grows over time (must carry historical semantics libraries).
- Six pins per case is verbose; needs compact encoding on the wire.
- Formspec migration generation (already spec'd) now runs under the opt-in mid-flight migration policy, not automatically.
- Conformance suites must include cross-version replay tests, not just latest-version tests.

**Neutral.**
- Does not prescribe *how* historical semantics libraries are distributed. Implementations choose (embedded multi-version verifier, version-routed gRPC service, registry-loaded).
- Does not prescribe the `conformanceClass` string vocabulary — that belongs to the conformance spec.

## Implementation plan

**Formspec.**
- Canonical response schema gains top-level `pin: CaseOpenPin` field (or placed in the first ledger event — to be decided at implementation).
- Changelog migration tooling documents: auto-migration is case-close only; mid-flight migration requires D-4 policy.
- Respondent Ledger §6 spec adds `pin` capture at ledger open.

**WOS.**
- Add `ProvenanceKind::MigrationPinChanged` (Facts tier).
- Kernel schema spec'd: version strings MUST follow semver (already the case per [ADR 0063](./0063-release-trains-by-tier.md)).
- `DurableRuntime` API accepts a `pin: CaseOpenPin` at `CaseInstance::create`; downstream evaluation carries it in context.
- Conformance suite extended with cross-version replay cases: evaluate an archived chain under archived semantics and assert byte-identical replay.
- WOS #3 migration routing backlog item softens — this ADR provides the contract.

**Trellis.**
- Envelope header gains REQUIRED `pin` object at first event; MUST NOT change within chain unless `MigrationPinChanged` record anchors the transition.
- Verifier implementation carries a semantics-library registry keyed by `(spec, version)` tuples.
- Phase-cut compatibility is a MUST in Core §8 verifier obligations.
- Export bundle manifest includes the pin set alongside existing metadata.

**Stack-level.**
- New `pins.md` reference document naming the six dimensions authoritatively and pointing to each spec's version-string format.
- Reference deployment topology spec (trigger-gated) includes semantics-library distribution guidance.

## Open questions

1. **Pin wire encoding.** Default: inline JSON object on first anchored event. Alternative: URI reference to a pin registry. Recommendation: inline — self-contained bundles matter more than wire efficiency for small strings.
2. **Semantics-library distribution.** Default: each verifier implementation embeds historical libraries. Alternative: a registry-backed lookup at verify time. Recommendation: default — self-contained verification is a stack-level claim; networked semantics lookup weakens it.
3. **Pin-mutation via supersession.** When [ADR 0066](./0066-stack-amendment-and-supersession.md) supersession opens a new chain, does the new chain inherit the old pin set, start fresh, or get a choice? Default: supersession chooses — it's a governance act and the authorizing actor specifies the pin. Alternative: mandatory fresh pin. Recommendation: default.
4. **Conformance-class downgrade.** Can a case pin a *narrower* conformance class than the runtime supports? Default: yes — "core-only" cases can run on a "complete" runtime without invoking complete-tier features. Alternative: no — runtime matches case. Recommendation: default — downgrade is safe; upgrade is migration (D-4).

## Alternatives considered

**Rolling-forward semantics (cases always run on latest).** Rejected. Changes observable outcomes retroactively. A case decided in 2026 under v1.0 semantics, re-evaluated in 2030 under v1.5, might produce a different decision. That violates append-only correctness and breaks the "the record survives the vendor" claim — because it only survives *if* vendor evolution is compatible, and rolling-forward assumes compatibility by fiat.

**Per-layer independent version pins.** Rejected. Cross-spec contracts (custodyHook, canonical response, event hash chain) evolve together; pinning only one side creates latent drift at the composition boundary. The failure mode is silent — records look valid but compose incorrectly.

**Auto-migration at case open when old pin is deprecated.** Rejected. Migration is a governance act. Silent auto-migration on pin deprecation would violate D-4's authorized-and-recorded invariant.

**Pin-set as optional.** Rejected. Omitted pin means implicit-current-semantics, which is exactly rolling-forward semantics, already rejected. Pin is REQUIRED or the contract doesn't hold.

**Single monolithic "stack version."** Rejected. The three specs evolve on independent release trains by design. Collapsing them to one version string would force lockstep release coordination — which is the opposite of the independent-release-trains posture.
