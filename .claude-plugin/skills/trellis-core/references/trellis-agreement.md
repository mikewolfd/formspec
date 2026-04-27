# Trellis Agreement Document Reference Map

> `trellis/specs/trellis-agreement.md` — 157 lines, ~13 KB — **Track A, non-normative** organizational gate (not implementor-conformance prose). Approves scope, primitives, non-goals, seams, and Phase 1 invariants before deeper spec work. RFC 2119 terms here gate **organizational adoption**; byte obligations live in Trellis Core and the Trellis Operational Companion.

## Overview

This document positions Trellis as the **integrity substrate** for Formspec + WOS: canonical CBOR envelopes, hash chains, signed checkpoints, offline-verifiable export bundles, and a verification-independence contract. It explicitly defers implementor conformance to **Trellis Core** (Phase 1 byte protocol) and the **Trellis Operational Companion** (Phase 2+ operator discipline). It states fifteen **Phase 1 non-negotiable invariants** (cheap now, wire-break to retrofit), names **seams** with Formspec Respondent Ledger and WOS Kernel, sequences phases 1–4 as strict supersets, and defines the **success gate** (“stranger test” + vectors). When this map disagrees with normative Trellis prose, follow the **authority order** below.

## Authority order (Trellis family)

When sources conflict, resolve in this order (strongest first):

1. **Rust** — reference crates under `trellis/crates/` (byte authority; ADR 0004).
2. **CDDL** — structural shapes in `trellis-core.md` appendix (e.g. §28).
3. **Normative prose** — `trellis-core.md`, `trellis-operational-companion.md`.
4. **Requirements matrix** — `trellis-requirements-matrix.md` (traceability only; prose wins on conflict).
5. **Python** — `trellis-py/` cross-check implementations.
6. **Archives** — `trellis/specs/archive/`, `thoughts/archive/` — non-normative; do not cite for conformance.

**This agreement** sits *outside* that ladder for byte semantics: it is a product/strategy sign-off gate, not a conformance spec.

## Section Map

### Preamble (Lines 1–12)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|----------------|
| preface | Trellis Agreement Document | Declares status (Track A decision gate), date, owner, vision lineage, and that the doc is a short gate—not a conformance spec. Bridges RFC 2119 usage to **approval** language; points implementors to Core + Operational Companion. | Track A, non-normative, product strategy, `thoughts/product-vision.md`, MUST/MUST NOT/SHALL/SHOULD/MAY | Onboarding stakeholders; confirming this file is not the byte spec. |

### §1 Purpose (Lines 14–17)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|----------------|
| 1 | Purpose | Frames Trellis as integrity substrate surviving system, vendor, and time; names explicit **deferrals** from Formspec Respondent Ledger and WOS Kernel so Trellis is a downstream concrete answer, not a new invented layer. | integrity substrate, Respondent Ledger, WOS Kernel, spec loop | Explaining *why* Trellis exists relative to Formspec/WOS. |

### §2 Scope (Lines 20–38)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|----------------|
| 2 | Scope | **IS:** event envelope (canonical CBOR), hash chain, signed checkpoint, export bundle, verification + independence contract, composition with Respondent Ledger and `custodyHook`. **IS NOT:** BPM, identity issuer, DMS, BI, cost narrative, storage engine. | event envelope, hash chain, checkpoint, export bundle, verification-independence, PROV-O, XES, OCEL 2.0, pluggable storage | Scoping a feature or integration; rejecting out-of-scope product asks. |

### §3 Primitives (Lines 42–57)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|----------------|
| 3 | Primitives | One-line normative **vocabulary** for Trellis specs: Event, Envelope, Chain, Checkpoint, Export bundle, Signature (COSE_Sign1 / successor, `suite_id`), response ledger, case ledger, agency log, federation log; distinguishes “ledger” vs “log.” | Event, Envelope, Chain, Checkpoint, Export bundle, COSE_Sign1, suite_id, response ledger, case ledger, agency log, federation log, prev_hash | Glossary alignment across docs and code. |

