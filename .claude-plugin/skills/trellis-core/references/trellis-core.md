# Trellis Core Specification Reference Map

> `trellis/specs/trellis-core.md` — **2324** lines, ~165 KB — **Phase 1 Core** (integrity substrate beneath Formspec intake and WOS governance). Companion: Formspec Core v1.0, Formspec Respondent Ledger v0.1, WOS Kernel v1.0.

## Overview

Trellis specifies byte-exact, append-only, offline-verifiable **events** (COSE_Sign1 over dCBOR `EventPayload`), **hash chains** per `ledger_scope`, **signed checkpoints** over Merkle trees of canonical event hashes, **HPKE-wrapped** payload keys, **signing-key registry** snapshots in exports, and a **deterministic ZIP** export layout with a normative **verification algorithm**. Phase 2/3 behavior extends only through reserved containers and registered `*.extensions` keys; the Phase 1 envelope is the long-term case-ledger event shape.

**Authority (cross-stack, load-bearing):** For this family, treat **Rust reference crates** as byte authority where ADR 0004 applies, then **CDDL in §28 (Appendix A)** for structural wire shape, then **normative prose** in §§1–29, then **`trellis-requirements-matrix.md`** `TR-CORE-*` rows as traceability aids (correct matrix if it drifts from prose), then any **Python cross-checks**, with **`specs/archive/`** and other archives **non-normative** (do not cite as authority). **Version 1.0.0 / ratified** is a coherent-snapshot label, not a freeze against drift: implementation and matrix must track the spec.

## Section Map

### Title, abstract, status, and table of contents (Lines 9–63)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| — | Trellis Core Specification (Phase 1) | Document title, YAML frontmatter (`version`, `status`, `date`, `editors`). | Phase 1, ratified, 2026-04-21 | Confirm edition metadata. |
| — | Abstract | Stack role: cryptographic integrity for events, response ledgers, checkpoints, exports; COSE, dCBOR, SHA-256, Ed25519, HPKE; Phase 2/3 as strict supersets via reserved slots. | stranger test, offline verification, Operational Companion | Explain what Trellis is / is not. |
| — | Status of This Document | Ratified Phase 1 Core; stranger test closed against fixture corpus (§29); operational guarantees delegated to Operational Companion; archives under `specs/archive/` superseded for Phase 1 normative text. | fixture corpus, supersession | Procurement / “what ships in Phase 1”. |
| — | Table of Contents | Numbered outline through Appendix B and References. | section index | Navigate long document. |

### §1 Introduction (Lines 65–101)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §1.1 | What Trellis is | Trellis as smallest attested record unit: signature over deterministic CBOR, content hash over ciphertext, registry-resolvable keys, checkpoint-attested append position. | envelope, not workflow engine | Scope questions. |
| §1.2 | Three scopes of append-only structure | **Event**, **response ledger**, **case ledger**, **agency log**, **federation log** — all Trellis-shaped; “ledger” always qualified. | ledger_scope, sealed response | Multi-scope architecture. |
| §1.3 | Non-goals | Explicit exclusions: WOS/Formspec semantics, storage, transport, PQC Phase 1, BBS+ Phase 1, legal admissibility. | Phase 1 pins | Avoid spec creep. |
| §1.4 | Phase supersetting commitment | Phase 1 envelope = Phase 3 case-ledger event format; unknown **top-level** payload fields rejected; extensions via reserved maps only. | strict superset, §6.5 MUST | Forward compatibility / version bumps. |

### §2 Conformance (Lines 103–122)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §2.1 | Conformance classes | **Fact Producer**, **Canonical Append Service**, **Verifier**, **Derived Processor**, **Export Generator** — each MUST satisfy tagged requirements. | RFC 2119, profiles renamed | Claiming conformance. |
| §2.2 | RFC 2119 scope | Keywords bind wire format, verifier, export, posture honesty; not UX/transport/delegated companion topics. | MUST scope | Keyword interpretation. |

### §3 Terminology (Lines 125–149)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §3 | Terminology | Canonical definitions: canonical event hash, prior event hash, content hash, `suite_id`, `kid`, payload ref, registry, key bag, checkpoint, watermark, idempotency key, custody vs conformance vs RL Profile A/B/C. | trellis-event-v1, trellis-author-event-v1, Respondent Ledger §15A | Any term disambiguation. |

### §4 Non-goals and authority boundaries (Lines 152–161)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §4 | Non-goals and authority boundaries | **Formspec** owns definition/response/FEL/validation; **WOS** owns workflow/governance; **Trellis** owns envelope/chain/checkpoint/export/verify only; MUST delegate upstream semantics. | authority boundary, MUST NOT restate | Cross-spec ownership disputes. |

