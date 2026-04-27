# trellis-cli Reference Map

> `trellis/crates/trellis-cli` — **223** lines across **1** file — Fixture-oriented CLI for the current Trellis Rust scaffold (`src/main.rs` crate docs).

## Overview

`trellis-cli` is a **binary-only** package (no `lib.rs`). It wires together `trellis-core` (append), `trellis-verify` (single-event verification), `trellis-export` (deterministic ZIP packaging), `trellis-cddl` (COSE key parsing), and `trellis-store-memory` for a **small smoke subset** of the Trellis append fixture corpus. Operators invoke fixed subcommand names (`append-*`, `verify-*`, `export-*`) that read committed vectors under `trellis/fixtures/vectors/`. Full corpus replay belongs to the `trellis-conformance` binary (see `trellis/CLAUDE.md`).

## Authority claim

**Operator surface append/verify/export.** (Orchestrator context, verbatim.)

This crate does **not** define byte semantics; it is a **thin orchestration** over `append_event`, `verify_single_event`, and `ExportPackage::to_zip_bytes`. Rust remains byte authority for encoding and hashes elsewhere (Trellis ADR 0004); this CLI only exercises those APIs against fixtures. It is canonical for **how** smoke vectors are loaded from disk and **which** fixture directories and filenames are assumed (`input-author-event-hash-preimage.cbor`, `expected-event.cbor`, issuer `*.cose_key` under `_keys/`).

## Module structure

| Path        | Lines | Role                                                                 |
| ----------- | ----- | -------------------------------------------------------------------- |
| `src/main.rs` | 223 | Entry (`main`/`run`), command dispatch, six fixture commands, helpers, tests |

## Public Types

| Item | Kind | Derives | Description |
| ---- | ---- | ------- | ----------- |
| —    | —    | —       | **No library surface.** Package exposes a binary only; there are no `pub struct` / `pub enum` / `pub trait` items in this crate. |

## Public Functions

There are **no `pub fn`** items exported for other crates. The table below maps the **binary’s internal and operator-visible behavior** (all functions are private to the binary).

| Function / surface | Signature (conceptual) | Returns / outcome | Description |
| ------------------ | ------------------------ | ------------------- | ----------- |
| `main` | `fn main()` | `()`; `exit(1)` on error | Prints `run()` error to stderr and exits non-zero on failure. |
| `run` | `fn run() -> Result<(), String>` | `Ok(())` or `Err(message)` | Reads `env::args().nth(1)`; missing argv → usage `Err`; else `dispatch_command`. |
| `dispatch_command` | `fn dispatch_command(command: &str) -> Result<(), String>` | `Ok` / `Err` | Matches one of six literal command strings or `Err` for unknown command. |
| **Operator: `append-001`** | (via `dispatch_command`) | Prints three lengths | Loads `001-minimal-inline-payload` + `issuer-001.cose_key`; `MemoryStore::new`; `append_event`; prints `canonical`, `signed`, `append_head` CBOR lengths. |
| **Operator: `append-002`** | (via `dispatch_command`) | Prints three lengths | Same as append-001 for `002-rotation-signing-key` + `issuer-002.cose_key`. |
| **Operator: `verify-001`** | (via `dispatch_command`) | Prints three booleans | Reads `issuer-001.cose_key`, `parse_ed25519_cose_key`; reads `expected-event.cbor` from `001-minimal-inline-payload`; `verify_single_event`; prints `structure_verified`, `integrity_verified`, `readability_verified`. |
| **Operator: `verify-002`** | (via `dispatch_command`) | Prints three booleans | Same pattern for issuer-002 and `002-rotation-signing-key`. |
| **Operator: `export-001`** | (via `dispatch_command`) | Prints `zip_bytes` length | Append pipeline as append-001, then builds `ExportPackage` with entries `010-canonical-event.cbor`, `020-signed-event.cbor`, `030-append-head.cbor`; `to_zip_bytes`. |
| **Operator: `export-002`** | (via `dispatch_command`) | Prints `zip_bytes` length | Same as export-001 for rotation fixture / key 002. |
| `append_001_command` | `fn append_001_command() -> Result<(), String>` | `Ok(())` | Implementation of `append-001`. |
| `append_002_command` | `fn append_002_command() -> Result<(), String>` | `Ok(())` | Implementation of `append-002`. |
| `verify_001_command` | `fn verify_001_command() -> Result<(), String>` | `Ok(())` | Implementation of `verify-001`. |
| `verify_002_command` | `fn verify_002_command() -> Result<(), String>` | `Ok(())` | Implementation of `verify-002`. |
| `export_001_command` | `fn export_001_command() -> Result<(), String>` | `Ok(())` | Implementation of `export-001`. |
| `export_002_command` | `fn export_002_command() -> Result<(), String>` | `Ok(())` | Implementation of `export-002`. |
| `fixture_inputs` | `fn fixture_inputs(dir: &str, key_file: &str) -> Result<(Vec<u8>, Vec<u8>), String>` | Authored CBOR + raw key bytes | Reads `input-author-event-hash-preimage.cbor` from append vector dir and key from `_keys/`. |
| `fixture_root` | `fn fixture_root(dir: &str) -> PathBuf` | Path | `CARGO_MANIFEST_DIR/../../fixtures/vectors/append/{dir}`. |
| `key_path` | `fn key_path(file: &str) -> PathBuf` | Path | `CARGO_MANIFEST_DIR/../../fixtures/vectors/_keys/{file}`. |

