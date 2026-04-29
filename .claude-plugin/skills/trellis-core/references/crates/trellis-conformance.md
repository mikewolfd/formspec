# trellis-conformance Reference Map

> `trellis/crates/trellis-conformance` — **1244** lines across **2** files — Conformance harness for the committed Trellis vector corpus (`lib.rs` crate docs).

## Overview

`trellis-conformance` is a **workspace test crate** with **no exported Rust public API**: `src/lib.rs` contains only crate-level documentation, `#![forbid(unsafe_code)]`, and two `#[cfg(test)]` modules (`tests`, `model_checks`). Running `cargo nextest run -p trellis-conformance` replays the committed fixture tree under `trellis/fixtures/vectors/` and asserts byte-identical outputs against the reference Trellis Rust stack (`trellis-core` append path, `trellis-export` ZIP bytes, `trellis-verify` reports, and CBOR/hash helpers from `trellis-cddl` / `trellis-types`). It sits **below** production crates as an **oracle**: vectors and Rust implementations are expected to move in lockstep per Trellis workflow (`trellis/CLAUDE.md`).

## Authority claim

**G-4 oracle full-corpus vector replay.**

This crate is the **G-4 conformance oracle** for Trellis: it does not define wire bytes itself; it **replays** every committed vector operation (`append`, `export`, `verify`, `tamper`, `projection`, `shred`) and fails if any artifact diverges from what the Rust reference stack produces. Byte authority for encodings remains in `trellis-core`, `trellis-types`, `trellis-cose`, `trellis-export`, and `trellis-verify` per Trellis ADR 0004; this crate is **canonical for “does the implementation still match the frozen corpus?”** — not for normative prose sections alone. Property tests in `model_checks.rs` pin named requirements rows (`TR-CORE-*`, `TR-OP-*`) as executable propositions alongside fixture replay.

## Module structure

| Path | Lines | Role |
|---|---:|---|
| `src/lib.rs` | 612 | Crate root; `#![forbid(unsafe_code)]`; `#[cfg(test)] mod model_checks` and inline `mod tests` with full vector corpus replay. |
| `src/model_checks.rs` | 632 | Proptest-backed models (`AppendContractModel`, `canonical_order_by_scope`, …) and replay parity between `MemoryStore` and a test-only `IndexedStore`. |

## Public Types

| Item | Kind | Derives | Description |
|---|---|---|---|
| *(none)* | — | — | The crate exposes **no** `pub struct`, `pub enum`, `pub trait`, or `pub type`. All types are private to `#[cfg(test)]` modules. |

### Test-only internal types (`model_checks.rs`)

These are **not** part of the crate’s Rust public API; they exist for navigability when reading sources.

| Item | Kind | Derives | Description |
|---|---|---|---|
| `CandidateSpec` | struct | `Clone, Debug, PartialEq, Eq` | Proptest-generated parameters for synthetic candidates (scope, DAG mask, tie-breaker, payload, optional fact group, operational “accident” fields). |
| `Candidate` | struct | `Clone, Debug, PartialEq, Eq` | Materialized candidate with `id`, same-scope `dependencies`, and `Accident`. |
| `Accident` | struct | `Clone, Debug, PartialEq, Eq` | Operational metadata perturbed to prove ordering invariants ignore accidents (`TR-CORE-023`). |
| `CanonicalRef` | struct | `Clone, Copy, Debug, PartialEq, Eq` | `(scope, position)` reference into a per-scope canonical admission order. |
| `AppendCall` | struct | `Clone, Debug, PartialEq, Eq` | Abstract append invocation for the idempotency / conflict / prerequisite model. |
| `AppendOutcome` | enum | `Clone, Copy, Debug, PartialEq, Eq` | `Deferred`, `Accepted`, `Replay`, `RejectedDifferentPayload`, `RejectedConflict`. |
| `AppendContractModel` | struct | `Default, Debug` | Mutable oracle for append contract rules (prerequisites, idempotency, scoped fact conflicts). |
| `IndexedStore` | struct | `Default, Debug` | In-memory `(scope_bytes, sequence) → StoredEvent` map implementing `LedgerStore` for replay parity tests. |