### §5 Canonical encoding (Lines 164–195)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §5.1 | Pinned encoding: dCBOR | Core deterministic CBOR (RFC 8949 §4.2.2 profile): map key order, no indefinite length, float rules. | dCBOR, lexicographic keys | Serialization bugs. |
| §5.2 | Reproducibility requirement | Fixture bytes MUST match across implementations; semantic equivalence without byte match is non-conformant. | byte-for-byte, §29 | Test vectors / interop. |
| §5.3 | CDDL grammar fragment | Base `canonical-bytes` / `digest` fragment; full grammar in §28. | CDDL, Appendix A | Type definitions entry. |

### §6 Event format (Lines 198–338)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §6.1 | Normative structure | `Event` = COSE_Sign1; `EventPayload` map keys fixed; Phase 1 MUST NOT emit unknown top-level keys; `extensions` for growth. | EventPayload, idempotency_key | Wire event layout. |
| §6.2 | Sequence and prev_hash | `sequence` monotonic; `prev_hash` null iff sequence 0; `causal_deps` null or [] Phase 1. | linear chain, ledger_scope | Chain validation. |
| §6.3 | author_event_hash | Binds author-originated fields; immutable under LAK re-wrap (§8.6). | AuthorEventHashPreimage, §9.5 | Hash vs rotation. |
| §6.4 | content_hash over ciphertext | SHA-256 over ciphertext; `PayloadInline` / `PayloadExternal`; `AvailabilityHint`; crypto-shredding rationale. | trellis-content-v1, PayloadRef | Payload integrity / withholding. |
| §6.5 | Phase-superset extension points | Reserved: `causal_deps`, `commitments`, `EventPayload.extensions`, `header.extensions`, `witness_ref`; strict superset commitment. | Phase 2, Phase 3 | Extension design. |
| §6.6 | Signature scope | COSE `Sig_structure` over dCBOR `EventPayload`; protected headers per §7.4. | Signature1, external_aad | Signing implementation. |
| §6.7 | Extension Registration | `trellis.*` / `x-` rules; **registered identifiers table** (custody/disclosure transitions, staff-view binding, evidence attachment, export catalogs, Phase 2+ keys). | trellis.export.attachments.v1, reject-if-unknown-at-version | Registered extension behavior. |
| §6.8 | Three event surfaces | **Authored** (`AuthorEventHashPreimage`), **canonical** (`EventPayload`), **signed** (`Event` COSE) — different bytes; TR-CORE-018. | authored form, canonical form, signed form | Fixtures / hashing confusion. |

### §7 Signature profile (Lines 341–407)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §7.1 | Pinned Phase 1 suite | `suite_id = 1` → Ed25519/COSE, SHA-256 dependent digests. | alg -8, EdDSA | Default suite. |
| §7.2 | suite_id IANA-style registry | Table 0–15; unregistered MUST reject. | suite_id registry | New algorithms. |
| §7.3 | Migration obligation | Verifier uses in-band `suite_id`; export embeds keys; multi-decade verify story. | post-quantum reserved | Long-term archive. |
| §7.4 | COSE protected headers and Sig_structure | Embedded payload only; `alg`, `kid`, `suite_id` required; private-use negative labels; protected header bstr bytes are signature-critical. | -65537, artifact_type | COSE interop bugs. |

### §8 Signing-key registry (Lines 410–495)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §8.1 | Why this exists | Exports MUST embed resolvable keys post-rotation. | self-contained export | Verification after rotation. |
| §8.2 | SigningKeyEntry | CDDL: `kid`, `pubkey`, `suite_id`, `status`, validity, supersedes, attestation. | SigningKeyStatus | Registry records. |
| §8.3 | kid format | 16-byte opaque; optional **derived** `kid` = first 16 bytes SHA-256(dCBOR(suite_id) \|\| pubkey). | kid derivation | kid collisions / format. |
| §8.4 | Lifecycle | Active → Rotating → Retired/Revoked transitions; Revoked terminal; Retired still verifies history. | Revoked, Retired | Key state machine. |
| §8.5 | Registry snapshot in every export | Complete transitive closure for cited `kid`s. | export completeness | Missing key failures. |
| §8.6 | LedgerServiceWrapEntry under LAK rotation | Re-wrap append-only; MUST NOT mutate event `key_bag` / `author_event_hash`. | LAK, invariant #7 | Service-side rotation. |

