# trellis-store-memory Reference Map

> `trellis/crates/trellis-store-memory` — 36 lines across 1 file — In-memory store for the append scaffold (`//!` in `lib.rs`).

## Overview

This crate provides a minimal in-process implementation of the `LedgerStore` seam from `trellis-core`: it appends `StoredEvent` values to a `Vec` in call order. It does not interpret bytes, enforce ledger invariants, or persist across process lifetime. Primary consumers are `trellis-conformance` (committed vector corpus for append and model-check tests) and any local harness that needs a store that never fails I/O. It sits below `trellis-core::append_event` as a replaceable persistence adapter; canonical hashing and COSE construction remain in `trellis-core` and sibling crates.

## Authority claim

**Orchestrator (verbatim):** In-process `LedgerStore` adapter; conformance-test backing.

**Observed:** This crate is not byte authority for Trellis wire formats; it only holds opaque `StoredEvent` snapshots produced upstream. Byte authority for append semantics remains in `trellis-types`, `trellis-cddl`, `trellis-cose`, and `trellis-core` per Trellis ADR 0004 (Rust as authority where the stack disagrees with prose). This crate is canonical for “how tests hold appended events in RAM” only, not for event encoding or verification.

## Module structure

Single crate root; no public submodules.

| Path       | Lines | Role                                              |
| ---------- | ----- | ------------------------------------------------- |
| `src/lib.rs` | 36  | `MemoryStore` and `LedgerStore` implementation. |

## Public Types

| Item          | Kind   | Derives              | Description                                                                 |
| ------------- | ------ | -------------------- | ----------------------------------------------------------------------------- |
| `MemoryStore` | struct | `Default`, `Debug`   | Holds `Vec<StoredEvent>`; `append_event` pushes in order; no validation layer. |

### `LedgerStore` (implemented for `MemoryStore`)

Upstream trait defined in `trellis-core`. Relevant associated items for this type:

| Associated item | Signature / type                         | Notes                                      |
| --------------- | ---------------------------------------- | ------------------------------------------ |
| `type Error`    | `Infallible`                             | `append_event` cannot return `Err`.       |
| `append_event`  | `fn append_event(&mut self, event: StoredEvent) -> Result<(), Self::Error>` | Delegates to `Vec::push`. |

## Public Functions

| Function            | Signature                                              | Returns                         | Description                                                                 |
| ------------------- | ------------------------------------------------------ | ------------------------------- | ----------------------------------------------------------------------------- |
| `MemoryStore::new`  | `fn new() -> Self`                                     | Empty `MemoryStore`             | Same as `Default::default()`; crate-level docs: “Creates an empty in-memory store.” |
| `MemoryStore::events` | `fn events(&self) -> &[StoredEvent]`                | Slice view of append-ordered events | Crate-level docs: “Returns all stored events in append order.”               |
| `LedgerStore::append_event` (via `MemoryStore`) | `fn append_event(&mut self, event: StoredEvent) -> Result<(), Infallible>` | `Ok(())` always | Persists one `StoredEvent` by pushing onto the internal vector (trait contract from `trellis-core`). |

## Public Constants

None. Domain-separation tags and suite constants live in `trellis-types` / `trellis-cose`, not in this crate.

## Trait Implementations

| Type          | Implements    | Notes                                                                 |
| ------------- | ------------- | --------------------------------------------------------------------- |
| `MemoryStore` | `LedgerStore` | `Error = Infallible`; append-only in-memory log for tests and harnesses. |
| `MemoryStore` | `Default`     | Via `#[derive(Default)]`; empty `events` vector.                     |

## Public Re-exports

None.

## Cross-Crate Dependencies

| Crate           | Used For                         | Direction                                      |
| --------------- | -------------------------------- | ---------------------------------------------- |
| `trellis-core`  | `LedgerStore` trait              | upstream (this crate implements the trait)   |
| `trellis-types` | `StoredEvent` argument / slice   | upstream (opaque stored snapshot type)       |

No `crates.io` dependencies in `Cargo.toml`. `std::convert::Infallible` is used for the associated `Error` type.

## Spec Anchors Cited in Source

Doc comments in this crate do not cite `trellis-core.md` sections, ADRs, RFCs, or fixture paths. Verbatim crate-level and item lines:

- `lib.rs:2` — "`//! In-memory store for the append scaffold.`"
- `lib.rs:11` — "`/// Stores appended events in memory for conformance tests.`"
- `lib.rs:18` — "`/// Creates an empty in-memory store.`"
- `lib.rs:23` — "`/// Returns all stored events in append order.`"

## Byte-Level / Behavioral Notes

- `#![forbid(unsafe_code)]` — no `unsafe` in this crate.
- Storage is a plain `Vec<StoredEvent>`: append order equals successful `append_event` call order; there is no cross-scope indexing or on-disk layout.
- `Error = Infallible` means `trellis_core::append_event` will never fail solely because the store rejected a write; store-related failures in `append_event` come only from encoding/parse paths upstream of the store call.
- No deduplication, idempotency keys, or durability: replacing this with `trellis-store-postgres` (or another adapter) is an explicit product/runtime choice, not a behavior-preserving drop-in for persistence semantics.
- No `unimplemented!()`, `todo!()`, or `panic!` in library code (empty infallible body).

## Test Surface

- `trellis/crates/trellis-conformance/src/lib.rs` — `#[cfg(test)] mod tests`: imports `trellis_store_memory::MemoryStore` (see around lines 17–18); `assert_append_fixture_matches` constructs `MemoryStore::new()` and passes it to `trellis_core::append_event` against fixtures under `trellis/fixtures/vectors/append/`.
- `trellis/crates/trellis-conformance/src/model_checks.rs` — property/replay tests import `MemoryStore` (see around line 11) alongside `LedgerStore` / `append_event` for model-check evidence.
- This crate contains no `#[cfg(test)] mod tests` of its own.

## When to Read the Source

- When changing the `LedgerStore` contract in `trellis-core` and verifying all adapters still compile and satisfy the trait’s documented semantics.
- When adding fields or behavior to `MemoryStore` (e.g., metrics, capacity limits) that would change test harness assumptions.
- When auditing whether conformance tests should assert on `MemoryStore::events()` contents after multi-append scenarios (not currently part of the public conformance API surface beyond append pipeline outputs).
