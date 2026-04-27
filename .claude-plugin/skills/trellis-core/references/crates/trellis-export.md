# trellis-export Reference Map

> `trellis/crates/trellis-export` — 291 lines across 1 file — Deterministic ZIP export support for Trellis Phase 1 (`//!` crate header).

## Overview

`trellis-export` is a small, dependency-light crate that turns an in-memory list of logical `(path, bytes)` members into a **byte-identical** classic ZIP32 archive whenever the same logical package is serialized. It implements the **ZIP encoding constraints** called out in Trellis Core `trellis-core.md` §18.1 (STORED-only, fixed DOS time/date, zero extra fields, zero external attributes, lexicographic entry order, central directory order matching locals). It does **not** assemble a full §18.2 member tree, sign manifests, or enforce Trellis filename prefixes; those are upstream export-generator responsibilities that feed `ExportPackage`.

The crate is **Rust byte authority** for the deterministic ZIP bit-layout it emits (ADR 0004 discipline for Trellis crates). Verifiers and golden vectors depend on those bytes remaining stable.

## Authority claim

**Orchestrator (verbatim):** §18 Export Package Layout deterministic ZIP.

**Observed:** Canonical for the **mechanical ZIP32 layout** produced by `ExportPackage::to_zip_bytes` — local headers, central directory, end-of-central-directory record, CRC32 fields, and ordering — aligned with `trellis/specs/trellis-core.md` §18.1. The prose spec also names required **member files and directory prefixes** (§18.2 onward); this crate only serializes whatever paths and payloads the caller supplies. `trellis-verify` / export generators are responsible for populating members per §18.2–§18.9.

## Module structure

| Path | Lines | Role |
|---|---|---|
| `src/lib.rs` | 291 | Crate root: `ExportEntry`, `ExportError`, `ExportPackage`, ZIP serialization, `#[cfg(test)]` integration with vector fixture |

## Public Types

| Item | Kind | Derives | Description |
|---|---|---|---|
| `ExportEntry` | struct | `Clone`, `Debug`, `PartialEq`, `Eq` | Logical archive member: owned path string and payload bytes. Fields are private; use `new`, `path`, `bytes`. |
| `ExportError` | struct | `Debug` | Failure from `to_zip_bytes`; carries message and a captured `std::backtrace::Backtrace`. Implements `Display` and `std::error::Error`. |
| `ExportPackage` | struct | `Clone`, `Debug`, `Default`, `PartialEq`, `Eq` | Ordered collection of `ExportEntry` values; `to_zip_bytes` clones and **sorts** entries by `path` before emitting ZIP records. |

## Public Functions

| Function | Signature | Returns | Description |
|---|---|---|---|
| `ExportEntry::new` | `pub fn new(path: impl Into<String>, bytes: Vec<u8>) -> Self` | `ExportEntry` | Constructs one logical member. |
| `ExportEntry::path` | `pub fn path(&self) -> &str` | `&str` | Borrowed UTF-8 path inside the archive. |
| `ExportEntry::bytes` | `pub fn bytes(&self) -> &[u8]` | `&[u8]` | Borrowed uncompressed payload (STORED). |
| `ExportError::backtrace` | `pub fn backtrace(&self) -> &Backtrace` | `&Backtrace` | Captured backtrace at construction time. |
| `ExportPackage::new` | `pub fn new() -> Self` | `ExportPackage` | Empty package (same as `Default`). |
| `ExportPackage::add_entry` | `pub fn add_entry(&mut self, entry: ExportEntry)` | `()` | Appends a member (order does not affect ZIP output; serialization sorts by path). |
| `ExportPackage::entries` | `pub fn entries(&self) -> &[ExportEntry]` | `&[ExportEntry]` | Slice of logical members before serialization. |
| `ExportPackage::to_zip_bytes` | `pub fn to_zip_bytes(&self) -> Result<Vec<u8>, ExportError>` | `Ok(Vec<u8>)` or `Err(ExportError)` | Builds deterministic ZIP32 bytes: lexicographic path order, duplicate-path error, **ASCII-only** path check, `crc32fast` CRC32, ZIP32 bound checks (`u32` sizes/counts, `u16` entry count). |

## Public Constants

| Constant | Type | Value | Purpose |
|---|---|---|---|
| *(none)* | — | — | The crate exposes **no** `pub const`. Wire magic, version fields, fixed DOS time/date, and compression method are **private** `const` items in `lib.rs` (see Byte-Level / Behavioral Notes). |