### §9 Hash construction (Lines 498–654)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §9.1 | Domain separation discipline | UTF-8 tag + 4-byte big-endian length prefixes for each component. | len(tag), SHA-256 | Any digest computation. |
| §9.2 | Canonical event hash | `trellis-event-v1` over `dCBOR(CanonicalEventHashPreimage)`. | CanonicalEventHashPreimage | Event identity hash. |
| §9.3 | Content hash | `trellis-content-v1` over ciphertext bytes only. | crypto-shredding | Plaintext vs ciphertext hash errors. |
| §9.4 | Key bag and HPKE wrap | HPKE suite 1 Base mode; fresh ephemeral per wrap per ledger scope; fixture private-key carve-out. | KeyBagEntry, RFC 9180 | HPKE / AEAD. |
| §9.5 | author_event_hash construction | `trellis-author-event-v1` over `AuthorEventHashPreimage` (excludes `author_event_hash`, signatures). | trellis-author-event-v1 | Authoring pipeline. |
| §9.6 | Checkpoint digest | `trellis-checkpoint-v1` over checkpoint preimage. | CheckpointHashPreimage | Checkpoint ID hash. |
| §9.7 | Export manifest digest | `trellis-export-manifest-v1` over manifest preimage. | ExportManifestHashPreimage | Manifest binding. |
| §9.8 | Domain-tag registry | Lists all Trellis domain tags including posture/transition attestation tags. | trellis-merkle-leaf-v1, trellis-posture-declaration-v1 | Tag collisions / new tags. |

### §10 Chain construction (Lines 657–702)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §10.1 | Phase 1: strict linear chain | Total order by `sequence` within scope. | strict linear | Ordering model. |
| §10.2 | prev_hash requirements | Genesis null; else predecessor canonical hash. | prev_hash, canonical_event_hash | Chain replay / fork. |
| §10.3 | Reserved: causal dependencies | Phase 2 DAG/HLC; Phase 1 empty only at version 1. | causal_deps | Phase 2 upgrade path. |
| §10.4 | Ledger scope and partitioning | One canonical order per scope; examples include one Formspec Response. | ledger_scope | Multi-tenant isolation. |
| §10.5 | Append-only invariant | No rewrite after admit; corrections are new events. | admitted | Tampering / edits. |
| §10.6 | Append head artifact | `AppendHead` dCBOR return shape; links to next `prev_hash`; TR-CORE-083; not in ZIP. | AppendHead | Append API contract. |

### §11 Checkpoint format (Lines 705–788)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §11.1 | Purpose | Signed Merkle root over canonical event hashes; inclusion/consistency proofs; optional anchors. | tree_head_hash | “What is a checkpoint?” |
| §11.2 | Checkpoint structure | `CheckpointPayload` fields; checkpoint digest equals §9.6; `prev_checkpoint_hash` chains checkpoints. | Checkpoint, trellis-checkpoint-v1 | Checkpoint CBOR. |
| §11.3 | Merkle tree construction | RFC 6962-style with domain-separated leaf/interior; odd-node promotion. | trellis-merkle-leaf-v1 | Tree root mismatch. |
| §11.4 | Inclusion and consistency proofs | Verifier MUST recompute roots; failed consistency ⇒ tampered source / §10.5 violation. | InclusionProof, ConsistencyProof | Proof verification. |
| §11.5 | anchor_ref | Optional external anchor; Phase 1 MUST NOT require non-null for verify success. | Phase 4, OpenTimestamps | Anchoring policy. |
| §11.6 | Head-format extension container | Phase 3 data only in `CheckpointPayload.extensions`; invariant #12 / agency adoption. | CaseLedgerHeadExtensions | Case-ledger / agency heads. |
| §11.7 | Interop sidecar derivation (non-normative) | SCITT-shaped interop optional per **ADR 0008**; core verify MUST NOT depend on sidecar. | ADR 0008, SCITT | Sidecar receipts. |

### §12 Header policy (Lines 791–849)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §12.1 | EventHeader shape | Plaintext vs commitment fields; `witness_ref` reserved. | event_type, classification | Header layout. |
| §12.2 | Plaintext vs. committed declaration table | Normative layer table; commitments use `trellis-header-commitment-v1` + nonce in ciphertext. | outcome_commitment, metadata leakage | Privacy / HIPAA-style concerns. |
| §12.3 | extensions sub-map | Same registration rules as §6.7; MUST NOT smuggle committed-layer data. | EventHeader.extensions | Header extensions. |
| §12.4 | Event-type granularity | **Outcome-neutral** event types; outcomes in payload/`outcome_commitment`. | wos.determination | Enumeration leakage. |

### §13 Commitment slots reserved (Lines 852–887)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §13.1 | Commitment structure | `scheme`, `slot`, `value`, `metadata`. | Commitment | Future selective disclosure. |
| §13.2 | Fixed-position vectors | Per `event_type` fixed slot count; unused slots identity-filled. | slot vector | Type-specific commitments. |
| §13.3 | Scheme registry | Schemes 0–3 reserved / Phase 2+; Phase 1 `commitments` null or []. | BBS+, Pedersen | Scheme IDs. |
| §13.4 | Why slots, not implementation | Avoid locking obsolete crypto in Phase 1. | wire reservation | Why empty commitments. |

