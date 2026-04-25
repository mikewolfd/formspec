# ADR 0079: Formspec Native IntakeHandoff Emission for WOS Targets

**Status:** Proposed
**Date:** 2026-04-25
**Scope:** Stack — Formspec spec + Formspec runtime + WOS workflow schema; cross-spec
**Related:** [ADR 0073 (stack case initiation and intake handoff)](./0073-stack-case-initiation-and-intake-handoff.md); [ADR 0076 (product-tier consolidation)](./0076-product-tier-consolidation.md) Q10 + D-9; [`wos-spec/schemas/wos-workflow.schema.json`](../../wos-spec/schemas/wos-workflow.schema.json) `$defs/IntakeReference`; [`wos-spec/examples/timeoff.workflow.json`](../../wos-spec/examples/timeoff.workflow.json) (Forms+ tier reference); [`schemas/definition.schema.json`](../../schemas/definition.schema.json) (Formspec definition)

## Context

ADR 0073 D-3 defines `IntakeHandoff` as the named, typed artifact crossing the Formspec → WOS boundary. The implementation places envelope construction at the workflow-author surface: the WOS workflow declares an intake reference, and the integration platform (or workflow author) explicitly wires up envelope emission on Formspec submission.

For benefits adjudication, permit reviews, fraud investigation — heavyweight `rightsImpacting` workflows where the envelope cost is amortized over substantial governance + agent + signature logic — explicit envelope authoring is fine. The author already manages dozens of cross-cutting concerns; one more is in the noise.

For the Forms+ tier defined by ADR 0076 D-9 (~30-line workflows: trivial lifecycle, one submitter, optional approver), explicit envelope wiring is a significant fraction of the workflow's total complexity. The "~30 lines" claim only holds if the author *doesn't* also have to write the envelope plumbing.

ADR 0076 Q10 owner decision (2026-04-25): Formspec emits `IntakeHandoff` natively when targeting a WOS workflow URL. This ADR ratifies and specifies that decision.

The reference example `wos-spec/examples/timeoff.workflow.json` already presumes native emission — its `intake.contractRef` points at a Formspec definition with no envelope wiring in sight, total file ~30 lines. ADR 0079 is what makes that example actually executable end-to-end.

## Decision

### D-1. Native emission rule

When a Formspec definition declares a WOS workflow target (via the seam in D-3), the Formspec runtime, on validated submission, MUST automatically construct and emit an `IntakeHandoff` envelope conforming to ADR 0073's contract. The envelope is not authored at the workflow side; it is produced by the Formspec runtime as a deterministic side effect of submission.

The envelope is the *output* of validation; it is not a separate authoring artifact. Forms+ tier authors write a Formspec definition and a WOS workflow definition. The runtime wires them.

### D-2. Boundary ownership stays per ADR 0073

ADR 0073 invariants are unchanged:

- Formspec owns intake-session truth (canonical response hash, definition pin, validation status).
- WOS owns governed case identity and `case.created` event emission.
- The seam is the named `IntakeHandoff` artifact (ADR 0073 D-3).

What ADR 0079 changes is *who constructs the envelope*, not *what crosses the seam*.

### D-3. Target declaration syntax

Formspec definitions gain an optional top-level `targetWorkflow` object:

```json
{
  "$formspec": "1.0",
  "url": "https://example.org/forms/timeoff.formspec.json",
  "version": "1.0.0",
  "targetWorkflow": {
    "url": "https://example.org/wf/timeoff",
    "version": "^1.0.0",
    "mode": "workflowInitiated"
  },
  "items": [...]
}
```

| Field | Required | Description |
|---|---|---|
| `targetWorkflow.url` | REQUIRED (when block present) | URI matching the WOS workflow's top-level `url`. Symmetric with WOS-side `intake.contractRef`. |
| `targetWorkflow.version` | OPTIONAL | Semver range against the WOS workflow's `version`. Lint warns on incompatibility. |
| `targetWorkflow.mode` | OPTIONAL | `workflowInitiated` (default) or `publicIntake`. Mirrors ADR 0073 D-4 mode vocabulary. |

When `targetWorkflow` is absent, the Formspec definition behaves exactly as today (no native emission). When present, the Formspec runtime activates native emission per D-1.

This declaration is **explicit and load-bearing** — it is the signal that authors a WOS-targeting form. No implicit detection (e.g. "any runtime that registers a WOS handler emits"). Implicit detection couples runtime configuration to spec semantics; explicit declaration keeps the contract in the spec where it can be linted, version-pinned, and audited.

### D-4. Envelope content responsibilities

