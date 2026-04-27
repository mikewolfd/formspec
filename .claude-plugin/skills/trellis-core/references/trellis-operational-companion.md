# Trellis Operational Companion Reference Map

> `trellis/specs/trellis-operational-companion.md` — **1832** lines, ~132 KiB — **Phase 2** ratified operational companion to Trellis Core (operator obligations: posture, projections, sidecars, assurance).

> **Navigation note:** This file is a **coherent-snapshot tag** for skill lookup — not a normative freeze of the spec. When the canonical companion changes, regenerate this map from source.

> **Authority order (Trellis stack):** Rust crates (byte authority, ADR 0004) > CDDL in `trellis-core.md` §28 (structural) > normative prose in Core + companions > Trellis Requirements Matrix > Python cross-check > archives and drafts (**non-normative; do not cite**).

## Overview

Trellis is the **cryptographic integrity substrate** beneath Formspec (intake / respondent history) and WOS (workflow governance). Trellis Core fixes **bytes**; this companion fixes **operator obligations** so byte-conformant deployments cannot silently misrepresent posture, drift projections, or break cross-stack seams.

Conformance is **cumulative**: Phase 1 requires Core only; Phase 2+ requires Core **and** this companion. Where text conflicts with Core, **Core prevails**; this document must not weaken Core invariants or redefine wire formats (it cites Core sections instead).

---

## Section Map

### Document framing (Lines 10–160)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| (title) | Trellis Operational Companion | Front matter: version 1.0.0, ratified, Phase 2, companion-to `trellis-core.md`. | `companion-to`, Phase 2, v1.0.0 | Confirm document identity and binding to Core. |
| §Abstract | Abstract | Contrasts byte-correctness with product-honesty failures (dashboard drift, crypto-shred gaps, AI without attestation, undisclosed custody changes). | operational companion, evidence poisoning | Explain why Phase 2 obligations exist beyond Core. |
| §Status | Status of This Document | Ratified second W3C-style Trellis spec; stable for production; Core governs where it already fixed semantics. | ratified, stable, normative boundary | Argue precedence vs Core prose. |
| §Relationship | Relationship to Trellis Core | **Bytes vs obligations** split table; conflict rule; non-re-specification rule (cite Core for shapes). | Trellis Core owns, companion owns, conflict rule | Scope a requirement into Core vs companion. |
| §ToC | Table of Contents | Numbered outline Parts I–VI, appendices A–B, references. | Parts I–VI | Route to major part. |

### Introduction, conformance, terminology (Lines 147–219)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §5 | Introduction | Motivates operational failure modes; all obligations use RFC 2119; explicit seam deferral wording. | RFC 2119, SEAM DEFINED | Onboard readers to companion scope. |
| §6.1 | RFC 2119 Language | BCP 14 keyword interpretation. | MUST, SHOULD, MAY, BCP 14 | Parse normative strength. |
| §6.2 | Conformance Prerequisite | Companion conformance undefined without matching Trellis Core. | Core prerequisite | Gate conformance claims. |
| §6.3 | Conformance Tiers | **OP-1** baseline, **OP-2** projection-disciplined, **OP-3** sidecar-integrated; **OP-W** Phase 4 seam only (§26). | OP-1, OP-2, OP-3, OP-W | Map product tier to obligations. |
| §6.4 | Conformance Roles | Operator, Projection Producer, Authorization Evaluator, sidecar producers, Monitor/Witness (preview), Auditor. | Operator, Auditor, sidecar roles | Assign obligations to a component. |
| §7 | Terminology | Operational terms: Posture Declaration, Custody Model, Custody Hook (WOS §10.5), watermark, sidecar, purge cascade, delegated compute, metadata budget, durable-append boundary, disclosure manifest. | Custody Hook, watermark, sidecar | Align vocabulary with implementation names. |