### §14 Registry snapshot binding (Lines 890–937)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §14.1 | The problem | Byte integrity ≠ semantic meaning without bound registry snapshot. | semantic verifiability | “Why embed registries?” |
| §14.2 | Bound registry | Export embeds domain registry bytes: event types, roles, governance ruleset, classification vocabulary. | registry snapshot | Export manifest design. |
| §14.3 | RegistryBinding | `registry_digest`, `registry_format`, `registry_version`, `bound_at_sequence`. | bound_at_sequence | Registry evolution. |
| §14.4 | Verifier obligation | Resolve meaning for event at sequence S using latest binding with `bound_at_sequence ≤ S`; **live lookup non-conformant**. | §14.4 | Historical interpretation. |
| §14.5 | Registry migration discipline | Breaking semantic changes require binding event before new admits. | registry migration | Governance of taxonomy. |
| §14.6 | Reserved test identifiers | `x-trellis-test/*` for fixtures; production MUST reject; TR-CORE-073. | x-trellis-test | Conformance vs production. |

### §15 Snapshot and watermark discipline (Lines 940–979)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §15.1 | Core rule | Derived artifacts and agency-log entries MUST carry **watermark** + deterministic **rebuild path**; elaboration in Companion. | Derived Processor | Projections / rebuildability. |
| §15.2 | Watermark | `Watermark` CDDL; `checkpoint_ref`, `rebuild_path`, optional `projection_schema_id` (URI when present for Companion §14.1 projections). | projection_schema_id | Staff views / OC-40. |
| §15.3 | Rebuild path | dCBOR for rebuildable artifacts; nondeterministic fields declared in path id (Companion §15.3 OC-40). | rebuild_path | Byte equality of rebuilds. |
| §15.4 | Rule applies to agency-log entries | Phase 3 agency entries are derived; MUST be rebuildable from case ledgers. | agency log watermark | Phase 3 integrity story. |

### §16 Verification independence contract (Lines 983–1009)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §16.1 | Normative requirement | Offline verify: no DB/APIs except optional named external proof material. | air-gapped | Export completeness claims. |
| §16.2 | No live registry lookups | Phase 1 verifier MUST NOT live-resolve registries. | embedded registry | Verifier implementation. |
| §16.3 | Optional external anchors | Baseline verify succeeds without fetching anchors unless registered deployment class says otherwise. | external_anchors | Anchor failures. |
| §16.4 | Omitted-payload honesty | Separate booleans for structure/integrity/readability; MUST declare omitted checks. | omitted_payload_checks, structure_verified | Redacted exports. |

### §17 Append idempotency contract (Lines 1012–1066)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §17.1 | Why this is wire contract | Envelope-layer idempotency for multi-operator interop. | append contract | Retry semantics. |
| §17.2 | idempotency_key | 1–64 bytes; UUIDv7 recommended; deterministic hash alternative. | UUIDv7, RFC 9562 | Key generation. |
| §17.3 | Resolution semantics | `(ledger_scope, idempotency_key)` permanent; same key + different payload ⇒ `IdempotencyKeyPayloadMismatch`. | scope-permanent | Duplicate detection bugs. |
| §17.4 | Operational retry policy boundary | Companion §18 owns TTL/store lifecycle; cannot relax §17.3 identity rule. | Operational Companion §18 | Ops vs wire. |
| §17.5 | Rejection codes | Normative table: `prev_hash_mismatch`, `sequence_gap`, `unknown_suite_id`, etc. | IdempotencyKeyPayloadMismatch | API error mapping. |

### §18 Export package layout (Lines 1069–1226)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §18.1 | Deterministic ZIP | Lexicographic member order, STORED only, fixed mtime, no DEFLATE; `000-` prefix ordering trick. | STORE, deterministic ZIP | ZIP nondeterminism. |
| §18.2 | Required archive members | Tree under `trellis-export-<scope>-<tree_size>-<shorthash>/`; optional `061`/`062`/`063` catalogs. | 010-events.cbor, 000-manifest.cbor | Package layout. |
| §18.3 | ExportManifest | Signed manifest binds digests; `PostureDeclaration`, `omitted_payload_checks`, `extensions`. | ExportManifestPayload | Manifest fields. |
| §18.4 | 010-events.cbor | dCBOR array of `Event` in canonical order. | events_digest | Event ordering in export. |
| §18.5 | inclusion-proofs.cbor and consistency-proofs.cbor | Map/array shapes for proofs. | leaf_index, ConsistencyProof | Proof files. |
| §18.6 | 040-checkpoints.cbor | Ordered checkpoints; `prev_checkpoint_hash` chain. | checkpoints_digest | Checkpoint sequence. |
| §18.7 | Head format version and superset commitment | `head_format_version` vs `CheckpointPayload.version`; Phase 3 head superset via extensions. | head_format_version | Version confusion. |
| §18.8 | verify.sh | POSIX script, no network, delegates to bundled verifier binary. | 090-verify.sh | Human-run verify path. |
| §18.9 | README.md | MUST disclose scope, tree head, posture, omitted checks, invocation; not legal claims. | 098-README.md | README normative bits. |

