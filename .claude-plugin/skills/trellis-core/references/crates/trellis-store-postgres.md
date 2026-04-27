# trellis-store-postgres Reference Map

> `trellis/crates/trellis-store-postgres/` — 351 lines across 1 file — Postgres-backed Trellis event storage; default production storage seam for the Phase-1 append runtime (`src/lib.rs` crate documentation).

## Overview

This crate implements a production-oriented `LedgerStore` (trait in `trellis/crates/trellis-core/src/lib.rs`) over PostgreSQL: it creates a `trellis_events` table, appends `StoredEvent` rows (`trellis/crates/trellis-types/src/lib.rs`), and loads events for a scope in sequence order. It keeps third-party types off the public API (`postgres::Client` is private). Downstream, `wos-server`'s `EventStore` port is designed to compose this crate for the canonical events table alongside separate projection schema work. Byte semantics for what gets stored (canonical vs signed COSE bytes, scope, sequence) remain owned by Trellis Core and `trellis-types`; this crate is persistence and transport policy (cleartext `NoTls` for Phase-1 localhost only).

## Authority claim

**Orchestrator (verbatim):** Production storage; wos-server EventStore port composes here.

**Observed:** Rust remains byte authority for what is *written* (opaque `BYTEA` blobs) per Trellis ADR 0004; interpretation of those bytes is not implemented in this crate — it defers to `trellis-core` / `trellis-types` and `specs/trellis-core.md` Phase-1 envelope invariants. This crate is canonical for the **Postgres DDL and query shape** of the reference `trellis_events` table and for **TLS posture documentation** of `PostgresStore::connect`. It does not implement hashing, COSE, or CDDL; it only stores and retrieves the bytes the append pipeline already produced.

## Module structure

Single-file crate; all logic in `src/lib.rs` (351 lines): public store + error types, `LedgerStore` impl, and an embedded integration test that spins a temporary local Postgres cluster when `initdb` / `pg_ctl` are available on `PATH` (or under Homebrew PostgreSQL@16 paths).

## Public Types

