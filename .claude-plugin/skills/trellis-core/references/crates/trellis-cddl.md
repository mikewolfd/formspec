# trellis-cddl Reference Map

> `trellis/crates/trellis-cddl` — 303 lines across 1 file — Minimal CDDL-facing parsers and encoders for the G-4 append scaffold (`src/lib.rs` crate docs)

## Overview

`trellis-cddl` implements a **small, fixture-aligned subset** of the Trellis ledger-event and append-head CBOR shapes: decode authored and canonical ledger-event maps, decode a pinned Ed25519 `COSE_Key`, synthesize canonical event bytes from authored bytes plus `author_event_hash`, and build deterministic byte blobs for `canonical_event_hash` preimage and `AppendHead`. It sits beside `trellis-types` (canonical CBOR helpers) as **Rust-side structure for shapes described in CDDL** (`trellis-core.md` §28 Appendix A). Intended consumers include the Trellis CLI and verification stack (`trellis-cli` depends on this crate; `trellis-verify` lists it under `dev-dependencies` for cross-checking).

## Authority claim

**CDDL mirror of trellis-core.md §28 Appendix A; structural authority ADR 0004.**

Per Trellis discipline, **Rust is byte authority** when prose and source disagree; this crate’s map-prefix constants, field order assumptions, and preimage layouts are load-bearing for append-scaffold fixtures. The crate does **not** embed the CDDL text itself — it encodes the operational subset used by **`append/001-minimal-inline-payload`** and comments require **`trellis-verify`** to stay in lockstep when the authored ledger-event map shape changes. Normative grammar remains in **`trellis-core.md` §28**; this crate is **canonical for the implemented encode/decode paths** and **partial** relative to the full Appendix A surface.

## Module structure

| Path | Lines | Role |
|------|------:|------|
| `src/lib.rs` | 303 | Entire public API: parsers, encoders, `CddlError`, `#[cfg(test)]` proptest + fixture round-trip |

## Public Types

| Item | Kind | Derives | Description |
|------|------|---------|-------------|
| `ParsedAuthoredEvent` | struct | `Clone`, `Debug`, `PartialEq`, `Eq` | Subset of authored ledger-event: `ledger_scope` (byte string) and `sequence` (unsigned integer) after CBOR map decode. |
| `ParsedEd25519Key` | struct | `Clone`, `Debug`, `PartialEq`, `Eq` | Ed25519 key material from a COSE_Key map: 32-byte public key (label `-2`) and 32-byte private seed (label `-4`). |
| `ParsedCanonicalEvent` | struct | `Clone`, `Debug`, `PartialEq`, `Eq` | Canonical ledger-event: `ledger_scope`, `sequence`, and 32-byte `author_event_hash`. |
| `CddlError` | struct | `Debug` | Decode/shape failure with message; captures `Backtrace` at construction (not `Clone`/`Eq`). |

### `CddlError` — associated API

| Method | Signature | Role |
|--------|-----------|------|
| `backtrace` | `pub fn backtrace(&self) -> &Backtrace` | Exposes the captured backtrace for debugging decode failures. |

## Public Functions

| Function | Signature | Returns | Description |
|----------|-----------|---------|-------------|
| `parse_authored_event` | `pub fn parse_authored_event(bytes: &[u8]) -> Result<ParsedAuthoredEvent, CddlError>` | `Ok` with scope + sequence, or `Err` on CBOR/map/field errors | Decodes root CBOR map; requires text keys `ledger_scope` (bstr) and `sequence` (uint). |
| `parse_ed25519_cose_key` | `pub fn parse_ed25519_cose_key(bytes: &[u8]) -> Result<ParsedEd25519Key, CddlError>` | `Ok` with fixed 32-byte keys, or `Err` | Decodes COSE_Key map; reads integer labels `-2` and `-4` as 32-byte bstrs. |
| `parse_canonical_event` | `pub fn parse_canonical_event(bytes: &[u8]) -> Result<ParsedCanonicalEvent, CddlError>` | `Ok` with scope, sequence, 32-byte hash, or `Err` | Decodes canonical ledger-event map; `author_event_hash` must be exactly 32 bytes. |
| `canonical_event_from_authored` | `pub fn canonical_event_from_authored(authored_event: &[u8], author_event_hash: [u8; 32]) -> Result<Vec<u8>, CddlError>` | `Ok(Vec<u8>)` canonical CBOR, or `Err` if first byte is not the expected 12-entry map prefix | Replaces map header with 13-entry prefix, appends `author_event_hash` tstr + bstr using `trellis_types` encoders; body bytes after the first byte are copied verbatim from the authored blob. |
| `canonical_event_hash_preimage` | `pub fn canonical_event_hash_preimage(scope: &[u8], canonical_event: &[u8]) -> Vec<u8>` | Always `Vec<u8>` (infallible builder) | Builds the CBOR map wrapper: `version` = 1, `ledger_scope`, `event_payload` = `canonical_event` (see byte notes for leading `0xa3`). |
| `append_head_bytes` | `pub fn append_head_bytes(scope: &[u8], sequence: u64, canonical_event_hash: [u8; 32]) -> Vec<u8>` | `Vec<u8>` | Builds `AppendHead`-shaped map: `scope`, `sequence`, `canonical_event_hash` (leading `0xa3`). |

## Public Constants

There are **no** `pub const` items in this crate. Load-bearing **private** map-prefix constants (documented here because they define wire compatibility with fixtures and `canonical_event_from_authored`):