### Part I — Posture and disclosure (Lines 221–500)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §8.1 | The Three Access Classes | Three-way partition: provider-readable, reader-held, delegated-compute; delegated is scoped, not standing runtime access. | access taxonomy, delegated compute | Classify data paths or AI access. |
| §8.2 | Mandatory Declaration | Per content class, declare access class in posture declaration (OC-01). | OC-01, posture declaration | Audit declaration completeness. |
| §8.3 | Non-Collapse | Must not mislabel delegated as provider-readable or vice versa (OC-02). | OC-02, non-collapse | Review marketing vs actual posture. |
| §8.4 | Access-Class Inheritance | Custody models and sidecars inherit active model; sidecar text must not weaken class. | inheritance | Validate sidecar wording. |
| §9.1 | Rationale and Naming | Custody Models **CM-A…F** replace legacy A–E; avoids collision with Respondent Ledger Profile A/B/C; Core §21 cites here; matrix §2.2/§4.3. | CM-A, invariant #11, Core §21 | Explain naming or cite canonical CM list. |
| §9.2 | The Six Standard Custody Models | Normative table CM-A … CM-F with short posture summaries. | CM-A–CM-F | Pick or validate custody model. |
| §9.3 | Required Fields per Model | Nine required declaration fields including attestation and metadata budget refs. | `custody_model_id`, OC-04 | Schema or template for custody block. |
| §9.4 | Model-Specific Obligations | Per-model MUSTs (plain language for CM-A; residual plaintext lifecycle for CM-C; quorum honesty for CM-D; etc.). | CM-A–CM-F obligations | Deep-check a chosen CM. |
| §9.5 | Combinations and Extensions | Extended models outside reserved range; transitions §10 + honesty §11. | OC-05, extension models | Custom custody identifier design. |
| §9.6 | Non-Collision with Respondent Ledger Profile A/B/C | No bare A/B/C for CM; Formspec owns RL profiles (OC-06). | OC-06, rl-profile | Cross-spec ledger profile vs CM. |
| §10.1 | Transitions Are Canonical Events | Listed posture changes = Posture Transition on chain (Core §6) (OC-07). | Posture Transition, OC-07 | Decide if a change needs a chain event. |
| §10.2 | No Silent Transitions | No change without event; no retroactive rewrite of declarations—forward correction (OC-08/09). | OC-08, OC-09 | Incident response on wrong declaration. |
| §10.3 | Required Transition-Event Semantics | Seven semantic questions answered; wire pinned Appendix A.5; Phase 1 concrete subtypes per Core §6.7 (OC-10). | OC-10, Appendix A.5 | Implement or verify transition payloads. |
| §10.4 | Scope of Transition Attestations | Narrowing MAY single-attest; expanding access MAY require dual attestation (OC-11). | OC-11, dual attestation | Governance signing policy. |
| §10.5 | Downstream Obligations on Transition | Projections, disclosure manifests, evaluators must react (OC-12). | OC-12, rebuild | Transition rollout checklist. |
| §11.1 | Required Publication | Posture declaration with export (Core §18); five bullet topics (OC-13). | Posture Declaration, OC-13 | Export bundle checklist. |
| §11.2 | Invariant-#15 Floor | Must not oversell trust; name external anchors; silence is non-conformant (OC-14). | invariant #15, OC-14 | Marketing / trust claims review. |
| §11.3 | Export-Bundle Binding | Embed or content-address declaration; verifier surfaces missing posture (OC-15). | OC-15, Core §19 | Offline verification UX. |
| §11.4 | Auditor Comparison | Auditor compares declaration to control plane without payload access (OC-16). | Auditor, OC-16 | Third-party audit interface. |
| §11.5 | Mismatch Handling | Posture-honesty violation workflow: record, transition, publish, notify (OC-17). | posture-honesty violation | Breach or drift response. |
| §12.1 | The Declaration-as-Table Form | Metadata budget MUST be structured table per scope (OC-18). | Metadata Budget, OC-18 | Reject prose-only budgets. |
| §12.2 | Table Rows and Columns | Required columns: fact_family, visible_fields, observer_classes, leakage columns, delegated effects (OC-19). | observer_classes, OC-19 | Author budget rows. |
| §12.3 | Coverage Rule | Every admitted fact family listed (OC-20). | OC-20, coverage | Gap analysis on new event types. |
| §12.4 | Visible-Metadata Ceiling | SHOULD limit retention of visible metadata (OC-21–23). | OC-21, OC-22, OC-23 | Data minimization. |
| §12.5 | Payload-Confidentiality Is Not Metadata Privacy | Equating the two is forbidden (OC-24). | OC-24 | Privacy narrative vs table. |
| §12.6 | Posture Inheritance | Models/bindings/sidecars cannot weaken active budget (OC-25). | OC-25 | Sidecar vs global budget. |
| §13.1 | Slot Population, Not Slot Redefinition | Core §13 slots populated here; manifests over slots; BBS+ deferred Phase 3+ (OC-31 seam). | Core §13, commitment slots | Selective disclosure architecture. |
| §13.2 | Population Rule | Records needing later selective disclosure MUST populate slots (OC-26). | OC-26 | FOIA / sealing readiness. |
| §13.3 | Disclosure Manifest Structure | Nine required manifest fields including proofs (OC-27). | Disclosure Manifest, OC-27 | Build or verify manifests. |
| §13.4 | Disclosure Honesty | Manifest is derived; preserves provenance tiers (OC-28/29). | OC-28, OC-29, Core §6 | Litigation / export semantics. |
| §13.5 | Redaction Auditability | Auditor verifies commitments without withheld plaintext (OC-30). | OC-30 | Audit redaction pipeline. |
| §13.6 | Deferral | Phase 2 = population + manifest structure; advanced crypto seam (OC-31). | Phase 3+, SEAM DEFINED | Roadmap advanced crypto. |

