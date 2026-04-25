# Planning Backlog (Cross-ADR)

Organized backlog for remaining work and unresolved design points across stack ADRs.  
Primary sources in this update: ADR 0068, ADR 0069, ADR 0070, ADR 0072, ADR 0073, and the WOS kernel-restructure cluster (ADR 0074, 0075, 0076, 0077, 0078), with cross-ADR alignment tasks against ADR 0061, ADR 0066, and ADR 0071.

## Tenant Contract and Data Shape

- [ ] Require top-level `tenant` in Formspec artifacts (`respondent-ledger`, canonical response, intake handoff if in scope). Source: ADR 0068 D-1 + implementation plan.
- [ ] Add required `tenant` to Trellis envelope header and bundle-level export metadata. Source: ADR 0068 implementation plan.
- [ ] Add required `tenant: String` to WOS `CaseInstance` and persistence model. Source: ADR 0068 implementation plan.
- [ ] Define canonical tenant regex/format and enforce consistently across schemas and runtime validation. Source: ADR 0068 Open Question #1.
- [ ] Decide one source-of-truth rule for tenant identity (`payload.tenant` vs TypeID prefix) and define hard-fail behavior on mismatch. Source: ADR 0068 D-1/D-4 (proposed clarification).

## Runtime Isolation and Enforcement

- [ ] Thread tenant context through the entire `DurableRuntime` API surface and all implementations/callers. Source: ADR 0068 implementation plan.
- [ ] Enforce runtime rejection for cross-tenant reads/writes and tenant-mismatch submissions.
  Source: ADR 0068 D-1 + implementation plan.
- [ ] Define/store/query boundaries as mandatory tenant partitions (not optional app filtering). Include DB/cache/queue/export boundaries.
  Source: ADR 0068 D-1 ("substrate boundary") (proposed hardening).
- [ ] Define verifier refusal behavior when expected tenant scope does not match chain/bundle tenant. Source: ADR 0068 implementation plan.

## Relationship, Case Scope, and Supersession Rules

- [ ] Implement lint rule for cross-tenant relationship rejection (`K-C-010` proposed) and wire into kernel validation.
  Source: ADR 0068 implementation plan.
- [ ] Clarify case ID scope semantics: reconcile "unique within (tenant, ledger)" with TypeID/UUIDv7 practical uniqueness and storage/API keys.
  Source: ADR 0068 D-4 + ADR 0061 TypeID posture (proposed clarification).
- [ ] Decide supersession scope-bundle carry-forward semantics (reuse first 3 + new ledger vs fresh full tuple) and encode in contract text + validators.
  Source: ADR 0068 Open Question #3 + ADR 0066 linkage.

## Identity and Authorization Model

- [ ] Finalize actor-across-tenants identity model (global identity + per-tenant authority vs mapped per-tenant identities).
  Source: ADR 0068 D-3 + Open Question #2.
- [ ] Publish authorization invariants proving grants never transfer across tenants.
  Source: ADR 0068 D-3 (implementation hardening).

## Migration and Versioning Alignment

- [ ] Resolve ADR consistency conflict: ADR 0068 immutable 4-tuple wording vs ADR 0071 mid-flight pin changes.
  Proposed split:
  - immutable case identity tuple (tenant + stable scope identity),
  - mutable version pin set governed by `MigrationPinChanged`.
  Source: ADR 0068 D-2 and ADR 0071 D-4 (proposed ADR amendment).
- [ ] Update ADR text where needed so "MUST NOT change for case lifetime" only applies to intended identity fields.
  Source: ADR 0068 D-2 (proposed wording fix).

## Cross-Layer Migration and Versioning (ADR 0071)

### Contract and Sequencing

- [ ] Ratify ADR 0071 dependencies and sequencing assumptions before implementation (`0066`, `0068`, and migration-routing dependencies).
  Source: ADR 0071 context/implementation plan + stack sequencing notes.
- [ ] Define and freeze canonical `CaseOpenPin` shape (all six dimensions), nullability rules, and per-dimension version-string constraints.
  Source: ADR 0071 D-1.
- [ ] Decide one authoritative wire location for `CaseOpenPin` (first anchored ledger event vs canonical response) and treat all other surfaces as projections.
  Source: ADR 0071 implementation plan + Open Question #1.
- [ ] Add stack-level `pins.md` reference documenting pin dimensions, ownership, and normative version-format links.
  Source: ADR 0071 implementation plan.

### Runtime and Verifier Wiring

- [ ] Add WOS `MigrationPinChanged` shape/kind and runtime acceptance path (`CaseInstance::create` with `pin`, then context propagation).
  Source: ADR 0071 D-4 + implementation plan.
- [ ] Clarify WOS `instanceVersioning` relationship to stack-level cross-layer pinning so only one authoritative version contract exists.
  Source: ADR 0071 D-1/D-2 (integration clarification).
- [ ] Add Trellis envelope/verifier obligations:
  - required initial `pin`,
  - pin immutability unless `MigrationPinChanged` anchors a transition,
  - phase-lineage compatibility across prior envelope phases.
  Source: ADR 0071 D-2/D-3/D-4 + implementation plan.
- [ ] Add Formspec-side pin capture and migration-policy documentation so active-case auto-migration is not implied.
  Source: ADR 0071 implementation plan.
- [ ] Align WOS migration-routing backlog (`#3`) with ADR 0071 transition semantics so routing cannot bypass pin-change governance.
  Source: ADR 0071 implementation plan + WOS backlog dependency.

### Conformance and Operations

- [ ] Add cross-version replay conformance fixtures asserting archived-semantics replay determinism (byte-identical where required).
  Source: ADR 0071 D-2 + implementation plan.
- [ ] Add rollout/ops guardrails for pin transitions (feature flags, migration-attempt telemetry, verifier mismatch observability).
  Source: ADR 0071 consequences + proposed implementation hardening.

## Testing and Conformance

- [ ] Add negative tests for missing tenant, malformed tenant, and tenant mismatch across all touched schemas/APIs.
  Source: ADR 0068 implementation plan.
- [ ] Add integration tests for tenant-scoped lifecycle operations (`create/load/enqueue`) in WOS runtime.
  Source: ADR 0068 implementation plan.
- [ ] Add verifier tests for tenant mismatch refusal and accepted same-tenant chains/bundles.
  Source: ADR 0068 implementation plan.
- [ ] Add regression tests for `payload.tenant` and TypeID-prefix consistency checks.
  Source: ADR 0068 D-1/D-4 (proposed hardening).

## Registry, References, and Documentation

- [ ] Add ADR 0068 as a normative reference where TypeID registration and stack contracts are declared.
  Source: ADR 0068 stack-level implementation item + ADR 0061 relationship.
- [ ] Move ADR 0068 from Proposed to Accepted only after unresolved contract questions are closed.
  Source: ADR 0068 status + open questions.
- [ ] Update root/WOS/Trellis TODO trackers with explicit completion criteria tied to tests and verifier obligations.
  Source: ADR 0068 implementation plan (execution hygiene).

## Failure Semantics and Commit Boundary (ADR 0070)

- [ ] Ratify ADR 0070 and publish a stack-level normative delta note that explicitly states:
  - commit point = Trellis local append receipt (`canonical_event_hash`),
  - `stalled` lifecycle status,
  - `CommitAttemptFailure` Facts-tier record,
  - no runtime saga compensation (governance correction via ADR 0066).
  Source: ADR 0070 D-1..D-6 + implementation plan.
- [ ] Resolve boundary-language conflict between ADR 0070 commit semantics and current WOS `DurableRuntime` center wording; codify precedence in `STACK.md` and WOS companion docs.
  Source: ADR 0070 D-1 + cross-ADR consistency review (proposed change).
- [ ] Decide and document whether Formspec pre-commit rejects are "no decision record" or "no stack record at all," and define allowed failure/audit telemetry shape.
  Source: ADR 0070 D-2 + premise review (proposed refinement).

## Runtime Reliability, Retry, and Stalled Recovery (ADR 0070)

- [ ] Add `stalled` to WOS reserved lifecycle/status vocabulary and add `stalled_since` to `CaseInstance`.
  Source: ADR 0070 implementation plan.
- [ ] Extend `DurableRuntime` custody append contract with typed outcomes for retryable, budget-exhausted, and terminal failures.
  Source: ADR 0070 implementation plan (`append_to_custody` typed error requirement).
- [ ] Implement bounded retry with ADR-0061 idempotency tuple `(caseId, recordId)` and guarantee single canonical commit on eventual success.
  Source: ADR 0070 D-4 + ADR 0061.
- [ ] On retry-budget exhaustion, transition to `stalled`, emit operator-facing telemetry, and require explicit recovery path.
  Source: ADR 0070 D-4 + implementation plan.
- [ ] Define operational policy for auto-recovery vs explicit operator intervention, and make the default explicit in runtime config + docs.
  Source: ADR 0070 Open Question #2.
- [ ] Specify minimum tenant isolation guarantees for append-path outages so "cross-tenant failure isolation" is either normative or explicitly deployment-conditional.
  Source: ADR 0070 Open Question #3 + ADR 0068.

## Provenance and Verifier Surface (ADR 0070)

- [ ] Add `ProvenanceKind::CommitAttemptFailure` (Facts tier) with schema and runtime emitters.
  Source: ADR 0070 D-6 + implementation plan.
- [ ] Wire Trellis verifier reporting for `CommitAttemptFailure` and add optional `failures.json` export summary.
  Source: ADR 0070 implementation plan.
- [ ] Clarify failure-record durability semantics during prolonged outages (anchored on next success/recovery vs separate durable failure journal).
  Source: ADR 0070 D-6 + premise review (open design risk).

## Compensation Model and Governance Alignment (ADR 0070 + ADR 0066)

