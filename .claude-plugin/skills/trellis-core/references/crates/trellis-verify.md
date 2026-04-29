# trellis-verify Reference Map

> `trellis/crates/trellis-verify/` — 3834 lines across 1 file — Trellis verification for single events, tamper fixtures, and export ZIPs.

## Overview

`trellis-verify` is the **stranger-test** reference verifier for Trellis Phase-1: it checks COSE_Sign1 envelopes, event payloads, signing-key registries, export ZIP layout and manifest digests, Merkle inclusion/consistency proofs, checkpoints, optional export extensions (attachments, signature affirmations, intake handoffs), and posture-transition continuity. It consumes only bytes plus embedded registries (no live DB or workflow runtime), aligning with **Trellis Core §16** independence and **§19** verification behavior. Public API is intentionally small (`verify_*` plus report types); almost all parsing and policy lives in private `fn` items in `lib.rs`. `#![forbid(unsafe_code)]`.

## Authority claim

**Orchestrator (verbatim):** §19 Verification Algorithm, §16 Verification Independence; stranger-test target.

**Observed:** Byte authority per Trellis ADR 0004 over `trellis/specs/trellis-core.md` — this crate is the **Rust reference for offline verification** (canonical for “what a verifier does with bytes,” modulo any documented divergence). It **implements** Core §19 and must honor §16’s dependency discipline (minimal workspace surface: `trellis-cose`, `trellis-types`; no `trellis-core` / stores). Prose in §19/§16 is normative for product meaning; when comments cite appendix steps or ADRs, they are audit hooks, not a second spec.

## Module structure

| Path | Lines | Role |
|------|------:|------|
| `src/lib.rs` | 3834 | Entire crate: public entrypoints, ZIP/export pipeline, event/checkpoint/Merkle verification, parsers, `#[cfg(test)] mod tests` |

## Public Types

| Item | Kind | Derives | Description |
|------|------|---------|-------------|
| `VerificationFailure` | struct | `Clone`, `Debug`, `PartialEq`, `Eq` | One failed check: string `kind` (machine-oriented failure id) and `location` (hex hash, path, or index label). |
| `PostureTransitionOutcome` | struct | `Clone`, `Debug`, `PartialEq`, `Eq` | Per posture-transition rollup: `transition_id`, `kind`, `event_index`, `from_state`, `to_state`, three booleans (`continuity_verified`, `declaration_resolved`, `attestations_verified`), and string `failures`. |
| `VerificationReport` | struct | `Clone`, `Debug`, `Default`, `PartialEq`, `Eq` | Aggregate outcome: `structure_verified`, `integrity_verified`, `readability_verified`, vectors of failures by category, `posture_transitions`, `warnings`. Phase-1 runtime report (see crate doc on `VerificationReport`). |
| `VerifyError` | struct | `Debug` | Decode/parse failure before a structured report can be built; holds private `message` and `backtrace`; exposes `backtrace()` and `Display`/`Error`. |

*No public traits, enums, or type aliases.*

## Public Functions

| Function | Signature | Returns | Description |
|----------|-------------|---------|-------------|
| `verify_single_event` | `fn verify_single_event(public_key_bytes: [u8; 32], signed_event: &[u8]) -> Result<VerificationReport, VerifyError>` | `Ok(report)` or `Err(VerifyError)` | Parses one COSE_Sign1, registers the given Ed25519 key under the event’s `kid`, runs `verify_event_set` (no tamper classification, no export scope). Errors when bytes are not a decodable Sign1. Doc: returns an error when signed bytes do not decode as COSE_Sign1. |
| `verify_tampered_ledger` | `fn verify_tampered_ledger(signing_key_registry: &[u8], ledger: &[u8], initial_posture_declaration: Option<&[u8]>, posture_declaration: Option<&[u8]>) -> Result<VerificationReport, VerifyError>` | `Ok(report)` or `Err(VerifyError)` | Decodes registry and non-empty dCBOR array of events; enables tamper-oriented classification. Empty/malformed ledger yields fatal `malformed_cose` report (not `VerifyError`). Doc: errors when registry bytes cannot be decoded. |
| `verify_export_zip` | `fn verify_export_zip(export_zip: &[u8]) -> VerificationReport` | Always `VerificationReport` (never `VerifyError`) | Opens ZIP, validates layout, manifest-signed payload, digests of required members, registry bindings, replays events/checkpoints/proofs, optional extensions. Fatal failures become `VerificationReport::fatal` with `event_failures[0]` carrying kind/location. Doc: verifies a complete export ZIP. |

## Public Constants