### Part II — Derived artifacts and projections (Lines 502–660)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §14.1 | The Invariant-#14 Requirement | Every derived artifact watermarked; min fields include checkpoint, tree_size/head, build time, schema, rebuild_path (OC-32); TR-OP-001/002. | watermark, OC-32, TR-OP-001, TR-OP-002, invariant #14 | Any cache, index, dashboard, evaluator state. |
| §14.2 | No Second Canonical Truth | Projections never authoritative for facts; restates Core §15 (OC-33). | OC-33, Core §15 | “Source of truth” disputes. |
| §14.3 | Canonical Resolution | On conflict, canonical wins; derived is stale (OC-34). | OC-34 | Reconciliation logic. |
| §14.4 | Declared Configuration History | Retain config needed for rebuild determinism (OC-35). | rebuild-deterministic, OC-35 | Projection versioning. |
| §14.5 | Elevation Prohibition | Cannot elevate derived to canonical by policy (OC-36). | OC-36, Core §10 | Dangerous ingestion patterns. |
| §14.6 | Authorization Evaluators Are Derived | Evaluators full §14 + §25 stale discipline; no silent fail-open. | Authorization Evaluator | Rights engines. |
| §15.1 | Projection Categories | Consumer-facing vs system; both watermarked; consumer gets §15.2/4 (OC-37). | Consumer-Facing Projection, OC-37 | Classify projections. |
| §15.2 | Watermark Display | Must expose checkpoint + head to consumer; TR-OP-001/002 (OC-38). | OC-38, TR-OP-001 | UI freshness display. |
| §15.3 | Rebuild Equivalence | Rebuild at same checkpoint/config = same deterministic fields; declare which fields (OC-39/40); TR-OP-005/006. | OC-39, OC-40, TR-OP-005, TR-OP-006 | Regression / golden tests. |
| §15.4 | Staleness Indication | Stale views must signal; must not leak unprojected content (OC-41; ties §28). | stale, OC-41 | Staff UI indicators. |
| §15.5 | Integrity Sampling Policy | Declare and exercise sampling or checkpoint-bound equivalence (OC-42/43). | OC-42, OC-43 | Ops SLO for drift detection. |
| §15.6 | Rebuild Fixture Integrity | Fixtures tamper-protected; tests required (OC-44). | OC-44 | CI security for fixtures. |
| §15.7 | Purge-Cascade Interaction | Projections subject to §20.3 purge rules. | purge cascade | Erasure + indexes. |
| §16.1 | The Invariant-#14 Cadence Requirement | Snapshots from day one; replay-only retrofit non-conformant (OC-45). | checkpoint snapshots, OC-45 | Greenfield ledger design. |
| §16.2 | Cadence | Time/height/event/hybrid cadence; auditor-comparable; **TR-OP-008** for G-3 lint / `coverage.tr_op` (OC-46). | OC-46, TR-OP-008 | Snapshot scheduling. |
| §16.3 | Snapshot Integrity Binding | Binds to checkpoint; verifiable; still derived (OC-47). | OC-47, Core §11 | Snapshot verification. |
| §16.4 | Snapshot as Recovery Substrate | Equivalence established before rights-impacting recovery use (OC-48). | OC-48 | DR using snapshots. |
| §16.5 | Retention and Purge Cascade | Plaintext snapshots purged; no resurrecting shredded plaintext (OC-48 context + §20). | purge, OC-48 | Retention vs erasure. |
| §17.1 | Staff Views Are Rights-Impacting Surfaces | Staff projections drive adjudication; stricter rules. | staff view, rights-impacting | Adjudicator UX policy. |
| §17.2 | Watermark Propagation | Staff views carry/display full §14.1 watermark (OC-49). | OC-49 | Court / hearing UI. |
| §17.3 | Stale-View Signaling | Stale must be signaled before rights action; acknowledgement recorded (OC-50). | OC-50, acknowledgement | Workflow gating. |
| §17.4 | Decision-Binding | Canonical events record staff-view watermark used (OC-51). | OC-51, Core §6 | Evidence binding. |
| §17.5 | No Silent Override | Staff cannot override canonical (OC-52). | OC-52 | Conflict UI. |
| §17.6 | Respondent-Facing Integrity | Consumer projections + metadata budget respect (§15 + §12). | respondent-facing | Respondent portal. |