- [ ] Reconcile ADR 0070 D-5 ("no runtime saga compensation") with existing WOS compensation surface (`compensable`, `compensatingAction`, compensation logs, `$compensation.complete`) by choosing one path:
  - deprecate runtime compensation constructs, or
  - explicitly scope them as non-governance operational semantics.
  Source: ADR 0070 D-5 + current WOS model/schema (proposed change).
- [ ] If deprecating/refining compensation semantics, publish migration/deprecation plan and fixture updates to preserve conformance stability.
  Source: ADR 0070 D-5 + ADR 0066 linkage.

## Amendment, Supersession, and Decision Revisit Contract (ADR 0066)

- [ ] Ratify ADR 0066 and close its three open questions before implementation gates open in WOS/Trellis/Formspec trackers.
  Source: ADR 0066 status + Open questions + implementation gate notes in root/WOS/Trellis TODOs.
- [ ] Add Formspec Respondent Ledger `ResponseCorrection` event shape with prior-event hash linkage (`ResponseSubmitted.canonical_event_hash`) and strict declared-subset correction semantics.
  Source: ADR 0066 D-1 + implementation plan (Formspec).
- [ ] Add supersession-start linkage shape for the superseding respondent ledger (`supersedes_chain: { chain_id, checkpoint_hash }`) and assert no in-place mutation semantics.
  Source: ADR 0066 D-1 (Supersession) + Context premise.
- [ ] Add WOS provenance and schema support for all six ADR 0066 kinds:
  `CorrectionAuthorized`, `AmendmentAuthorized`, `DeterminationAmended`, `RescissionAuthorized`, `DeterminationRescinded`, and `AuthorizationAttestation`.
  Source: ADR 0066 Consequences + implementation plan (WOS).
- [ ] Add WOS Workflow Governance policy surfaces for revisit authorization (`amendmentPolicy`, `rescissionPolicy`, and corresponding mode gates) and enforce assurance-floor policy for rights-impacting cases.
  Source: ADR 0066 D-2 + implementation plan (WOS).
- [ ] Wire WOS exporter coverage so all ADR 0066 records emit as distinct event types in PROV-O / OCEL / XES.
  Source: ADR 0066 implementation plan (WOS exporters).
- [ ] Complete Trellis Phase-1 ADR 0066 scope:
  reserve `supersedes_chain_id` under MUST-NOT-populate discipline, land vectors `append/011-correction`, `append/012-amendment`, `append/013-rescission`, and add verifier checks for correction-preservation + rescission-terminality.
  Source: ADR 0066 D-3 + implementation plan (Trellis) + Trellis TODO #17.
- [ ] Complete Trellis Phase-4 ADR 0066 scope:
  activate supersession runtime, specify/emit `supersession-graph.json`, add chain-linkage verification against predecessor checkpoint hash, and enforce cycle detection.
  Source: ADR 0066 D-3/D-4 + implementation plan (Trellis).
- [ ] Add cross-repo conformance fixtures proving all four revisit modes across Formspec -> WOS -> Trellis seams, including required negative cases for invalid supersession linkage and post-rescission determination attempts.
  Source: ADR 0066 Consequences (new fixture set required) + implementation plan.

## Evidence Integrity and Attachment Binding (ADR 0072)

- [ ] Close remaining tracker drift so ADR 0072 reflects landed Trellis/Formspec coverage in root trackers (current root `TODO.md` wording still implies open Trellis export/verify/tamper work).
  Source: ADR 0072 implementation status follow-up + stack review.
- [ ] Confirm WOS-side optional origination posture remains intentionally unimplemented (`WOS MAY originate`) and document explicit trigger conditions for when to implement it.
  Source: ADR 0072 D-4 + implementation plan.
- [ ] If WOS post-intake evidence origination is needed, define and implement WOS evidence-intake/evidence-reference shape that cites binding events by `canonical_event_hash`.
  Source: ADR 0072 implementation plan (WOS).
- [ ] Add/retain cross-repo conformance checks proving `EvidenceAttachmentBinding` invariants for add/replace/remove lifecycle semantics and `prior_binding_hash` lineage integrity.
  Source: ADR 0072 D-1/D-2/D-6.
- [ ] Ensure offline export/verify coverage remains mandatory in regression runs (vectors landed; keep CI enforcement explicit) for:
  - attachment manifest digest mismatch,
  - missing inline attachment body,
  - unresolved or cyclic binding lineage.
  Source: ADR 0072 D-5/D-6 + fixture plan.
- [ ] Decide and codify privacy-profile behavior for attachment metadata in portable artifacts (`filename`, `media_type`, `slot_path`, `byte_length`) to avoid over-disclosure in sensitive workflows.
  Source: ADR 0072 Open Question #2 + premise review hardening.
- [ ] Decide whether verifier plaintext re-hash should remain `SHOULD` (when readable) or become profile-level `MUST` for specific assurance classes.
  Source: ADR 0072 D-6 + premise review hardening.
- [ ] Define slot identity stability strategy across schema/form evolution (stable slot id and/or canonicalized slot path rules) to prevent semantic drift.
  Source: ADR 0072 D-1 (`slot_path`) + premise review hardening.
- [ ] Evaluate minimal cross-origin removal normalization (common required references on remove) while preserving origin-owned event types.
  Source: ADR 0072 D-2 + premise review hardening.

## Case Initiation and Intake Handoff (ADR 0073)

- [ ] Build shared stack fixture bundles for the remaining cross-seam proof path:
  - `workflowInitiated` attach-to-existing-case,
  - `publicIntake` accept-then-create-case,
  - deterministic expected outputs across Formspec -> WOS -> Trellis verify.
  Source: ADR 0073 implementation plan (Stack-level) + implementation status ("Still open").
- [ ] Add at least one required negative shared fixture (response-hash mismatch) in the stack bundle so end-to-end verify failure is asserted at the seam, not only in repo-local vectors.
  Source: ADR 0073 implementation plan (Stack-level/Trellis) + implementation status ("Still open") + premise review.
- [ ] Add CI/conformance gate for shared fixture bundles and required negative cases so stack-integration regressions fail at integration time.
  Source: ADR 0073 implementation plan (Stack-level) + proposed execution hardening.
- [ ] Update examples/docs/product wording to avoid implying Formspec creates governed cases; preserve D-1 ownership semantics (`case.created` is WOS-owned).
  Source: ADR 0073 D-1 + implementation plan (Stack-level).
- [ ] Remove dual naming drift at the seam (`CaseInitiationRequest` alias) and keep `IntakeHandoff` as the single canonical contract term.
  Source: ADR 0073 D-3 + premise review proposed change.
- [ ] Update ADR 0073 implementation-status text to mark Trellis vectors as landed and keep only genuinely open work (shared fixture bundle + CI ratification evidence).
  Source: ADR 0073 implementation status + subsequent implementation evidence + premise review.

## Time Semantics and Temporal Determinism (ADR 0069)

- [ ] Ratify ADR 0069 scope and authority (move from `Proposed`), including explicit compatibility statement for cross-layer adoption order.
  Source: ADR 0069 status + implementation planning.
- [ ] Resolve contract boundary for timestamp representation across layers: universal RFC3339-on-wire vs profiled contract that allows Trellis internal epoch/seconds representation.
  Source: ADR 0069 D-1/D-2 + Open Question #2 + premise review.
- [ ] Pin canonical UTC wire rules (D-1) in all outward-facing schemas/examples and remove contradictory offset examples.
  Source: ADR 0069 D-1 + implementation plan + status audit contradiction.
- [ ] Implement and centralize timestamp precision policy (D-2) with explicit field-class scoping (`ordering-sensitive` vs informational) to avoid unnecessary universal breakage.
  Source: ADR 0069 D-2 + rationale + premise review hardening.
- [ ] Add chain timestamp-order verification (D-3) with explicit failure taxonomy distinct from hash/signature integrity failures.
  Source: ADR 0069 D-3 + implementation plan + premise review.
- [ ] Define leap-second handling contract (D-4): at minimum reject `23:59:60` on wire; clarify whether UTC-SLS is mandatory runtime behavior or implementation guidance.
  Source: ADR 0069 D-4 + alternatives + premise review.
- [ ] Add optional `clock_source`/attestation contract (D-5) with applicability matrix for rights-impacting clocks (when optional vs required by profile/policy).
  Source: ADR 0069 D-5 + Open Question #1 + premise review.
- [ ] Enforce explicit timezone context for FEL `today()`/`now()` (D-6), with staged migration path (lint/warn -> policy gate -> hard fail).
  Source: ADR 0069 D-6 + implementation plan + premise review.
- [ ] Align WOS runtime/time APIs and Formspec FEL evaluation context so timezone selection composes cleanly with WOS jurisdiction/business-calendar rules.
  Source: ADR 0069 D-6 + WOS Kernel §7 linkage.

## Time Semantics Testing and Conformance (ADR 0069)

- [ ] Add cross-repo timestamp conformance fixtures for UTC-only wire format, precision acceptance/rejection, and canonicalization of trailing fractional zeros.
  Source: ADR 0069 D-1/D-2 + Open Question #3.
- [ ] Add verifier tests for D-3 timestamp ordering (accept non-decreasing, reject backwards) including edge cases where hash chain is valid but temporal order fails.
  Source: ADR 0069 D-3 + implementation plan.
- [ ] Add leap-second test vectors asserting selected D-4 policy (`23:59:60` rejected or normalized per final policy) and deterministic behavior at day boundaries.
  Source: ADR 0069 D-4 + implementation plan.
- [ ] Add FEL tests proving timezone-required semantics for `today()`/`now()` and deterministic multi-timezone replay.
  Source: ADR 0069 D-6 + consequences + implementation plan.
- [ ] Add migration/regression fixtures for existing second-precision timestamps to enforce explicit transition behavior.
  Source: ADR 0069 D-2 consequences + implementation planning.

## Lint, Validation, and Conformance (ADR 0070)