| Constant (private) | Type | Value | Purpose |
|--------------------|------|-------|---------|
| `AUTHORED_LEDGER_EVENT_MAP_ENTRY_COUNT` | `u8` | `12` | Definite-length authored ledger-event map pair count for Phase-1 append fixtures. |
| `AUTHORED_LEDGER_EVENT_MAP_PREFIX` | `u8` | `(5 << 5) \| 12` = **`0xac`** | First byte of authored CBOR map (`append/001` shape). |
| `CANONICAL_LEDGER_EVENT_MAP_ENTRY_COUNT` | `u8` | `13` | Canonical map adds `author_event_hash` as 13th entry. |
| `CANONICAL_LEDGER_EVENT_MAP_PREFIX` | `u8` | `(5 << 5) \| 13` = **`0xad`** | First byte of canonical ledger-event map produced by `canonical_event_from_authored`. |

## Trait Implementations

| Type | Implements | Notes |
|------|--------------|------|
| `CddlError` | `Display` | Prints `message` only (no backtrace in `Display`). |
| `CddlError` | `std::error::Error` | Standard error trait for propagation. |

## Public Re-exports

None — the crate does not `pub use` symbols from `ciborium` or `trellis-types`; callers depend on this crate’s own types and functions only.

## Cross-Crate Dependencies

| Crate | Used For | Direction |
|-------|----------|-----------|
| `trellis-types` | `encode_bstr`, `encode_tstr`, `encode_uint` for deterministic CBOR fragments in encoders | upstream (this crate consumes) |
| `ciborium` | `Value` and `from_reader` for decoding inbound CBOR | external (not re-exported) |

**Workspace dependents (Cargo.toml):** `trellis-cli` → `[dependencies]`; `trellis-verify` → `[dev-dependencies]` (no `trellis_cddl::` references in `trellis-verify` source at time of map generation — reserved for tests or future wiring).

**Dev-only:** `proptest` for property tests.

## Spec Anchors Cited in Source

- `lib.rs:2` — `//! Minimal CDDL-facing parsers and encoders for the G-4 append scaffold.`
- `lib.rs:136-141` — Comment block: map prefix `(5 << 5) | n` for definite-length maps; Phase-1 fixtures use **12** authored fields; canonical adds `author_event_hash` as **13th and last** entry; **`trellis-verify` recovers the authored preimage** and must stay in lockstep if the CDDL map shape changes.
- `lib.rs:152-152` — Doc on `canonical_event_from_authored`: authored bytes must match **12-entry** definite-length map used by **`append/001`**.
- `lib.rs:158-160` — Error string: `"append/001 authored event does not start with the expected 12-entry map"`.

*(No `///` lines in this file cite `trellis-core.md` §28 by number; authority is established by project docs and the orchestrator context above.)*

## Byte-Level / Behavioral Notes

- `#![forbid(unsafe_code)]` — no `unsafe` in this crate.
- **First-byte gate:** `canonical_event_from_authored` rejects authored input unless `authored_event[0] == 0xac` (12-pair map). Changing pair counts without updating **`trellis-verify`** preimage recovery breaks the scaffold (per inline comment).
- **Splice semantics:** Bytes `authored_event[1..]` are copied after replacing only the map header byte with **`0xad`**; appended tail is `encode_tstr("author_event_hash")` + `encode_bstr(&hash)` from `trellis-types` (must stay aligned with dCBOR/canonical rules in `trellis-types`).
- **`canonical_event_hash_preimage`:** Starts with **`0xa3`** (3-pair map), then `version` (tstr + uint `1`), `ledger_scope` (tstr + bstr), `event_payload` (tstr + raw `canonical_event` slice — **not** re-encoded through `encode_bstr` for the outer payload).
- **`append_head_bytes`:** Also leads with **`0xa3`**; fields `scope` (bstr), `sequence` (uint via `encode_uint`), `canonical_event_hash` (bstr).
- **COSE_Key:** Labels are **signed integers** `-2` and `-4` matched via `as_integer()`; both values must be **32-byte** bstrs.
- **Map lookups:** Field discovery is **linear scan** over map entries; order is not semantically fixed by the parser, but **encoder output order** in `canonical_event_from_authored` assumes fixture layout for the tail append.
- **`CddlError`:** Uses `expect` only after `map_lookup_fixed_bytes` enforces length 32 for `author_event_hash` — that path should be unreachable if helper is correct.

## Test Surface

| Location | What it covers |
|----------|----------------|
| `src/lib.rs` — `#[cfg(test)] mod tests` | Fixture round-trip: `trellis/fixtures/vectors/append/001-minimal-inline-payload/{input-author-event-hash-preimage.cbor,expected-event-payload.cbor}`; asserts `canonical_event_from_authored` matches expected bytes and `parse_canonical_event` fields. |
| Same module — `proptest!` | `canonical_event_encoder_is_a_fixed_point`: random `author_event_hash`; re-encode idempotence vs parse. |

No separate integration crate under `trellis-conformance` was found referencing `trellis_cddl` at map generation time; CLI/verify wiring may expand later.

## When to Read the Source

- Exact **CBOR key ordering** and whether a consumer assumes **last** map position for `author_event_hash` (comment references verify recovery).
- Any change to **fixture path** `001-minimal-inline-payload` or map entry counts — grep `AUTHORED_LEDGER_EVENT_MAP_*` and error strings.
- Edge cases for **integer width** or **non-definite** CBOR encodings not produced by these encoders (parsers use `ciborium::Value` only).