### §19 Verification algorithm (Lines 1229–1467)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §19 | VERIFY(E) algorithm (steps 1–10) | Full offline procedure: ZIP open, manifest verify, digest checks, per-event checks (signatures, hashes, chain, registry, **staff-view binding** for rights-impacting events), checkpoints, **posture-transition** continuity (Companion A.5), optional **ADR 0072** attachments, **WOS Signature Profile** affirmations catalog, **ADR 0073** intake-handoffs catalog, proofs, posture declaration anchors, tri-boolean verdict; `PostureTransitionOutcome` shape. | VerificationReport, integrity_verified | Implementing or auditing verifier. |
| §19.1 | Tamper evidence | Localizable vs fatal failures; consistency proofs detect history rewrite. | event_failures | Debugging tamper reports. |
| §19.2 | No network, no fallbacks | MUST NOT fetch or heuristic-skip checks silently. | strict verify | Security review. |
| §19.3 | Time and memory | Complexity guidance; sub-60s engineering note for large N (non-normative performance). | O(N log N) proofs | Performance planning. |

### §20 Trust posture honesty (Lines 1471–1517)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §20.1 | Normative requirement | MUST NOT oversell trust posture vs behavior (invariant #15). | trust posture | Marketing / UI claims. |
| §20.2 | Required PostureDeclaration | Boolean fields for provider read, reader-held, delegated compute, anchors, recovery, metadata summary. | PostureDeclaration | Manifest honesty. |
| §20.3 | Honest field semantics | Each boolean’s meaning including delegated compute / LLM access. | delegated_compute | AI + custody. |
| §20.4 | Legal claims | No “legal admissibility” from crypto alone; **WOS Assurance §6** cited for upstream framing. | WOS Assurance §6 | Compliance language. |
| §20.5 | Downgrade protocol | Fix overstated posture via new canonical facts / posture-transition events, not silent rewrite. | posture transition | Incident response narrative. |

### §21 Posture / custody / conformance-class vocabulary (Lines 1520–1556)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §21.1 | The vocabulary problem | Disambiguate RL Profile A/B/C vs conformance classes vs custody models CM-A–F. | namespace collision | Naming in code/docs. |
| §21.2 | Normative renames | RL owns Profile A/B/C (**Respondent Ledger §15A**); conformance classes §2.1; custody models in Companion §9. | Profile A/B/C | Cross-doc vocabulary. |
| §21.3 | Custody models enumerated | CM-A–CM-F identifiers; Companion §9.2 canonical semantics. | CM-A, custody registry §26.3 | Custody model IDs. |
| §21.4 | Scope distinction | Event vs response ledger vs case ledger vs agency log vs federation log. | five scopes | Architecture naming. |

### §22 Composition with Respondent Ledger (Lines 1559–1603)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §22.1 | The seam | RL defines `eventHash` / `priorEventHash` (**RL §6.2**) and `LedgerCheckpoint` (**RL §13**); RL §13.4 defers crypto to Trellis. | Respondent Ledger, specs/audit/respondent-ledger-spec.md | RL–Trellis boundary. |
| §22.2 | Per-event binding | When Trellis-wrapped: RL **`eventHash` MUST store Trellis `canonical_event_hash`**; **`priorEventHash` MUST store Trellis `prev_hash`** — store-the-digest, not recompute RL §14 hash equality. | eventHash, priorEventHash, Track E §21(a) | Intake ledger chaining. |
| §22.3 | Per-range binding | RL `LedgerCheckpoint.batchHash` MUST equal Trellis `tree_head_hash` for same sequence range; different artifacts, same covered events. | LedgerCheckpoint, batchHash | Checkpoint alignment with RL §13. |
| §22.4 | Case ledger as composition | Case ledger = Trellis events + `trellis.response-head` / `wos.*` taxonomy. | trellis.response-head | Case file composition. |
| §22.5 | Response → case composition rule | Four-step seal rule tying RL final checkpoint, Trellis checkpoint, case-ledger head event, `prev_hash` extension. | sealed submission | End-to-end seal workflow. |