- [ ] Add lint rule `K-F-010`: workflows that can enter `stalled` MUST provide an operator-accessible recovery transition.
  Source: ADR 0070 implementation plan.
- [ ] Add schema/lint diagnostics for missing stalled-recovery paths and missing/invalid retry policy wiring.
  Source: ADR 0070 implementation plan (expanded validation scope).
- [ ] Add cross-repo fixture bundle coverage for:
  - append success,
  - retry then success with no duplicate commit,
  - budget exhaustion to `stalled`,
  - operator recovery from `stalled`,
  - governance rejection recorded without applying rejected effects.
  Source: ADR 0070 D-2/D-3/D-4/D-6 + shared fixture strategy.

## Open Questions / Uncertainties (Decision Queue)

- [ ] Tenant identifier format: human-meaningful kebab string vs UUID.
  Source: ADR 0068 Open Question #1.
- [ ] Cross-tenant actor identity format and proofing boundary.
  Source: ADR 0068 Open Question #2.
- [ ] Supersession bundle semantics: what rebinds vs what stays fixed.
  Source: ADR 0068 Open Question #3 + ADR 0066.
- [ ] Case ID uniqueness contract level (global practical uniqueness vs scoped uniqueness as normative rule).
  Source: ADR 0068 D-4 + ADR 0061.
- [ ] Confirm the ADR 0071 D-4/D-5 compatibility rubric is sufficient to avoid cross-ADR ambiguity (instead of treating 0068 vs 0071 as precedence conflict).
  Source: ADR 0068 + ADR 0071 + proposed rubric in hardening item below.
- [ ] ADR 0071 pin wire encoding choice: inline pin object vs registry URI reference.
  Source: ADR 0071 Open Question #1.
- [ ] ADR 0071 historical semantics distribution model: embedded libraries vs runtime registry lookup.
  Source: ADR 0071 Open Question #2.
- [ ] ADR 0071 supersession pin-mutation default when ADR 0066 opens a new chain (inherit vs fresh vs explicit choice).
  Source: ADR 0071 Open Question #3 + ADR 0066.
- [ ] ADR 0071 conformance-class downgrade policy (case pin narrower than runtime capability).
  Source: ADR 0071 Open Question #4.
- [ ] Commit-boundary precedence: does ADR 0070 redefine stack-level commit semantics over prior WOS durability language, or must ADR text be amended for explicit compatibility?
  Source: ADR 0070 D-1 + WOS `DurableRuntime` posture.
- [ ] Formspec reject telemetry policy: should invalid submissions produce no stack record, or a constrained non-decision operational fact?
  Source: ADR 0070 D-2 (proposed clarification).
- [ ] `stalled` modeling boundary: kernel lifecycle state vs runtime-health metadata with explicit operator action.
  Source: ADR 0070 D-4 + premise review.
- [ ] `CommitAttemptFailure` observability lag acceptance: is delayed anchoring acceptable, or is an independently durable failure journal required?
  Source: ADR 0070 D-6 + premise review.
- [ ] Runtime compensation compatibility path: remove/retire current compensation constructs, or keep them with tightly scoped semantics that do not conflict with ADR 0070 D-5.
  Source: ADR 0070 + ADR 0066 + current WOS model/schema.
- [ ] ADR 0066 rescission semantics: resolve contradiction between D-3 terminality rule (no amendment-after-rescission) and Open Question #1 recommendation (rescission-of-rescission treated as amendment).
  Source: ADR 0066 D-3 + Open Question #1 (premise review).
- [ ] ADR 0066 phase strategy: resolve wording conflict between "defer supersession post-1.0 rejected" and implementation plan that activates supersession runtime in Phase 4.
  Source: ADR 0066 alternatives + D-1/implementation plan (premise review).
- [ ] ADR 0066 auditability posture: decide whether rejected amendment/correction/rescission attempts are intentionally unrecorded or should produce constrained denial records for due-process traceability.
  Source: ADR 0066 D-5 + premise review.
- [ ] ADR 0066 ownership boundary: clarify where canonical `reason` and `authorization` live per mode so respondent-ledger and governance records cannot diverge.
  Source: ADR 0066 D-1/D-2 + premise review.
- [ ] ADR 0072 attachment profile contract: decide metadata disclosure policy (`filename`/`media_type`/`slot_path`/`byte_length`), plaintext re-hash requirement tier (`SHOULD` vs profile `MUST`), and slot identity stability (`slot_path` vs stable slot id + migration mapping).
  Source: ADR 0072 Open Question #2 + D-1 + D-6 + premise review.
- [ ] ADR 0072 WOS optional evidence origination: defer indefinitely or schedule a profile/phase trigger for implementation.
  Source: ADR 0072 D-4 + implementation status.
- [ ] ADR 0073 anonymous public intake default posture and gating policy (pending-case allowed vs identity-first).
  Source: ADR 0073 Open Question #1.
- [x] ADR 0073 mode vocabulary boundary is currently closed at `workflowInitiated`/`publicIntake`; reopen only if shared-fixture evidence demonstrates a third mode requirement.
  Source: ADR 0073 Open Question #2 + current schema contract.
- [ ] ADR 0073 closure criteria execution: land the shared fixture bundles + verifier + CI evidence already defined in `thoughts/specs/2026-04-24-shared-cross-seam-fixture-bundle-design.md`.
  Source: ADR 0073 implementation status + shared fixture bundle design.
- [ ] ADR 0073 policy-floor uncertainty: which acceptance checks are mandatory across deployments (vs profile-specific) so `publicIntake` portability does not drift.
  Source: ADR 0073 D-7 + premise review.
- [ ] ADR 0069 precision-scope uncertainty: whether ms-minimum rejection applies to all wire timestamps or only ordering-sensitive/clock-bearing fields.
  Source: ADR 0069 D-2 rationale + premise review.
- [ ] ADR 0069 leap-second uncertainty: should UTC-SLS be normative and verifiable, or should the normative contract be lexical rejection + parser-safe normalization only.
  Source: ADR 0069 D-4 + premise review.
- [ ] ADR 0069 failure-taxonomy uncertainty: should D-3 timestamp-order violations be classified as integrity failures or temporal-consistency policy failures.
  Source: ADR 0069 D-3 + premise review.
- [ ] ADR 0069 FEL rollout uncertainty: strict immediate D-6 enforcement vs phased migration for existing expressions lacking timezone context.
  Source: ADR 0069 D-6 + consequences + premise review.
- [ ] ADR 0069 attestation posture uncertainty: optional-by-default forever, or mandatory for defined assurance classes/rights-impacting clocks.
  Source: ADR 0069 D-5 + Open Question #1 + premise review.

## Proposed ADR/Spec Hardening (from Reviews)

- [ ] Add a normative compatibility rubric for ADR 0071 D-4 vs D-5 classification ("compatible migration" vs "breaking semantics requiring ADR 0066 supersession"), including decision authority and required evidence.
  Source: ADR 0071 D-4/D-5 + ADR 0066 (premise review).
- [ ] ADR 0066: publish a mode-to-layer contract table that fixes canonical record ownership per mode (`reason`, `authorization`, and hash reference locus) and distinguishes respondent-visible acts from governance-only acts.
  Source: ADR 0066 D-1/D-2 + premise review hardening.
- [ ] ADR 0066: tighten verifier-boundary wording so Trellis correction-preservation obligations are explicitly reporting/projection semantics and do not imply Formspec-layer mutation authority.
  Source: ADR 0066 D-3 + premise review hardening.
- [ ] ADR 0066: add explicit phase-closure criteria (Phase 1 vs Phase 4) with fixture and verifier evidence requirements before status advancement.
  Source: ADR 0066 implementation plan + Trellis/WOS TODO execution posture.
- [ ] Define semantics-library lifecycle policy (availability horizon, signing/provenance, and security deprecation handling) so "historical semantics required" is operationally implementable.
  Source: ADR 0071 D-2/D-3 (premise review).
- [ ] Expand determinism contract beyond version strings by identifying and pinning or sealing non-version inputs that can alter replay outcomes (policy packs, reference data, locale/ruleset inputs, feature flags).
  Source: ADR 0071 replay guarantee premise (proposed hardening).
- [ ] Publish a per-dimension transition matrix for `MigrationPinChanged` (allowed/forbidden upgrades, downgrade/rollback semantics, and required authorizations).
  Source: ADR 0071 D-4 + Open Questions (proposed hardening).
- [ ] ADR 0072: publish a single attachment-profile taxonomy that binds confidentiality controls (manifest metadata redaction/retention), slot-reference stability rules (stable id + mapping), and verifier strictness tiers.
  Source: ADR 0072 premise review hardening + D-1 + D-6.
- [ ] ADR 0072: consider a minimal normalized removal reference contract to improve cross-origin audit tooling without centralizing origin lifecycle types.
  Source: ADR 0072 D-2 premise review hardening.
- [x] ADR 0073 closure checklist is now defined by the shared fixture-bundle design (`002` + `003` plus CI ratification); remaining work is execution, not checklist design.
  Source: ADR 0073 implementation status + `thoughts/specs/2026-04-24-shared-cross-seam-fixture-bundle-design.md`.
- [x] ADR 0073 contract-authority vs closure semantics are already documented; keep tracker focused on evidence execution.
  Source: ADR 0073 Context/Decision + implementation status.
- [ ] ADR 0069: add a timestamp profile taxonomy (ordering-sensitive, SLA/statutory, informational) and bind D-2 precision requirements to profile class rather than universal wire rejection.
  Source: ADR 0069 D-2 + premise review hardening.
- [ ] ADR 0069: clarify D-3 verifier failure class and reporting semantics so temporal-order violations do not ambiguously overlap with cryptographic integrity failures.
  Source: ADR 0069 D-3 + premise review hardening.
- [ ] ADR 0069: split D-4 into normative parser contract and optional runtime clock-discipline guidance unless a verifiable UTC-SLS attestation mechanism is adopted.
  Source: ADR 0069 D-4 + premise review hardening.