No public `const` items. Load-bearing **crate-private** constants (wire / domain separation) live at the top of `lib.rs` and are listed below for byte semantics.

| Constant | Type | Value / notes | Purpose |
|----------|------|-----------------|--------|
| `SUITE_ID_PHASE_1_I128` | `i128` | `SUITE_ID_PHASE_1 as i128` from `trellis-types` | Compare to protected-header suite id. |
| `ALG_EDDSA` | `i128` | `-8` | COSE EdDSA alg id check. |
| `COSE_LABEL_ALG` / `COSE_LABEL_KID` | `i128` | `1`, `4` | Protected-header labels. |
| `CHECKPOINT_DOMAIN` | `&str` | `"trellis-checkpoint-v1"` | Domain tag for checkpoint preimage hashing. |
| `MERKLE_LEAF_DOMAIN` | `&str` | `"trellis-merkle-leaf-v1"` | RFC6962-style leaf prefix for event leaf hashes. |
| `MERKLE_INTERIOR_DOMAIN` | `&str` | `"trellis-merkle-interior-v1"` | Interior node hashing. |
| `POSTURE_DECLARATION_DOMAIN` | `&str` | `"trellis-posture-declaration-v1"` | Posture declaration digest domain. |
| `ATTACHMENT_EXPORT_EXTENSION` | `&str` | `"trellis.export.attachments.v1"` | Manifest extension id for attachment catalog. |
| `ATTACHMENT_EVENT_EXTENSION` | `&str` | `"trellis.evidence-attachment-binding.v1"` | Event extension id for attachment binding. |
| `SIGNATURE_EXPORT_EXTENSION` | `&str` | `"trellis.export.signature-affirmations.v1"` | Signature affirmation export extension. |
| `INTAKE_EXPORT_EXTENSION` | `&str` | `"trellis.export.intake-handoffs.v1"` | Intake handoff export extension. |
| `WOS_SIGNATURE_AFFIRMATION_EVENT_TYPE` | `&str` | `"wos.kernel.signatureAffirmation"` | WOS event type string for signature path. |
| `WOS_INTAKE_ACCEPTED_EVENT_TYPE` | `&str` | `"wos.kernel.intakeAccepted"` | Intake accepted record gate. |
| `WOS_CASE_CREATED_EVENT_TYPE` | `&str` | `"wos.kernel.caseCreated"` | Case-created record gate. |

Event/manifest hashing also uses `EVENT_DOMAIN`, `AUTHOR_EVENT_DOMAIN`, `CONTENT_DOMAIN`, `COSE_LABEL_SUITE_ID`, and helpers from **`trellis-types`** (`domain_separated_sha256`, `encode_*`).

## Trait Implementations

| Type | Implements | Notes |
|------|--------------|------|
| `VerifyError` | `Display`, `std::error::Error` | Message from internal string; no `source` chain. |

Public structs use **derive-only** traits (`Clone`, `Debug`, `PartialEq`, `Eq`, `Default` on `VerificationReport`); no manual `Display` on `VerificationFailure`.

## Public Re-exports

None (`pub use` not used).

## Cross-Crate Dependencies

| Crate | Used For | Direction |
|-------|----------|------------|
| `trellis-cose` | `sig_structure_bytes` — COSE Sig_Structure bytes for Ed25519 verify | upstream |
| `trellis-types` | `EVENT_DOMAIN`, `AUTHOR_EVENT_DOMAIN`, `CONTENT_DOMAIN`, `COSE_LABEL_SUITE_ID`, `SUITE_ID_PHASE_1`, `domain_separated_sha256`, `encode_bstr`, `encode_tstr`, `encode_uint` | upstream |
| `ciborium` | CBOR `Value` decode/encode across payloads, registries, proofs | external (shapes verifier behavior) |
| `ed25519-dalek` | `Signature`, `VerifyingKey`, signature verification | external |
| `sha2` | `Sha256` for digests and preimage hashing | external |
| `zip` | `ZipArchive` — read export ZIP members (`deflate` feature enabled; tests often build STORED archives) | external |

**Dev-dependencies:** `trellis-cddl` (`parse_ed25519_cose_key` in tests).

**Intentionally absent:** `trellis-core`, storage crates, async runtimes — preserves §16 stranger-test boundary (`trellis/CLAUDE.md`).

## Spec Anchors Cited in Source

