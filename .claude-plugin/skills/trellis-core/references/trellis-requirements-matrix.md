# Trellis Requirements Matrix Reference Map

> `trellis/specs/trellis-requirements-matrix.md` — 547 lines, ~88KB — traceability / requirements matrix (non-normative vs Core + Operational Companion prose)

## Overview

This document is the consolidated Trellis traceability matrix: stable IDs `TR-CORE-NNN` (core-scope) and `TR-OP-NNN` (operational-companion-scope), each row tying a single normative sentence to rationale, verification method, product-vision invariant (#1–#15) where applicable, and legacy `ULCR-*` / `ULCOMP-R-*` mapping. It supersedes four legacy matrices (archived under `specs/archive/core/` and `thoughts/archive/drafts/`). **Trellis Core and the Trellis Operational Companion remain the normative prose sources; this matrix is not an independent conformance authority.** If a matrix row conflicts with prose, prose wins and the row is treated as a bug to fix. The matrix also carries mapping tables (invariants → IDs, legacy → IDs), profile/custody namespace disambiguation (Invariant #11), and a gap log for dropped or reinstated legacy rows.

## Section Map

### Preamble and column schema (Lines 13-36)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| purpose | Purpose | States matrix role as consolidated traceability for the Trellis spec family; prose supremacy over matrix; legacy supersession paths. | not normative alone, prose governs, ULCR, ULCOMP-R, Phase 1 envelope | Establishing authority order before citing matrix rows as law. |
| column-schema | Column Schema (traceability) | Defines columns ID, Scope, Invariant, Requirement, Rationale, Verification, Legacy, Notes; IDs monotonic and never reused; BCP 14 for requirement keywords. | TR-CORE-, TR-OP-, test-vector, projection-rebuild-drill, declaration-doc-check, model-check, spec-cross-ref, manual-review | Interpreting any row or filtering by verification type. |
| scoped-vocab-note | Scoped-vocabulary note | Canonical truth / canonical record / canonical order are always resolved within the governed ledger scope in force (response ledger, case ledger, agency log, federation log); unqualified rows read scope-agnostically per §3.3 vocabulary. | §3.3, governed ledger scope, response ledger, case ledger, agency log, federation log | Reading rows about “canonical truth” without explicit scope qualifiers. |

### Section 1 — Core-scope requirements (Lines 38-201)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 1.1 | Contracts (Append / Derived / Workflow / Authorization / Trust / Export) | TR-CORE-001–007: constitutional contracts for append semantics, derived artifacts, workflow vs ledger, authz grants vs evaluator state, trust/posture honesty surface, export provenance, and binding-preservation across mechanism changes. | Canonical Append Contract, Derived Artifact Contract, Workflow Contract, Authorization Contract, Trust Contract, Export Contract | Cross-cutting “what must never break” for any Trellis implementation. |
| 1.2 | Ontology, Canonical Truth, and Companion Subordination | TR-CORE-010–018: five object classes, no collapsing derived/export into canonical truth, companion narrows but cannot reinterpret core, controlled vocabulary, three CDDL surfaces (authored / canonical / signed) non-interchangeable. | author-originated fact, canonical record, canonical append attestation, derived artifact, disclosure/export artifact, Core §6.8, G-3 | Ontology disputes, companion vs core conflicts, event surface naming. |
| 1.3 | Canonical Order and One-Per-Scope Invariant | TR-CORE-020–025: one append-attested order per governed scope; scope declaration; no alternate order from ops layers; order independent of receipt accidents; prev_hash linear vs DAG reservation; deterministic tie-break SHOULD. | Invariant #5, prev_hash, causal DAG, HLC | Ordering, concurrency, fork/equivocation semantics. |
| 1.4 | Canonical Hash Construction | TR-CORE-030–032: single authoritative event hash, dCBOR/pinned serialization, hashes over ciphertext for crypto-shredding, registry for future hash constructions. | Invariant #1, #4, dCBOR, RFC 8949 §4.2.2, fixtures/vectors/encoding | Encoding fixtures, hash-over-ciphertext, JCS legacy correction. |
| 1.5 | Signature Suite and Signing-Key Registry | TR-CORE-035–038: suite_id on every signed artifact, Phase 1 suite + PQC reservation, migration obligation for verifiers, signing-key registry snapshot in exports, key_bag/author_event_hash immutability under rotation. | Invariant #2, #3, #7, Ed25519, COSE_Sign1, ML-DSA, SLH-DSA, SigningKeyEntry, LedgerServiceWrapEntry | Signature agility, export self-containment, rotation. |
| 1.6 | Fact-Admission State Machine and Durable-Append Boundary | TR-CORE-040–046: five-class distinction at admission; companions narrow admissibility without reinterpretation; durable-append boundary defines canonicity; attestation scope vs content correctness; CAS attestation issuance rules and receipt contents. | durable-append boundary, Canonical Append Service, admission prerequisites | When a fact “becomes” canonical; attestation vs substance. |
| 1.7 | Append Idempotency and Rejection Semantics | TR-CORE-050–053: stable idempotency key on append; retry semantics; explicit auditable rejections; verifier-visible idempotent outcomes. | Invariant #13, idempotency key, no-op outcome | Wire contract deduplication and client retries. |
| 1.8 | Verification Independence and Export | TR-CORE-060–067: verifier duties without derived runtime; export generator floor; minimum export package; immutable references; class distinctions in exports; honesty when payload unreadable; verifier capability checklist. | stranger test, offline verifier, Export Generator | Export ZIP contents and offline verification story. |
| 1.9 | Manifest Bindings (Registry-Snapshot, Redaction, Plaintext-vs-Committed) | TR-CORE-070–073: manifest registry digest (Invariant #6); commitment slots in header (Invariant #8); plaintext vs committed header fields (Invariant #9); x-trellis-test/ reserved for fixtures, rejected in production. | Invariant #6, #8, #9, Core §14.6, Pedersen, Merkle, BBS+ deferred | Manifest semantics, conformance test event types, header privacy. |
| 1.10 | Head Format, Case Ledger, Agency Log (Forward Composition) | TR-CORE-080–083: Phase 1 export bytes = Phase 3 case-ledger event shape (strict superset); case head superset of checkpoint; agency log as case heads + metadata; AppendHead CBOR for append return only (not Phase 1 export). | Invariant #10, #12, AppendHead, Core §10.6 | Phase arc continuity, API vs export surfaces. |
| 1.11 | Snapshots, Watermarks, and Rebuild | TR-CORE-090–091: watermarks on derived artifacts and agency-log entries (Invariant #14); durable immutable canonical storage; snapshots derived; replica state operational. | tree_size, tree_head_hash, projection-rebuild-drill | Incremental projections vs full replay. |
| 1.12 | Posture Honesty and Companion Subordination | TR-CORE-100–103: no stronger trust claims than behavior (Invariant #15); Posture Declaration minimum fields; posture transitions auditable; conformance classes subordinate to declaration. | Posture Declaration, provider-readable, reader-held, delegated-compute | Trust marketing vs spec floor, posture docs. |
| 1.13 | Versioning, Lifecycle, and Metadata Minimization | TR-CORE-110–113: algorithm/schema versioning; lifecycle facts for crypto ops; erasure documentation; metadata minimization SHOULD/MUST NOT. | silent reinterpretation, crypto erasure, metadata minimization | Long-term verify historical records; retention metadata. |
| 1.14 | Cross-Repository Authority and Baseline Scope | TR-CORE-120–126: no redefining Formspec/WOS; delegate bind/FEL/validation; additive Trellis to Formspec; conformance floors; screener delegation; governed substrate binding; baseline does not require advanced crypto unless declared. | Core §22, §23, Formspec processor, Screener | Stack boundaries, what Trellis must not specify. |
| 1.15 | Conformance Roles | TR-CORE-130–134: five roles (Fact Producer, CAS, Verifier, Derived Processor, Export Generator); per-role MUST requirements. | role declaration, conformance unit | Scoping an implementation’s obligations. |
| 1.16 | Binding / Sidecar Boundary | TR-CORE-140–143: binding-declared byte/procedure exactness; vocabularies in companions; sidecars subordinate; attestation fields not rewritten in place. | binding, sidecar, Companion §23, §24 | Binding-specific normative bytes vs core. |

### Section 2 — Operational-companion-scope requirements (Lines 204-331)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 2.1 | Projection Discipline (Watermark, Stale Indication, Rebuild) | TR-OP-001–008: staff projection watermarks, stale indication, crypto-shredding cascade, rebuild byte-equality on deterministic portion (Core §15.3), tests for watermark/stale, projection integrity policy, checkpoint cadence vs Posture Declaration (OC-46 anchor). | Invariant #14, Watermark, Core §15.2, snapshot-from-day-one | Operator UX, projection conformance, checkpoint gaps. |
| 2.2 | Custody Models (CM-A … CM-F) | TR-OP-010–017, 015–016: per-model Posture Declaration honesty for CM-A–F; unified reader-held rules; reader-held vs provider-readable wording. | Companion §9, §9.2, §9.4, CM-A, CM-F, Invariant #11 | Mapping legacy companion “Profile A–E” to custody models. |
| 2.3 | Delegated Compute | TR-OP-020–022: delegation explicit/auditable vs provider readability; grant discipline; material reliance on delegated output as canonical facts with links. | delegated compute, canonical fact for reliance | AI/delegation operational patterns. |
| 2.4 | Grants, Revocations, Evaluator Rebuild | TR-OP-030–034: grants/revocations append-only canonical; derived evaluators rebuildable; delegation affecting rights as canonical; sharing-mode hygiene; rights-impacting evaluator traceability. | authorization evaluator, projection-rebuild-drill | Authz cache vs ledger of grants. |
| 2.5 | Metadata Budget and Verification Posture | TR-OP-040–045: metadata budget by fact family; verification posture tiers; custody-model and disclosure-profile transition CDDL (Appendix A.5.x, A.4); verifier continuity and co-publish rule for declarations (Core §19). | Invariant #9, #11, #15, trellis.custody-model-transition.v1, trellis.disclosure-profile-transition.v1, rl-profile-A/B/C | Posture-transition events and declaration digests. |
| 2.6 | Offline Authoring Conformance Class | TR-OP-050–053: delayed submission, authored vs canonical time, pending non-canonical state, replay/duplicate behavior. | offline authoring, pending facts, non-canonical | Mobile/offline authoring operations. |
| 2.7 | Durable-Append Boundary, Storage, Conflict Handling | TR-OP-060–061: operational durable-append elaboration (pairs TR-CORE-042); conflict handling scoped without silent canonical rewrite or cross-scope stall. | durable-append boundary, conflict-sensitive categories | Multi-scope append under conflict. |
| 2.8 | Protected Payloads, Selective Disclosure, Disclosure Artifacts | TR-OP-070–074: protected payloads; selective disclosure via disclosure/export artifacts; disclosure not rewrite of canonical truth; disclosure/export conformance class; claim-class honesty. | Invariant #8, protected payload, disclosure artifact | Privacy-preserving export and audience-specific views. |
| 2.9 | Privacy / Metadata Minimization (operational elaboration) | TR-OP-080: document who is protected from whom; payload confidentiality ≠ metadata privacy; plain-language provider readability. | metadata privacy, declaration-doc-check | Privacy documentation for deployments. |
| 2.10 | CAS Operational Obligations and Proof Model | TR-OP-090–092: CAS validates admissibility and proofs without over-reaching into decrypt/workflow unless declaration says so; one proof model per scope; external witnessing subordinate to core append semantics. | CAS, proof model, transparency-log style | Operational limits of append service. |
| 2.11 | Lifecycle, Erasure, Sealing, Legal Sufficiency (ledger-scoped) | TR-OP-100–101: operational elaboration of erasure (TR-CORE-112); cryptography ≠ legal sufficiency claims. | legal sufficiency, manual-review | Compliance marketing boundaries. |
| 2.12 | Versioning / Algorithm Agility (operational elaboration) | TR-OP-110–112: immutable interpretation material for historical verify; SHOULD test via model check/fuzz; offline coordination guidance. | Invariant #2, model-check, property-based | Operational testing and migration posture. |
| 2.13 | Companion-Scope Companion-Subordination Restatements | TR-OP-120–122: operational companion cannot create second order or collapse derived; may refine custody/binding; scoped exports honest about coverage. | Companion §14, §15, §27 | Sanity-checking operational-only extensions. |
| 2.14 | Versioned Registries (Operator-Side Complement to Invariant #6) | TR-OP-130: SHOULD versioned registries for taxonomy/vocabularies; digestible for manifest (complements TR-CORE-070); reinstated from gap log §5.4. | Invariant #6, ULCOMP-R-197, versioned registries | Operator registry practice + export manifest binding. |

### Section 3 — Mapping tables (Lines 334-416)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 3.1 | Invariants #1–#15 → `TR-CORE-NNN` | Maps each product-vision envelope invariant to contributing TR-CORE rows and optional TR-OP rows; notes #11 as spec-prose + §4 of matrix. | Invariant #1–#15, traceability | “Which IDs implement invariant #N?” |
| 3.2 | Legacy ID → `TR-NNN` (Traceability) | Shorthand index: ULCR/ULCOMP-R ranges consolidated to current TR-* rows; notes §5 drops. | ULCR, ULCOMP-R, legacy migration | Translating old matrix citations to Trellis IDs. |
| 3.3 | Terminology Reconciliation | Replaces loose “canonical substrate” language with governed canonical substrate and four scoped tiers; ledger vs log naming. | response ledger, case ledger, agency log, federation log | Scoped vocabulary for truth/order claims. |

### Section 4 — Profile-namespace disambiguation (Invariant #11) (Lines 418-469)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 4.1 | Respondent Ledger posture axes | Retains “Respondent Ledger Profile A/B/C” as orthogonal axes (Formspec Respondent Ledger upstream). | Respondent Ledger Profile A/B/C, thoughts/formspec/specs/respondent-ledger-spec.md §15A | Disambiguating “Profile” from custody model letters. |
| 4.2 | Legacy core-draft profiles → Conformance Classes | Renames core-draft “profiles” to Conformance Classes (Core-owned); User-Held / Respondent-History owned upstream by Formspec RL. | Conformance Class: Core, Offline, Reader-Held, Delegated-Compute, Disclosure | Trellis conformance class naming. |
| 4.3 | Legacy companion Profiles A–E → Custody Models CM-A…CM-F | Maps legacy companion letters to CM-* identifiers; CM-F client-origin sovereign; definitions in Companion §9.2. | CM-A, CM-F, Companion §9.2, TR-OP-010..017 | Custody model rows and posture declarations. |
| 4.4 | Phase-scoped Trellis capability tiers | Phase names for capability tiers (Attested-export through Federation), not profile letters. | Phase 1–4, Federation tier | Product roadmap language vs matrix IDs. |

### Section 5 — Gap log (Legacy rows dropped) (Lines 472-537)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| 5.1 | Dropped: superseded by invariant or consolidated row | ULCR-041, 042, 044, 045, 046: archived-core meaning governs over drafts; each mapped to superseding TR-* with DRAFTS-meaning coverage notes. | [corrected], Plan 3, specs/archive/core | Why specific ULCR IDs vanished. |
| 5.2 | Dropped: out of scope (Formspec RL or WOS) | Rows owned by Respondent Ledger, WOS Assurance, WOS Governance; precise section citations; generic lifecycle upstream. | WOS Assurance, WOS Governance, Respondent Ledger §5–9 | Avoid duplicating upstream specs in Trellis matrix. |
| 5.3 | Dropped: duplicate of consolidated row | ULCR-073, 113, 114, 075 subsumed by TR-CORE/TR-OP consolidation. | [confirmed] | Explaining duplicate legacy IDs. |
| 5.4 | Reinstated: drop was unsound | ULCOMP-R-197 → TR-OP-130; WOS Governance Appendix A mis-citation corrected via cross-reference-map. | [reinstated as TR-*-NNN], registry conventions | Registry versioning operator duty. |
| 5.5 | Contradictions between legacy matrices | Resolves substrate scope, companion profile letters vs RL profiles, core-draft “profiles” vs conformance classes in favor of §3.3 and §4. | namespace collision, governed canonical substrate | Historical draft confusion audits. |

### Closing references (Lines 540-547)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| refs | References | Canonical pointers to product vision, trellis-core, trellis-operational-companion, cross-reference-map, legacy archives. | normative specs, non-normative legacy | Building a reading stack from matrix footnotes. |

## Cross-References

**Normative Trellis prose (authority over matrix)**

- `trellis/specs/trellis-core.md` — primary normative spec; cited throughout as Core §1–4, §6–7, §9–16, §19–23 (hash construction §9 / §9.8, verification algorithm §19, Formspec/WOS seams §22–23, test prefix §14.6, AppendHead §10.6, envelope/header commitments §12–13, Watermark §15.2, deterministic projection portion §15.3, posture §20, custody §21.3, etc.).
- `trellis/specs/trellis-operational-companion.md` — operational normative spec; Companion §6, §9–11, §14–16, §23–24, §27; Appendix A.4 (Custody Model Registry), A.5.1 (`trellis.custody-model-transition.v1`), A.5.2 (`trellis.disclosure-profile-transition.v1`); OC-09, OC-15, OC-46 (snapshot-from-day-one / co-publish); §10.4 attestation-count semantics for posture transitions.

**Product vision and terminology**

- `thoughts/product-vision.md` — Phase 1 envelope invariants #1–#15; terminology block; Track E §21.

**Formspec / WOS upstream (matrix rows dropped or delegated)**

- `thoughts/formspec/specs/respondent-ledger-spec.md` — §15A (Recommended deployment profiles / Respondent Ledger Profile A/B/C); §5–9, §6.6, §6.6A, §6.6.1, §6.7, §7 ChangeSetEntry, §8 event taxonomy, §9 materiality (per gap log citations).
- WOS Assurance — §2 Assurance Levels, §3 Subject Continuity, §4 Invariant 6 (disclosure vs assurance), §5 Provider-Neutral Attestation (per §5.2 gap table).
- WOS Governance — workflow governance `workflow-governance.md` §§3–4, §8, §11; §2.9 schema upgrade lifecycle; §7.15 legal hold / retention precedence (per §5.2).
- WOS Kernel — `custodyHook` seam referenced in Trellis architecture (not re-listed in matrix body but part of stack context in skill docs).

**Repository indices and legacy**

- `specs/cross-reference-map.md` — authoritative concept→section index for dropped-row upstream destinations; cited in §5.2, §5.4.
- Legacy matrices (non-normative): `specs/archive/core/unified-ledger-requirements-matrix.md`, `specs/archive/core/unified-ledger-companion-requirements-matrix.md`, `thoughts/archive/drafts/unified-ledger-requirements-matrix.md`, `thoughts/archive/drafts/unified-ledger-companion-requirements-matrix.md` — `Legacy` column resolves to archived-core for completeness (ULCR-104..115, ULCOMP-R-215..223).

**Standards, encodings, and CDDL surfaces**

- BCP 14 — RFC 2119 requirement keywords in Requirement column.
- RFC 8949 §4.2.2 — deterministic CBOR (dCBOR) paired with Core-defined hash preimages (matrix §1.4).
- CDDL types / structures — `AuthorEventHashPreimage`, `EventPayload`, `Event` as `COSESign1Bytes` (TR-CORE-018); `SigningKeyEntry`; `AppendHead` (scope, sequence, `canonical_event_hash`); `Watermark` (Core §15.2); `trellis-posture-declaration-v1` digest (TR-OP-044); `rl-profile-A` / `rl-profile-B` / `rl-profile-C`; Pedersen / Merkle / BBS+ as deferred or slot-level references.

**Fixtures and verification artifacts**

- `fixtures/vectors/...` — especially `fixtures/vectors/encoding/` for dCBOR round-trip byte vectors (TR-CORE-032 notes); `test-vector` verification class throughout.

**Design notes referenced inline**

- G-3 gap tracking (e.g. B2, B3, S1/S2), Wave 1 Stream B O-3, Wave 1 Stream D O-5 — authoring/traceability notes tied to specific TR rows (TR-CORE-018, 073, 083; TR-OP-005,006,008; TR-OP-042–045).

## Quick Reference — `TR-CORE-NNN` by block

| IDs | § | Short label |
|-----|---|----------------|
| 001–007 | 1.1 | Core contracts (append, derived, workflow, authz, trust, export, binding preservation) |
| 010–018 | 1.2 | Object classes, companion subordination, vocabulary, three event surfaces |
| 020–025 | 1.3 | One order per scope, scope declaration, no ops-layer order, no receipt-time order, prev_hash model, tie-break |
| 030–032 | 1.4 | One hash construction, ciphertext hashing, dCBOR + SHA-256 + registry rule |
| 035–038 | 1.5 | suite_id, migration, signing-key registry export, key_bag immutability |
| 040–046 | 1.6 | Admission FSM, durable-append boundary, attestation rules |
| 050–053 | 1.7 | Append idempotency and rejections |
| 060–067 | 1.8 | Verifier independence and export package |
| 070–073 | 1.9 | Manifest registry digest, commitment slots, plaintext vs committed, `x-trellis-test/` |
| 080–083 | 1.10 | Phase-forward head shapes, AppendHead API artifact |
| 090–091 | 1.11 | Watermarks + derived/agency rebuild; snapshots operational |
| 100–103 | 1.12 | Posture honesty + declaration fields + transitions + subordination to declaration |
| 110–113 | 1.13 | Versioning, ledger-scoped lifecycle/crypto erasure, metadata minimization |
| 120–126 | 1.14 | Formspec/WOS authority, additive rule, floors, screener delegation, substrate binding, baseline scope |
| 130–134 | 1.15 | Five conformance roles |
| 140–143 | 1.16 | Binding exactness, companion vocabularies, sidecars, receipt immutability |

## Quick Reference — `TR-OP-NNN` by block

| IDs | § | Short label |
|-----|---|----------------|
| 001–008 | 2.1 | Projection watermarks, stale, shred cascade, rebuild equiv, tests, integrity policy, checkpoints |
| 010–017, 015–016 | 2.2 | CM-A–F declaration honesty; reader-held rules |
| 020–022 | 2.3 | Delegated compute discipline and material reliance |
| 030–034 | 2.4 | Grants/revocations canonical; evaluator rebuild; rights-impacting traces |
| 040–045 | 2.5 | Metadata budget; verification posture; posture-transition CDDL + verifier rules + co-publish digest |
| 050–053 | 2.6 | Offline authoring conformance |
| 060–061 | 2.7 | Durable-append ops; conflict handling |
| 070–074 | 2.8 | Protected payloads, selective disclosure, disclosure artifacts, claim honesty |
| 080 | 2.9 | Operational privacy/metadata disclosure |
| 090–092 | 2.10 | CAS ops scope, single proof model, witnessing |
| 100–101 | 2.11 | Erasure ops restatement; legal sufficiency honesty |
| 110–112 | 2.12 | Historical verify material; testing SHOULDs; offline coordination guidance |
| 120–122 | 2.13 | Operational companion subordination restatements |
| 130 | 2.14 | Versioned registries for manifest binding |

## Quick Reference — Invariant #1–#15 → matrix rows

See source §3.1 for the authoritative table. Summary: #1→030,032 | #2→035,036 + OP-110 | #3→037 | #4→030,031 | #5→020–025 | #6→070 + OP-130 | #7→038 | #8→071 + OP-071 | #9→072 + OP-040 | #10→080 | #11→§4 + OP-042,043 | #12→081–083 | #13→050,051,053 | #14→090 + OP-001–006 | #15→100 + OP-010–014,040 + OP-044,045.

## Critical Behavioral Rules

1. **Prose wins.** Trellis Core and the Operational Companion are normative; this matrix is traceability only. Any conflict is a matrix defect, not a license to ignore Core/Companion prose.
2. **Scoped vocabulary is load-bearing.** “Canonical truth,” “canonical record,” and “canonical order” are interpreted within the active governed ledger scope (response / case / agency / federation); unqualified matrix language inherits §3.3, not a global implicit scope.
3. **Five object classes stay distinct.** Author-originated fact, canonical record, canonical append attestation, derived artifact, and disclosure/export artifact must not be collapsed for verification, export, or companion wording (TR-CORE-010–012, 040,060,065; TR-OP-120–122).
4. **One append-attested order per governed scope.** Partition by disjoint scope is allowed; competing orders for the same scope are forbidden (TR-CORE-020–022).
5. **Hashes and encoding are pinned.** Single authoritative event hash construction; deterministic CBOR; hashes over ciphertext where crypto-shredding applies; future constructions require registry before mandatory verifier acceptance (TR-CORE-030–032).
6. **Canonicity starts at the durable-append boundary.** Attestation timing pairs with admission prerequisites; CAS must not attest before the boundary or before dependencies (TR-CORE-042–046).
7. **Append idempotency is a wire contract.** Stable idempotency key; same key+payload → same reference; same key+different payload → defined rejection (TR-CORE-050–051).
8. **Verification does not depend on derived runtime state** for canonical integrity (TR-CORE-061); exports must carry enough for offline verification (TR-CORE-062–067).
9. **Companions narrow; they do not reinterpret core** or introduce a second canonical order (TR-CORE-015–016; TR-OP-120–121).
10. **Posture declarations must not overclaim** reader-held vs provider-readable vs delegated compute; transitions are auditable and declaration digests on transition events must co-publish the post-transition declaration (TR-CORE-100–103; TR-OP-044–045).
11. **Formspec and WOS semantics are not redefined here** — delegate processing; Trellis is additive to a Formspec-only processor (TR-CORE-120–125).
12. **Projections and agency-log entries carry watermarks** and rebuild paths; stale views must be visible when behind checkpoint (TR-CORE-090–091; TR-OP-001–003).
13. **Legacy IDs map 1:1 to consolidated rows** in the `Legacy` column; dropped legacy rows are explained in §5 with disposition tags — do not “resurrect” meaning without reading the gap log.
14. **Namespace disambiguation (Invariant #11):** Respondent Ledger Profile A/B/C ≠ companion custody letters; companion letters are CM-A–F; core-draft “profiles” are Conformance Classes (§4).