### Part III — Operational contracts (Lines 662–914)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §18.1 | Core Byte Contract Assumed | Layers operational rules on Core §17 byte idempotency. | Core §17, invariant #13 | API design on append. |
| §18.2 | Retry Budgets | Declare max retries per key; exhausted → rejection (OC-53). | retry budget, OC-53 | Client retry policy. |
| §18.3 | API Retry Windows | Latency expectations; post-window ≠ key reuse (OC-54/55). | API retry window, OC-54 | SLO vs permanence. |
| §18.4 | Dedup Store Lifecycle | Dedup store is derived, watermarked, durable across restarts (OC-56/57). | dedup store, OC-56 | Storage compaction. |
| §18.5 | Replay-Observable Semantics | Retries observe identical outcome class (OC-58/59). | OC-58, OC-59 | Exactly-once UX. |
| §18.6 | Idempotent-Acceptance Consequences | Verifier-visible distinction new vs resolved (OC-60). | OC-60 | Client + verifier contracts. |
| §18.7 | Durable-Append Boundary | Declares when attestation/export state is durable (OC-61/62). | durable-append boundary | Export timing. |
| §18.8 | Replica Completion Is Not Canonical | Replica lag is derived only (OC-63). | OC-63 | Multi-region correctness. |
| §19.1 | Scope: AI Agents and Scoped Delegates | AI agents in WOS autonomy regime; Trellis attestation/audit side. | AI agent, WOS | Agent-in-the-loop features. |
| §19.2 | Required Grant Structure | Explicit, attributable, scoped, auditable grants (OC-64/65). | OC-64, grant | Before compute starts. |
| §19.3 | Authority Attestation | Grant carries authority attestation on-ledger (OC-66). | OC-66 | Signing grants. |
| §19.4 | Attribution of Compute Output | Material actions record output + links to grantor/agent/scope/advisory level (OC-67). | OC-67 | Model output lineage. |
| §19.5 | No Scope Drift | Grant ≠ standing runtime access; expansions are new grants (OC-68/69). | OC-68, OC-69 | Scope creep prevention. |
| §19.6 | Interaction with WOS Autonomy Caps | Trellis ≠ substitute for WOS caps; WOS violation stays WOS non-conformant (OC-113e pattern). | WOS autonomy | Cross-layer gates. |
| §19.7 | Custody-Hook Binding | WOS §10.5 path records grants as Trellis canonical (see §24). | custodyHook, Core §23 | WOS+Trellis integration. |
| §19.8 | Supply-Chain Considerations | SHOULD declare model provenance; misrepresentation = posture violation (OC-70). | OC-70 | Model cards. |
| §19.9 | Delegated-Compute Declaration Document | OC-70a–c: Appendix A.6 TOML+MD declaration; actor discriminator; Core §19 integrity path. | Appendix A.6, OC-70a, OC-70c | Lint / conformance for agents. |
| §20.1 | Lifecycle Facts Are Canonical | Compliance-affecting lifecycle ops as canonical facts when supported (OC-71/72). | lifecycle fact, Core §6 | Legal hold, seal, archive. |
| §20.2 | Sealing and Precedence | Define sealed vs later facts; legal hold vs retention default (OC-73/74). | sealed, legal hold | Policy precedence matrix. |
| §20.3 | Crypto-Shredding Scope | Core crypto + operational purge cascade completeness (OC-75); **TR-OP-004**. | crypto-shred, TR-OP-004, OC-75 | Shred semantics. |
| §20.4 | Purge-Cascade Obligation | All plaintext-bearing derived artifacts invalidated (OC-76); TR-OP-004. | OC-76, purge cascade | Post-shred verification. |
| §20.5 | Cascade Scope | MUST enumerate Appendix A.7 **CS-01…CS-06** programmatically (OC-77). | CS-01, OC-77, Appendix A.7 | Automated cascade iterator. |
| §20.6 | Documentation | Posture doc must explain irrecoverability, residual access, evidence, metadata (OC-78). | OC-78 | User-facing shred notices. |
| §20.7 | Legal Sufficiency | No crypto-only legal claims (OC-79/80). | OC-79, OC-80 | Legal/compliance comms. |
| §21.1 | Rejection Is Observable | Caller-visible rejection taxonomy (OC-81). | rejection class | API error design. |
| §21.2 | Required Rejection Classes | Nine minimum classes including `IdempotencyKeyPayloadMismatch` context, posture, lifecycle (OC-82). | invalid_signature, posture_violation | Error code parity. |
| §21.3 | Rejected Records Are Not Canonical | Terminal per idempotency identity (OC-83). | OC-83 | Idempotency store. |
| §21.4 | Idempotent-No-Op Rejection | Explicit semantics for duplicate-as-no-op (OC-84). | OC-84 | 200 vs 409 patterns. |
| §21.5 | Rejection Evidence | SHOULD structured evidence for class, key, retryability (OC-85). | OC-85 | Support tooling. |
| §22.1 | Everything That Matters Is Versioned | Algorithms, schemas, semantics versioned (OC-86). | OC-86 | Version pinning policy. |
| §22.2 | Historical Verifiability | 2045 verifier for 2026 records (OC-87). | OC-87 | Long-term archive. |
| §22.3 | No Silent Reinterpretation | Migrations are canonical events or transitions (OC-89/90). | OC-89, OC-90 | Rule upgrades. |
| §22.4 | Out-of-Band Knowledge Prohibited | Interpretation material content-addressed in export (OC-91). | OC-91 | Verifier self-containment. |
| §22.5 | Suite Rotation Operational Obligations | Rotation facts, key snapshots, posture update, continuous verifiable exports (OC-92). | suite_id, OC-92 | Key rotation runbooks. |
| §22.6 | Registry Discipline | SHOULD versioned registries; digest in export per Core §18 / invariant #6 (OC-93); **TR-OP-130**. | OC-93, TR-OP-130, invariant #6 | Registry snapshots in manifest. |