- [ ] ADR 0069: publish a D-6 migration plan (lint rule ID, deprecation phase dates, compatibility switch behavior) before hard-fail activation.
  Source: ADR 0069 D-6 + implementation plan + premise review hardening.
- [ ] ADR 0069: define clock-source attestation policy tiers (optional baseline, required for rights-impacting clocks, profile-level stricter requirements).
  Source: ADR 0069 D-5 + Open Question #1 + premise review hardening.

## WOS Architecture Granularity and AI-Native Positioning (ADR 0064)

### Remaining Execution Tasks

- [ ] Close handoff hygiene item §4.1 uniformly across all WOS schemas: permit vendor `x-` extensions via `patternProperties` where intended, enforce unknown-key rejection, and ensure rule coverage includes both extension-allow and reserved-namespace rejection paths.
  Source: ADR 0064 Consequences (inherits handoff §4) + `wos-spec/thoughts/archive/reviews/2026-04-16-architecture-review-handoff.md` §4.1.
- [ ] Land explicit Tier-1 extension rule registration parity (`K-EXT-001` equivalent) and fixtures so extension-seam behavior is not only implied by schema shape or Tier-2 comments (`K-EXT-002` exists; Tier-1 parity still missing).
  Source: handoff §4.1 + ADR 0064 D-1/D-3 loop reliability requirement.
- [ ] Complete handoff §4.2 truth-in-coverage work: rule-coverage-first reporting, CI rule→fixture enforcement, and promotion mechanics for load-bearing classification.
  Source: ADR 0064 Alternatives Considered #1 (revisit trigger depends on §4.2 metrics) + open-questions Q4 actions.
- [ ] Complete handoff §4.4 release-train + compatibility work (per-stream versioning, tag/Changesets posture, compat matrix, staleness checks) after §4.2 baseline is honest.
  Source: ADR 0064 Consequences + handoff §4.4 + open-questions Q3/Q5.
- [ ] Finish Claim-A enablement work referenced by ADR 0064 consequences: schema-doc quality, structured lint diagnostics, conformance trace pedagogy, synth/bench loop, and positioning artifacts.
  Source: ADR 0064 Consequences + handoff §5.1-§5.6 + open-questions Q1/Q2/Q6.
- [ ] Add explicit WOS workspace CI gate(s) so `wos-spec` lint/conformance/runtime checks are exercised in automated workflows, not only by local/manual runs (root workspace CI currently excludes `wos-spec`).
  Source: ADR 0064 D-1 methodology dependency (`spec -> schema -> lint -> conformance -> runtime`) + execution hardening.

### Open Questions / Uncertainty (Decision Queue)

- [ ] Decide whether ADR 0064 should remain historical-rationale-first or be upgraded to a stricter operational contract with explicit, measurable falsification criteria per decision (D-1 through D-4).
  Source: ADR 0064 Decision scope wording + premise review.
- [ ] Define explicit revisit evidence for D-2 (AI normative), D-3 (named sidecars), and D-4 (dual-companion split), analogous to D-1's existing metric-based revisit trigger.
  Source: ADR 0064 Alternatives Considered + handoff/open-questions follow-on.
- [ ] Decide whether schema-count references in ADR text are normative or illustrative; if illustrative, document count drift policy so future growth does not trigger false architectural disputes.
  Source: ADR 0064 Context/D-1 ("18 schemas") + premise review.
- [ ] Decide whether to treat companion-drift detection (`COMP-001` concept) as optional backlog or required governance control for maintaining D-4 over time.
  Source: ADR 0064 Alternatives Considered #3 + handoff §4.3.

### Proposed ADR/Spec Hardening (from Review)

- [ ] ADR 0064 edit: replace fixed-count phrasing ("18 schemas") with method-centric wording ("fine-grained, domain-scoped schema surfaces") while keeping historical count in context/examples only.
  Source: ADR 0064 D-1 premise hardening.
- [ ] ADR 0064 edit: add a compact "Revisit Rubric" subsection mapping each D-* decision to trigger evidence, decision owner, and expected artifact update path (ADR supersession vs plan/todo update).
  Source: ADR 0064 governance hardening.
- [ ] ADR 0064 edit: for D-3, explicitly state extension posture ("named first-class sidecars + typed extension path") to avoid a false binary with generic attachments while preserving semantic-contract intent.
  Source: ADR 0064 D-3 premise hardening.
- [ ] ADR 0064 edit: for D-4, make drift surveillance an affirmative requirement (or explicitly declare it optional) instead of only a deferred alternative mention.
  Source: ADR 0064 Alternatives Considered #3 + premise hardening.
- [ ] Add a closure checklist item for ADR 0064 in planning/todo trackers that defines "implemented enough" as evidence across docs, lint matrix, fixtures, and CI gates.
  Source: ADR 0064 Consequences + execution hardening.

## Statutory Clocks and Deadline Semantics (ADR 0067)

### Remaining Execution Tasks

#### Governance and Acceptance Gate

- [ ] Accept ADR 0067 (currently Proposed) and clear tracker gates that explicitly block implementation until acceptance.
  Source: ADR 0067 status + WOS/Trellis TODO gate notes.
- [ ] Resolve or explicitly ratify defaults for ADR 0067 open questions (granularity, post-hoc elapsed emission policy, multi-jurisdiction behavior) before implementation freeze.
  Source: ADR 0067 Open questions.

#### WOS Contract, Schema, and Runtime Wiring

- [ ] Add `ClockStarted` and `ClockResolved` as Facts-tier provenance kinds in WOS core (`ProvenanceKind`) with schema/export parity.
  Source: ADR 0067 implementation plan (WOS).
- [ ] Add/ratify `Clock` schema shape and event payload fields (`clock_kind`, `duration`, `calendar_ref`, `statute_reference`, `computed_deadline`, resolution fields, origin hash linkage), including `x-*` extension posture.
  Source: ADR 0067 D-1 + implementation plan.
- [ ] Wire required clock emissions in WOS transition paths:
  - AppealClock on adverse decision notice path,
  - ProcessingSLA on intake-accepted/intake-complete path,
  - GrantExpiry on award-issued path.
  Source: ADR 0067 D-2 + implementation plan (merged scope).
- [ ] Extend/align Task SLA authoring surface with the ADR 0067 clock contract where durations overlap.
  Source: ADR 0067 implementation plan + WOS TODO ADR-0067 item.
- [ ] Reopen and align WOS #51 statutory deadline chains against the now-explicit event-pair contract and calendar semantics.
  Source: ADR 0067 related note + WOS TODO #51 linkage.

#### Formspec / Respondent Ledger Integration

- [ ] Implement StatuteClock origination on respondent-triggered acts via the existing Respondent Ledger emit path, including required statute reference URI.
  Source: ADR 0067 D-2 + implementation plan (Formspec).
- [ ] Confirm/document ledger observation semantics so clock records remain ordinary entries without introducing a new authoring surface.
  Source: ADR 0067 D-2 + implementation plan (Formspec).

#### Trellis Export and Verifier

- [ ] Add `open-clocks.json` to export-bundle spec and exporter output.
  Source: ADR 0067 D-3 + Trellis TODO #18.
- [ ] Extend verifier with expired-unresolved clock diagnostics (`computed_deadline < sealed_at` and no matching resolve), preserving integrity-vs-advisory separation unless policy changes.
  Source: ADR 0067 D-3 + Trellis TODO #18.
- [ ] Implement pause/resume segment composition in verifier logic (`paused` resolve + resumed start with residual duration).
  Source: ADR 0067 D-4.
- [ ] Land Trellis vectors:
  - `append/014-clock-started`,
  - `append/015-clock-satisfied`,
  - `append/016-clock-elapsed`,
  - `append/017-clock-paused-resumed`.
  Source: ADR 0067 implementation plan + Trellis TODO #18.

#### Cross-ADR / Stack Integration and Conformance

- [ ] Integrate ADR 0067 semantics into ADR 0066 amendment policy composition (`may this still be amended?` depends on statute clock state).
  Source: ADR 0067 D-5 + ADR 0066 D-5 relationship.
- [ ] Add shared stack fixture coverage for statutory clock composition (`006-statutory-clock-fires`) once ADR execution lands in WOS/Trellis/Formspec.
  Source: shared fixture design doc + ADR 0067 execution dependency.
- [ ] Update stack-level status/docs/TODOs after landing so 0067 moves from open-contract prose to implementation-backed claim.
  Source: STACK.md open-contract posture + root/WOS/Trellis TODO tracking hygiene.

### Open Questions / Uncertainty (Decision Queue)

- [ ] Timestamp granularity for clock envelope fields: keep ADR 0067 default framing or align strictly with ADR 0069 precision posture for SLA-sensitive clocks.
  Source: ADR 0067 Open Question #1 + ADR 0069 linkage.
- [ ] Post-hoc elapsed closure policy: auto-emit synthetic `ClockResolved(elapsed)` at next authoritative touch vs allow permanently open clocks with verifier advisory only.
  Source: ADR 0067 Open Question #2.
- [ ] Multi-jurisdiction same-trigger behavior: always emit parallel clocks vs require single governing-jurisdiction choice at case open.
  Source: ADR 0067 Open Question #3.
- [ ] Dual-origin StatuteClock conflict handling: define deterministic de-dup/arbitration when Formspec and WOS can both observe the triggering act.
  Source: ADR 0067 D-2 (implementation uncertainty from premise review).
- [ ] Verifier severity posture for expired-unresolved clocks: advisory-only globally vs profile/policy-controlled escalation.
  Source: ADR 0067 D-3 + premise review uncertainty.

### Proposed ADR/Spec Hardening (from Review)

- [ ] ADR 0067 edit: separate the core contract ("deadline semantics are center, timers are adapters") from strict implementation policy choices; keep policy defaults explicit but clearly profile-adjustable where needed.
  Source: ADR 0067 premise review.