### §23 Composition with WOS custodyHook (Lines 1606–1674)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §23.1 | The seam | **WOS Kernel §10.5** `custodyHook` delegates crypto custody to Trellis; directional seam. | custodyHook | WOS runtime integration. |
| §23.2 | Binding obligations | Seven MUSTs: envelope, `wos.*` event_type, payload placement, **canonical_event_hash** as WOS integrity hash, **no parallel WOS chain**, Trellis checkpoints for range obligations, posture + transitions. | WOS Kernel §8, §10.4 | WOS-Trellis deployment checklist. |
| §23.3 | Ledger-scope selection | Operator-chosen `ledger_scope` per §10.4; recommend one scope per WOS case. | ledger_scope | Multi-case isolation. |
| §23.4 | Event-type namespace and outcome-neutrality | `wos.*` vs `trellis.*` disjoint; no outcome-specific `wos.*` types; **WOS Kernel §10.6** `x-wos-` reservation note. | wos.determination | Event type registry design. |
| §23.5 | Idempotency-key construction for WOS retries | Stable keys across WOS retries; Companion **§24.9** for operational append surface details. | idempotency_key, Companion §24.9 | Saga / scheduler retries. |
| §23.6 | Autonomy-cap mapping | **WOS AI Integration §5.2–5.3** vocabulary authoritative; Trellis records delegated-compute grants + actor attribution per Companion §§8, 19, OC-70c. | autonomous, manual, delegated compute | AI-governed actions on ledger. |
| §23.7 | Non-redefinition | WOS semantics unchanged; Trellis only wraps/attests. | separation of concerns | Spec overlap arguments. |
| §23.8 | Delegation | Any WOS evaluation dependency MUST go to WOS-conformant processor. | MUST delegate | What Trellis verifier does not do. |

### §24 Agency log (Phase 3 superset preview) (Lines 1677–1709)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §24.1 | Normative definition | Agency log entries are case-ledger heads + metadata; checkpoint-shaped with registered `extensions` keys; `trellis.case-head` events. | trellis.case-head, CT analogy | Phase 3 architecture. |
| §24.2 | Phase 1 preservation obligation | Phase 1 MUST reserve extension points Phase 3 fills; Phase 1 verifier preserves unknown registered extension keys in checkpoints. | invariant #12 | Forward-compatible checkpoints. |
| §24.3 | Why this appears in Phase 1 | Prevent Phase 3 wire break for Phase 1 exports. | agency-log adoption | Roadmap / export compatibility. |
| §24.4 | Non-goal for Phase 1 | No gossip / witness / federation mechanics in Phase 1. | Phase 4 | Out of scope questions. |

### §25 Security and privacy considerations (Lines 1712–1757)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §25.1 | Threat model | Honest-but-curious operator without signing keys; goals “difficult and obvious” vs full equivocation-proof. | operator threat | Security reviews. |
| §25.2 | Metadata leakage | Plaintext envelope fields; points to Companion metadata budget. | metadata leakage | Privacy engineering. |
| §25.3 | Equivocation and split-view | Passive detection via multiple exports; Phase 4 witness path. | equivocation | Multi-party audit. |
| §25.4 | Side channels | Timing/pattern leakage; not Phase 1 mandated obliviousness. | side channel | Hardening discussions. |
| §25.5 | Replay | Idempotency + `ledger_scope` prevent cross-scope replay. | replay | Security test cases. |
| §25.6 | Key compromise | Revocation semantics; verifier cannot judge pre/post compromise timing alone. | Revoked | Incident narrative. |
| §25.7 | Post-quantum migration | Keep Ed25519 verify path after suite migration. | suite_id migration | Long-term crypto plan. |
| §25.8 | Crypto-shredding interaction with backups | DEK destruction vs backup ciphertext; quantum note deferred Phase 2. | GDPR Art. 17 | Erasure / backups. |

### §26 IANA considerations (Lines 1760–1780)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §26.1 | Content type | `application/trellis-export+zip`; `.ztrellis` / `.zip`. | media type | MIME / file handlers. |
| §26.2 | suite_id registry | IANA registration policy; ties to §7.2. | Trellis Signature Suites | IANA packages. |
| §26.3 | Custody Models registry | CM-* identifiers until IANA. | custody models registry | CM-* allocation. |
| §26.4 | Domain tags | Internal tags; documented for implementors. | trellis-* domain tags | Digest tag assignment. |
| §26.5 | CBOR tag | No new CBOR tag Phase 1. | COSE_Sign1Bytes | Serialization choices. |

### §27 Test vector requirements (Lines 1784–1818)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §27.1 | Coverage minimum | ≥50 vectors across append/verify/export/tamper directories under `fixtures/vectors/`. | fixtures/vectors | Conformance suite planning. |
| §27.2 | Per-vector requirements | Each vector: inputs + expected bytes + `VerificationReport`. | manifest.toml, derivation.md | Fixture authoring. |
| §27.3 | Byte-level claim coverage | Every normative byte claim hit by ≥1 vector; rejection codes covered. | negative-case | Coverage gaps. |
| §27.4 | Cross-implementation byte match | Stranger-test success criterion; one-byte divergence is failure. | second implementation | Interop disputes. |

### §28 Appendix A — Full CDDL (Lines 1822–2099)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §28 | Full CDDL | Authoritative structural grammar for Phase 1 types (extends §5.3 fragment): events, headers, hashes, registry, proofs, manifest, `Watermark`, `StaffViewDecisionBinding`, `VerificationReport` (note: some types appear in prose-only sections — always reconcile with Rust crate if they diverge). | Appendix A, COSESign1Bytes | **Structural** source of truth after Rust byte authority. |

