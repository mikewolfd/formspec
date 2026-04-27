# trellis-types Reference Map

> `trellis/crates/trellis-types` — 219 lines across 1 file — Shared Trellis types and byte helpers (`//!` in `lib.rs`).

## Overview

`trellis-types` is the lowest shared Rust layer for Trellis Phase-1 scaffolding: fixed UTF-8 **domain-separation tags** and numeric wire constants that must match `trellis/specs/trellis-core.md` (especially §7 suite/COSE labels and §9 hash construction), minimal **deterministic CBOR length encodings** used when building COSE structures, the **`domain_separated_sha256`** primitive matching Core §9.1, and in-memory **append artifacts** (`StoredEvent`, `AppendHead`, `AppendArtifacts`) passed between `trellis-core`, storage adapters, and conformance tooling. It deliberately avoids serde and most third-party types on the public surface so sibling crates do not leak foreign APIs. Workspace version `0.1.0`, edition `2024`.

## Authority claim

**Orchestrator (verbatim):** Public type surface; domain-separation tags (`EVENT_DOMAIN`, `AUTHOR_EVENT_DOMAIN`, `CONTENT_DOMAIN`) per Core §9.

**Observed:** Byte authority for these tags and for `domain_separated_sha256`’s length-prefix layout follows **Trellis ADR 0004** (Rust canonical; Python `trellis-py` and fixture generators cross-check). String values and `SUITE_ID_PHASE_1` / `COSE_LABEL_SUITE_ID` / `COSE_SUITE_ID_LABEL_MAGNITUDE` must stay aligned with `trellis-core.md` §§7, 9 and with `fixtures/vectors/_generator/_lib/byte_utils.py` where doc comments name Python symbols. This crate is canonical for the **single-component** domain-separated SHA-256 shape `len(tag)||tag||len(component)||component` as implemented here (matches §9.1 prose). It does **not** own full event CDDL, COSE Sign1 assembly, or dCBOR serializers — those live in `trellis-cddl`, `trellis-cose`, `trellis-core`, and `trellis-verify`.

## Module structure

Single-crate surface: all items live in `src/lib.rs` (219 lines).

## Public Types

| Item | Kind | Derives | Description |
|------|------|---------|-------------|
| `StoredEvent` | struct | `Clone`, `Debug`, `PartialEq`, `Eq` | Snapshot of one appended event: ledger `scope`, monotonic `sequence`, `canonical_event` bytes, and `signed_event` (COSE_Sign1 envelope bytes). Mutated only via `new` and accessors — fields are private. |
| `AppendHead` | struct | `Clone`, `Debug`, `PartialEq`, `Eq` | Post-append API artifact: `scope`, `sequence`, `canonical_event_hash` (32-byte SHA-256). Normative CDDL/dCBOR shape is in Core §10.6; this Rust struct is the in-process return shape used by `trellis-core` and stores. |
| `AppendArtifacts` | struct | `Clone`, `Debug`, `PartialEq`, `Eq` | Byte bundle from the append scaffold: `author_event_hash`, `canonical_event_hash`, `protected_header`, `sig_structure`, `canonical_event`, `signed_event`, `append_head` — all public fields, all load-bearing for fixtures and callers. |

### `StoredEvent` methods

| Method | Signature | Description |
|--------|-------------|-------------|
| `new` | `fn new(scope: Vec<u8>, sequence: u64, canonical_event: Vec<u8>, signed_event: Vec<u8>) -> Self` | Constructs a stored snapshot ( doctest in source). |
| `scope` | `fn scope(&self) -> &[u8]` | Ledger scope bytes. |
| `sequence` | `fn sequence(&self) -> u64` | Sequence within scope. |
| `canonical_event` | `fn canonical_event(&self) -> &[u8]` | Canonical event payload bytes. |
| `signed_event` | `fn signed_event(&self) -> &[u8]` | Signed COSE event bytes. |

### `AppendHead` methods