## Public Constants

| Constant | Type | Value | Purpose |
| -------- | ---- | ----- | ------- |
| —        | —    | —     | **None** — no `pub const` in this crate. |

## Trait Implementations

| Type | Implements | Notes |
| ---- | ---------- | ----- |
| —    | —          | **None** in this crate (no local types). |

## Public Re-exports

**None** — no `pub use`.

## Cross-Crate Dependencies

| Crate               | Used For | Direction |
| ------------------- | -------- | --------- |
| `trellis-cddl`      | `parse_ed25519_cose_key` for verify commands | upstream (consumed) |
| `trellis-core`      | `AuthoredEvent`, `SigningKeyMaterial`, `append_event` | upstream |
| `trellis-export`    | `ExportEntry`, `ExportPackage`, ZIP bytes | upstream |
| `trellis-store-memory` | `MemoryStore` for append/export | upstream |
| `trellis-verify`    | `verify_single_event` | upstream |

**External `crates.io`:** none declared — `std` only beyond workspace crates.

## Spec Anchors Cited in Source

- `main.rs:2` — `//! Fixture-oriented CLI for the current Trellis Rust scaffold.`
- `main.rs:24-27` — usage string: *"These commands mirror a small smoke subset of the Trellis fixture corpus."* and *"Run the full committed vector set via the `trellis-conformance` binary."*

## Byte-Level / Behavioral Notes

- `#![forbid(unsafe_code)]` — no `unsafe` in this crate.
- **Append and export** share the same path: authored preimage + key → `append_event` → canonical/signed/append-head bytes; export only wraps those three blobs in a deterministic ZIP layout defined by `trellis-export` (not re-specified here).
- **Verify** does not re-append; it loads **pre-generated** `expected-event.cbor` from the fixture directory and verifies with the parsed issuer public key — any drift in fixture layout or filenames breaks the CLI without changing core semantics.
- **Fixture paths** are anchored at `env!("CARGO_MANIFEST_DIR")` with `../../fixtures/vectors/...` — moving the crate or fixtures without updating these segments breaks all commands.
- **In-memory store** only; no persistence or network I/O.
- **No stubs:** no `unimplemented!`, `todo!`, or placeholder panics in shipped paths.

## Test Surface

- `src/main.rs` — `#[cfg(test)] mod tests` (lines ~195–223): `dispatch_rejects_unknown_command`; `dispatch_accepts_fixture_command_names` (runs all six commands end-to-end against committed vectors — requires fixture tree present).
- Broader corpus: **`trellis-conformance`** workspace package and `cargo test -p trellis-conformance` per `trellis/CLAUDE.md` (G-4 oracle), not this binary.

## When to Read the Source

- Exact **stdout format strings** and error message text (tests may depend on them).
- **Fixture directory and file naming** conventions when adding new smoke commands.
- Any future **argv parsing** beyond positional `nth(1)` — currently intentionally minimal.