### §29 Appendix B — Example events and exports (Lines 2103–2275)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §29.1 | A minimal first event | Schematic `EventPayload` walkthrough; key-order caveat → fixtures win. | session.started, formspec.authored | Teaching / examples. |
| §29.2 | A signed checkpoint | Example `CheckpointPayload`. | checkpoint example | Checkpoint teaching. |
| §29.3 | Export manifest | Example `ExportManifestPayload`. | trellis-export/1 | Manifest teaching. |
| §29.4 | Worked verification trace | Success path + tamper example with expected failure localization. | tamper fixture | Explain verifier behavior. |

### §30 Traceability anchors (Lines 2278–2298)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §30 | Traceability anchors | Non-normative index of `TR-CORE-*` rows in `trellis-requirements-matrix.md`; prose §§1–29 wins on conflict. | TR-CORE-001–TR-CORE-143 (gaps in numbering intentional per spec list) | Traceability / matrix audits. |

### §31 References (Lines 2300–2324)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|--------------|
| §31.1 | Normative references | RFC 2119/8174/8032/8610/8949/9052/9180/9562/6962; FIPS 180-4; **Formspec Core**; **Formspec Respondent Ledger**; **WOS Kernel**. | RFC, FIPS | Bibliography / citations. |
| §31.2 | Informative references | FIPS 204/205; **WOS Assurance**; Operational Companion; **product vision** `thoughts/product-vision.md`. | Phase 2+, vision invariants | Background reading. |

## Cross-References

**Formspec**

- **Formspec Core v1.0** — companion document (front matter); authority for definition/response/FEL/validation (§4); Trellis-bound processors MUST implement Core conformance.
- **Formspec Respondent Ledger** — `specs/audit/respondent-ledger-spec.md` (also `thoughts/formspec/specs/respondent-ledger-spec.md` in-tree pointer in §22.1): **§6.2** `eventHash` / `priorEventHash`; **§13** `LedgerCheckpoint` / **§13.4** defers signature suite to Trellis; **§14** serialization of RL events for authored material; **§15A** Profile A/B/C posture axes (§21); **§6.9** evidence attachment binding → extension `trellis.evidence-attachment-binding.v1` (§6.7).
- **IntakeHandoff / responseHash** — `063-intake-handoffs.cbor` + manifest extension `trellis.export.intake-handoffs.v1` (§§6.7, 18.2, 19) and stack **ADR 0073**.

**WOS**

- **WOS Kernel v1.0** — companion (front matter); **§8** Facts tier; **§10.4** `lifecycleHook`; **§10.5** `custodyHook` seam into Trellis (§23); **§10.6** `x-wos-` prefix reservation (§23.4).
- **WOS AI Integration** — **§5.2** autonomy levels; **§5.3** impact cap (§23.6).
- **WOS Assurance** — **§6** legal-sufficiency framing vs crypto claims (§20.4).
- **WOS-authored payloads in verify** — `wos.kernel.signatureAffirmation`, `SignatureAffirmation`, `wos.kernel.intakeAccepted` / `IntakeAccepted`, `wos.kernel.caseCreated` / `CaseCreated` (§19); “WOS Signature Profile / stack WOS-T4 closeout” for affirmations catalog (§15.3, §18.2).

**Trellis family**

- **Trellis Operational Companion (Phase 2)** — projection cadence, metadata budgets, posture-transition auditability, delegated-compute, snapshot/rebuild elaboration, **§18** append idempotency operations, **§24.9** WOS append binding surface, **§§8–10, 14.1, 15.3, 17.3, 19–19.6** cited from Core; **Appendix A.5–A.6, B.4–B.5** for posture/transition and delegated-compute shapes.
- **`trellis-requirements-matrix.md`** — `TR-CORE-*` matrix rows (§30); must not contradict normative prose.

**Stack ADRs and design docs**

- **ADR 0008** — Interop sidecar discipline (SCITT-shaped sidecars); **non-normative** for Phase 1 verification (§11.7).
- **ADR 0072** — Evidence integrity / attachment binding → `trellis.export.attachments.v1`, `061-attachments.cbor`, §§6.7, 18.2, 19.
- **ADR 0073** — Intake handoff export catalog → `trellis.export.intake-handoffs.v1`, `063-intake-handoffs.cbor`, §§6.7, 18.2, 19.

**Product / vision**

- **`thoughts/product-vision.md`** (2026-04-17) — invariants #1–#15 referenced from status/§20/§17.3 (informative §31.2).

**External standards (normative §31.1)**

- BCP 14 (**RFC 2119**, **RFC 8174**); **RFC 8032** (Ed25519); **RFC 8610** (CDDL); **RFC 8949** (CBOR/dCBOR); **RFC 9052** (COSE); **RFC 9180** (HPKE); **RFC 9562** (UUIDv7); **RFC 6962** (CT Merkle model); **FIPS 180-4** (SHA-256).

