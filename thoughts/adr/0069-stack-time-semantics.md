# ADR 0069: Stack Contract — Time Semantics

**Status:** Proposed
**Date:** 2026-04-21
**Scope:** Cross-layer — Formspec + WOS + Trellis
**Related:** [STACK.md Open Contracts](../../STACK.md#open-contracts); [ADR 0067 (statutory clocks)](./0067-stack-statutory-clocks.md) (clock emission inherits these pins); Trellis Core §9 (timestamp fields in envelope); WOS Kernel §7 (business-calendar timezone selection); Formspec FEL `today()` / `now()`; [parent TODO](../../TODO.md) stack-wide section

## Context

All three layers produce timestamps. None agrees with the others on precision, timezone, leap-second handling, monotonicity, or clock-source attestation. RFC3339 UTC is assumed in prose across the specs but never normatively pinned as a cross-layer invariant.

The pattern that breaks in its absence is not catastrophic in development — it is catastrophic intermittently in production:

- A case created in Tokyo, reviewed in San Francisco, audited in New York: whose clock renders `today()` in a FEL expression?
- A chain sealed during a leap second: does Trellis emit `23:59:60`, reject it, or smear?
- SLAs with sub-second semantics (ProcessingSLA per [ADR 0067](./0067-stack-statutory-clocks.md)) require precision; dates and appeal windows do not.
- A chain whose timestamps move backwards between events — is it integrity-valid?

Listed in [STACK.md Open Contracts](../../STACK.md#open-contracts) as an integration primitive. Cheap to close now; each deferred day hardens wrong defaults in submodule code.

## Decision

Six pins across the three layers. Every implementation MUST honor them at the wire; presentation is a renderer concern.

### D-1. RFC3339 UTC is the wire format

Every timestamp emitted by any layer, on any wire — event envelope, provenance record, export bundle manifest, FEL builtin return — MUST serialize as RFC3339 with the `Z` zone designator. Offsets (`+09:00`, `-05:00`) MUST NOT appear on the wire. Local-time rendering is a renderer concern and happens after the record leaves the chain.

### D-2. Millisecond precision is the minimum; sub-millisecond is allowed

`2026-04-21T12:34:56.789Z` is the minimum-precision canonical form. Higher-precision timestamps (`2026-04-21T12:34:56.789012345Z`) are valid and preserve additional digits. Second-precision timestamps (`2026-04-21T12:34:56Z`) are REJECTED by verifiers — precision is load-bearing for SLA clocks under [ADR 0067](./0067-stack-statutory-clocks.md).

Rationale: rejecting second-only precision at the wire forces an SLA clock that fires within the same second to be unambiguously ordered.

### D-3. Chain order MUST agree with timestamp order

Within a single Trellis ledger chain, timestamps MUST be non-decreasing across `priorEventHash` sequence. A chain with backwards timestamps between consecutive events is an integrity failure — the verifier MUST reject it.

This pin composes [ADR 0057](../../wos-spec/thoughts/archive/adr/0057-wos-core-implementation-boundary.md) serial-per-instance ordering with Trellis's hash-chain ordering. Per-instance serialization at the WOS layer produces events in a total order; that total order MUST match anchor-time timestamp order.

Non-decreasing — equal timestamps are permitted. Two events at the same millisecond are ordered by chain position, not by timestamp.

### D-4. Leap seconds absorb via UTC-SLS

Clients MUST NOT emit `23:59:60`. On leap-second days, the preceding 1000 seconds smear via UTC-SLS (the Google/AWS NTP convention): each second spans 1000.001 ms, such that the final second of the day at the wire is `23:59:59.999Z` and the first second of the next day is `00:00:00.000Z` without a gap.

Rationale: strict `23:59:60` breaks most RFC3339 parsers and would produce spurious chain-failure incidents every leap second. The smearing is operationally proven at planetary scale.

### D-5. Clock-source attestation is Facts-tier optional

Runtimes emitting rights-impacting clock starts (per [ADR 0067](./0067-stack-statutory-clocks.md) `ClockStarted`) MAY declare a clock-source attestation on the record:

```
clock_source {
  kind: "ntp" | "ptp" | "tsa" | "wall-clock" | "x-*",
  source_identifier: string,   // server FQDN, TSA URL, etc.
  attested_at: RFC3339         // optional cross-check
}
```

Absent declaration implies `wall-clock` best-effort. Audit posture increases with attestation; the stack does not mandate it. RFC 3161 TSAs are adapters for attestation; not required by the center.

### D-6. FEL `today()` and `now()` require explicit timezone context

FEL's temporal builtins MUST receive a `timezone` in their evaluation context. A FEL expression evaluated without a declared timezone is a configuration error — the evaluator MUST refuse, not silently fall back to server timezone.

Timezone selection composes with WOS Kernel §7 jurisdiction-aware business-calendar selection. Where a case's jurisdiction pins a timezone, `today()` and `now()` resolve against that timezone. Where multiple applicable calendars disagree on timezone, WOS §7's configuration-error rule applies.

## Consequences

**Positive.**
- Chain ordering is deterministic and auditable across time zones and daylight-saving transitions.
- Leap seconds do not produce intermittent integrity failures.
- FEL temporal expressions produce identical outcomes across deployments for the same input.
- SLA clocks (ADR 0067) have enough precision to be sub-second-deterministic.
- Clock attestation is optional but declarative when required.

**Negative.**
- D-6 forces FEL authors to declare timezone (minor authoring burden; mitigated by jurisdiction-aware inheritance from WOS §7).
- D-2 rejecting second-precision breaks any existing fixture using second-precision timestamps. Greenfield — no production data, fixtures regenerate cheaply.
- D-3 requires runtime clock-monotonicity discipline at anchor time.

**Neutral.**
- Does not pick an NTP/PTP provider or attestation substrate. RFC 3161 TSAs are adapters; OpenTimestamps-style anchoring is a Trellis adapter slot.

## Implementation plan

**Formspec.**
- Canonical response schema pins all timestamp fields to the RFC3339 millisecond-or-better regex.
- FEL evaluator requires `timezone` in evaluation context; absence returns `EvaluationContextError`, not `null`.
- `today()` and `now()` resolve against the declared timezone.

**WOS.**
- `ProvenanceRecord.timestamp` schema pins to D-1 + D-2 regex.
- `DurableRuntime` trait method signatures carry timezone context where temporal evaluation is required.
- `Clock` $def (per [ADR 0067](./0067-stack-statutory-clocks.md)) optional `clock_source` field matching D-5 shape.
- Lint rule (proposed `K-T-010`) for FEL expressions using `today()` / `now()` without a `timezoneRef` declaration.

**Trellis.**
- Envelope header timestamp field pinned to D-1 + D-2.
- Verifier rejects chains with timestamp-order violations per D-3.
- Verifier rejects envelopes containing `23:59:60` timestamps per D-4.
- Optional `clock_source` object on `ClockStarted` events per D-5.
- One-page "Time" section added to Trellis Operational Companion citing this ADR.

## Open questions

1. **Attestation substrate for D-5.** Default: RFC 3161 TSA for rights-impacting clock starts. Alternative: custom signed attestation. Recommendation: default — RFC 3161 is mature and audit-familiar.
2. **Backwards-in-time evidence import.** If a deployment imports evidence with pre-deployment timestamps (e.g., historical records), D-3 still holds within a single chain. Cross-chain? Out of scope — imports are bundle-level, not chain-level.
3. **Sub-millisecond precision canonicalization.** Two runtimes writing `2026-04-21T12:34:56.789000Z` vs `2026-04-21T12:34:56.789Z` — equal? Default: equal (trailing zeros insignificant). Alternative: strict byte-equality (trailing zeros significant). Recommendation: default — matches RFC3339 prose; Trellis byte-equality is on envelope bytes, not on parsed timestamps.

## Alternatives considered

**Strict UTC with leap-second rejection.** Rejected — would cause intermittent integrity incidents at each leap second, and RFC3339 parsers disagree on whether `23:59:60` is valid.

**Server-local timezone default in FEL.** Rejected — the same FEL expression evaluating differently on different deployments breaks portability. D-6 forces explicit intent.

**Per-layer independent time policy.** Rejected — composition across layers requires a shared pin or chain-ordering invariants cannot hold.

**Second-precision minimum for wire timestamps.** Rejected — SLA clocks under [ADR 0067](./0067-stack-statutory-clocks.md) need sub-second determinism; rejecting second-precision at the wire forces correctness.

**Monotonic-only (reject backwards OR equal timestamps).** Rejected — equal timestamps are legitimate (two events processed within the same millisecond). Chain position disambiguates.
