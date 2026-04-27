# trellis-cose Reference Map

> `trellis/crates/trellis-cose/` — 69 lines across 1 file — COSE helpers for the Phase-1 append scaffold (`//!` in `lib.rs`).

## Overview

`trellis-cose` implements the byte-level COSE_Sign1 signing seam for Trellis Phase 1: derived `kid` (§8.3), pinned protected-header bytes for Ed25519 / `suite_id = 1` (§7.4), RFC 9052 `Sig_structure` construction, Ed25519 signing, and assembly of the tag-18 `COSE_Sign1` envelope. It is **not** a general COSE library; it hand-builds the CBOR bytes expected by `trellis-core.md` and the fixture corpus. Primary consumer is `trellis-core::append_event`, which sequences these helpers after CDDL parsing; `trellis-conformance` exercises that path against committed vectors.

## Authority claim

**Orchestrator context (verbatim):** Byte authority `trellis-core.md` §7 Signature Profile and §8 Signing-Key Registry.

**Agent observations:** Per Trellis ADR 0004, Rust is byte authority when prose and source disagree; this crate is the canonical implementation for **Phase-1 COSE_Sign1 preimage layout** (`protected_header_bytes`, `sig_structure_bytes`, `sign1_bytes`) and **derived `kid` preimage** (`derive_kid`) as wired today. Normative field semantics (`alg`, `kid`, `suite_id`, registry tables) are defined in §7–§8; this crate **implements** those sections rather than restating them. It does **not** implement optional protected-header `artifact_type` (§7.4) — that field is absent from `protected_header_bytes`. Signing-key **registry records** (`SigningKeyEntry`, status enums) live in CDDL/spec and sibling crates, not here; this crate only supplies crypto bytes used alongside registry resolution.

## Public Types

This crate exposes **no** public structs, enums, traits, or type aliases — the API is five public free functions only.

## Public Functions

| Function | Signature | Returns | Description |
|---|---|---|---|
| `derive_kid` | `fn derive_kid(suite_id: u8, public_key: [u8; 32]) -> [u8; 16]` | First 16 bytes of `SHA-256( encode_uint(suite_id) \|\| public_key )` | Implements the §8.3 derived-`kid` construction using `trellis_types::encode_uint` so the `suite_id` prefix matches canonical CBOR unsigned encoding (see doc comment on Python cross-check). |
| `protected_header_bytes` | `fn protected_header_bytes(kid: [u8; 16]) -> Vec<u8>` | Raw **map** bytes (not wrapped in the COSE protected-header bstr) that become the middle component of `Sig_structure` | Builds a fixed 3-entry CBOR map: `alg` label `1` → EdDSA `-8`; `kid` label `4` → 16-byte `kid`; Trellis `suite_id` label `-65537` → `SUITE_ID_PHASE_1` (`1`) from `trellis-types`. Leading byte `0xa3` pins three map pairs. |
| `sig_structure_bytes` | `fn sig_structure_bytes(protected_header: &[u8], payload: &[u8]) -> Vec<u8>` | Full `Sig_structure` CBOR array | RFC 9052 `Sig_structure`: `["Signature1", protected_bstr, external_aad, payload_bstr]` with `external_aad` the empty byte string (`0x40`). The `protected_header` argument is the **raw protected-header map** bytes (as returned by `protected_header_bytes`); this function wraps them with `encode_bstr` for the `Sig_structure` middle component. |
| `sign_ed25519` | `fn sign_ed25519(private_seed: [u8; 32], sig_structure: &[u8]) -> [u8; 64]` | Raw Ed25519 signature (64 bytes) | Signs `sig_structure` with `ed25519_dalek` using the 32-byte seed; Phase 1 suite per §7.1 (`alg = -8`). |
| `sign1_bytes` | `fn sign1_bytes(protected_header: &[u8], payload: &[u8], signature: [u8; 64]) -> Vec<u8>` | Full `COSE_Sign1` value bytes | CBOR tag `18` (`0xd2`), then 4-array: protected as bstr, unprotected empty map `0xa0`, payload bstr, signature bstr — embedded payload only (§7.4: no detached / nil payload). |

## Public Constants