### Part IV — Sidecars (Lines 916–1177)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §23.1 | Purpose and Binding | Binds Formspec Respondent Ledger to Trellis without second truth. | Formspec §13, Respondent History | Respondent timeline design. |
| §23.2 | Scope | Respondent-visible history; optional moments; projections not canonical (OC-94/95). | OC-94, OC-95 | Scope creep on history UX. |
| §23.3 | Stable Path Semantics | Stable logical paths across presentation changes (OC-96). | stable path | Form migration addressing. |
| §23.4 | Item-Key Semantics | Stable keys for repeatables/attachments (OC-97). | item key | Repeat groups / lists. |
| §23.5 | Validation Snapshot Structure | SHOULD material validation snapshots (OC-98). | validation snapshot | Validation audit trail. |
| §23.6 | Amendment Cycle Semantics | SHOULD amendment phases and baselines (OC-99). | amendment | Amend / correct flows. |
| §23.7 | Migration Outcome Semantics | SHOULD migration outcome classes (OC-100). | migration | Schema upgrade UX. |
| §23.8 | Materiality Discipline | No keystroke-level canonical facts (OC-101). | OC-101, materiality | Telemetry minimization. |
| §23.9 | Coverage Honesty | Views must not overclaim coverage (OC-102). | OC-102 | Marketing / export labels. |
| §23.10 | Binding to Respondent Ledger and Trellis Core | Ledger events via binding; projections watermarked (OC-103). | OC-103, Core §6 | End-to-end respondent binding. |
| §24.1 | Purpose and Binding | WOS governance via **WOS Kernel §10.5** `custodyHook`; no WOS semantic redefinition. | custodyHook, WOS Kernel §10.5 | WOS orchestration + Trellis. |
| §24.2 | Non-Redefinition | WOS remains authoritative for runtime semantics (OC-104). | OC-104 | Avoid duplicating WOS spec. |
| §24.3 | Canonical-vs-Operational Distinction | Classify operational vs canonical vs derived dashboards (OC-105). | OC-105 | Temporal / engine state. |
| §24.4 | Non-Elevation | Ops sequencing ≠ canonical truth (OC-106). | OC-106 | Queue depth claims. |
| §24.5 | Governance Fact Families | SHOULD mark families canonical vs operational (OC-107). | fact family | Catalog governance events. |
| §24.6 | Review and Adjudication Semantics | SHOULD distinguish review stages vs decisions (OC-108). | review, adjudication | Workflow modeling. |
| §24.7 | Approval, Escalation, and Recovery | SHOULD timers vs humans vs compensating actions (OC-109); ops order ≠ canonical order (OC-110). | OC-109, OC-110 | SLA vs evidence order. |
| §24.8 | Runtime Is Derived | Engines are derived processors; only CAS admission makes canonical (OC-111). | OC-111, Core §2 | BPMN / Step Functions. |
| §24.9 | `custodyHook` Binding | Route via CAS per **Core §23**; four-field WOS contract; idempotency domain tag; OC-112/113; **OC-113a** causal order vs Core §6 sequence / §23.3; **OC-113b** sidecar catalogs `wos.*`. | Core §23, OC-112, OC-113a, OC-113b | Implement custodyHook adapter. |
| §24.10 | Posture-Transition Auditability for WOS Governance | WOS-driven custody changes still need §10 Trellis events; ordering vs `wos.*` authorizer (OC-113c). | OC-113c, `trellis.custody-model-transition.v1` | Split WOS record vs Trellis transition. |
| §24.11 | Delegated-Compute Flow-Through for WOS Autonomy | Non-`manual` autonomy → §19 + Appendix A.6; attribution rules; **WOS AI Integration §5.2** (OC-113d). | OC-113d, assistive autonomy | AI-authored governance records. |
| §24.12 | Provenance Across Export | Export views must not overclaim completeness (OC-114). | OC-114 | Case export packaging. |
| §25.1 | Grants and Revocations Are Canonical | Rights-affecting grants on append-only chain (OC-115). | OC-115 | Authorization source of truth. |
| §25.2 | Delegation Facts | Delegation affecting authority must be canonical (OC-116). | OC-116 | Delegation chains. |
| §25.3 | Evaluators Are Derived | Evaluators MAY be derived from grants (OC-117/118). | OC-117, OC-118 | Policy engine architecture. |
| §25.4 | Traceability to Canonical Facts | Every decision input traceable to canonical facts (OC-119). | OC-119 | Explainability / audit. |
| §25.5 | Rebuild Behavior | Declare rebuild inputs, config, procedure, equivalence (OC-120). | OC-120 | Evaluator DR. |
| §25.6 | Behavior Under Stale, Missing, Inconsistent, or Unavailable State | MUST declare defer / fail-closed / recovery / reject; **silent fail-open NON-CONFORMANT** (OC-121/122). | OC-121, OC-122, fail-closed | AuthZ outage behavior. |
| §25.7 | Canonical Semantics Prevail | Evaluator never overrides grants/revocations (OC-123). | OC-123 | Cache invalidation rules. |
| §25.8 | Cryptographic-Erasure Interaction | Erasure invalidates dependent evaluator state (OC-124). | OC-124 | Post-shred authz. |

### Part V — Witnessing and monitoring (Lines 1179–1257)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §26.1 | Seam Definition; Implementation Deferred | **SEAM DEFINED; IMPLEMENTATION DEFERRED TO PHASE 4** — interfaces without full Phase 4 obligations. | Phase 4, OP-W | Future-proof monitoring APIs. |
| §26.2 | Subordination to Canonical Correctness | Witnessing does not replace append semantics; witness absence ≠ invalid records (OC-125). | OC-125 | Correctness vs transparency. |
| §26.3 | Checkpoint Publication Interface | If monitoring supported: required publication fields table (OC-126). | OC-126, checkpoint publication | Monitor integration contract. |
| §26.4 | Publication Obligations | Honest checkpoints; appendible history; no rewrite (OC-127). | OC-127 | Public transparency log style feeds. |
| §26.5 | Monitor Sub-Roles | Four sub-roles named (passive, equivocation, anchor, audit witness) — detail Phase 4 (OC-128). | OC-128 | Role-based monitoring design. |
| §26.6 | Witness Attestation Semantics (Seam) | Witness attests observation properties, not canonical append (OC-129). | OC-129 | Witness vs append signature. |
| §26.7 | Equivocation Evidence Format (Seam) | Structured cross-checkable equivocation evidence — format Phase 4 (OC-130). | OC-130 | Dispute evidence bundles. |
| §26.8 | Detection Is Not Enforcement | Monitors must not rewrite chain (OC-131). | OC-131 | Incident response boundaries. |
| §26.9 | Privacy Bounds | Monitors/witnesses must not observe unnecessary secrets (OC-132). | OC-132 | Monitor data minimization. |
| §26.10 | Rate and Abuse Considerations | SHOULD rate-limit checkpoint APIs (OC-133). | OC-133 | DDoS hardening. |