## Trait Implementations

| Type | Implements | Notes |
|---|---|---|
| `ExportError` | `Display` | Formats the human-readable `message` only (not the backtrace). |
| `ExportError` | `std::error::Error` | Marker trait; no `source()` chaining. |

## Public Re-exports

None — no `pub use`.

## Cross-Crate Dependencies

| Crate | Used For | Direction |
|---|---|---|
| `crc32fast` | `Hasher` for per-entry CRC32 in local and central headers | external (crates.io) |
| `ciborium` | Dev-only: parse `input-ledger-state.cbor` in fixture test | external, `dev-dependencies` only |

No workspace Trellis crates (`trellis-core`, `trellis-cose`, …) are linked; this crate is intentionally isolated for ZIP mechanics.

## Spec Anchors Cited in Source

The crate root and methods do **not** cite `trellis-core.md` section numbers in doc comments. Behavioral linkage to §18.1 is by **implementation match**, not by quoted prose.

- `lib.rs:2` — `//! Deterministic ZIP export support for Trellis Phase 1.`
- `lib.rs:99-103` — `/// Serializes the logical package to deterministic ZIP bytes.` … `/// Entries are emitted in lexicographic path order with stored compression,` … `/// fixed DOS timestamps, zero extra fields, and zero external attributes so` … `/// identical logical packages yield byte-identical archives across runs.`
- `lib.rs:105-107` — `/// # Errors` / `/// Returns an error when duplicate or non-ASCII paths are present, or when` / `/// the archive exceeds classic ZIP field bounds.`

## Byte-Level / Behavioral Notes

- `#![forbid(unsafe_code)]` — no `unsafe` in this crate.
- **Private wire constants** in `lib.rs` (changing any value breaks golden ZIPs): `ZIP_VERSION_NEEDED` / `ZIP_VERSION_MADE_BY` = `20`; `ZIP_GENERAL_PURPOSE_BITS` = `0`; `ZIP_COMPRESSION_STORED` = `0`; `ZIP_FIXED_TIME` = `0`; `ZIP_FIXED_DATE` = `(1 << 5) | 1` (DOS minimum date per §18.1 / ZIP epoch); signatures `0x0403_4b50` (local), `0x0201_4b50` (central), `0x0605_4b50` (EOCD); EOCD ends with **16-bit zero ZIP comment length** (no trailing comment).
- **Endianness:** all multi-byte ZIP fields written **little-endian** via `push_u16_le` / `push_u32_le`.
- **Ordering:** `entries.sort_by` on `path` string comparison implements §18.1 lexicographic order for the path strings supplied; central records follow the same order as local file sections.
- **ASCII-only paths:** `path.is_ascii()` is required — stricter than “UTF-8 filename” wording in §18.1 for arbitrary Unicode; Trellis §18.2 paths in practice are ASCII-safe (prefixed names, hex, slashes).
- **ZIP32 limits:** entry count fits `u16`; compressed/uncompressed sizes and offsets fit `u32`; no ZIP64 paths in this implementation.
- **CRC32:** `crc32fast::Hasher` over **uncompressed** entry bytes (STORED), written identically into local and central headers.
- **Central directory fields pinned to zero** where applicable: extra field length, file comment length, internal/external attrs, disk number start, etc., per deterministic layout.

## Test Surface

| Location | Role |
|---|---|
| `trellis/crates/trellis-export/src/lib.rs` — `#[cfg(test)] mod tests` (lines ~237–291) | Unit tests only. |
| `deterministic_zip_bytes_are_reproducible` | Same logical package → two `to_zip_bytes()` calls → `assert_eq!` on full archive bytes. |
| `export_001_fixture_matches_byte_for_byte` | Reads `trellis/fixtures/vectors/export/001-two-event-chain/` (`input-ledger-state.cbor`, member files, `expected-export.zip`), builds `ExportPackage`, asserts serialized ZIP equals fixture bytes on disk. |

No `trellis-conformance` or other workspace crate currently references `trellis-export` in Rust source (grep); the **001** vector is the primary cross-check.

## When to Read the Source

- Exact **byte layout** of each local vs central header field order and which `u16`/`u32` slots are zeroed.
- Any future change to **path validation** (ASCII vs full UTF-8) or **ZIP64** support.
- Error message strings and **backtrace** capture behavior (`ExportError::new` is private but shapes diagnostics).
