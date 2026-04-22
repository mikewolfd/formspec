# ADR 0067: Stack Contract — Statutory Clocks and Deadline Semantics

**Status:** Proposed
**Date:** 2026-04-21
**Scope:** Cross-layer — Formspec + WOS + Trellis
**Related:** [STACK.md Open Contracts](../../STACK.md#open-contracts); [ADR 0066 (amendment and supersession)](./0066-stack-amendment-and-supersession.md); WOS §7.1 jurisdiction-aware business-calendar selection (landed); WOS #20 typed events (landed); WOS #51 statutory deadline chains (trigger-gated); WOS #40 Task SLA authoring surface (landed); [WOS TODO](../../wos-spec/TODO.md); [Trellis TODO](../../trellis/TODO.md)

## Context

Rights-impacting workflows run on legal deadlines. Appeal windows, processing SLAs, statutes of limitation, benefit expiry — each is a clock that starts on a triggering event and fires or lapses at a computed moment. None are currently defined as a cross-layer contract. WOS has jurisdiction-aware business calendar selection (§7.1) and typed timer events (#20), but the semantics of "a clock attached to the record" are not pinned across the three layers. What starts the clock, who owns it, how it seals into the ledger, and what the verifier reports on an expired-but-unresolved clock are all undefined.

Listed in [STACK.md Open Contracts](../../STACK.md#open-contracts) as expensive — touches all three layers.

The primitive is not a timer. Timers are runtime concerns. The primitive is an *event pair* — `ClockStarted` at one point in the chain, `ClockResolved` at another — with declarative policy about when each may fire and what their occurrence means.

## Decision

**Four clock kinds** cover the canonical deadline patterns. Each is expressed as an event-pair contract declared by the layer that originates the clock, with Trellis anchoring both endpoints into the chain.

| Kind | Origin trigger | Terminal | Typical duration |
|---|---|---|---|
| **AppealClock** | adverse decision notice emitted | appeal filed \| deadline elapsed | 30 – 90 days |
| **ProcessingSLA** | intake submission accepted | decision issued \| deadline elapsed | 1 – 30 business days |
| **GrantExpiry** | benefit award issued | grant consumed \| expiry elapsed | months – years |
| **StatuteClock** | statutorily-defined triggering event | legal action initiated \| statute elapsed | years |

### D-1. Clock event shape (center declaration)

Every clock emits two canonical events separated by a computed duration.

**`ClockStarted`** — emitted by the originating layer when the triggering event occurs:

```
ClockStarted {
  clock_id: string,              // unique within the chain
  clock_kind: enum,              // AppealClock | ProcessingSLA | GrantExpiry | StatuteClock | x-*
  origin_event_hash: Hash,       // which event triggered the clock
  duration: ISO8601Duration,
  calendar_ref: string | null,   // resolves via WOS §7.1 jurisdiction-aware selection
  statute_reference: URI | null, // statutory authority when applicable
  computed_deadline: RFC3339,    // materialized once at start; does not float
}
```

**`ClockResolved`** — emitted on satisfaction, elapse, pause, or cancellation:

```
ClockResolved {
  clock_id: string,
  origin_clock_hash: Hash,        // ClockStarted event hash
  resolution: "satisfied" | "elapsed" | "paused" | "cancelled",
  resolving_event_hash: Hash | null,  // the act that resolved it
  resolved_at: RFC3339,
}
```

`clock_kind` is an open enum with `x-*` vendor extension per the stack-wide opinionated-taxonomy discipline.

The `computed_deadline` is materialized once at clock start and does not float as calendars evolve — this is a policy choice, not a runtime optimization. A calendar amendment after a clock starts does not retroactively shift its deadline; if the authoring deployment needs that semantics, it emits `ClockResolved(resolution: "cancelled")` + a new `ClockStarted`.

### D-2. Layer ownership

| Clock | Originating layer | Anchoring layer |
|---|---|---|
| AppealClock | WOS (emits on adverse-decision transition) | Trellis |
| ProcessingSLA | WOS (emits on intake-complete workflow event) | Trellis |
| GrantExpiry | WOS (emits on award-issued transition) | Trellis |
| StatuteClock | WOS (or Formspec, if triggered by a respondent act) | Trellis |

Formspec may originate a StatuteClock when a respondent act is itself the triggering event (e.g., filing an application starts a jurisdictional statute). Formspec never originates the other three kinds — those are governance concerns. The Respondent Ledger observes all clock events through the ledger as ordinary entries; originating them requires the authority the Respondent Ledger does not claim.

### D-3. Clock state in export bundles (Trellis-owned)

Export bundles include a new `open-clocks.json` manifest enumerating every `ClockStarted` whose `ClockResolved` has not been emitted at export time:

```
{
  "open": [{
    "clock_id": string,
    "clock_kind": enum,
    "computed_deadline": RFC3339,
    "origin_event_hash": Hash
  }]
}
```

The verifier emits an advisory diagnostic for each expired-but-unresolved clock (`computed_deadline < bundle.sealed_at` and no matching `ClockResolved`). Advisory, not an integrity failure — a deadline may pass without a system response, and *that is the audit-relevant fact*. Integrity is about the chain; the diagnostic is about the case.

### D-4. Pause and resume (WOS-owned; no new record kinds)

Statutory clocks pause and resume on administrative events (applicant response pending, hearing scheduled, etc.). WOS emits the pause as a two-event pair using the existing vocabulary:

1. `ClockResolved(resolution: "paused", resolving_event_hash: pause-cause)` — terminates the prior segment.
2. `ClockStarted(clock_kind: same, origin_event_hash: resume-cause, duration: residual)` — begins a new segment carrying the remaining duration.

The verifier composes pause segments into a cumulative duration by walking the chain. No `ClockPaused` record is needed — the two-event vocabulary composes.

### D-5. Relationship to ADR 0066 (amendment and supersession)

An amendment attempted after a statute clock has elapsed is a *governance-policy violation*, not an integrity violation. Trellis records whatever the governance layer permits to happen. WOS's amendment policy (ADR 0066 D-2) references the statute clock and rejects or permits the amendment under its deontic constraint. A rescission does not restart a statute clock — the original determination's elapsed time is preserved. A supersession via appeal may start a fresh StatuteClock if the appeal's statutory basis is independent.

## Consequences

**Positive.**
- Deadlines are first-class in the record — expiry is auditable, not implicit in missing events.
- Pause and resume compose from the base two-event vocabulary; no additional record kinds.
- Jurisdiction-aware via existing WOS §7.1 business-calendar selection; no duplicate plumbing.
- Verifier exposes open-clock state without opinionating about runtime behavior — a deployment with no live timers still produces valid chains.

**Negative.**
- Adds two WOS provenance record kinds (`ClockStarted`, `ClockResolved`) plus the clock-kind open enum.
- Trellis export bundle gains the `open-clocks.json` manifest and a verifier advisory path.
- Forces jurisdictional semantics to be decided per clock at authoring time — implicit defaults are not allowed. This is a design feature, not a deficiency.

**Neutral.**
- Does not mandate runtime timer implementation. A deployment without live timers still records `ClockStarted` at origin; `ClockResolved(resolution: "elapsed")` is emitted either at the next authoritative touch (audit, re-access, review) or left open, with the verifier advisory carrying the signal.

## Implementation plan

**WOS.**
- Add `ClockStarted` / `ClockResolved` to `ProvenanceKind` enum (Facts tier).
- Add `Clock` $def to kernel schema with `clock_kind`, `duration`, `calendar_ref`, `statute_reference` fields.
- Wire AppealClock emission to adverse-decision transition path — composes with §4.1 #2 deterministic notice (already landed).
- Wire ProcessingSLA emission to intake-complete event.
- Extend Task SLA authoring surface (#40, landed) to reference the clock contract where durations overlap.
- Reopens #51 statutory deadline chains — trigger-gate softens now that a contract exists.

**Formspec.**
- No authoring surface change. Respondent Ledger observes clock events as ordinary entries.
- StatuteClock origination on respondent acts (application filing) emits via the Respondent Ledger's existing event-emit path, referencing the applicable statute URI.

**Trellis.**
- Add `open-clocks.json` manifest to export bundle spec.
- Extend verifier with D-3 advisory diagnostic.
- Land `append/014-clock-started`, `append/015-clock-satisfied`, `append/016-clock-elapsed`, `append/017-clock-paused-resumed` vectors.

## Open questions

1. **Clock granularity.** Default: RFC3339 second-precision in the envelope. Jurisdictional deadlines are day-granular but the envelope should not preemptively floor precision — callers may need sub-day resolution for SLA clocks. Alternative: minute-precision.
2. **Post-hoc elapsed emission.** If a system goes dark and a deadline passes, who emits the terminal `ClockResolved`? Default: the next authoritative touch (audit, re-access, review) emits a synthetic `ClockResolved(resolution: "elapsed", resolved_at: computed_deadline)`. Alternative: leave open permanently and let the verifier advisory carry the signal. Recommendation: default — lets the chain self-close.
3. **Multi-jurisdictional clocks.** A case operating under federal + state law may face two statute clocks on the same act. Default: emit both, independently; no special composition. Alternative: require selection of a single governing jurisdiction at case open. Recommendation: default — WOS §7.1 jurisdiction selection is clock-scoped, so composition is straightforward.

## Alternatives considered

**Deadline as a field on the event that triggers it.** Rejected — events are immutable; pause and resume would require amendments to prior events, violating append-only. A deadline is a relationship between two events, not a property of one.

**Deadline as an external policy document consulted at audit.** Rejected — separates the clock from the chain it governs; makes offline verification impossible without the policy docs. The whole point of the chain is self-contained auditability.

**Single `Timer` record kind.** Rejected — conflates governance-meaningful clocks (appeal windows, statutes) with runtime timers (poll intervals, retry backoffs). The former require audit; the latter do not. Collapsing them forces Trellis to anchor retry-loop telemetry into the chain.

**Compute deadlines at verification time rather than at clock start.** Rejected — floats the deadline against the current calendar, making historical audits non-deterministic. A case audited in 2027 should see the same deadline a case audited in 2025 would.