This crate declares **no** `pub const` items. Load-bearing wire constants are inlined in `protected_header_bytes` and `sign1_bytes` (for example map length prefix `0xa3`, `Sig_structure` array prefix `0x84`, tag-18 lead `0xd2`, empty map `0xa0`, empty `external_aad` `0x40`). Phase-1 `suite_id` and the Trellis private-use label encoding come from `trellis_types::SUITE_ID_PHASE_1` and `trellis_types::encode_cose_suite_id_label()` (documented on the `trellis-types` side with §7.4 / RFC 9052 cross-references).

## Trait Implementations

None (no public local types).

## Public Re-exports

None.

## Cross-Crate Dependencies

| Crate | Used For | Direction |
|---|---|---|
| `trellis-types` | `SUITE_ID_PHASE_1`, `encode_bstr`, `encode_cbor_negative_int`, `encode_cose_suite_id_label`, `encode_tstr`, `encode_uint` | upstream (this crate consumes) |
| `ed25519-dalek` | `SigningKey`, `Signer`, `Signature` inside `sign_ed25519` | external (not exposed in public signatures) |
| `sha2` | `Sha256` inside `derive_kid` | external (not exposed in public signatures) |

**Downstream workspace consumers:** `trellis-core` calls all five public functions from `append_event` (`src/lib.rs`).

## Spec Anchors Cited in Source

- `lib.rs:2` — "`//! COSE helpers for the Phase-1 append scaffold.`"
- `lib.rs:15-17` — "`The preimage uses canonical CBOR unsigned encoding for `suite_id`, matching`" / "`Python `dcbor(suite_id)` in `fixtures/vectors/_generator/gen_v3_remaining.py``" / "`(and therefore differs from a raw single byte when `suite_id >= 24`).`"

*(Related anchors on dependencies used by this crate: `trellis-types` documents `SUITE_ID_PHASE_1` and `COSE_LABEL_SUITE_ID` with `trellis-core.md` §7 / RFC 9052 §3.1 in its own `lib.rs` doc comments.)*

## Byte-Level / Behavioral Notes

- `#![forbid(unsafe_code)]` — no `unsafe` in this crate.
- **`protected_header_bytes` returns the inner CBOR map bytes only** (first byte `0xa3`). Both `sig_structure_bytes` and `sign1_bytes` wrap that slice with `encode_bstr`, so the on-wire `Sig_structure` and `COSE_Sign1` protected slots carry the COSE-required bstr over the map, consistent with §7.4.
- **Protected-header map layout is fixed:** `0xa3` + three pairs in the order emitted in source (`alg`, `kid`, `suite_id`). Any reordering or extra keys changes the signature under §7.4 (“MUST recompute `Sig_structure` using the exact protected-header bstr bytes”).
- **`encode_cbor_negative_int(7)`** produces CBOR `-8` (EdDSA `alg` per §7.1 / RFC 9052).
- **`sign1_bytes`** uses CBOR tag number 18 (`0xd2`), unprotected header `0xa0` (empty map), and embedded payload — verifiers must reject nil/detached payloads per §7.4.
- **`external_aad`** is always the empty bstr in `sig_structure_bytes` (Phase 1 pin per §7.4 step list).
- **No `artifact_type` header (-65538)** is written; consumers relying on that optional header need a different code path.
- **No stubs:** no `unimplemented!`, `todo!`, or panicking placeholders in the source tree.

## Test Surface

- **No `#[cfg(test)]` module** in `trellis-cose` itself — the crate relies on integration coverage through **`trellis-core::append_event`**.
- **`trellis-conformance`** (`trellis/crates/trellis-conformance/src/lib.rs`, `#[cfg(test)] mod tests`): `committed_vectors_match_the_rust_runtime` drives `append_event` and compares artifacts including `sig-structure.bin` and `expected-event.cbor` under `trellis/fixtures/vectors/{append,export,verify,tamper,...}/` — this is the primary regression surface for `derive_kid`, `protected_header_bytes`, `sig_structure_bytes`, `sign_ed25519`, and `sign1_bytes` in lockstep with the corpus.
- **`trellis-types`** unit tests (`encode_cose_suite_id_label_matches_historical_bytes`, etc.) guard CBOR helpers this crate depends on for header encoding.

## When to Read the Source

- To confirm the **exact prefix bytes** of `protected_header_bytes` and `sign1_bytes` against a hex dump or a second implementation.
- To verify how **`sig_structure_bytes`** combines its arguments with `encode_bstr` and the empty `external_aad`.
- To judge **future extensions** (optional `artifact_type`, additional suites, or non-Phase-1 `suite_id` values) — none are implemented beyond the current fixed layout.