| Field | Owner | Source |
|---|---|---|
| `canonicalResponseHash` | Formspec runtime | Computed from the validated response per Formspec canonicalization rules |
| `definitionUrl` + `definitionVersion` | Formspec runtime | Pinned at submission time |
| `responsePayload` | Formspec runtime | Validated response instance |
| `mode` | Formspec runtime | From `targetWorkflow.mode` or default |
| `submitterActorRef` | Formspec runtime | From session/auth context if known; null for `publicIntake` anonymous flows (subject to ADR 0073 Open Question #1 acceptance floor) |
| `submittedAt` | Formspec runtime | RFC3339 UTC per ADR 0069 |
| `targetWorkflowUrl` + `targetWorkflowVersion` | Formspec runtime | From `targetWorkflow` declaration |
| `caseId` | **WOS, on receipt** | WOS owns case identity per ADR 0073 D-1 — Formspec MUST NOT mint case ids |
| `caseCreatedAt` | **WOS, on receipt** | Emitted as part of WOS `case.created` provenance |

Formspec emits everything Formspec knows; WOS emits everything WOS owns. No layer mints the other's data.

### D-5. Failure modes

Three classes, with explicit boundary semantics:

1. **Formspec validation fails** → no envelope emitted; submission rejected at Formspec layer; **no WOS event** (per ADR 0070 D-2 / ADR 0075 invariant). The Formspec respondent ledger may or may not record the rejection per ADR 0070 D-2 — out of scope for this ADR.
2. **Envelope construction fails after validation** → Formspec runtime retries per its own retry policy; envelope is content-addressable so retries are idempotent. WOS unaware until envelope arrives.
3. **WOS handler rejects valid envelope** → Formspec receives a typed rejection (`InvalidIntakeHandoff` with reason); submission UI surfaces the error; respondent ledger may record the rejection per Formspec policy. Common reasons: `targetWorkflow` URL not registered, version range incompatible, `mode` mismatch (e.g. `publicIntake` to a workflow that requires authenticated intake).

### D-6. Backwards compatibility

The pre-ADR-0079 path — workflow author or integration platform writes explicit envelope wiring — remains valid. ADR 0079 adds a path; it does not remove one.

| Tier | Path |
|---|---|
| Forms+ (ADR 0076 D-9) | Native emission via `targetWorkflow` declaration. Default. |
| DocuSign tier (ADR 0076 D-9) | Native emission for the intake form (typically the document data); explicit envelope wiring may be added if signature-context metadata needs to ride on the envelope `extensions`. |
| Case management tier (ADR 0076 D-9) | Either path. Native is sufficient for clean intake; explicit authoring is appropriate when integration platforms inject additional envelope metadata (e.g. eligibility-prequal scores, prior-case relationships) before WOS receives the envelope. |

The two paths are not in conflict — `targetWorkflow` declaration in the Formspec definition is the discriminator. Heavyweight workflows that need envelope customization can keep `targetWorkflow` absent and wire explicitly; lightweight workflows declare `targetWorkflow` and inherit the native path.

### D-7. Cross-spec versioning

`targetWorkflow.version` is a semver range. The `IntakeHandoff` envelope carries the *resolved* version (the actual WOS workflow version present at submission time), not the range. Compatibility matrix:

| Formspec definition `targetWorkflow.version` | WOS workflow `version` | Behavior |
|---|---|---|
| Absent | Any | No range check; Formspec emits envelope with WOS workflow's actual version |
| `^1.0.0` | `1.2.3` | Compatible; emit |
| `^1.0.0` | `2.0.0` | Incompatible; **lint** warns at authoring; runtime **rejects** at submission with typed `IncompatibleWorkflowVersion` |
| Exact (`1.0.0`) | `1.0.0` | Compatible; emit |
| Exact (`1.0.0`) | `1.0.1` | Incompatible (exact pin); reject |

Lint rule `FORMSPEC-WOS-VERSION-001` (cross-spec): warn when `targetWorkflow.version` range does not satisfy the registered WOS workflow's `version`.

### D-8. Lint rules

- **`FORMSPEC-WOS-XREF-001`** (cross-spec, Formspec side) — Formspec declares `targetWorkflow.url` `X` but no WOS workflow registered with `url` `X`. Requires registry access; degrades gracefully to warn-only when registry unavailable.
- **`WOS-INTAKE-XREF-001`** (cross-spec, WOS side) — WOS workflow's `intake.contractRef` points at Formspec definition `Y`, but Formspec definition `Y` does not declare reciprocal `targetWorkflow.url`. Asymmetric pairing is permitted (one-way reference) but flagged.
- **`FORMSPEC-WOS-VERSION-001`** — version-range mismatch (D-7).
- **`FORMSPEC-WOS-MODE-001`** — Formspec `targetWorkflow.mode` does not match WOS workflow's accepted modes (e.g. Formspec declares `publicIntake` but WOS workflow rejects anonymous intake per ADR 0073 D-7 acceptance floor).

All four lint rules are cross-spec — they require both spec authorities to be readable by the linter. The wos-spec `wos-lint --project` and Formspec `python3 -m formspec.validate` paths gain optional cross-spec resolution flags.

### D-9. Schema additions

**Formspec `definition.schema.json`** gains a top-level optional `targetWorkflow` object per D-3.

**WOS `wos-workflow.schema.json`** `$defs/IntakeReference` already accepts `contractRef` (Formspec definition URI) and `mode`. No change required.

The two specs declare the seam from each side; the seam shape itself (the `IntakeHandoff` envelope schema) is unchanged from ADR 0073.

## Consequences

**Positive.**

- **Forms+ tier delivers the ~30-line promise.** `wos-spec/examples/timeoff.workflow.json` becomes executable end-to-end without ~50 lines of envelope wiring at the workflow side.
- **Symmetry across the seam.** WOS workflow declares `intake.contractRef`; Formspec definition declares `targetWorkflow.url`. Each side names the other; cross-spec lint becomes possible.
- **Audit trail uniform across tiers.** Every WOS workflow targeted by a Formspec definition produces an `IntakeHandoff` envelope, regardless of who constructs it. Trellis-anchorable, deterministic.
- **Cross-spec versioning is explicit.** `targetWorkflow.version` semver range is authored, lintable, and runtime-checkable. No silent breakage when WOS workflow version drifts.

**Negative.**

- **Cross-spec dependency.** Formspec runtime now must understand WOS as a target consumer. The "Formspec is presentation-and-validation, period" framing loosens; Formspec gains knowledge of one downstream consumer.
- **Two paths to envelope emission.** Native vs explicit. Authors choose; lint helps disambiguate. Mitigation: the `targetWorkflow` field is the discriminator and is itself lintable.
- **Spec coordination cost.** Bumping Formspec major version that affects `IntakeHandoff` envelope shape requires WOS coordination. The envelope schema lives at the stack level, not in either spec alone.

**Neutral.**

- **ADR 0073 invariants unchanged.** Case identity ownership (D-1), mode vocabulary (D-4), envelope shape (D-3) all stand.
- **Trellis boundary unchanged.** Custody anchoring of the envelope (where applicable) stays per existing custody hooks.
- **Explicit envelope authoring still works.** Heavyweight workflows that need it (case management with integration-platform metadata injection) are not forced into native emission.

## Implementation plan

Numbered for tracking.

1. **Formspec spec amendment.** Add `targetWorkflow` to `definition.schema.json` per D-3. Add a normative section to Formspec Core spec defining the field's semantics and its trigger of native emission. Targeted spec edit, not a full Formspec ADR — this ADR provides the cross-spec ratification.
2. **Formspec runtime emission.** Implement envelope construction in the Formspec runtime (`packages/formspec-engine` for client-side; `src/formspec/` for server-side). Behind a feature flag initially; promote when native-emission examples conformance-pass.
3. **WOS workflow schema doc.** Document the symmetric `intake.contractRef` ↔ `targetWorkflow.url` pairing in `wos-workflow.schema.json` `$defs/IntakeReference` description.
4. **Cross-spec lint rules.** Register the four rules from D-8 in their respective lint matrices. Cross-spec resolution flag (`--cross-spec` or registry-aware mode) for each tool.
5. **Conformance fixtures.** Forms+ tier Formspec definition + WOS workflow definition pair, end-to-end submission, envelope round-trip. At least one per `mode` (`workflowInitiated`, `publicIntake`).
6. **Stack documentation.** Update `STACK.md` with the cross-spec dependency note. Update ADR 0073's implementation-status section with a pointer to this ADR.
7. **Migration note.** Any existing workflow author currently writing explicit envelope wiring may opt into native emission by adding `targetWorkflow` to their Formspec definition and removing the wiring. No forced migration; backwards compatibility per D-6.

## Open questions

1. **Envelope retry/idempotency on Formspec side.** Is envelope emission retry the caller's responsibility (network layer), or does Formspec runtime maintain its own retry policy? ADR 0070 covers WOS-side commit retry; this ADR covers Formspec-side emission retry. Likely defers to existing Formspec submission retry semantics — confirm before step 2 lands.
2. **Anonymous-flow submitter actor reference.** ADR 0073 Open Question #1 (anonymous `publicIntake` default posture) intersects with D-4: when `mode: publicIntake` and no auth context, what is `submitterActorRef`? `null`? A synthetic anonymous actor? Defer to ADR 0073 OQ#1 resolution.
3. **`extensions` injection point for native emission.** Heavyweight workflows currently inject custom envelope metadata via `extensions` (e.g. eligibility-prequal scores). Native emission D-4 doesn't enumerate an injection point. Two options: (a) `targetWorkflow.envelopeExtensions` Formspec field that Formspec runtime copies into the envelope, (b) heavyweight workflows simply continue to use explicit emission. Lean toward (b) — keep native emission simple; complex metadata is a signal that explicit authoring is the right path.
4. **Registry mechanism for cross-spec lint.** Cross-spec lint rules (D-8) need to resolve "WOS workflow registered at URL X" and "Formspec definition resolves to URL Y." Stack-level registry (per ADR 0061 / extension-registry posture) or local-project resolution? Defer to lint-tooling design, but flag now so the lint rules don't ship without a working resolution path.