- [ ] ADR 0067 edit: add explicit ownership/arbitration rule for dual-origin StatuteClock emission so one legal trigger cannot create ambiguous parallel authorities by accident.
  Source: ADR 0067 D-2 hardening.
- [ ] ADR 0067 edit: define residual-duration calculation and rounding/canonicalization rules for pause/resume segments so replay and verification remain deterministic.
  Source: ADR 0067 D-4 hardening.
- [ ] ADR 0067 edit: document mandatory governance reaction expectations for expired-unresolved advisories (even if verifier class remains non-integrity) to preserve rights-impact posture.
  Source: ADR 0067 D-3 hardening.
- [ ] ADR 0067 edit: add explicit v1 taxonomy boundaries/non-goals for the four clock kinds plus extension criteria for `x-*` kinds.
  Source: ADR 0067 Decision section hardening.

## Kernel Restructure: Single Branch (ADR 0076)

Single `kernel-restructure` branch sequencing the kernel chapter relocations, companion absorption, profile reclassification, provenance schema consolidation, and downstream-doc sweep. Foreach topology (ADR 0078) and output-commit pipeline (ADR 0074) land on the same branch.

### Chapter Relocations and Renumbering

- [ ] Relocate existing Kernel §11 (Contract Validation) → §6 (adjacent to Case State §5; contract validation governs case-data writes). Sweep cross-references in spec, schemas, lint rules, conformance fixtures, downstream documents.
  Source: ADR 0076 Phase 1 step 20.
- [ ] Relocate existing Kernel §12 (Separation Principles) → §2 (foundational meta-spec discipline; belongs early). Same cross-reference sweep.
  Source: ADR 0076 Phase 1 step 21.
- [ ] Move existing Kernel §13 (Conformance Fixtures) out of normative spec to `crates/wos-conformance/README.md` (or `meta/conformance-fixtures.md`). Conformance fixtures are tooling artifacts, not normative kernel prose.
  Source: ADR 0076 Phase 1 step 22.
- [ ] New Kernel §11 Runtime Serialization (was Runtime Companion §3 — CaseInstance serialization).
  Source: ADR 0076 Phase 1 step 7.
- [ ] New Kernel §12 Evaluation Modes (was Runtime Companion §10 — evaluation modes including 100-cycle convergence cap; observable-outcome runtime state, top-level chapter not §4 subsection).
  Source: ADR 0076 Phase 1 step 14.
- [ ] New Kernel §13 Formspec Coprocessor (was Runtime Companion §15 — 15-step Formspec coprocessor protocol; ADR 0073 already pins Formspec at the `contractHook` seam).
  Source: ADR 0076 Phase 1 step 19.

### Lifecycle Detail Companion Absorption

- [ ] Lifecycle Detail §2 (transition evaluation pseudocode) → Kernel §4.6/§4.7 as normative algorithm.
  Source: ADR 0076 Phase 1 step 1.
- [ ] Lifecycle Detail §3 (history states, shallow + deep) → Kernel §4.14.
  Source: ADR 0076 Phase 1 step 2.
- [ ] Lifecycle Detail §4 (advanced parallel execution: region activation, event routing, join semantics per `cancellationPolicy`, region cancellation, nested parallelism) → Kernel §4.8.
  Source: ADR 0076 Phase 1 step 3.
- [ ] Lifecycle Detail §5 (compensation algorithm: pivot step, reverse ordering, forward vs backward recovery) → Kernel §9.5.
  Source: ADR 0076 Phase 1 step 4.
- [ ] Lifecycle Detail §6 (timer lifecycle: reset-on-reentry, parallel-region scoping) → Kernel §9.7.
  Source: ADR 0076 Phase 1 step 5.
- [ ] Lifecycle Detail §7 (informative SCXML interoperability mapping) → `specs/kernel/appendix-scxml-mapping.md` (informative).
  Source: ADR 0076 Phase 1 step 6.

### Runtime Companion Absorption

- [ ] Runtime §4 (event delivery contract) → Kernel §4.2/§4.9 expansion.
  Source: ADR 0076 Phase 1 step 8.
- [ ] Runtime §5 (action execution model, including §5.4 service invocation execution semantics) → Kernel §9.2 expansion. Resolves the schema-target reference in ADR 0074 D-3 service-response row.
  Source: ADR 0076 Phase 1 step 9 + ADR 0074 D-3.
- [ ] Runtime §6 (durability guarantees G1–G5) → Kernel §9.1 expansion.
  Source: ADR 0076 Phase 1 step 10.
- [ ] Runtime §7 (timer precision) → Kernel §9.7 expansion (alongside Lifecycle Detail §6).
  Source: ADR 0076 Phase 1 step 11.
- [ ] Runtime §8 split:
  - §8.2 scoping → Kernel §4.12.
  - §8.3 deontic enforcement ordering → AI Integration §4.
  - §8.4 delegation verification → Governance §11.4.
  - §8.5 hold management → Governance §12.
  Source: ADR 0076 Phase 1 step 12.
- [ ] Runtime §9 (explanation assembly) → Governance §3 (due process, where adverse-decision originates).
  Source: ADR 0076 Phase 1 step 13.
- [ ] Runtime §11 (multi-version coexistence) → Kernel §9.6 expansion.
  Source: ADR 0076 Phase 1 step 15.
- [ ] Runtime §12 (host interfaces — nine traits like `InstanceStore`, `EventQueue`, `TaskPresenter`) → `specs/kernel/appendix-host-interfaces.md` (non-normative, adapter-facing).
  Source: ADR 0076 Phase 1 step 16.
- [ ] Runtime §13 (security model, engine-isolation) → `specs/kernel/appendix-security.md` (non-normative).
  Source: ADR 0076 Phase 1 step 17.
- [ ] Runtime §14 → Kernel §5.5 expansion of relationship-metadata model and triggered-event routing semantics. Cascade-depth cap (`maxRelationshipEventDepth` default 3) already lives in Kernel §4.10; that portion does not move.
  Source: ADR 0076 Phase 1 step 18.

### Companion and Profile Directory Cleanup

- [ ] Delete `specs/companions/` and `schemas/companions/`. Move `wos-case-instance` schema under `schemas/kernel/`.
  Source: ADR 0076 Phase 1 step 24.
- [ ] Delete `specs/profiles/integration.md` and `schemas/profiles/wos-integration-profile.schema.json` (after Integration Profile split lands).
  Source: ADR 0076 Phase 2 step 6.

### Profile Reclassification: Integration Split

- [ ] Integration Profile normative patterns → Kernel §9.2 (`invokeService` binding surface): §3 binding types, §3.3 common properties, §3.3.1 outputBinding JSONPath subset (incl. lint rule I-001), §3.4/§3.5/§3.6 structural shape, §3.8 retry policy, §4 contract validation, §7 idempotency, §9 execution ordering.
  Source: ADR 0076 Phase 2 step 1.
- [ ] Integration §5 (CloudEvents extension attributes — `wosinstanceid`, `wosdefid`, `wosdefversion`, `wosstate`, `wostaskid`, `woscorrelationkey`, `woscausationeventid`) + §6 (correlation rules referencing those attributes) → Kernel §9.2 as normative. Both must live in the same normative document.
  Source: ADR 0076 Phase 2 step 2.
- [ ] CloudEvents envelope encoding per CloudEvents v1.0.2 → `docs/adapters/cloudevents.md` (non-normative implementation reference).
  Source: ADR 0076 Phase 2 step 2.
- [ ] Integration §8.4 (deny-overrides-permit deontic-override rule: external policy engines are more restrictive, never more permissive) → AI Integration §4 (Deontic Constraints) as normative.
  Source: ADR 0076 Phase 2 step 3.
- [ ] Integration §8.1–§8.3, §8.5 (XACML / OPA / Cedar vendor specifics) → `docs/adapters/policy-engine-bridge.md` (non-normative).
  Source: ADR 0076 Phase 2 step 4.
- [ ] Integration §3.5 (Arazzo sequence), §3.6 (CWL-informed tool) → `docs/adapters/arazzo.md`, `docs/adapters/cwl-tools.md` (non-normative).
  Source: ADR 0076 Phase 2 step 5.
- [ ] Add open binding-type extension point on Kernel §9.2 (`binding.type` closed enum with `x-` prefix for extensions) so adapter documents register binding types via `x-` without requiring a profile document.
  Source: ADR 0076 Phase 2 step 7.

### Profile Reclassification: Semantic + Signature Renames

- [ ] Move `specs/profiles/semantic.md` → `specs/sidecars/ontology-alignment.md`. Rename document marker `$wosSemanticProfile` → `$wosOntologyAlignment`. Rename schema `schemas/profiles/wos-semantic-profile.schema.json` → `schemas/sidecars/wos-ontology-alignment.schema.json`. Narrow scope explicitly to ontology alignment (JSON-LD `@context`, SHACL shape library, PROV-O export, XES/OCEL export); remove framing suggesting it owns transition-tag vocabulary. Update Kernel §4.12 to state transition-tag vocabulary is kernel-owned.
  Source: ADR 0076 Phase 2 step 8.
- [ ] Move `specs/profiles/signature.md` → `specs/sidecars/signature.md`. Rename document marker `$wosSignatureProfile` → `$wosSignature`. Rename schema. Conformance suite command: `cargo test -p wos-conformance --test signature` (drop `_profile` suffix). Content unchanged.
  Source: ADR 0076 Phase 2 step 9.

### Provenance Schema Consolidation

- [ ] Merge `schemas/kernel/wos-provenance-record.schema.json` (`FactsTierRecord`, `MutationSource`, `VerificationLevel`) into `schemas/kernel/wos-kernel.schema.json`. Delete `wos-provenance-record.schema.json`. Update all `$ref` pointers. Resolves the schema-target confusion that drove ADR 0074's earlier errors.
  Source: ADR 0076 D-8 + Phase 1 step 23 + ADR 0074 D-4.
