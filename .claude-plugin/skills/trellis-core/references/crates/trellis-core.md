# trellis-core Reference Map

> `/Users/mikewolfd/Work/formspec/trellis/crates/trellis-core` — 160 lines across 1 file — (no `description` in `Cargo.toml`; crate-level docs: append scaffold for G-4 vectors)

## Overview

`trellis-core` is the **orchestration crate** for the Phase-1 Trellis append path: it parses an authored event and signing key, derives the author hash and canonical event, builds the COSE Sign1, computes the canonical event hash and append-head bytes, and persists a `StoredEvent` through the `LedgerStore` seam. It composes `trellis-cddl`, `trellis-cose`, and `trellis-types` without re-exporting them. Downstream conformance (`trellis-conformance`) and the in-memory store (`trellis-store-memory`) depend on this crate’s public surface for vector replay.

## Authority claim

**Orchestrator context (verbatim):** Append/verify state machine; canonical for `trellis-core.md` §10 (chain), §17 (idempotency), and the `LedgerStore` seam.

**Agent observations:**

- **Byte authority (Trellis ADR 0004):** This crate does not define wire encodings or domain tags; it **calls** `trellis_cddl` / `trellis_cose` / `trellis_types` (`domain_separated_sha256`, `EVENT_DOMAIN`, `AUTHOR_EVENT_DOMAIN`). When prose disagrees with those crates or this orchestration order, **Rust wins**; update spec prose or cross-checks, not silently this map.
- **§10 (chain) / §9 (hashes):** Chain-relevant fields (`prev_hash`, scope, sequence, causal deps) live inside the **canonical event bytes** produced by `trellis_cddl::canonical_event_from_authored` and the preimage for `canonical_event_hash`. This crate wires the pipeline but does not duplicate CDDL; treat `trellis-cddl` as the byte authority for those structures.
- **§17 (idempotency):** The public `LedgerStore` trait is **`append_event(StoredEvent) -> Result<(), Error>` only** — no idempotency key, dedupe window, or retry token appears on the seam. Normative §17 behavior (if required at persistence) must be documented as **not yet modeled** on this trait, or delegated to a not-yet-landed store implementation; this is a **Rust-vs-prose gap** until the trait evolves.
- **`LedgerStore` seam:** This crate **is** the normative home for the abstract append persistence hook used by `MemoryStore` and exercised in conformance / model checks.

## Module structure

| Path | Lines | Role |
|---|---|---|
| `src/lib.rs` | 160 | Entire public API: `LedgerStore`, wrapper types, `append_event`, `AppendError` |

## Public Types

| Item | Kind | Derives | Description |
|---|---|---|---|
| `LedgerStore` | trait | — | Store seam: implementors persist one `StoredEvent` per successful append. |
| `AuthoredEvent` | struct | `Clone`, `Debug`, `PartialEq`, `Eq` | Opaque authored-event input as raw bytes (`new`, `as_bytes`). |
| `SigningKeyMaterial` | struct | `Clone`, `Debug`, `PartialEq`, `Eq` | Opaque Ed25519 COSE_Key bytes (`new`, `as_bytes`). |
| `AppendError` | struct | `Debug` | Append pipeline failure; carries message and captured `Backtrace`. Implements `Display` and `std::error::Error`; exposes `backtrace()`. |

### `LedgerStore` (associated items)

| Associated | Constraint / signature | Notes |
|---|---|---|
| `type Error` | `std::error::Error + Send + Sync + 'static` | Bound required for object-safe reporting through `AppendError`. |
| `fn append_event` | `(&mut self, event: StoredEvent) -> Result<(), Self::Error>` | Called after full sign/hash pipeline; **only** persistence hook in this crate. |

## Public Functions

| Function | Signature | Returns | Description |
|---|---|---|---|
| `AuthoredEvent::new` | `pub fn new(bytes: Vec<u8>) -> Self` | `AuthoredEvent` | Constructs authored-event input wrapper. |
| `AuthoredEvent::as_bytes` | `pub fn as_bytes(&self) -> &[u8]` | `&[u8]` | Borrows wrapped authored bytes. |
| `SigningKeyMaterial::new` | `pub fn new(bytes: Vec<u8>) -> Self` | `SigningKeyMaterial` | Constructs COSE_Key material wrapper. |
| `SigningKeyMaterial::as_bytes` | `pub fn as_bytes(&self) -> &[u8]` | `&[u8]` | Borrows raw COSE_Key bytes. |
| `AppendError::backtrace` | `pub fn backtrace(&self) -> &Backtrace` | `&Backtrace` | Captured backtrace at construction time (`AppendError::new` is crate-private). |
| `append_event` | `pub fn append_event<S: LedgerStore>(store: &mut S, signing_key: &SigningKeyMaterial, authored_event: &AuthoredEvent) -> Result<AppendArtifacts, AppendError>` | `AppendArtifacts` on success; `AppendError` on decode/sign/store failure | Runs parse → `AUTHOR_EVENT_DOMAIN` author hash → canonical event → COSE protected header + Sig_structure + Sign1 → `EVENT_DOMAIN` canonical event hash → `append_head_bytes` → `store.append_event`. |