## Public Functions

| Function | Signature | Returns | Description |
|---|---|---|---|
| *(none)* | — | — | No `pub fn` at crate root. Vector orchestration lives in private `fn` inside `lib.rs` `mod tests` (e.g. `assert_fixture_matches`, `assert_append_fixture_matches`, …). |

## Public Constants

| Constant | Type | Value | Purpose |
|---|---|---|---|
| *(none)* | — | — | No `pub const`. Test code uses constants from dependencies (e.g. `trellis_types::EVENT_DOMAIN`) and a **private** domain tag `"trellis-checkpoint-v1"` inside `checkpoint_digest` in `lib.rs` for projection watermark checks. |

## Trait Implementations

| Type | Implements | Notes |
|---|---|---|
| `IndexedStore` | `trellis_core::LedgerStore` | `Error = Infallible`; `append_event` inserts by `(event.scope().to_vec(), event.sequence())`. Test-only; not `pub`. |

## Public Re-exports

None — no `pub use`.

## Cross-Crate Dependencies

| Crate | Used For | Direction |
|---|---|---|
| `trellis-core` | `append_event`, `AuthoredEvent`, `SigningKeyMaterial`, `LedgerStore`, `AppendError` | upstream (runtime under test) |
| `trellis-store-memory` | `MemoryStore` | upstream (append + ordering oracle) |
| `trellis-cddl` | `canonical_event_hash_preimage` | dev / test only |
| `trellis-export` | `ExportPackage`, `ExportEntry` | dev / test only |
| `trellis-types` | `EVENT_DOMAIN`, `domain_separated_sha256`, `encode_bstr`, `encode_tstr`, `encode_uint` | dev / test only |
| `trellis-verify` | `verify_export_zip`, `verify_tampered_ledger`, `VerificationReport`, `VerificationFailure` | dev / test only |
| `ciborium` | `Value`, decode/encode for projection/shred assertions | external, test only |
| `toml` | Parse `manifest.toml` per fixture directory | external, test only |
| `serde` | Derives in dev contexts where used transitively | external, test only |
| `sha2` | `Sha256::digest` for `backup_snapshot_ref` in shred vectors | external, test only |
| `proptest` | Property tests and strategies in `model_checks.rs` | external, test only |

## Spec Anchors Cited in Source

- `lib.rs:2` — "Conformance harness for the committed Trellis vector corpus."
- `model_checks.rs:2` — "Property and replay tests backing Trellis model-check evidence."
- `model_checks.rs:277-280` — "Visits all permutations via Heap's method — **O(n!)** in the candidate count." / "Permutation count is capped by `candidate_specs_strategy` (`1..=5` candidates → at most `5! = 120` permutations per proptest case)."
- `model_checks.rs:574-577` — "Locks byte-identical append replay for the committed `append/001` fixture across the in-memory `MemoryStore` and `IndexedStore` harnesses (same canonical artifacts and persisted event ordering). This does not exercise distinct storage backends beyond those two adapters."
- `lib.rs:414-416` — Shred-vector rationale text pins prose: `"{scope}-backup-restore-refused-per-§16.5"` (string built for expected cascade report).
- Requirement IDs appear as **Rust test names** (executable traceability): `tr_core_020_*`, `tr_core_023_*`, `tr_core_025_*`, `tr_core_046_*`, `tr_core_050_*`, `tr_op_061_*`, `tr_core_001_*`, `tr_op_111_*` in `model_checks.rs`; `committed_vectors_match_the_rust_runtime` drives full corpus replay in `lib.rs`.

## Byte-Level / Behavioral Notes

