# Review: WASM / fel split vs “logic in Rust” rule

**Date:** 2026-03-24  
**Rule:** Spec **business logic** lives in **Rust** (and Python for server/tooling); TypeScript **orchestrates** and **bridges** to WASM.

## Verdict

The **WASM runtime/tools split**, **`fel-api-runtime` / `fel-api-tools`**, **`init-formspec-engine` lazy tools load**, **`formspec-engine/render`**, **`formspec-core` subpath imports**, and **Playwright network tests** **do not add** new normative behavior in TypeScript. They are packaging, module graph, re-exports, harness glue, and assertions on load order.

## File-by-file (this workstream)

| Area | Rust-first? | Notes |
|------|-------------|--------|
| `fel-api-runtime.ts` | Yes | Passthrough to `wasm-bridge-runtime`; `analyzeFEL` only normalizes error **shape** for TS consumers. `splitNormalizedPath` delegates normalization to `wasmNormalizeIndexedPath`. `itemLocationAtPath` is **host tree navigation** (find item by key), not FEL evaluation. `normalizePathSegment` is a string helper (legacy); if it ever diverges from spec, it should move to Rust or call WASM. |
| `fel-api-tools.ts` | Yes | Passthrough + `rewriteFELReferences` / `validateExtensionUsage` **orchestration** (callbacks, walking items to collect extension names) then **WASM** does rewrite/validation. |
| `fel-api.ts` | Yes | Re-export barrel only. |
| `init-formspec-engine.ts` | Yes | Module load / init order only. |
| `engine-render-entry.ts` | Yes | Public surface only. |
| `FormEngine` / `wasm-fel` / engine chain → `wasm-bridge-runtime` | Yes | Already reviewed earlier; eval path is WASM. |
| `formspec-core` import changes | Yes | No logic change. |
| E2E harness / Playwright | Yes | Test infrastructure. |
| `CLAUDE.md` / `AGENTS.md` logic ownership | Yes | Documents the rule. |

## Pre-existing debt (not introduced here)

- **Full TS FEL interpreter** under `packages/formspec-engine/src/fel/` still exists for reactive **compileFEL** / **DependencyVisitor**. That conflicts with a strict “all FEL in Rust” posture; the agreed framing is: **normative eval = WASM**, TS pipeline = **client wiring** until/unless replaced by Rust-side dep graph + WASM-only eval.
- **`normalizePathSegment`** in `fel-api-runtime.ts` is pure TS regex; worth aligning with Rust if the spec defines path normalization normatively.

## README fix

`packages/formspec-engine/README.md` opening previously implied the TS FEL stack was the full story; it now states **Rust/WASM = authoritative** and points to **Logic ownership** in `CLAUDE.md` / `AGENTS.md`, and the **FEL pipeline** subsection is labeled as TS wiring with eval from WASM.