### §4 Trust posture (Lines 61–68)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|----------------|
| 4 | Trust posture | Claims **“difficult and obvious,”** not “system-owner-proof.” Phase 1 vs Phase 4 bars; forbids marketing trust stronger than behavior (see invariant #15). | Phase 1, Phase 4, tampering, checkpoint divergence, transparency witnessing, equivocation | Marketing, security claims, roadmap trust framing. |

### §5 Phase 1 non-negotiable invariants (Lines 72–90)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|----------------|
| 5 | Phase 1 non-negotiable invariants | Fifteen **organizational MUSTs** for the first envelope/manifest: encoding, suites, registries, ciphertext hashing, ordering model, manifest binding, key_bag immutability, commitment slots, header policy, forward-compatible phase shapes, profile naming, head composition, idempotency, watermarks, trust-posture honesty. Each one-line; normative detail in Core. | dCBOR, suite_id, SigningKeyEntry, crypto-shredding, prev_hash, DAG, domain registry, key_bag, author_event_hash, LedgerServiceWrapEntry, idempotency key, tree_size, tree_head_hash | Gate reviews; deciding if Phase 1 scope is committed; mapping to TR rows (see Quick Reference). |

### §6 Seams (Lines 94–101)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|----------------|
| 6 | Seams | Trellis **MUST** compose without redefining: Respondent Ledger §13 `LedgerCheckpoint`, §6.2 `eventHash`/`priorEventHash` (SHOULD→MUST when Trellis wraps), WOS §10.5 `custodyHook`, and Track E §21 extension for case ledger + agency log. | LedgerCheckpoint, eventHash, priorEventHash, custodyHook, Track E §21, case ledger, agency log | Integration design with Formspec/WOS; avoiding spec overlap bugs. |

### §7 Phase sequencing commitment (Lines 105–112)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|----------------|
| 7 | Phase sequencing commitment | Phases are **strict supersets** (invariants #10, #12): Phase 1 attested exports → Phase 2 runtime integrity (Rust crate) → Phase 3 portable case files → Phase 4 federation + Sovereign. | Phase 1, Phase 2, Phase 3, Phase 4, custodyHook, agency log, gossip | Roadmap phasing; what “strict superset” implies for wire formats. |

### §8 Delivery shape (Lines 116–130)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|----------------|
| 8 | Delivery shape | Two W3C-style normative artifacts (Core ~30–40 pp Phase 1; Operational Companion ~30–50 pp Phase 2), ~50 JSON vectors under `fixtures/vectors/{append,verify,export,tamper}/`, Rust crate family, public API (`append`, `verify`, `export`), CLI/WASM, one independent second implementation. | Trellis Core, Trellis Operational Companion, fixtures/vectors, trellis-core, trellis-cose, trellis-verify, trellis-cli, trellis-py, trellis-go | Planning deliverables and conformance strategy. |

### §9 Out of scope for Phase 1 (Lines 134–143)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|----------------|
| 9 | Out of scope for Phase 1 | Deferred with named seams: external witnessing (Phase 4), BBS+ implementation (slots reserved), threshold/FROST, respondent-held keys, consortium federation, PQ suite implementation (`suite_id` reserved only). | Phase 4, BBS+, FROST, Sovereign, federation log, suite_id, ML-DSA, SLH-DSA | Cutting Phase 1 scope; avoiding premature implementation. |

### §10 Success gate (Lines 147–151)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|----------------|
| 10 | Success gate | **Stranger test:** reader of agreement + two normative specs builds append/verify/export in any language and passes **all** conformance vectors—supreme acceptance criterion vs checklists. | stranger test, conformance vectors, append, verify, export | Defining “done” for Trellis interop; prioritizing vectors over process artifacts. |

### §11 Sign-off (Lines 155–157)

| Section | Heading | Description | Key Concepts | Consult When |
|---------|---------|-------------|--------------|----------------|
| 11 | Sign-off | Blank sign-off authorizing further Track A work. | sign-off, Track A | Formal gate completion. |

## Cross-References

### Upstream vision (agreement lineage)

- **`thoughts/product-vision.md`** — synthesized vision and roadmap; agreement claims every statement is derivable from vision without introducing new product facts.

### Normative Trellis specs (implementor obligations)

- **`trellis/specs/trellis-core.md`** — “The normative prose lives in Trellis Core” for invariant detail; Phase 1 envelope, CBOR, hashes, signatures, chain, checkpoint, export, verification, idempotency, security/privacy, Respondent Ledger + `custodyHook` composition.
- **`trellis/specs/trellis-operational-companion.md`** — Phase 2+ projections, metadata budget, delegated-compute honesty, posture-transition auditability, snapshot watermarks, rebuild semantics (per delivery table).

### Traceability matrix

- **`trellis/specs/trellis-requirements-matrix.md`** — Consolidated `TR-CORE-*` / `TR-OP-*` rows; **§3.1** maps invariants **#1–#15** → primary `TR-CORE` (and `TR-OP` where applicable); **§4** covers invariant **#11** namespace renaming (Profile A/B/C vs Conformance Classes vs Custody Models vs phase names). Matrix is traceability-only; **prose wins on conflict** (matrix frontmatter).

### Formspec (explicit seams in agreement)

- **Formspec Respondent Ledger add-on** — **§13** `LedgerCheckpoint` (signed checkpoint over contiguous events; Trellis supplies format).
- **Formspec Respondent Ledger add-on** — **§6.2** `eventHash` / `priorEventHash` (per-event binding; promotion to MUST when Trellis wraps the event; spans per-event vs per-range hashing scopes).

### WOS

- **WOS Kernel** — **§10.5** `custodyHook` (runtime uses Trellis as custody backend without redefining either spec).

### Track E / platform extension

- **Track E §21** (spec extension) — normative home for **case ledger** (sealed response heads + WOS governance) and **agency log** (operator log of case-ledger heads); not a casual nesting note.

### Vectors and tooling (paths named in agreement)

- **`fixtures/vectors/{append,verify,export,tamper}/`** — language-neutral JSON vectors; every byte-level claim should have ≥1 vector (under repo `trellis/` tree as implemented).
- **`trellis verify`** — offline verification entrypoint named in export-bundle description.

### Rust crates (delivery list)

- `trellis-core`, `trellis-cose`, `trellis-store-postgres`, `trellis-store-memory`, `trellis-verify`, `trellis-cli`, `trellis-conformance` — reference implementation family; public API surface described as `append`, `verify`, `export`.

### External standards and products (context only)

- **COSE** — `COSE_Sign1` (or named successor) for signatures.
- **Provenance / process mining** — PROV-O, XES, OCEL 2.0 as downstream analytics emit targets (not Trellis scope).
- **Identity providers** — ID.me, Login.gov, DIDs (integrate via adapters; Trellis does not issue identities).
- **Orchestration products** — Temporal, Camunda, Flowable, AWS Step Functions (explicit non-goals for Trellis as BPM).

## Quick Reference

### Phase 1 invariants (#1–#15) — one-line essence (agreement §5)

| # | Essence |
|---|---------|
| 1 | Pin one deterministic CBOR profile (dCBOR or named equivalent) for byte-exact vectors. |
| 2 | Every signed artifact carries `suite_id`; Phase 1 names suite; reserve hybrid/PQ. |
| 3 | Export includes `SigningKeyEntry` registry snapshot (Active/Revoked) for self-contained verification. |
| 4 | Hash ciphertext, not plaintext, for crypto-shredding compatibility. |
| 5 | Name ordering model (`prev_hash` linear vs causal DAG); reserve field if linear-only. |
| 6 | Manifest binds content-addressed digest of domain registry at signing. |
| 7 | `key_bag` / `author_event_hash` immutable under rotation; re-wrap → append-only `LedgerServiceWrapEntry`. |
| 8 | Reserve header slots for per-field commitments; BBS+ implementation deferred. |
| 9 | Explicit policy: which headers plaintext vs commitment to private values. |
| 10 | Phase 1 envelope bytes = Phase 3 case-ledger event bytes; later phases are strict supersets. |
| 11 | Disambiguate “Profile” across Respondent Ledger, core conformance classes, companion custody models, and phase tiers. |
| 12 | Heads compose forward; Phase 3 case-ledger head ⊇ Phase 1 checkpoint; agency log ⊇ case heads + metadata/witnesses. |
| 13 | Append carries stable idempotency key; same key+payload → same ref; same key+diff payload → defined error. |
| 14 | Derived artifacts and agency-log entries carry watermark `(tree_size, tree_head_hash)` + rebuild path; no full-replay-only Phase 1. |
| 15 | Do not claim stronger trust/admissibility than declared controls support. |

### Invariants #1–#15 → `TR-CORE-*` / `TR-OP-*` (matrix §3.1)

Authoritative row IDs live in **`trellis/specs/trellis-requirements-matrix.md` §3.1**. Summary:

| Inv. | Short name | TR-CORE | TR-OP |
|------|--------------|---------|-------|
| #1 | Canonical CBOR pinned | TR-CORE-030, TR-CORE-032 | — |
| #2 | Signature suite + migration | TR-CORE-035, TR-CORE-036 | TR-OP-110 |
| #3 | Signing-key registry in export | TR-CORE-037 | — |
| #4 | Hashes over ciphertext | TR-CORE-030, TR-CORE-031 | — |
| #5 | Ordering model (linear vs DAG) | TR-CORE-020–025 (incl. TR-CORE-024) | — |
| #6 | Registry snapshot in manifest | TR-CORE-070 | TR-OP-130 |
| #7 | key_bag / author_event_hash immutability | TR-CORE-038 | — |
| #8 | Commitment slots reserved | TR-CORE-071 | TR-OP-071 |
| #9 | Plaintext vs committed headers | TR-CORE-072 | TR-OP-040 |
| #10 | P1 envelope = P3 case-ledger event | TR-CORE-080 | — |
| #11 | Profile namespace disambiguation | *(spec prose + matrix §4)* | matrix §4 |
| #12 | Heads / agency log supersets | TR-CORE-081, TR-CORE-082, TR-CORE-083 | — |
| #13 | Append idempotency wire contract | TR-CORE-050, TR-CORE-051, TR-CORE-053 | — |
| #14 | Snapshots + watermarks day-one | TR-CORE-090 | TR-OP-001–003, TR-OP-005, TR-OP-006 |
| #15 | Trust-posture honesty floor | TR-CORE-100 | *(inherits TR-OP-010–014, TR-OP-040, per matrix)* |

### Phase bar (trust posture §4)

| Phase | Bar (agreement wording) |
|-------|-------------------------|
| **1** | Tampering requires replacing bundles already with third parties; reissue detectable via checkpoint divergence. |
| **4** | Transparency witnessing → equivocation-proof across operators. |

## Critical Behavioral Rules

1. **This document is not conformance prose** — organizational gates and vocabulary; byte-level MUSTs for implementors are in **Trellis Core** and the **Operational Companion**.
2. **Trellis answers two written deferrals** — Formspec Respondent Ledger (checkpoint + per-event hashes) and WOS `custodyHook`; Trellis must not redefine those upstream surfaces.
3. **Fifteen Phase 1 invariants are wire-commitments** — omitting any forces a later format break; treat §5 as a release gate for Track A.
4. **Hashes bind ciphertext** (invariant #4) — required for per-subject key destruction without breaking the chain story.
5. **Strict superset phasing** (invariants #10, #12, §7) — Phase 2/3 add fields only; Phase 1 export bytes remain valid Phase 3 case-ledger events; agency log entries extend case-ledger heads.
6. **Idempotency is on the wire** (invariant #13) — stable keys, canonical refs on retry, defined rejection on payload mismatch.
7. **Watermarks + rebuild paths are mandatory from day one** (invariant #14) — “full replay only” is explicitly invalid for Phase 1 at stated scale ambitions.
8. **Trust claims are capped** (invariant #15, §4) — cryptography and controls must not be oversold as legal admissibility or stronger posture than implemented.
9. **Seams are compositional, not overlapping rewrites** — §6 lists exact upstream anchors (`LedgerCheckpoint`, `eventHash`/`priorEventHash`, `custodyHook`, Track E §21).
10. **`suite_id` always identifies the cryptographic suite** (invariant #2) — future rotation and PQ/hybrid agility depend on it.
11. **Signing-key registry snapshot ships with export** (invariant #3) — verification must not depend on live operator registries alone.
12. **Domain registry digest in manifest** (invariant #6) — semantic binding, not bytes-only integrity.
13. **Success = stranger + vectors** (§10) — passing all conformance vectors with a clean-room implementation is the supreme acceptance test.
14. **Authority resolution** — for bytes/behavior, apply Rust → CDDL → prose → matrix → Python → archives; the agreement does not override that stack.
15. **`TR-*` rows trace invariants** — use matrix §3.1 for audit trails; if matrix and prose disagree, treat the matrix row as a bug candidate and follow normative prose.