- [ ] Higher-tier provenance records (Reasoning, Counterfactual, Narrative tiers) attach via `provenanceLayer` seam (Kernel §10.3) and live in their respective layer schemas — Reasoning in `schemas/governance/`, Counterfactual in `schemas/ai/`, Narrative in `schemas/advanced/`. Tier ownership matches sidecar ownership.
  Source: ADR 0076 D-8.

### Downstream Documentation Sweep (Same Branch)

- [ ] `wos-spec/specs/kernel/spec.md` abstract: replace "five named extension seams" with "six." Resolves the ADR 0077 D-5 #4 deferred edit.
  Source: ADR 0076 Phase 3 step 1 + ADR 0077 D-5 #4.
- [ ] `wos-spec/schemas/kernel/wos-kernel.schema.json` `description` field (line 5): same "five → six" fix.
  Source: ADR 0076 Phase 3 step 2 + ADR 0077 D-5 #4.
- [ ] `wos-spec/CLAUDE.md` Layer structure section: drop "Cross-cutting profiles" and "Companions" lines. Replace with the unified tiered-sidecar list (D-7). Update references to specific Companion or Profile artifacts.
  Source: ADR 0076 Phase 3 step 3.
- [ ] `wos-spec/README.md` "Specification inventory" table: restructure around one axis (Kernel + tiered sidecars). Retire "Profile" and "Companion" rows. Add new rows for split Integration adapter documents. Update all `specs/companions/...` and `specs/profiles/...` paths.
  Source: ADR 0076 Phase 3 step 4.
- [ ] `wos-spec/README.md` "How the layers work" section: drop "Cross-cutting profiles" and "Companions" subsections. Ontology Alignment and Signature become tiered sidecars alongside Governance/AI/Advanced.
  Source: ADR 0076 Phase 3 step 5.
- [ ] `wos-spec/README.md` "What to adopt" table: layer→spec mapping updated for new paths.
  Source: ADR 0076 Phase 3 step 6.
- [ ] `wos-spec/RELEASE-STREAMS.md` stream→path mapping: any `specs/companions/*` or `specs/profiles/*` entries move to new homes.
  Source: ADR 0076 Phase 3 step 7.
- [ ] `wos-spec/COMPATIBILITY-MATRIX.md`: same path-reference updates.
  Source: ADR 0076 Phase 3 step 8.
- [ ] `wos-spec/LINT-MATRIX.md`: lint rule I-001 (outputBinding JSONPath subset) reanchored to Kernel §9.2.X. Conformance class **Kernel Complete** (FEL semantic interpretation required for JSONPath subset enforcement). Category prefix stays `I-` for fixture continuity.
  Source: ADR 0076 Phase 3 step 9.
- [ ] `wos-spec/counter-proposal-disposition.md`: §Artifact taxonomy section becomes a one-line pointer to ADR 0076. §Seam vocabulary drift section becomes a one-line pointer to ADR 0077. Both prior sections deleted.
  Source: ADR 0076 Phase 3 step 10.
- [ ] Conformance fixtures referencing `$wosRuntimeCompanion`, `$wosLifecycleDetail`, `$wosIntegrationProfile`, `$wosSemanticProfile` update to new markers or drop marker where content folded into kernel.
  Source: ADR 0076 Phase 3 step 11.

## Output-Commit Pipeline (ADR 0074)

Five external-work surfaces become instances of one governed pipeline (validate → gate → project → record). Pipeline lands as part of the `kernel-restructure` branch (ADR 0076).

### Kernel Prose and Reserved Literals

- [ ] Per-surface defaults table in Kernel §5.4 normative prose. Cite `mutationSource` and `verificationLevel` as already-OPTIONAL fields on `FactsTierRecord` (`wos-provenance-record.schema.json`, merging into `wos-kernel.schema.json` per ADR 0076 D-8). Restate open-enum semantics (`oneOf [reserved literals | x- pattern]`). Point at AI Integration §3.3, Kernel §9.2 (with cross-reference to Runtime §5.4 until §5.4 absorbs into kernel), Kernel §9.4 + §9.7, Runtime §15 (→ Kernel §13 after restructure), Kernel §4.4 for per-surface defaults. No schema field is added.
  Source: ADR 0074 D-4 #1 + Implementation plan.
- [ ] Reserve `recordKind` literals `capabilityQuarantined` (capability invocation held for authorized-actor reset after non-retryable validation failure) and `capabilityOutputInvalidated` (previously-committed capability output superseded by later evidence) in Kernel §5.4 / §8 prose. Reservation is normative-prose (no enum constraint on the open `recordKind` discriminator).
  Source: ADR 0074 D-4 #2 + Implementation plan.
- [ ] Kernel §10 seam prose update: `contractHook`, `provenanceLayer`, `lifecycleHook` together carry the output-commit pipeline; no new seam declared. Reference ADR 0077.
  Source: ADR 0074 Implementation plan.

### Per-Surface Binding Landings

- [ ] `outputBindings` + `inputBindings` on `CapabilityDeclaration` (AI Integration §3.3). Default `mutationSource: agent-extracted`.
  Source: ADR 0074 D-3.
- [ ] `eventContract` + `retryPolicy` on `invokeService` (Kernel §9.2 declaration; Runtime §5.4 execution → Kernel §9.2 under ADR 0076). Default `mutationSource: system-fetched`.
  Source: ADR 0074 D-3 + ADR 0076 Phase 1 step 9.
- [ ] `eventContract` + `eventOutputBindings` on signal/message wait substates routed by `correlationKey` (Kernel §9.4) with `signalTimeout` (Kernel §9.7). Default `mutationSource: system-fetched`.
  Source: ADR 0074 D-3.
- [ ] `taskActions` on Runtime Companion §15 Formspec coprocessor surface (→ Kernel §13 after restructure). Generalizes `responseMappingRef` to non-Formspec respondent inputs. Default `mutationSource: human-entered` (or `human-corrected` on overrides).
  Source: ADR 0074 D-3.
- [ ] `mergeStrategy` + `collectPath` on parallel-state join (Kernel §4.4). Default `mutationSource: computed`.
  Source: ADR 0074 D-3.
- [ ] Processor semantics for `capabilityQuarantined` and `capabilityOutputInvalidated` under AI Integration §8: MUST NOT auto-retry; resume requires authorized-actor reset (provenance-recorded).
  Source: ADR 0074 Implementation plan.

### Lint Rules

- [ ] Write-scope-violation rule per surface: `outputBindings` target paths MUST fall within capability's registered write scope; `taskActions` fields MUST fall within task's editable surface; event/service bindings MUST fall within declared projection scope; parallel `collectPath` MUST fall within parallel region's declared merge scope. Out-of-scope writes fail at authoring time (lint) and at runtime (processor rejection).
  Source: ADR 0074 Implementation plan.
- [ ] `mutationSource` default rule per surface: lint warns when a surface emits a `mutationSource` outside the D-3 default set without a `rationaleRef` (e.g. a capability emitting `human-corrected` requires explicit rationale).
  Source: ADR 0074 Implementation plan.
- [ ] `verificationLevel` rule on rights-impacting transitions: governance profile lint MAY require minimum `verificationLevel` on mutations from `determination`-tagged transitions when `impactLevel` is `rightsImpacting`.
  Source: ADR 0074 Implementation plan.

### Runtime Conformance

- [ ] Single `commit_external_output` function in `wos-runtime` + `wos-formspec-binding` taking the six pipeline inputs and returning validated mutations + Facts-tier provenance records. Replaces five per-surface commit implementations.
  Source: ADR 0074 Implementation plan.
- [ ] Conformance fixtures: at least one positive + one negative per surface. Negative fixtures prove write-scope gate rejects out-of-scope projection.
  Source: ADR 0074 Implementation plan.
- [ ] Conformance fixtures: at least one per `mutationSource` reserved literal proving round-trip through Facts-tier mutation record + at least one for `x-vendor-*` extension value round-trip.
  Source: ADR 0074 Implementation plan.
- [ ] Three-way agreement: spec + in-memory reference adapter + production adapter (Restate) MUST all pass the same fixture set.
  Source: ADR 0074 Implementation plan.

## Foreach Topology (ADR 0078)

Adds `foreach` as a fifth state topology kind (atomic, compound, parallel, foreach, final — final remains terminal, not composite). Lands on the `kernel-restructure` branch (ADR 0076). Per-iteration writes route through ADR 0074's pipeline.

### Schema Additions

- [ ] Extend `$defs/State.type` enum in `wos-kernel.schema.json` to include `foreach`.
  Source: ADR 0078 D-1 + Implementation plan step 5.
- [ ] Add sixth conditional `allOf` block requiring `collection` and `body` when `type === "foreach"`; forbid `initialState`, `states`, `regions`, `cancellationPolicy`, `historyState` on foreach states.
  Source: ADR 0078 D-1 + Implementation plan step 5.
- [ ] Add foreach-specific State properties: `collection` (FEL string, REQUIRED), `itemVariable` (default `$item`), `indexVariable` (default `$index`), `concurrency` (integer or null, default null), `breakCondition` (FEL string, OPTIONAL), `outputPath` (REQUIRED when `mergeStrategy` set), `mergeStrategy` (`shallow` / `deep` / `collect`, OPTIONAL), `body` (State, REQUIRED).
  Source: ADR 0078 D-1.
- [ ] `x-lm.critical` annotations on `collection` and `body` properties.
  Source: ADR 0078 Implementation plan step 5.
- [ ] Reserve `iterationStarted`, `iterationCompleted`, `iterationFailed`, `iterationSkipped` literals on `recordKind` discriminator (consistent with ADR 0074 reservation pattern: normative prose, no enum extension on open discriminator).
  Source: ADR 0078 D-3 + Implementation plan step 6.