| Item | Kind | Derives | Description |
|---|---|---|---|
| `PostgresStoreError` | struct | `Debug` | Operational failure for connect, schema init, query, append, or numeric bounds checks when mapping Postgres `BIGINT` / stored values to `u64`. Carries a captured [`Backtrace`](https://doc.rust-lang.org/std/backtrace/struct.Backtrace.html). |
| `PostgresStore` | struct | *(manual `Debug` via `finish_non_exhaustive`)* | Owns a private `postgres::Client`. Connects with cleartext TLS (`NoTls`) in Phase-1; exposes `connect`, `load_scope_events`, and `LedgerStore::append_event`. |

### `PostgresStoreError` methods

| Method | Signature | Description |
|---|---|---|
| `backtrace` | `pub fn backtrace(&self) -> &Backtrace` | Returns the backtrace captured at error construction. |

## Public Functions

| Function | Signature | Returns | Description |
|---|---|---|---|
| `PostgresStore::connect` | `pub fn connect(connection_string: &str) -> Result<Self, PostgresStoreError>` | `Ok(PostgresStore)` on success | Opens a `postgres` client with [`NoTls`](https://docs.rs/postgres/latest/postgres/struct.NoTls.html), runs `CREATE TABLE IF NOT EXISTS trellis_events (...)`, returns the store. Fails on connection or DDL errors. |
| `PostgresStore::load_scope_events` | `pub fn load_scope_events(&mut self, scope: &[u8]) -> Result<Vec<StoredEvent>, PostgresStoreError>` | Ordered `Vec<StoredEvent>` for that scope | `SELECT ... WHERE scope = $1 ORDER BY sequence ASC`, maps rows to `StoredEvent::new`. Errors if query fails or a stored `sequence` does not fit `u64`. |
| `LedgerStore::append_event` | `fn append_event(&mut self, event: StoredEvent) -> Result<(), PostgresStoreError>` | `Ok(())` on successful `INSERT` | `INSERT INTO trellis_events (...) VALUES ($1..$4)` with `sequence` as `i64`. Errors if `event.sequence()` exceeds `i64::MAX`, if `execute` fails (e.g. primary key violation), or on driver errors. |

## Public Constants

| Constant | Type | Value | Purpose |
|---|---|---|---|
| *(none)* | — | — | There are **no** `pub const` items. The DDL string `CREATE_EVENTS_TABLE_SQL` is crate-private (`lib.rs:25–32`); it defines `trellis_events(scope BYTEA, sequence BIGINT, canonical_event BYTEA, signed_event BYTEA)` with `PRIMARY KEY (scope, sequence)`. |

## Trait Implementations

| Type | Implements | Notes |
|---|---|---|
| `PostgresStoreError` | `Display` | Writes `message` only (backtrace not in display string). |
| `PostgresStoreError` | `std::error::Error` | Base trait only; no `source()` chain. |
| `PostgresStore` | `Debug` | `finish_non_exhaustive()` — does not print the inner client. |
| `PostgresStore` | `LedgerStore` | `type Error = PostgresStoreError`; `append_event` persists one row per call. |

## Public Re-exports

None — the crate does not `pub use` symbols from dependencies.

## Cross-Crate Dependencies

| Crate | Used For | Direction |
|---|---|---|
| `trellis-core` | `LedgerStore` trait | upstream (this crate consumes) |
| `trellis-types` | `StoredEvent` | upstream |
| `postgres` | `Client`, `NoTls`, queries | external; **not** re-exported; shapes connection and SQL execution only |

**Dev-dependencies:** `tempfile` — ephemeral data directory for the `#[cfg(test)]` Postgres cluster harness.

## Spec Anchors Cited in Source

The source does not cite `trellis-core.md` section numbers or ADRs by path in `///` lines; crate-level `//!` documentation establishes intent instead:

- `lib.rs:2–6` — "Postgres-backed Trellis event storage." / "This crate owns the default production storage seam for the current Phase-1 append runtime." / "It intentionally exposes Trellis-owned types and does not leak `postgres` crate types through its public API."
- `lib.rs:8–14` — TLS section: `[PostgresStore::connect]` uses `postgres::NoTls`; "intentional for the Phase-1 scaffold and local test clusters (cleartext on the loopback interface only)"; directive to wire explicit TLS before non-localhost deployment.
- `lib.rs:74–79` — `connect` doc: cleartext / localhost-only Phase-1; do not use on untrusted networks without TLS.
- `lib.rs:98–102` — `load_scope_events`: errors when query fails or stored values do not fit "the current Phase-1 type bounds."

## Byte-Level / Behavioral Notes

- **Schema:** `(scope, sequence)` primary key enforces one row per sequence index per scope; duplicates surface as Postgres errors on `INSERT`, not as silent overwrites.
- **Sequence width:** Append path maps `u64` → `i64` for the driver; values above `i64::MAX` are rejected with a structured error before hitting the database.
- **Load path:** Reads `BIGINT` as `i64`, then `u64::try_from`; negative or oversized stored sequences fail closed with `PostgresStoreError`.
- **Column types:** All payload columns are `BYTEA`; the crate does not interpret canonical vs signed COSE layout — only stores and returns bytes.
- **Ordering:** `load_scope_events` uses `ORDER BY sequence ASC` for deterministic replay order within a scope.
- **TLS:** `NoTls` is a deliberate Phase-1 limitation; changing connect behavior affects every deployment's threat model, not just API shape.
- **`#![forbid(unsafe_code)]`** — no `unsafe` in this crate.

## Test Surface

| Location | What it covers |
|---|---|
| `trellis/crates/trellis-store-postgres/src/lib.rs` — `#[cfg(test)] mod tests` (approx. lines 172–351) | `postgres_store_persists_and_reads_scope_events`: two events on `scope-a`, one on `scope-b`, then `load_scope_events` ordering and field equality. Requires `initdb` and `pg_ctl` on `PATH` or under `/opt/homebrew/opt/postgresql@16/bin` or `/usr/local/opt/postgresql@16/bin`. |

No `trellis-conformance` crate dependency on this package was found in-repo; integration coverage is this embedded test plus any future `wos-server` adapter tests once the EventStore composition lands.

## When to Read the Source

- **Exact SQL strings and column names** — migrations, compatibility with hand-tuned DBs, or adding indexes require reading the `INSERT`/`SELECT` and `CREATE_EVENTS_TABLE_SQL` literals in `lib.rs`.
- **Temporary cluster test harness** — port reservation, `pg_ctl` flags, Homebrew path fallbacks, and failure modes when Postgres binaries are missing live only in the test module.
- **Error message wording and backtrace policy** — `PostgresStoreError::new` and `Display` formatting are the source of truth for diagnostics.