### Part VI — Assurance and references (Lines 1259–1413)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §27.1 | Beyond Core Vectors | Operational conformance beyond Core byte vectors. | operational conformance | Test strategy. |
| §27.2 | Projection Rebuild Tests | OP-2+ watermark, staleness, rebuild equivalence, fixtures, staff scenario (OC-134). | OC-134, OP-2 | CI for projections. |
| §27.3 | Crypto-Shred Cascade Tests | Per purge scope CS-* ; detect leftovers; no backup resurrection (OC-135). | OC-135 | Erasure integration tests. |
| §27.4 | Rejection Semantics Tests | Observable classes, idempotency, non-append of rejects (OC-136). | OC-136 | API contract tests. |
| §27.5 | Metadata-Budget Compliance Tests | Coverage, observer match, pattern leakage (OC-137). | OC-137 | Privacy QA. |
| §27.6 | Auditor Workflow Tests | Auditor posture vs control plane without payloads (OC-138). | OC-138 | External audit readiness. |
| §27.7 | Transition-Auditability Tests | Transition fields, no silent changes, dual attestation (OC-139). | OC-139 | Governance migration tests. |
| §27.8 | Idempotency Replay Tests | Retry budget, windows, dedup lifecycle, replay semantics (OC-140). | OC-140 | Load / chaos testing. |
| §28.1 | Staff-View UI Side Channels | UI leakage vs metadata budget; stale must not encode pending content (§15.4). | side channel, metadata budget | Adjudicator UI review. |
| §28.2 | Staff-View Leakage Across Audience Boundaries | Cross-case inference risks (SHOULD evaluate). | cross-audience | Multi-tenant UI. |
| §28.3 | Projection Poisoning | Defenses via rebuild/sampling/fixtures (§15). | projection poisoning | Security threat model. |
| §28.4 | Idempotency-Key Leakage | Keys are secrets; auth, entropy, minimal duplicate responses. | idempotency key | Abuse resistance. |
| §28.5 | Delegated-Compute Supply Chain | Model misrepresentation as honesty violation. | supply chain | Model provenance. |
| §28.6 | Purge-Cascade Completeness | Residual plaintext in caches/fixtures defeats shred. | cascade completeness | Safety-critical testing. |
| §28.7 | Authorization Evaluator Safety | Stale/undeclared evaluator = security defect (§25). | evaluator safety | Threat modeling authz. |
| §28.8 | Metadata-Leakage Patterns | Timing/linkage under-modeled risks. | metadata leakage | DPIA inputs. |
| §28.9 | Posture-Transition Attack Surface | Expansion abuse; dual attestation, retrospective scope, monitoring (§26). | transition attack | Insider threat. |
| §28.10 | Verification Posture Gating | High-stakes outcomes require declared verification posture for the outcome class; silent escalation NON-CONFORMANT. | verification posture, Posture Declaration | Tie outcomes to declared assurance tier; see §29.1 **WOS Assurance §2**. |
| §29.1 | Normative References | Trellis Core, RFCs, Formspec Core + Respondent Ledger, WOS Kernel/Assurance/Governance sections. | Trellis Core, RFC 2119 | Bibliography for specs. |
| §29.2 | Informative References | Vision, legacy drafts, matrix, normalization plan — **informative only**. | ULCOMP-R, drafts | Historical trace only. |

### Appendices (Lines 1415–1832)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| App A (intro) | Declaration Document Template | Machine+human posture template; JSON/CBOR encouraged. | PostureDeclaration | Authoring declarations. |
| §A.1 | Top-Level Structure | `PostureDeclaration` field block (illustrative record shape). | declaration_id, scope | Serialize posture doc. |
| §A.2 | Access Taxonomy Table Row | `AccessTaxonomyRow` with `access_class` enum and delegated exposure enum. | access_class, delegated_compute_exposure | Access table rows. |
| §A.3 | Metadata Budget Table Row | `MetadataBudgetRow` column alignment with §12. | MetadataBudgetRow | Budget serialization. |
| §A.4 | Custody Model Registry | `CustodyModelEntry` fields aligned with §9.3. | CustodyModelEntry | CM registry entries. |
| §A.5 | Posture Transition Event Families | Shared `Attestation` CDDL; **TR-OP-042** custody CDDL; **TR-OP-043** disclosure-profile CDDL; **TR-OP-044/045** verifier + co-publish rules (A.5.3). | `trellis.custody-model-transition.v1`, TR-OP-042–045 | Wire-level transition coding. |
| §A.5.1 | Custody-Model Transition | Concrete CDDL + reason code table. | reason_code, declaration_doc_digest | Emit custody transitions. |
| §A.5.2 | Disclosure-Profile Posture-Transition | RL profile axis `rl-profile-A/B/C`; `scope_change` enum; Phase 1 deployment-scope only. | rl-profile-A, scope_change | RL profile transitions. |
| §A.5.3 | Verification semantics | Verifier steps: CDDL, continuity, digest, attestations → `VerificationReport.posture_transitions`. | continuity_mismatch, Core §19 step 6 | Verifier implementation. |
| §A.6 | Delegated-Compute Declaration Document | TOML frontmatter + MD; OC-70a–c; cross-check rules 1–15; invariant #15 discriminator. | DelegatedComputeDeclaration, OC-70a | Agent deployment manifests. |
| §A.7 | Cascade-Scope Enumeration | Normative **CS-01…CS-06** table linking purge classes to §§14–25. | CS-01, purge cascade | Fixture manifests O-3. |
| App B (intro) | Sidecar Examples | **Non-normative** illustrative shapes preserving Part IV semantics. | non-normative examples | UI/prototype only. |
| §B.1 | Respondent History Sidecar — Minimal Shape | Example `RespondentHistorySidecar` composition. | RespondentHistorySidecar | Sidecar JSON sketches. |
| §B.2 | Workflow Governance Sidecar — Minimal Shape | `WorkflowGovernanceSidecar`, `CustodyHookBinding`, `AdmittedEventType`; autonomy policy ref when needed (**WOS Agent Config §3**). | custody_hook_binding, admitted_event_types | WOS integration examples. |
| §B.3 | Disclosure Manifest — Minimal Shape | Example manifest fields (§13.3 alignment). | DisclosureManifest | Disclosure tooling. |
| §B.4 | Delegated-Compute Grant — Minimal Shape | Example grant vs A.6 declaration distinction. | DelegatedComputeGrant | Grant event payloads. |
| §B.5 | Projection Watermark — Minimal Shape | Points to **Core §15.2** normative `Watermark` CDDL — illustration must not override Core. | Watermark, Core §15 | Watermark structs in code. |
| §C | Traceability Anchors | **Non-normative** list of `TR-OP-*` rows in `trellis-requirements-matrix.md`; matrix must not contradict companion. | TR-OP-*, trellis-requirements-matrix | Lint / matrix row lookup. |