- `lib.rs:2` — `//! Trellis verification for single events, tamper fixtures, and export ZIPs.`
- `lib.rs:69` — `/// Verification report for the current Phase-1 runtime.`
- `lib.rs:1212` — ``// `valid_to` — accepted per Core §19 (historical signatures).``
- `lib.rs:966-968` — `/// Only populated for disclosure-profile transitions (Appendix A.5.2).` / `/// Custody-model transitions derive their attestation rule from` / `/// from_state→to_state custody-rank ordering instead (A.5.3 step 4).`
- `lib.rs:1107-1121` — Export ZIP layout: single `{export_root}/` prefix, one `/`, relative keys like `000-manifest.cbor`; `parse_export_zip` contract.
- `lib.rs:1738-1739` — `/// ADR 0072 topology: duplicate manifest rows, prior resolution, strict prior-before-binding` / `/// order in the exported event array, and cycles in the prior-pointer graph.`
- `lib.rs:2528-2529` — `/// RFC 8949 §4.2.2 map key ordering: sort keys by the bytewise lexicographic order` / `/// of their encoded CBOR form. Used only for semantic equality of nested maps.`
- `lib.rs:2721-2727` — Doc block on `authored_preimage_from_canonical`: recovers authored-event CBOR by stripping the `author_event_hash` entry; **Coupling** to `canonical_event_from_authored` in `trellis-cddl` (last map field, canonical key encoding; reordering requires updating this locator).
- `lib.rs:2797` — `// RFC 6962 §2.1: unpaired end leaf is promoted without hashing`
- Fatal strings (not doc comments but normative UX): e.g. `"event protected header does not match the Trellis Phase-1 suite"`, `"manifest protected header does not match the Trellis Phase-1 suite"`.

## Byte-Level / Behavioral Notes

- **ZIP paths:** Every entry must be `{export_root}/{relative}` with exactly one `/`; top-level files and nested extra roots are rejected so member keys are stable relative paths (`parse_export_zip`).
- **Required export members and manifest digests:** `000-manifest.cbor`, `010-events.cbor`, `020-inclusion-proofs.cbor`, `025-consistency-proofs.cbor`, `030-signing-key-registry.cbor`, `040-checkpoints.cbor` — manifest must list SHA-256 digests matching raw member bytes before deep event verification.
- **Phase-1 COSE:** Protected header must use EdDSA (`-8`) and `SUITE_ID_PHASE_1` (via `trellis-types`); mismatch is fatal for manifest and per-event paths.
- **Detached manifest payload:** Rejected for Phase 1 (`manifest_payload_missing`).
- **External payloads:** `060-payloads/{hex}.bin` map content-hash → bytes for `payload_ref` external events inside `verify_export_zip`.
- **`authored_preimage_from_canonical`:** Byte-surgical strip of final `author_event_hash` bstr; coupled to `trellis-cddl` canonicalization order — reordering breaks author hash recomputation.
- **Merkle:** Leaf/interior domains are crate-local strings above; inclusion/consistency verification follows RFC 6962-style sibling promotion (see inline RFC comment at ~2797).
- **Registry status `3` (revoked):** Events after `valid_to` fail `revoked_authority`; events at or before `valid_to` still verify (historical signatures comment at ~1212).
- **No stubs:** No `unimplemented!`, `todo!`, or `panic!("not yet")` in library code. Four `unreachable!` arms (`lib.rs` ~454, ~573, ~716, ~822) follow manifest digest checks that already proved the same ZIP members exist — not a normal user-data path.

## Test Surface

- **In-crate:** `#[cfg(test)] mod tests` from `lib.rs:3160` — fixture-driven `verify_single_event`, `verify_export_zip`, `verify_tampered_ledger`, ZIP rebuild helpers, attachment topology unit tests, RFC6962 Merkle tests, CBOR map semantic equality, parser edge cases.
- **Fixtures (relative to `trellis/crates/trellis-verify/`):** `../../fixtures/vectors/append/` (e.g. `001-minimal-inline-payload`, `009-signing-key-revocation`), `../../fixtures/vectors/verify/001-export-001-two-event-chain/input-export.zip`, `../../fixtures/vectors/tamper/001-signature-flip`.
- **Workspace:** Run `cargo nextest run -p trellis-verify` (`trellis/CLAUDE.md`). No `trellis-conformance` / `trellis-cli` Cargo dependency on this crate at time of writing; conformance is via shared vectors and this package’s tests.

## When to Read the Source

- Exact ordering of `verify_event_set` checks, posture shadow state, and every `VerificationFailure` `kind` string emitted along each branch.
- Full checkpoint chain linkage, inclusion/consistency proof decoding, and interaction with `040-checkpoints.cbor`.
- Optional export extensions: `verify_attachment_manifest`, signature catalog, intake catalog — field-by-field matching rules and warning vs failure behavior.
- Low-level COSE parsing (`parse_sign1_bytes`, unprotected headers, payload detachment rules).
