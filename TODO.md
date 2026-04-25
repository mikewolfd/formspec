# Formspec — Consolidated TODO

Historical completion notes and resolved items moved to [`COMPLETED.md`](COMPLETED.md).

## Open

Scoring `[Imp / Cx / Debt]` per [`.claude/user_profile.md`](.claude/user_profile.md) economic model; number in parentheses is `Importance × Debt`. Dev/time free; architecture debt expensive. Cx is scheduling-only, never priority.

### Stack-wide

Items that cross more than one spec boundary. Home for work whose owner is the monorepo parent, not a single submodule. Stack-scoped ADRs land at [`thoughts/adr/`](thoughts/adr/).

## Load-Bearing (Delivery Blockers)

- **WOS-T4 cross-stack proof + signature-attestation / certificate-of-completion closeout** `[8 / 6 / 6]` (**48**)
  - **Role:** Canonical parent-owned tracker for remaining signature-workflow work across Formspec, WOS, Trellis, and Studio.
  - **Landed:** WOS Signature Profile semantics/runtime/lint/conformance and Trellis append/export/offline-verify byte proof (2026-04-22).
  - **Still open:** shared cross-repo fixture bundle end-to-end, Studio authoring/validation UX, and Trellis-owned human certificate-of-completion composition per [Trellis ADR 0007](trellis/thoughts/adr/0007-certificate-of-completion-composition.md).
  - **Completion slices:**
    - **Formspec:** `authoredSignatures` response fields, signed-response fixture, server revalidation preservation, WOS-facing mapping example, and explicit legal-intent caveat for drawn images.
    - **Trellis:** `append/019-wos-signature-affirmation`; `export/006-signature-affirmations-inline` (`062-signature-affirmations.cbor`, `trellis.export.signature-affirmations.v1`); negative verify/tamper vectors; catalog↔chain cross-check; core spec registration.
    - **Studio:** Signature Profile + linked signature-field authoring/validation UX, with fixture-backed sequential and parallel tests.
    - **Verification:** one shared bundle proving canonical response → WOS semantic evidence → Trellis custody/export artifacts.
  - **Execution home:** this parent item subsumes WOS T4 residue and Trellis WOS-T4 residue tracking.
  - **Gate:** none.

- **Shared cross-seam fixture suite** `[8 / 5 / 5]` (**40**)
  - **Role:** Full-stack proof bundle for canonical seams and composition claims.
  - **Why:** Without this, "portable case record verifiable offline" still depends on prose-only composition across submodules.
  - **Design landed:** [`thoughts/specs/2026-04-24-shared-cross-seam-fixture-bundle-design.md`](thoughts/specs/2026-04-24-shared-cross-seam-fixture-bundle-design.md) with `fixtures/stack-integration/`, manifest format, and runner contract.
  - **Phase-1 bundles:** `001` WOS-T4 signature-complete, `002` ADR 0073 public-create, `003` ADR 0073 workflow-attach.
  - **Gate:** none; scaffold first, then bundle `001` when Trellis ADR 0007 execution reaches step 3.

## ADRs Proposed (Awaiting Acceptance)