---

## Cross-References

**Trellis Core (normative, cited throughout)** — §2 Conformance (Canonical Append Service); §3 Terminology; §6 Event Format (including §6.7 posture-transition codes); §6.2 sequence; §9 Hash Construction (including §9.1 domain tags, §9.2 `canonical_event_hash`, §9.8 posture declaration digest); §10 Chain Construction; §11 Checkpoint Format; §13 Commitment Slots Reserved; §15 Snapshot and Watermark Discipline (§15.2 `Watermark` CDDL); §17 Append Idempotency Contract; §18 Export Package Layout; §19 Verification Algorithm (steps 6–9, `integrity_verified`, posture transition outcomes); §21 Posture / Custody / Conformance-Class Vocabulary (cites companion §9); **§22 Composition with Respondent Ledger** (especially §22.4 composed case-ledger scope); **§23 Composition with WOS `custodyHook`** (§23.2–23.7, four-field contract, §23.3 `ledger_scope`, §23.5 idempotency domain tag `trellis-wos-idempotency-v1`, §23.6 autonomy attribution).

**Formspec (cross-stack)** — **Respondent Ledger** Formspec §13 (binding for Respondent History sidecar); Formspec §13 / §15A cited in §29.1; Respondent Ledger Profile **A/B/C** axis (disclosure-profile transitions Appendix A.5.2); “Formspec §13” in §23.1, §23.10. **Formspec Core** (authored field semantics) per §29.1.

**WOS (cross-stack)** — **WOS Kernel §10.5** `custodyHook` (primary seam; §§7, 19.7, 24.1, 24.9–24.11); **WOS Kernel §4** Lifecycle, **§8** Facts tier (OC-113a causality); **WOS Kernel §12** Separation Principles (§29.1); **WOS AI Integration §5.2** autonomy levels including `manual` / `assistive` (§24.11 OC-113d); **WOS Agent Config §3** `autonomyPolicy` (Appendix B.2 `autonomy_policy_ref`); **WOS Assurance §2** assurance levels (§29.1, §28.10 verification posture gating); **WOS Workflow Governance §2.9** schema upgrade pattern (§29.1).

**Trellis Requirements Matrix** — §2.2 and §4.3 cite companion §9 custody identifiers (§9.1); Appendix §C lists `TR-OP-*` traceability rows in `trellis-requirements-matrix.md` (non-normative index; prose wins on conflict).

**IETF / W3C** — RFC 2119, RFC 8174 (BCP 14); RFC 8259 (JSON); RFC 3986 (URI) — §29.1.

**Internal companion appendices** — Appendix A (declaration and transition CDDL); Appendix B (illustrative sidecars); Appendix C (`TR-OP-*` anchor list).

**Informative only (§29.2 — do not cite as normative)** — Product vision; Unified Ledger Companion (draft); ULCOMP-R matrix as historical; Trellis Spec Family Normalization Plan §7; pre-normalization drafts.

**Core invariants named in companion** — #6 registry-snapshot binding; #11 namespace / posture vocabulary; #13 append idempotency; #14 snapshot/watermark/cadence; #15 posture honesty / actor discriminator (delegated compute).

---

## Quick Reference Tables

### Conformance tiers (§6.3)

| Tier | Name | Summary |
|------|------|---------|
| **OP-1** | Operational Baseline | Posture + custody declared; transitions on chain; operational idempotency; lifecycle/erasure; rejections; versioning. |
| **OP-2** | Projection-Disciplined | Watermarks everywhere; rebuildable projections; staff-view rules; snapshot-from-day-one; integrity sampling declared and run. |
| **OP-3** | Sidecar-Integrated | Respondent History ↔ Formspec Respondent Ledger; Workflow Governance ↔ WOS `custodyHook`; grants/revocations canonical; evaluators obey §10 rebuild semantics. |
| **OP-W** | (Phase 4) | Monitoring/witnessing full obligations — **seam only** in §26 / §6.3. |

### Standard custody models (§9.2)

| ID | Short name | Access posture (abbrev.) |
|----|------------|----------------------------|
| **CM-A** | Provider-Readable Custodial | Provider-readable current + historical. |
| **CM-B** | Reader-Held with Recovery Assistance | Reader-held; recovery assist under declared conditions. |
| **CM-C** | Delegated Compute | Delegated compute permitted; must declare provider plaintext exposure. |
| **CM-D** | Threshold-Assisted Custody | Quorum across custodians; honest threshold declaration. |
| **CM-E** | Organizational Trust | Org/tenant authority over recovery/access posture. |
| **CM-F** | Client-Origin Sovereign | Client keys; operator recovery absent unless declared. |