### Spec Prose

- [ ] Kernel §4.3: extend topology kinds enumeration to five. Add foreach subsection covering iteration loop, `collection` evaluated once at state entry, `itemVariable` / `indexVariable` defaults, `concurrency` semantics (null = sequential; positive integer = max parallel), `breakCondition` evaluation order. Clarify final remains terminal; count goes from "four kinds" to "five kinds" with foreach joining the composite set.
  Source: ADR 0078 Implementation plan step 1.
- [ ] Kernel §4.7 transition execution sequence: no change. Iteration body transitions follow existing four-step sequence per iteration.
  Source: ADR 0078 Implementation plan step 2.
- [ ] Kernel §4.8 fork/join: cross-reference noting foreach uses `mergeStrategy` for output aggregation, distinct from parallel-state region join (which uses synthetic `$join` event).
  Source: ADR 0078 Implementation plan step 3.
- [ ] Kernel §5.4 mutation history: no change (per-iteration writes use existing `mutationSource: computed` literal).
  Source: ADR 0078 Implementation plan step 4.
- [ ] Define iteration-record-kind shape constraints in Kernel §8 prose alongside existing kernel record kinds. `iterationStarted` / `iterationCompleted` MUST be paired per iteration; emitting start without completion is a processor invariant violation.
  Source: ADR 0078 D-3 + Implementation plan step 6.

### Lint Rules

- [ ] L-foreach-001: `foreach.collection` MUST evaluate to a statically-analyzable bounded array. Unbounded or unanalyzable expressions fail. Conformance class: **Kernel Complete** (FEL semantic interpretation required).
  Source: ADR 0078 D-7.
- [ ] L-foreach-002: `outputPath` set requires `mergeStrategy` set. Conformance class: **Kernel Structural** (schema-checkable conditional).
  Source: ADR 0078 D-7.
- [ ] L-foreach-003: iteration body writes MUST fall within `outputPath` scope plus governance-permitted paths. Conformance class: **Kernel Complete** (binding-target analysis). Consistent with ADR 0074 §D-1.4 write-scope rule.
  Source: ADR 0078 D-7.
- [ ] L-foreach-004: `concurrency` MUST be `null` or positive integer. Conformance class: **Kernel Structural**.
  Source: ADR 0078 D-7.

### Conformance Fixtures

- [ ] Sequential foreach over static array (`concurrency: null`).
  Source: ADR 0078 D-8.
- [ ] Parallel foreach with `concurrency: 3` cap.
  Source: ADR 0078 D-8.
- [ ] `breakCondition` early termination — verifies `iterationSkipped` provenance for unrun iterations.
  Source: ADR 0078 D-8.
- [ ] Empty collection — verifies zero iterations and aggregation produces empty result under each `mergeStrategy`.
  Source: ADR 0078 D-8.
- [ ] Per-iteration provenance emission — verifies `iterationStarted` / `iterationCompleted` pairing and `iterationFailed` on inner-body error final state.
  Source: ADR 0078 D-8.
- [ ] foreach inside compound state — verifies nested topology composes.
  Source: ADR 0078 D-8.
- [ ] Aggregation under each `mergeStrategy` (`shallow`, `deep`, `collect`) — verifies the reused pipeline shape.
  Source: ADR 0078 D-8.
- [ ] At least one negative fixture per L-foreach-001..004 lint rule.
  Source: ADR 0078 Implementation plan step 8.
- [ ] Three-way agreement: in-memory adapter + production adapter (Restate) MUST both pass foreach fixture set.
  Source: ADR 0078 Implementation plan step 9.

## Rejection Register Downstream Cleanup (ADR 0075)

Pointer-only edits redirecting README, gap analysis, and disposition rejection content to ADR 0075's canonical register. Some items overlap with the ADR 0076 downstream-doc sweep but are listed separately here because the pre-restructure README/gap-analysis edits land independently of the artifact taxonomy work.

- [ ] `wos-spec/README.md` `why-not-extend-bpmn` and `why-json-native` sections: link to ADR 0075's register for the itemized list. Retain framing prose explaining the JSON-native / governance-semantics thesis.
  Source: ADR 0075 Implementation plan.
- [ ] `wos-spec/thoughts/2026-04-24-standards-absorption-gap-analysis.md` `Do Not Integrate` section: shorten to a pointer at ADR 0075. Retain absorption-plan sections (gaps worth integrating, refactor target, priority).
  Source: ADR 0075 Implementation plan.
- [ ] `wos-spec/counter-proposal-disposition.md` `Red flags` and `Rejects requiring explicit spec documentation` sections: shorten to ADR 0075 pointers (cite row numbers). REJECT-bucket rows in disposition tables retain one-line rationale + row citation.
  Source: ADR 0075 Implementation plan.
- [ ] Future CI lint candidate: any new spec doc citing "we rejected" content without pointer to ADR 0075 fails promotion gate. Implementation deferred until ADR 0075 accepted.
  Source: ADR 0075 Implementation plan.

## Seam Vocabulary Cleanup (ADR 0077)

Disposition row corrections + future lint rule. CLAUDE.md edit already landed in ADR 0077 D-5 #1.

- [ ] `wos-spec/counter-proposal-disposition.md` row E1 ("Custom node types"): attach the canonical name list to the "Kernel §10.1–§10.6" phrase. Drop the "Kernel intro prose may still say 'five'" caveat once ADR 0076's abstract fix lands.
  Source: ADR 0077 D-5 #2.
- [ ] `wos-spec/counter-proposal-disposition.md` row E9 ("Field type extensions"): rewrite "`caseFieldExtension` seam" reference as "kernel §10.6 `x-` extensions on case-file fields." Case-field extensibility is `x-` extensions inside `CaseFile` / `MutationRecord`, not a named §10 seam. Disposition E9's HELD bucket disposition stands on the behavior; only the seam name reference is wrong.
  Source: ADR 0077 D-3 + D-5 #2.
- [ ] `thoughts/2026-04-24-standards-absorption-gap-analysis.md` §Refactor Target: confirm `contractHook`, `provenanceLayer`, `lifecycleHook` citations remain correct when next revising the gap analysis. No edit required, only confirmation.
  Source: ADR 0077 D-5 #3.
- [ ] WOS-lint backlog candidate: reject any WOS specification prose or schema comment naming a seam identifier other than the canonical six (`actorExtension`, `contractHook`, `provenanceLayer`, `lifecycleHook`, `custodyHook`, `extensions`). Scope: `wos-spec/specs/**` markdown + `$comment` / `description` text in `wos-spec/schemas/**`.
  Source: ADR 0077 Lint rule candidate.

## Open Questions / Decision Queue (ADR 0074–0078)

### Output-Commit Pipeline (ADR 0074)

- [ ] **Coercion policy.** Pipeline-level normative coercion table (e.g. "string → number coerces under ISO-8601 number-string rules; otherwise fails") vs each surface declares its own coercion stance in the binding map. Default: per-surface. Revisit if Wave 4 surfaces need a shared coercion contract.
  Source: ADR 0074 Open Question #1.
- [ ] **`verificationLevel` requirement posture.** Governance-profile requirement (default) vs L1 MUST on `determination`-tagged transitions. Elevating to L1 MUST tightens rights-proportional claims but forces every kernel-only deployment to supply the value.
  Source: ADR 0074 Open Question #2.
- [ ] **Quarantine resume authorization.** AI Integration §8 concept (resume policy declared per capability — default) vs kernel concept (role-tagged actor MUST be referenced in resume provenance). Kernel reservation is currently neutral on who may reset, only on the fact that reset is provenance-recorded.
  Source: ADR 0074 Open Question #3.

### Rejection Register / Open Design Items (ADR 0075)

- [ ] **Boundary-event companion surface.** Authoring sugar that compiles to statechart transitions (interrupting timeout, non-interrupting notification, error handler, message handler, compensation trigger) is permitted; the companion document does not yet exist. Open question: lands as a Runtime Companion section vs separate authoring companion. Tracked in gap analysis refactor target.
  Source: ADR 0075 Open Question #1.
- [ ] **Governed discretionary work model.** Catalog shape, activation criteria, authorization actor, bounded read/write scope, provenance on create/assign/complete/cancel/override. Captures CMMN's "real caseworkers add work that wasn't pre-modeled" lesson without unconstrained planning-table mutation. Tracked in gap analysis priority list.
  Source: ADR 0075 Open Question #2.
- [ ] **Register maintenance threshold.** When does a new rejection earn an ADR amendment vs supersession? Threshold proposal: idea raised (or likely to be raised) by more than one contributor, crosses one of the twelve invariants, rationale non-obvious from invariant alone.
  Source: ADR 0075 Open Question #3.

## WOS Submodule Plans Audit (2026-04-24)

24-document audit of `wos-spec/thoughts/{plans,adr,specs}/` — 20 plans + 3 ADRs (0059, 0060, 0061) + 1 integration master (Phase 11). Per-document verdicts and full archive-move checklist live in `wos-spec/thoughts/audit-2026-04-24-wos-spec-thoughts-plans.md`. Open items rolled up below by topic.

### CI / Release Automation (WOS Submodule)

- [ ] Dedicated `wos-schema-regression` (or equivalent) GitHub Actions job with path filters for `pytest tests/schemas`. No workflow under `wos-spec/.github` today; parent-repo workflows do not exercise the WOS schema regression suite.
  Source: audit verdict 5 (`2026-04-17-wos-schema-regression-tests.md`).
- [ ] Optional rule-coverage workflow `.github/workflows/wos-coverage.yml` + `ratchet-check` binary. Registry graduation + coverage CLI + matrix regen landed; standalone CI step + mass LoadBearing-promotion seed remain partial.
  Source: audit verdict 13 (`2026-04-16-wos-rule-coverage-conformance.md`).