**External standards (informative §31.2)**

- **FIPS 204** (ML-DSA); **FIPS 205** (SLH-DSA) — reserved `suite_id` values (§7.2).

**Non-normative / do-not-cite-as-authority**

- `specs/archive/` consolidated material (§22 Status); earlier split drafts — superseded for Phase 1 normative purposes.
- `thoughts/archive/drafts/*` referenced in §3 as non-definitional for terms.

## Quick Reference: `TR-CORE-*` anchors

There are **no `TR-OP-*` identifiers** in this Core document (Operational Companion owns operational trace rows).

| Anchor | Where cited | Role |
|--------|-------------|------|
| **TR-CORE-018** | §6.8 | Authored vs canonical vs signed event surfaces (fixtures / hashing). |
| **TR-CORE-073** | §14.6 | `x-trellis-test/*` reserved prefix semantics for fixtures vs production rejection. |
| **TR-CORE-083** | §10.6 | `AppendHead` artifact contract tying append results to `prev_hash`. |
| **TR-CORE-001 – 007** | §30 list | Matrix row group (obligations mapped in `trellis-requirements-matrix.md`). |
| **TR-CORE-010 – 017** | §30 | — |
| **TR-CORE-020 – 025** | §30 | — |
| **TR-CORE-030 – 038** | §30 | — |
| **TR-CORE-040 – 046** | §30 | — |
| **TR-CORE-050 – 053** | §30 | — |
| **TR-CORE-060 – 067** | §30 | — |
| **TR-CORE-070 – 072** | §30 | — |
| **TR-CORE-080 – 082** | §30 | — |
| **TR-CORE-090 – 091** | §30 | — |
| **TR-CORE-100 – 103** | §30 | — |
| **TR-CORE-110 – 113** | §30 | — |
| **TR-CORE-120 – 126** | §30 | — |
| **TR-CORE-130 – 134** | §30 | — |
| **TR-CORE-140 – 143** | §30 | — |

**Note:** §30’s enumerated list has intentional numbering gaps; use the matrix file for row definitions.

## Critical Behavioral Rules

1. **dCBOR everywhere:** All Trellis wire artifacts MUST be deterministically encoded per §5; byte-identical reproduction is the conformance bar (§5.2, §27.4).
2. **Unknown top-level fields:** Phase 1 producers MUST NOT emit unknown top-level keys on `EventPayload`, `CheckpointPayload`, or `ExportManifestPayload`; verifiers MUST reject them — forward compatibility is **only** via registered `*.extensions` keys (§6.1, §6.5, §11.6, §19).
3. **Content hash is over ciphertext, never plaintext** — preserves chain validity under crypto-shredding / key destruction (§6.4, §9.3).
4. **`author_event_hash` excludes itself and signatures**; immutable under `LedgerServiceWrapEntry` re-wrap (§6.3, §8.6, §9.5).
5. **Canonical event hash** includes full signed-boundary `EventPayload` inside `CanonicalEventHashPreimage` under `trellis-event-v1` (§9.2); do not conflate with RL `eventHash` semantics (§22.2).
6. **When Trellis wraps Respondent Ledger events**, RL `eventHash` MUST store Trellis `canonical_event_hash`, and `priorEventHash` MUST store Trellis `prev_hash` — **store-the-digest**, not equality with RL §14’s independent hash (§22.2).
7. **`LedgerCheckpoint.batchHash`** MUST equal Trellis **`tree_head_hash`** for the same inclusive sequence range; still distinct artifacts from RL `LedgerCheckpoint` (§22.3).
8. **WOS `custodyHook` binding:** WOS records admitted as Trellis events use `wos.*` types, Trellis `canonical_event_hash` wherever WOS needs an integrity hash, Trellis `prev_hash` as the only linear chain — no parallel WOS-side chain (§23.2, §23.5).
9. **COSE:** Embedded payload only (`payload` MUST NOT be `nil`); recompute `Sig_structure` with **exact** protected-header bstr bytes from the envelope (§7.4).
10. **HPKE wraps:** Fresh X25519 ephemeral per `KeyBagEntry`, unique across all wraps in the ledger scope; destroy ephemeral private key after use (§9.4).
11. **Append-only:** No rewrite after admit; inconsistent checkpoint vs prior head is tamper (§10.5, §11.4).
12. **Verifier independence:** No live registry lookups; no dependency on projections/DBs for baseline verify (§16.1–16.2, §19).
13. **Idempotency:** `(ledger_scope, idempotency_key)` is forever unique per canonical event; conflicting payload ⇒ `IdempotencyKeyPayloadMismatch` (§17.3).
14. **Export ZIP:** STORED-only, deterministic ordering and metadata; DEFLATE forbidden (§18.1).
15. **Registry meaning:** Resolve `event_type` / taxonomy at sequence S using embedded binding with largest `bound_at_sequence ≤ S` (§14.4).