### Required rejection classes (§21.2, excerpt)

`invalid_signature`, `malformed_fact`, `unsupported_version`, `duplicate_submission`, `exhausted_idempotency_key`, `revoked_authority`, `unauthorized_access`, `posture_violation`, `lifecycle_state` — Operators MAY extend with documentation in posture declaration.

### Purge cascade scope identifiers (Appendix A.7)

| ID | Class |
|----|--------|
| **CS-01** | Consumer-facing and system projections (§15) |
| **CS-02** | Evaluator state incorporating destroyed material (§25) |
| **CS-03** | Performance/recovery snapshots (§16) |
| **CS-04** | Caches, indexes, materialized views (§15) |
| **CS-05** | Rebuild fixtures with destroyed material (§14 / §20) |
| **CS-06** | Respondent history views and workflow export views (§§23–24) |

### TR-OP traceability anchors (Appendix §C; matrix rows non-normative if they drift from prose)

Enumerated in source Appendix **§C** as the operational traceability row set in `trellis-requirements-matrix.md`:

| Group | IDs |
|-------|-----|
| 001–008 | TR-OP-001, TR-OP-002, TR-OP-003, TR-OP-004, TR-OP-005, TR-OP-006, TR-OP-007, TR-OP-008 |
| 010–017 | TR-OP-010, TR-OP-011, TR-OP-012, TR-OP-013, TR-OP-014, TR-OP-015, TR-OP-016, TR-OP-017 |
| 020–022 | TR-OP-020, TR-OP-021, TR-OP-022 |
| 030–034 | TR-OP-030, TR-OP-031, TR-OP-032, TR-OP-033, TR-OP-034 |
| 040–041 | TR-OP-040, TR-OP-041 |
| 042–045 | TR-OP-042, TR-OP-043, TR-OP-044, TR-OP-045 — posture-transition event auditability (Appendix A.5) |
| 050–053 | TR-OP-050, TR-OP-051, TR-OP-052, TR-OP-053 |
| 060–061 | TR-OP-060, TR-OP-061 |
| 070–074 | TR-OP-070, TR-OP-071, TR-OP-072, TR-OP-073, TR-OP-074 |
| 080 | TR-OP-080 |
| 090–092 | TR-OP-090, TR-OP-091, TR-OP-092 |
| 100–101 | TR-OP-100, TR-OP-101 |
| 110–112 | TR-OP-110, TR-OP-111, TR-OP-112 |
| 120–122 | TR-OP-120, TR-OP-121, TR-OP-122 |
| 130 | TR-OP-130 |

*Inline traceability in companion prose:* **TR-OP-001/002** (§§14.1, 15.2); **TR-OP-004** (§20.3–20.5); **TR-OP-005/006** (§15.3); **TR-OP-008** (§16.2, G-3 `coverage.tr_op`); **TR-OP-042–045** (Appendix A.5); **TR-OP-130** (§22.6, OC-93).

---

## Critical Behavioral Rules

1. **Core wins on conflict.** Any companion requirement that weakens Trellis Core invariants is invalid; do not reinterpret canonical truth, order, append attestation semantics, or export verification guarantees (§Relationship).
2. **No byte re-specification.** Operational companion cites Core for shapes; implement wire formats from Core + CDDL authority (§Relationship non-re-specification rule).
3. **Custody Models are `CM-A`…`CM-F` here;** they are **not** Respondent Ledger Profile A/B/C — never conflate labels (§9.6, OC-06).
4. **Posture changes on the §10.1 list must become canonical Posture Transition events** — silent changes are violations even if nothing “breaks” yet (§10.1–10.2).
5. **Posture-expanding transitions require dual attestation** when both authorities exist; narrowing MAY reduce attestation scope (§10.4, Appendix A.5.3 `scope_change` rules).
6. **Every derived artifact gets a watermark and rebuild path**; none is canonical for facts (§14; Core §15).
7. **Canonical records always beat projections/evaluators** on disagreement; never “correct” the chain from a dashboard (§14.3, §25.7).
8. **Snapshots from day one** at a declared, auditor-comparable cadence — full-replay-only is non-conformant (§16; TR-OP-008 for tooling).
9. **Operational idempotency** layers retry budgets, API windows, dedup stores, and replay-observable outcomes on top of Core §17 permanence (§18).
10. **Delegated compute** requires explicit canonical grants, authority attestation, and **exactly one** of `actor_human` / `actor_agent_under_delegation` per event under declaration scope (§19, OC-70c); **Trellis attestation does not replace WOS autonomy caps** (§19.6, §24.11 OC-113e).
11. **Crypto-shred is incomplete until the purge cascade** reaches every **CS-01…CS-06** class programmatically (§20.3–20.5, Appendix A.7).
12. **Authorization evaluators** must declare behavior under stale/missing/inconsistent/unavailable state; **silent fail-open is NON-CONFORMANT** (§25.6–25.7).
13. **`custodyHook` routes WOS governance to Trellis CAS** per Core §23; preserve WOS vs Trellis provenance; respect WOS causal order in `sequence` within `ledger_scope` including composed case scope (§24.9 OC-112/113/113a; Core §22.4, §23).
14. **Respondent History** binds to **Formspec Respondent Ledger §13** and Trellis canonical records without a second append truth (§23.10).
15. **Matrix `TR-OP-*` rows are traceability aids** — if they disagree with ratified companion prose, **fix the matrix** (Appendix §C).