| Method | Signature | Description |
|--------|-------------|-------------|
| `new` | `fn new(scope: Vec<u8>, sequence: u64, canonical_event_hash: [u8; 32]) -> Self` | Builds head from scope, sequence, and hash. |
| `scope` | `fn scope(&self) -> &[u8]` | Ledger scope bytes. |
| `sequence` | `fn sequence(&self) -> u64` | Sequence after append. |
| `canonical_event_hash` | `fn canonical_event_hash(&self) -> [u8; 32]` | Canonical event hash (copy). |

## Public Functions

| Function | Signature | Returns | Description |
|----------|-------------|---------|-------------|
| `encode_bstr` | `fn encode_bstr(bytes: &[u8]) -> Vec<u8>` | CBOR major type 2 prefix + bytes | Deterministic CBOR byte-string wrapper using the crate’s shared length encoder. |
| `encode_tstr` | `fn encode_tstr(text: &str) -> Vec<u8>` | CBOR major type 3 prefix + UTF-8 bytes | Encodes a text string as CBOR tstr. |
| `encode_uint` | `fn encode_uint(value: u64) -> Vec<u8>` | CBOR major type 0 encoding | Unsigned integer encoding; used for small integers such as `suite_id`. |
| `encode_cbor_negative_int` | `fn encode_cbor_negative_int(n: u64) -> Vec<u8>` | CBOR major type 1 encoding | Encodes CBOR negative `-1 - n` per RFC 8949; doc comment cites EdDSA `alg = -8` as an example (`n == 7` → `-8`). |
| `encode_cose_suite_id_label` | `fn encode_cose_suite_id_label() -> Vec<u8>` | Four-byte CBOR key encoding | Canonical key bytes for [`COSE_LABEL_SUITE_ID`]; must match historical bytes `0x3a 0x00 0x01 0x00 0x00` (see unit test). |
| `domain_separated_sha256` | `fn domain_separated_sha256(tag: &str, component: &[u8]) -> [u8; 32]` | 32-byte digest | SHA-256 over `u32be(len(tag))\|\|tag\|\|u32be(len(component))\|\|component` — Core §9.1 single-component form. |

## Public Constants

| Constant | Type | Value | Purpose |
|----------|------|-------|---------|
| `AUTHOR_EVENT_DOMAIN` | `&str` | `"trellis-author-event-v1"` | Domain tag for `author_event_hash` over `dCBOR(AuthorEventHashPreimage)` (Core §9.5). |
| `CONTENT_DOMAIN` | `&str` | `"trellis-content-v1"` | Domain tag for `content_hash` over ciphertext (Core §9.3). |
| `EVENT_DOMAIN` | `&str` | `"trellis-event-v1"` | Domain tag for `canonical_event_hash` over the canonical-event preimage (Core §9.2). |
| `SUITE_ID_PHASE_1` | `u64` | `1` | Phase-1 Trellis signature suite id (Core §7 suite registry; Ed25519 / COSE_Sign1 profile). |
| `COSE_LABEL_SUITE_ID` | `i128` | `-65537` | COSE protected-header map label for Trellis `suite_id` (Core §7.4; RFC 9052 §3.1). |
| `COSE_SUITE_ID_LABEL_MAGNITUDE` | `u64` | `65536` | Unsigned `n` where CBOR negative integer `-1 - n` equals `COSE_LABEL_SUITE_ID`. |

## Trait Implementations

| Type | Implements | Notes |
|------|------------|-------|
| `StoredEvent`, `AppendHead`, `AppendArtifacts` | `Clone`, `Debug`, `PartialEq`, `Eq` | Derived only — no `Hash`, `Serialize`, `Deserialize`, `Display`, or `Error` on public types. |

## Public Re-exports

None — the crate does not `pub use` symbols from dependencies.

## Cross-Crate Dependencies

| Crate | Used For | Direction |
|-------|----------|-----------|
| `sha2` | `Digest` + `Sha256` inside `domain_separated_sha256` | upstream (this crate consumes) |

**Downstream workspace crates** (consume `trellis-types`; not listed as Cargo deps of this crate): `trellis-core`, `trellis-cose`, `trellis-cddl`, `trellis-verify`, `trellis-store-memory`, `trellis-store-postgres`, `trellis-conformance`. Python cross-check mirrors constants and `domain_separated_sha256` under `trellis/trellis-py/`.

