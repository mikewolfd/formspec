# ADR 0070: Stack Contract — Cross-Layer Failure and Compensation

**Status:** Proposed
**Date:** 2026-04-21
**Scope:** Cross-layer — Formspec + WOS + Trellis
**Related:** [STACK.md Open Contracts](../../STACK.md#open-contracts); [ADR 0057 (WOS center vs. implementation boundary)](../../wos-spec/thoughts/archive/adr/0057-wos-core-implementation-boundary.md) (serial-per-instance invariant); [ADR 0061 (WOS custodyHook wire format)](../../wos-spec/thoughts/adr/0061-custody-hook-trellis-wire-format.md) (idempotency tuple); [ADR 0066 (amendment and supersession)](./0066-stack-amendment-and-supersession.md) (compensation via governance); [ADR 0068 (tenant and scope composition)](./0068-stack-tenant-and-scope-composition.md); [parent TODO](../../TODO.md) stack-wide section

## Context

The three layers are separately durable. A typical case transition involves: Formspec validates response → WOS emits provenance record → Trellis custody-hook anchors it. Each step can fail at different moments. Partial commits are possible. The stack has never declared what invariant holds across a partial failure.

Concrete failure shapes:

- Formspec revalidates a submission; governance rejects; the Trellis chain anchors both the response AND the rejection — but the response was "invalid," so is it in the record? Does the verifier surface it as rejected-data or just data?
- WOS emits `AmendmentAuthorized`; Trellis custody-hook fails because the anchor substrate is down. Retry? How many times? What's the failure state of the WOS instance?
- Trellis anchors successfully; WOS runtime crashes before the receipt propagates. Caller retries. Does a second append succeed, fail idempotently, or produce a duplicate?
- An anchored decision turns out to be wrong a week later. Does the stack have a runtime-level "undo," or is reversal a governance act?

Each layer has ordering invariants on its own ([ADR 0057](../../wos-spec/thoughts/archive/adr/0057-wos-core-implementation-boundary.md) serial-per-instance; Trellis chain-hash-ordering; Formspec deterministic validation). None of them says what's true when two layers disagree about whether something committed.

Listed in [STACK.md Open Contracts](../../STACK.md#open-contracts) as an integration primitive. Blocks any production deployment.

## Decision

Six pins. The first is the whole architecture — everything else follows.

### D-1. The integrity layer is the commit point

A case transition is *committed* when Trellis's custody-hook append returns `canonical_event_hash`. Before that return, the state is *pending*, not durable from the stack's perspective. After that return, the state is canonical and irreversible at the runtime layer.

**"Commit" means local append, not anchor.** Trellis distinguishes two operations:
- **Local append** — writes the event into the hash-chain and returns `canonical_event_hash`. Latency is milliseconds (hash + signature + storage write). This is the commit point in this ADR.
- **Anchor** — submits the checkpoint seal to an external substrate (transparency log, TSA, bilateral witness). Latency depends on substrate (OpenTimestamps cycles hourly-to-daily). Anchoring is scheduled and cadence-driven; it does not gate per-event commits.

The "record survives the vendor" claim rests on *eventually anchored* local appends. Unanchored local appends still verify against the hash-chain and signatures; they lose only the external-substrate trust anchor. The commit-to-anchor interval is a deployment-tunable property; it does not weaken commit semantics.

Implications:
- No layer treats its own durable write as the commit point. WOS is durable-per-`DurableRuntime`, but that durability is *internal scaffolding* — the commit that makes a decision "part of the record" is the Trellis local append.
- Any failure between WOS emission and Trellis local-append receipt is a *pending* failure, not a *committed* failure. Retries are correct by construction (per D-4).
- Formspec revalidation and WOS governance evaluation happen before Trellis append. They are pre-commit and may abort without leaving a record.

This is the dependency-inversion choice for runtime durability. Trellis is the stable center for *what committed*; WOS durable-runtime is the adapter for *how we got there*; external anchor substrates are adapters for *how strongly we trust the commit post-hoc*.

### D-2. Formspec validation failures are pre-commit

If Formspec server-side revalidation rejects a submission, no WOS event is emitted and no Trellis append occurs. The rejected response is not part of the record. The fact that a submission was attempted is not recorded at the stack level.

Formspec may separately log rejected attempts in a product-level audit trail — that is an adapter concern and out of scope here. The stack invariant is: invalid data does not contaminate the record.

### D-3. WOS governance rejections are post-commit on the rejection itself

A governance rejection of a human action (reviewer attempts an unauthorized transition; case-worker attempts amendment outside policy) is *itself* a decision. The rejection decision MUST be emitted as a provenance record and MUST be anchored by Trellis. What is *not* recorded is the rejected action's would-have-been effects.

The distinction:
- *Rejected data* (Formspec D-2) — invalid input; no record.
- *Rejected action* (WOS D-3) — valid attempt of a disallowed operation; the denial is a record.

Rationale: in rights-impacting work, pattern-of-attempted-overreach is itself governance-relevant evidence.

### D-4. Trellis append failures trigger bounded retry with idempotency

Failure of a Trellis append (network timeout, anchor substrate downtime, hash-chain conflict) triggers retry. The `(caseId, recordId)` tuple from [ADR-0061](../../wos-spec/thoughts/adr/0061-custody-hook-trellis-wire-format.md) is the idempotency key — retries with identical tuples are safe.

- Retry budget is configured per `DurableRuntime` adapter; a sensible default is exponential backoff up to ten minutes.
- A successful retry produces a single canonical event; no duplicate records exist on success.
- A retry-budget-exhausted case enters the `stalled` kernel lifecycle state — new reserved state introduced by this ADR. `stalled` is not terminal; operator intervention (a new runtime attempt, an anchor-substrate change, or explicit abandonment via supersession) resolves it.

Operator-facing: `stalled` cases surface telemetry and a remediation path. They do not silently fail.

### D-5. No runtime saga; compensation is governance

An anchored decision that is later found to be wrong is NOT reversed by a runtime compensation event or saga. Reversal is a *governance act* under [ADR 0066](./0066-stack-amendment-and-supersession.md): amendment, rescission, or supersession.

This pin is structural. Saga-style auto-compensation is a tempting runtime pattern for transactional systems, but in rights-impacting work it misrepresents the record. A decision that happened, happened — the chain preserves it. A new decision may supersede it, and the supersession is itself a recorded governance act. The chain MUST NOT be editable post-commit; compensation flows through append-only amendment records.

Rationale: this keeps the center clean. Runtime sagas are exactly the kind of adapter-leaking-into-center pattern the stack rejects. It also composes cleanly with [ADR 0066](./0066-stack-amendment-and-supersession.md)'s four canonical revisit modes.

### D-6. Observable failure telemetry is Facts-tier

Commit-attempt failures — retries, budget-exhaustions, stalled entries — are themselves audit-relevant. The stack emits a `CommitAttemptFailure` provenance record (Facts-tier) carrying:

```
CommitAttemptFailure {
  caseId: TypeID,
  intended_record_id: TypeID,
  failure_kind: "retry" | "budget-exhausted" | "substrate-unavailable" | "x-*",
  attempt_count: integer,
  first_attempt_at: RFC3339,
  last_attempt_at: RFC3339,
  error: string
}
```

The failure record itself is anchored — either on the next successful append (if retry eventually succeeds), or on recovery from `stalled` state (if operator intervenes). Failures are not invisible; they become part of the audit trail.

## Consequences

**Positive.**
- A single commit point eliminates "which layer committed first?" ambiguity.
- Idempotent retries are safe by construction.
- `stalled` is a first-class reserved state, not runtime-defined escape behavior.
- Compensation semantics route through [ADR 0066](./0066-stack-amendment-and-supersession.md) — one vocabulary, not two.
- Commit-attempt failures are anchored and auditable.

**Negative.**
- Adds `stalled` to kernel reserved lifecycle vocabulary.
- Adds `CommitAttemptFailure` provenance record kind.
- Forces Formspec revalidation to be atomic with the WOS emission path (no "submit first, validate later" pattern).
- Some deployments may want runtime-level "undo" for operational correction (e.g., a data-entry error caught within seconds). They must use amendment/correction under [ADR 0066](./0066-stack-amendment-and-supersession.md) instead.

**Neutral.**
- Does not prescribe retry budget numbers. Defaults live in `DurableRuntime` adapter configuration, not in the center.
- Does not prescribe anchor-substrate failover. Trellis anchor targets (transparency logs, TSAs, bilateral witnesses) are adapter concerns.

## Implementation plan

**Formspec.**
- Server-side revalidation path documented as pre-commit; explicit rejection of "submit first, validate later."
- No new event kinds required.

**WOS.**
- Add `stalled` to kernel reserved lifecycle states.
- Add `ProvenanceKind::CommitAttemptFailure` (Facts tier).
- `DurableRuntime` trait method `append_to_custody` returns a typed error distinguishing retryable from budget-exhausted.
- `CaseInstance` gains an optional `stalled_since: RFC3339` field when in stalled state.
- Lint rule (proposed `K-F-010`) that a workflow with no operator-accessible recovery transition out of `stalled` state fails load-time validation — stalled cases must have an explicit recovery path.

**Trellis.**
- Verifier surfaces `CommitAttemptFailure` records in verification reports.
- No changes to envelope or chain format — `CommitAttemptFailure` rides on ordinary appends.
- Bundle manifest optionally includes a `failures.json` summary for verifier-tool ergonomics.

**Stack-level.**
- Reference deployment topology spec (trigger-gated in [parent TODO](../../TODO.md)) names retry-budget defaults when it lands.

## Open questions

1. **Retry-budget default value.** Default: exponential backoff starting at 100ms, doubling, capping at 5 minutes between attempts, total budget 30 minutes. Alternative: shorter (15 minutes) for interactive workflows, longer (24 hours) for batch. Recommendation: default per adapter with deployment override.
2. **`stalled` state auto-recovery on substrate restoration.** Default: no. Operator must explicitly re-try. Alternative: auto-retry on substrate health-check success. Recommendation: default — rights-impacting work prefers explicit human intervention to silent auto-recovery of anchor failures.
3. **Cross-tenant failure contagion.** If one tenant's Trellis storage is unavailable, does another tenant's chain continue to append? Default: yes — per [ADR 0068](./0068-stack-tenant-and-scope-composition.md) tenant scope is an isolation boundary. Alternative: shared substrate means shared failure. Recommendation: default — tenant isolation includes failure isolation.

## Alternatives considered

**Two-phase commit across all three layers.** Rejected. Trellis's hash-chain append is inherently irreversible; 2PC's abort phase would require chain editing, which violates append-only posture.

**Saga pattern with runtime compensation events.** Rejected. Compensation in rights-impacting work is governance, not runtime. Saga semantics assume transactional correction is possible; the stack's posture is that append-only is the correctness invariant and governance supersession is the correction mechanism.

**WOS durable state as the commit point (Trellis anchor async/eventual).** Rejected. Trellis is the integrity layer; if it anchors eventually, "the record survives the vendor" weakens to "the record survives the vendor with N-minute delay," which procurement conversations cannot round-trip. Trellis-as-commit is the honest pin.

**Per-layer independent failure policy.** Rejected. Composition becomes per-deployment convention; different deployments' "same" failure scenarios produce different observable records.

**Retry the `CommitAttemptFailure` record itself.** Rejected. Infinite recursion. The failure record anchors on next-success-or-recovery; it does not itself retry.