- **No `unsafe`:** `#![forbid(unsafe_code)]` on the crate (`lib.rs:4`).
- **Fixture layout:** `fixtures_root()` resolves to `trellis/fixtures/vectors` via `Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/vectors")` (`lib.rs:22-24`, `model_checks.rs:294-296`). Each vector directory must contain `manifest.toml` with `op` ∈ `append` \| `export` \| `verify` \| `tamper` \| `projection` \| `shred` (`lib.rs:59-66`).
- **Append vectors:** Compares `author-event-hash.bin`, `expected-event-payload.cbor`, `sig-structure.bin`, `expected-event.cbor`, `expected-append-head.cbor` to `append_event` artifacts (`lib.rs:74-99`).
- **Export vectors:** Builds `ExportPackage` from manifest-described ledger members; ZIP bytes must match `expected.zip` exactly (`lib.rs:102-122`).
- **Projection vectors:** May assert CBOR watermarks, optional `staff_view_decision_binding`, rebuilt view (`view_rebuilt`), and cadence reports synthesized from checkpoint `tree_size` fields; `checkpoint_digest` uses a **hand-built** CBOR map prefix (`0xa3` + encoded `"scope"` / `"version"` / `"checkpoint_payload"`) then `domain_separated_sha256("trellis-checkpoint-v1", &preimage)` (`lib.rs:583-592`). Any change alters watermark bytes.
- **COSE Sign1 parsing in tests:** `sign1_payload_value` expects CBOR tag **18** (`Value::Tag(18, inner)`) and takes payload array index **2** (`lib.rs:548-552`) — must stay aligned with fixture COSE layout.
- **Shred / cascade:** Expected `cascade_report` CBOR is built from declared cascade scope, optional `backup_snapshot_ref` (SHA-256 of snapshot bytes), `target_content_hash` from first event’s `content_hash`, and per-scope post-state maps (`lib.rs:380-453`).
- **Ordering model tests:** `canonical_order_by_scope` implements deterministic ready-queue selection: among ready candidates, minimize `(tie_breaker, id)` (`model_checks.rs:232-244`) — must stay aligned with Trellis concurrency narrative exercised by `TR-CORE-020` / `023` / `025`.

## Test Surface

| Location | What it covers |
|---|---|
| `lib.rs:10-612` | `mod tests`: `committed_vectors_match_the_rust_runtime` walks all subdirs under `fixtures/vectors/{append,export,verify,tamper,projection,shred}`; helpers decode TOML manifests, drive `MemoryStore` + `append_event`, ZIP export, `verify_export_zip` / `verify_tampered_ledger`, projection CBOR checks, shred cascade reports. |
| `model_checks.rs:331-632` | `proptest!` block: `tr_core_020_single_canonical_order_per_scope`, `tr_core_023_order_is_independent_of_operational_accidents`, `tr_core_025_concurrency_uses_deterministic_tie_breaking`, `tr_core_046_prerequisites_gate_attestation`, `tr_core_050_idempotency_keys_are_stable_across_retries`, `tr_op_061_conflicts_stay_scoped_to_affected_facts`; plus `tr_core_001_append_fixture_replay_is_identical_across_memory_and_indexed_stores`, `tr_op_111_replay_and_property_battery_are_live`. |
| External fixtures | `trellis/fixtures/vectors/**` — byte artifacts and `manifest.toml` are the co-authoritative inputs alongside this crate. |

No `#[cfg(test)] mod tests` blocks exist outside these two modules.

## When to Read the Source

- **Exact manifest keys and optional branches** for each `op` (e.g. `posture_transition_count`, `staff_view_decision_binding_fields`, tamper `export_zip` vs registry path) — the match arms and TOML field names are the contract.
- **Projection / checkpoint preimage layout** — the ad hoc CBOR prefix in `checkpoint_digest` must be verified against the spec’s checkpoint hashing narrative, not inferred from this map alone.
- **Fixture generator parity** — doc comments in generators or Python cross-checks are not in this crate; when vectors change, read `fixtures/vectors/**/manifest.toml` and sibling generator scripts.