## Spec Anchors Cited in Source

- `lib.rs:21` — "Phase-1 Trellis signature suite identifier (Core §7 suite registry)."
- `lib.rs:24-28` — "This value must stay aligned with Python `COSE_LABEL_SUITE_ID` in `fixtures/vectors/_generator/_lib/byte_utils.py` and with every runtime that builds or parses Phase-1 protected headers." Also cites "Core §7.4, RFC 9052 §3.1".
- `lib.rs:154-156` — "Encodes a CBOR negative integer `-1 - n` (RFC 8949 major type 1)." Example: "`n == 7` yields `-8` (EdDSA `alg` value in COSE headers)."
- `lib.rs:164` — "Equivalent to canonical CBOR for integer `-65537` (`-1 - 65536`)."

## Byte-Level / Behavioral Notes

- `#![forbid(unsafe_code)]` — no `unsafe` in this crate.
- **No stubs:** No `unimplemented!()`, `todo!()`, or placeholder `panic!` paths were found in `src/`.
- **`domain_separated_sha256`** uses **32-bit big-endian** length prefixes for the UTF-8 tag and for the single component; changing width or endianness breaks wire compatibility with Core §9.1 and with Python/fixture generators.
- **Domain string literals** (`trellis-*-v1`) are normative; a version bump requires new tags and coordinated spec, Rust, Python, and vector updates (Core reserves `-v1` / `-v2` semantics in §9.2 prose for the canonical-event tag).
- **`encode_major_len` is private** but defines all public CBOR prefix encodings: additional argument types or alternate canonical forms must not be introduced on the public helpers without matching Core + COSE byte fixtures.
- **`AppendHead` Rust struct vs §10.6 CDDL:** The in-memory struct holds the same logical fields; on-wire dCBOR bytes for append-head artifacts are produced elsewhere (`trellis-cddl` / callers). Do not assume `AppendHead`’s memory layout matches raw CBOR without going through the CDDL encoder.
- **`SUITE_ID_PHASE_1` and `COSE_LABEL_SUITE_ID`** must remain consistent with protected-header construction in `trellis-cose` and with any generator that emits COSE bytes.

## Test Surface

| Location | Role |
|----------|------|
| `trellis/crates/trellis-types/src/lib.rs` (`#[cfg(test)] mod tests`, lines 203–219) | Asserts `encode_cose_suite_id_label()` equals `vec![0x3a, 0x00, 0x01, 0x00, 0x00]` and `encode_uint(1)` is `vec![0x01]`. |
| `trellis/crates/trellis-conformance` | Imports `EVENT_DOMAIN`, `domain_separated_sha256`, `StoredEvent`, `AppendArtifacts`; exercises hashes and model checks against vectors. |
| `trellis/crates/trellis-core` | `append_event` uses `AUTHOR_EVENT_DOMAIN`, `EVENT_DOMAIN`, `domain_separated_sha256`, `StoredEvent`, `AppendArtifacts`, `AppendHead`. |
| `trellis/crates/trellis-store-postgres` | Round-trip and append tests using `StoredEvent::new`. |
| `trellis/fixtures/vectors/_generator/*.py` | Python generators call `domain_separated_sha256` / tag constants — cross-language byte parity with Rust. |

Requirements-matrix rows such as **TR-CORE-083** (`AppendHead` return shape) are satisfied through `trellis-core` + conformance, not by tests inside this crate alone.

## When to Read the Source

- When changing **CBOR additional-information** rules for values outside the inline 0–23 range, or when proving equivalence to `dcbor()` / dCBOR rules in other crates.
- When reconciling **AppendHead** or **AppendArtifacts** field sets with the latest Core CDDL after a spec edit (this file only holds the Rust scaffolding shapes).
- When adding a **new domain tag** or hash construction: confirm §9.* prose, add the `const` here, mirror in Python `constants.py`, and extend vectors — the reference map will not show generator-side usage.