Long signature for `append_event`: see `lib.rs:106-110`.

## Public Constants

| Constant | Type | Value | Purpose |
|---|---|---|---|
| *(none)* | — | — | This crate defines **no** `pub const` items. Load-bearing domain tags (`EVENT_DOMAIN`, `AUTHOR_EVENT_DOMAIN`) and suite labels live in **`trellis-types`** (`SUITE_ID_PHASE_1`, `COSE_LABEL_SUITE_ID`, etc.); this crate uses them only through `domain_separated_sha256` and downstream COSE helpers. |

## Trait Implementations

| Type | Implements | Notes |
|---|---|---|
| `AppendError` | `Display` | Writes `message` only (no backtrace in display string). |
| `AppendError` | `std::error::Error` | Source chain not customized. |

No `LedgerStore` impls in this crate (impls live in consumers, e.g. `MemoryStore`).

## Public Re-exports

None — no `pub use`.

## Cross-Crate Dependencies

| Crate | Used For | Direction |
|---|---|---|
| `trellis-cddl` | `append_head_bytes`, `canonical_event_from_authored`, `canonical_event_hash_preimage`, `parse_authored_event`, `parse_ed25519_cose_key` | upstream (this crate consumes) |
| `trellis-cose` | `derive_kid`, `protected_header_bytes`, `sig_structure_bytes`, `sign_ed25519`, `sign1_bytes` | upstream |
| `trellis-types` | `AUTHOR_EVENT_DOMAIN`, `AppendArtifacts`, `AppendHead`, `EVENT_DOMAIN`, `StoredEvent`, `domain_separated_sha256` | upstream |

All are **workspace path** dependencies (`trellis/crates/…`). No crates.io dependencies in `trellis-core`’s own `Cargo.toml`.

## Spec Anchors Cited in Source

- `lib.rs:2` — `//! Trellis append scaffold for the current G-4 vectors.`
- `lib.rs:96-105` — `append_event` rustdoc: computes author hash, canonical payload, COSE signature, canonical-event hash, and `AppendHead` from fixture-pinned authored bytes; documents error cases (decode failure, store rejection). **No explicit `trellis-core.md` § anchors in this file.**

**Rust-vs-prose note:** `trellis-types` documents several constants with **Core §7** citations (e.g. suite registry, COSE label); `trellis-core` inherits those bytes but does not repeat the citations here.

## Stubs / panics audit

- **No** `unimplemented!()`, `todo!()`, or `panic!("not yet")` in `trellis/crates/trellis-core/src/`.

## Byte-Level / Behavioral Notes

- **`#![forbid(unsafe_code)]`** — entire crate.
- **Digest order:** `author_event_hash = domain_separated_sha256(AUTHOR_EVENT_DOMAIN, authored_bytes)` then canonical event construction, then `canonical_event_hash = domain_separated_sha256(EVENT_DOMAIN, canonical_preimage)` where `canonical_preimage` comes from `canonical_event_hash_preimage(ledger_scope, &canonical_event)` — order is load-bearing for fixture parity.
- **COSE:** Phase-1 suite path uses `derive_kid(1, public_key)` and `sign_ed25519` over `sig_structure_bytes(&protected_header, &canonical_event)`; changing call order or arguments breaks vectors.
- **Dead construction:** After `append_head_bytes`, the code builds `let _head = AppendHead::new(...)` and **discards** it; the returned `AppendArtifacts.append_head` comes **only** from `append_head_bytes`. The `AppendHead::new` call is redundant for wire bytes (possible cleanup candidate; not a semantic fork if both agree).
- **Moves vs clones:** `StoredEvent::new` receives `ledger_scope.clone()`, `sequence`, `canonical_event.clone()`, `signed_event.clone()` so `parsed_event` remains usable for the discarded `_head` and return value assembly.
- **Store failure:** Store errors are wrapped as `AppendError` strings (`format!("store append failed: {error}")`).

## Test Surface

| Location | What exercises `trellis-core` |
|---|---|
| `trellis/crates/trellis-conformance/src/lib.rs` | `#[cfg(test)] mod tests` — imports `AuthoredEvent`, `SigningKeyMaterial`, `append_event`; `assert_append_fixture_matches` replays `fixtures/vectors/append/**` against `MemoryStore`. |
| `trellis/crates/trellis-conformance/src/model_checks.rs` | Property/replay scaffolding importing `AuthoredEvent`, `LedgerStore`, `SigningKeyMaterial`, `append_event`. |
| `trellis/crates/trellis-store-memory/src/lib.rs` | `impl LedgerStore for MemoryStore` — the canonical in-process impl of the seam. |

**No `#[cfg(test)]` module inside `trellis-core` itself.**

## When to Read the Source

- Exact error strings and backtrace capture behavior for `AppendError`.
- Any future extension to `LedgerStore` (e.g. §17 idempotency, batching, custody hooks) will start in `lib.rs` — this map should be regenerated after API changes.
- Bit-level CDDL and COSE layouts: read **`trellis-cddl`** and **`trellis-cose`**, not this orchestrator.