- [ ] Release trains Tasks 4–5: Changesets `fixed` groups, `scripts/wos-publish.mjs`, `.github/workflows/wos-release.yml`, README "Versioning" section. Tasks 1–3 (RELEASE-STREAMS.md, per-stream changelogs, COMPATIBILITY-MATRIX.md) landed.
  Source: audit verdict 14 (`2026-04-16-wos-release-trains.md`) + `wos-spec/TODO.md` §4.4.
- [ ] Synthesis benchmark: full `wos-bench` plan — crate, leaderboard doc, multi-problem fixture set. Single problem file today; tracked as lower-priority backlog in `wos-spec/TODO.md` §5.5.
  Source: audit verdict 9 (`2026-04-16-wos-synthesis-benchmark.md`).

### Conformance / Fixtures / Facts Tier (WOS Submodule)

- [ ] Promote `K-DET-001` (determination transitions require `caseFileSnapshot`) with evidence map + conformance fixtures. Schema + Rust + runtime + pytest landed; rule + fixture migration not found.
  Source: audit verdict 3 (`2026-04-18-wos-facts-tier-input-snapshot.md`).
- [ ] Migrate determination-bearing conformance fixtures to populate `caseFileSnapshot`. `TODO.md` claims `#24a` closed in narrative while plan still tracks K-DET-001 + fixture work — drift between completed narrative and conformance depth.
  Source: audit verdict 3 + cross-ref delta.

### Schema Documentation Quality (WOS Submodule)

- [ ] `SCHEMA-DOC-001` triage pass: offender list doc, per-tier description backfills, promotion past `draft` with linked fixtures. `schema_doc.rs` + draft rule landed; triage markdown / tier backfills / fixture-linked promotion open.
  Source: audit verdict 12 (`2026-04-16-wos-schema-description-audit.md`).

### Governance / Assurance Alignment (WOS Submodule)

- [ ] Governance schema upgrades: §2.9 schema, §4.9 quorum delegation, §7.15 legal hold prose + schema fields. Plan partially landed (Kernel `custodyHook` + Assurance spec/schema); governance extensions and legal-sufficiency cross-ref to Assurance §6 still missing.
  Source: audit verdict 17 (`2026-04-15-wos-custody-and-assurance.md`).
- [ ] Add legal-sufficiency cross-reference to Assurance §6 + Invariant 6 deduplication grep across governance prose.
  Source: audit verdict 17.
- [ ] Reconcile `WOS-FEATURE-MATRIX.md` rows showing ✅ for governance items without matching spec/schema artifacts. Matrix/spec drift must close before treating those capabilities as shippable claims.
  Source: audit verdict 17 + cross-ref delta + audit recommendation 2.

### Synth / MCP / Authoring Follow-ups (WOS Submodule)

- [ ] Empirical iteration counts via live Anthropic runs (Q-V0-1..4). Spike crate + retrospective + benchmark problem landed; live-API metrics still follow-up.
  Source: audit verdict 4 (`2026-04-17-wos-synth-v0-spike.md`).
- [ ] Production `ToolContext` wiring; retire `DirectToolContext` stopgap. Synth crate split + Task 7 schema landed; `DirectToolContext` documented as stopgap.
  Source: audit verdict 10 (`2026-04-16-wos-synth-crate.md`).
- [ ] Authoring crate helpers: nested-state setters, transition metadata setters, case-field / correspondence APIs per plan. ~27 helpers vs planned 28 with different names; nested-state and some transition-metadata helpers explicitly open.
  Source: audit verdict 7 (`2026-04-17-wos-authoring-crate.md`).
- [ ] Synth completion criterion 6 (10 NL workflows converging) blocked on `wos-synthesis-benchmark` plan. Keep cross-link explicit in `TODO.md` until `wos-bench` exists to avoid silent dependency chains.
  Source: audit verdict 10 + audit recommendation 4.

### Program Narrative — Tracked Obligations (ADR 0059)

- [ ] Phase 3 mapping: every WOS emission mappable to stable unified-ledger taxonomy event types. Strategic ADR-0059 narrative; Phase 1 WOS duties met, Phase 2/3 explicitly future-gated. Not a task checklist; tracked as obligation.
  Source: audit verdict 1 (`0059-unified-ledger-as-canonical-event-store.md`).

### Cross-Reference Taxonomy Continuation (ADR 0060)

- [ ] Future schema PRs SHOULD continue applying the `*Ref` / `*Key` / `*Id` taxonomy until no plain-string key remains under a `*Ref` suffix. WOS-T2 first-landed sweep (Workflow Governance) closed; future sweeps land per-PR.
  Source: audit verdict 22 (`adr/0060-cross-reference-naming-ref-key-id.md`).
- [ ] First remaining candidate: `schemas/kernel/wos-correspondence-metadata.schema.json` `templateRef` (lines 117, 175) — resolves to the metadata's own `id`, so this is intra-document `*Id`, not URI. Taxonomy violation.
  Source: audit verdict 22 + cross-ref delta.

### Phase 11 Master Follow-on Alignment

- [ ] Phase 11 master should reference (or be archived against) the public-intake handoff path that ADR 0073 introduced. The master treats `submitTaskResponse` as the only ingress; `crates/wos-formspec-binding/src/lib.rs:72` (`IntakeHandoff`) + `IntakeAcceptanceAdapter` implement the load-bearing public-intake handoff that has overtaken Phase 11's framing.
  Source: audit verdict 24 (`specs/2026-04-11-formspec-wos-phase11-integration-master.md`).
- [ ] Either retire the dead `P11-BL-050` rule id (no entry in lint registry — publication discipline honored implicitly) or land the rule.
  Source: audit verdict 24 §6.10 item 7.
- [ ] Consider deleting Phase 11 master §10 "Subagent / tooling note" — predates the parent CLAUDE.md formal skill registration; informative, not normative.
  Source: audit verdict 24.
- [ ] Fix Phase 11 master §6.10 reference to `thoughts/plans/2026-04-11-phase11-coprocessor-open-backlog.md` — points at the parent Formspec repo, not the WOS submodule. Cold readers grep the submodule and find nothing.
  Source: audit verdict 24.

### Stack-wide Identifier Seam (Optional, Unscheduled)

- [ ] Open a shared-stack TypeID utility ADR. WOS, Formspec Response IDs, and Trellis bundle artifacts could share one TypeID utility crate. Explicitly optional and unscheduled per ADR-0061 §4 item 9; decide after first-implementation landings reveal whether the shared utility is worth the coordination cost.
  Source: audit verdict 21 (`adr/0061-custody-hook-trellis-wire-format.md`).

### Frontmatter Housekeeping (WOS Submodule)

- [ ] Flip `wos-spec/thoughts/adr/0059-continuous-mode-post-mutation-rescan.md` `Status: Proposed` → `Accepted` (or `Implemented`). All five §6 tasks landed across `2d890d3`/`a683c03`/`bdf7063`/`f03ca40`; K-049 is the only `LoadBearing` rule per `LINT-MATRIX.md:148` and `crates/wos-lint/src/rules/registry.rs:1031-1046`.
  Source: audit verdict 23.
- [ ] Document ADR-0059 §4.2 back-compat shim divergence: the one-release `"$continuous"` no-op alias was skipped in greenfield-cleanup commit `f03ca40`; deviation lives only in `COMPLETED.md:319`. Add a one-line note to ADR-0059 before archive.
  Source: audit verdict 23.
- [ ] Reconcile ADR-0061 §3 Negative wording calling `serde_json_canonicalizer` "superseded" with §2.2 carve-out keeping it for §8.2.1 case-file snapshots (`crates/wos-core/src/provenance/snapshot.rs:22`). Clarifying edit before any amendment.
  Source: audit verdict 21.
- [ ] Flip `wos-spec/thoughts/specs/2026-04-11-formspec-wos-phase11-integration-master.md` `status: proposed` → `accepted` (or `landed`). Body already declares Landed/Resolved at `:51-53`; §7 publication checklist all `[x]`.
  Source: audit verdict 24.
- [ ] Optional: add a one-line "overtaken by ADR-0073 / ADR-0061" note to the Phase 11 master before archive.
  Source: audit verdict 24.
- [ ] Reconcile `COMPLETED.md` internal narrative: `:171, 199` describe ADR-0059 F3b as "drafted" / "READY TO EXECUTE" while `:316-319` documents actual landing. Internal supersession not surfaced.
  Source: audit cross-ref delta.

### Archive Cleanup (WOS Submodule, 13 candidates)

Full `git mv` blocks live in the audit doc. **Do not archive** `0059-unified-ledger-as-canonical-event-store.md` (living program narrative, not closed task list).

- [ ] Run `git mv` for the 9 FULLY RESOLVED plans (`2026-04-20-typed-event-meta-vocabulary`, `2026-04-17-wos-mcp-crate`, `2026-04-16-trace-emitting-conformance`, `2026-04-16-structured-lint-diagnostics`, `2026-04-16-provenance-record-schema-extension`, `2026-04-15-provenance-export`, `2026-04-14-spec-section-1-implementation`, `2026-04-13-runtime-crate`, `2026-04-10-core-extraction`) + 2 Accepted ADRs (0060, 0061) into `wos-spec/thoughts/archive/{plans,adr}/`. Ensure target directories exist.
  Source: audit archive-move checklist.
- [ ] Frontmatter-flip-then-archive (single commit each): `adr/0059-continuous-mode-post-mutation-rescan.md` and `specs/2026-04-11-formspec-wos-phase11-integration-master.md`. Move into `wos-spec/thoughts/archive/{adr,specs}/` after the status flip.
  Source: audit verdicts 23, 24 + recommendation 5.
- [ ] Checkbox hygiene pass: many landed plans still show `- [ ]` in source `.md`. Either archive after a final "mark complete" edit, or add a one-line banner "Execution record: see `COMPLETED.md` §…" to stop false "open plan" signals.
  Source: audit recommendation 1.