- **ADR 0066 — amendment and supersession** `[7 / 6 / 5]` (**35**) — [`thoughts/adr/0066-stack-amendment-and-supersession.md`](thoughts/adr/0066-stack-amendment-and-supersession.md)
  - **Governance:** ratify ADR; resolve open questions (rescission-of-rescission, supersession graph shape, correction subset scope).
  - **Formspec:** Respondent Ledger `ResponseCorrection`, superseding-chain first event, reason/authorization fields, corrected-field subset schema, fixtures.
  - **WOS:** six provenance/record kinds, Facts vs Narrative tiering, governance policy fields, runtime/lint/fixtures, and `wos-export` mappings.
  - **Trellis:** Phase 1 `supersedes_chain_id` reservation + correction/amendment/rescission vectors; Phase 4 runtime activation + graph export/verifier.
  - **Cross-repo:** shared fixture bundle `005-amendment-and-supersession`; align ADR 0072 binding composition once shapes land.
  - **Execution home:** [`wos-spec/TODO.md`](wos-spec/TODO.md#adr-0066-exec-checklist), [`trellis/TODO.md`](trellis/TODO.md) item `17`, [`wos-spec/crates/wos-server/TODO.md`](wos-spec/crates/wos-server/TODO.md) `WS-072`.
  - **Gate:** owner probe.

- **ADR 0067 — statutory clocks** `[7 / 5 / 5]` (**35**) — [`thoughts/adr/0067-stack-statutory-clocks.md`](thoughts/adr/0067-stack-statutory-clocks.md)
  - **Governance:** ratify ADR; resolve timestamp granularity, synthetic resolution policy, and multi-jurisdiction emit policy.
  - **WOS:** `clockStarted` / `clockResolved` + `Clock` schema, triggers, pause/resume composition, overlaps and calendar composition.
  - **Formspec:** Statute-trigger emit path via Respondent Ledger.
  - **Trellis:** `open-clocks.json`, advisory verifier for expired-unresolved clocks, pause-segment accumulation, append vectors `014`-`017`.
  - **Cross-repo:** shared fixture bundle `006-statutory-clock-fires`; optional ADR 0069 `clock_source`.
  - **Execution home:** [`wos-spec/TODO.md`](wos-spec/TODO.md#adr-0067-exec-checklist), [`trellis/TODO.md`](trellis/TODO.md) item `18`, [`wos-spec/crates/wos-server/TODO.md`](wos-spec/crates/wos-server/TODO.md) `WS-073`.
  - **Gate:** owner probe.

- **ADR 0068 — tenant and scope composition** `[8 / 4 / 6]` (**48**) — [`thoughts/adr/0068-stack-tenant-and-scope-composition.md`](thoughts/adr/0068-stack-tenant-and-scope-composition.md)
  - **Scope:** tenant-outermost hierarchy, case scope bundle `(Tenant, DefinitionId, KernelId, LedgerId)`, per-tenant authorization with cross-tenant actors.
  - **Why:** prerequisite for public-SaaS wedge.
  - **Gate:** owner probe.

- **ADR 0069 — time semantics** `[7 / 2 / 6]` (**42**) — [`thoughts/adr/0069-stack-time-semantics.md`](thoughts/adr/0069-stack-time-semantics.md)
  - **Pins:** RFC3339 UTC wire format, millisecond+ precision, chain-order/time-order rule, UTC-SLS leap smear, optional clock-source attestation, explicit FEL timezone.
  - **Gate:** owner probe.

- **ADR 0070 — cross-layer failure and compensation** `[7 / 5 / 6]` (**42**) — [`thoughts/adr/0070-stack-failure-and-compensation.md`](thoughts/adr/0070-stack-failure-and-compensation.md)
  - **Pins:** Trellis append as commit point, pre-commit Formspec failures, post-commit WOS rejections on rejection event, bounded retry + idempotency, `stalled` kernel state, no runtime saga, `CommitAttemptFailure` Facts record.
  - **Gate:** owner probe.

- **ADR 0071 — cross-layer migration and versioning** `[7 / 4 / 5]` (**35**) — [`thoughts/adr/0071-stack-cross-layer-migration-and-versioning.md`](thoughts/adr/0071-stack-cross-layer-migration-and-versioning.md)
  - **Pins:** pin-at-case-open across six dimensions, version-aware verification, phase-cut verifier compatibility, authorized mid-flight migration via `MigrationPinChanged`, breaking semantics through ADR 0066 supersession.
  - **Gate:** owner probe.

## ADRs Accepted (Implementation Underway)

- **ADR 0073 — case initiation and intake handoff** `[8 / 4 / 6]` (**48**) — [`thoughts/adr/0073-stack-case-initiation-and-intake-handoff.md`](thoughts/adr/0073-stack-case-initiation-and-intake-handoff.md)
  - **Landed:** Formspec `IntakeHandoff` schema/spec/lint/types/Python validation + both example modes; WOS typed parser + runtime acceptance seam/policy/provenance; Runtime Companion `acceptIntakeHandoff`; kernel provenance schema/prose; Trellis workflow-attach and public-intake vectors.
  - **Still open:** parent-owned shared fixture bundle exposing canonical response/handoff artifacts directly from top-level repo.
  - **Done means:** cold-reader traceability across Formspec → WOS → Trellis without prose-only composition claims.

- **ADR 0072 — evidence integrity and attachment binding** `[7 / 4 / 5]` (**35**) — [`thoughts/adr/0072-stack-evidence-integrity-and-attachment-binding.md`](thoughts/adr/0072-stack-evidence-integrity-and-attachment-binding.md)
  - **Landed:** Formspec origin shape, Trellis export contract, `append/018-attachment-bound`.
  - **Still open:** Trellis export/verify/tamper coverage for `061-attachments.cbor` and `trellis.export.attachments.v1`.

- **Identity attestation bundle shape** `[5 / 3 / 4]` (**20**)
  - **Scope:** provider-neutral identity-proofing attestation shape, generalized from `SignatureAffirmation.identityBinding`.
  - **Tracking:** [`trellis/TODO.md`](trellis/TODO.md) and [`wos-spec/TODO.md`](wos-spec/TODO.md).
  - **Gate:** signature-workflow evidence shape proven sufficient by WOS-T4 closeout.

## Sustaining (Hygiene, Not Delivery)

- **WOS-spec workspace in parent CI** `[5 / 2 / 2]` (**10**)
  - Root workspace excludes `wos-spec/`, so top-level CI misses `wos-lint`, `wos-conformance`, `wos-runtime`, and `wos-server`.
  - Add dedicated job (or required check) that runs `cargo test --workspace` inside `wos-spec/`.
  - **Indexed backlog:** [`wos-spec/TODO.md`](wos-spec/TODO.md) ADR 0064 + architecture-review handoff.
  - **Gate:** none.

- **Security disclosure policy** `[6 / 2 / 4]` (**24**)
  - Trellis reference implementation is landed; disclosure policy is now load-bearing in `STACK.md`.
  - **Gate:** none.

- **Stack-level ADR cross-check lint** `[5 / 3 / 3]` (**15**)
  - Mechanical lint to ensure seam-touching ADRs cross-reference counterpart ADRs in other projects.
  - **Gate:** none (script-only).

- **ADR 0073 terminology normalization** `[3 / 1 / 2]` (**6**)
  - Remove stale `CaseInitiationRequest` naming in favor of `IntakeHandoff` in stack ADRs and long-lived docs.
  - Start with [`thoughts/adr/0059-unified-ledger-as-canonical-event-store.md`](thoughts/adr/0059-unified-ledger-as-canonical-event-store.md).
  - **Gate:** none (doc cleanup).

## Trigger-Gated

- **Stack-wide TypeID utility crate** `[4 / 3 / 3]` (**12**)
  - Primitive: `{tenant}_{type}_{uuidv7_base32}`.
  - WOS already adopted in ADR-0061; extract layer-0 `formspec-typeid` (Rust + Python) when a second spec adopts.
  - Candidate adopters: Formspec response IDs, Trellis bundle artifacts, respondent-ledger event IDs.
  - **Gate:** second adopter.

- **Reference deployment topology spec** `[5 / 5 / 2]` (**10**)
  - Turn `STACK.md` 4-process model into deployable reference: container composition, storage defaults, secrets handling, anchor-adapter defaults.
  - **Gate:** SBA engagement shape or public-SaaS launch requirement.

### Formspec-side cross-layer

Work in the Formspec spec and runtime itself that other layers depend on. Lives in `specs/` and `schemas/`, not in stack ADRs.

- **WOS Runtime §15 integrator alignment (P11-BL-051)** `[5 / 3 / 3]` (**15**)
  - Keep Core §2.1.6 + `schemas/.../response.schema.json` examples aligned with full Response-envelope validation (`additionalProperties: false` at root, open `data`).
  - Ensure integrator-facing docs cite Runtime §15 where informal handoff prose still exists.
  - Processor/rejection/hook ordering implementation lives in [`wos-spec/TODO.md`](wos-spec/TODO.md) item `#66`.

- **`ResponseCorrection` event in Respondent Ledger §6** `[6 / 3 / 4]` (**24**)
  - Introduce correction event referencing prior `ResponseSubmitted.canonical_event_hash` with declared corrected-field subset.
  - **Gate:** ADR 0066 accepted.

- **Offline authoring profile in Respondent Ledger companion** `[6 / 5 / 4]` (**24**)
  - Specify pending-local-state semantics, authored-time preservation under delayed submit, and chain construction for buffered offline events.
  - Required producer-side contract for Trellis `priorEventHash: [Hash]` reservation (ADR 0001).
  - Absorbs archived migration SHOULDs ULCOMP-R-210..212 as offline-authoring semantics (not ADR 0071 migration semantics).
  - Gap source: [`trellis/specs/archive/cross-reference-map-coverage-analysis.md`](trellis/specs/archive/cross-reference-map-coverage-analysis.md) §4.4.
  - **Gate:** none.

## Track / Monitor

### 14. `materializePagedLayout` — by design

- **Source**: editor/layout split review
- **File**: `packages/formspec-studio/src/workspaces/layout/LayoutCanvas.tsx:361-380`
- **Status**: Guarded by `useRef<boolean>` flag — no-op after first call. Negligible overhead.

### 19. Component tree reconciles on every dispatch

- **Source**: editor/layout split review
- **File**: `packages/formspec-core/src/raw-project.ts:350-373`
- **Action**: Monitor. Resolution path documented: add dirty flag. Not yet implemented.

### LayoutContainer dual-droppable

- **Source**: layout DnD review (2026-04-07)
- **File**: `packages/formspec-studio/src/workspaces/layout/LayoutContainer.tsx:194-209`
- **Status**: `useSortable` + `useDroppable(container-drop)` on same element. No code change until a mis-hit is reproduced.
