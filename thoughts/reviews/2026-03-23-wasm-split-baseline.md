# WASM runtime/tools split — size & timing baseline (ADR 0050)

**Status:** Partial — sizes + rough Node timings recorded (2026-03-23)  
**Date:** 2026-03-23  
**Plan:** [2026-03-23-wasm-runtime-tools-split.md](../plans/2026-03-23-wasm-runtime-tools-split.md)

## Implementation note (current tree)

Runtime and tools artifacts are built from the **same** `crates/formspec-wasm` crate twice (`wasm-pack` → `wasm-pkg-runtime` / `wasm-pkg-tools`). Until a **Rust crate/feature split** removes `formspec-lint` (and friends) from the runtime build, **`.wasm` byte sizes are effectively identical** between the two outputs. The delivered win today is **load order** (runtime-first) and **optional second fetch**, not a smaller runtime binary.

## Artifact sizes

Measured after `npm run build:wasm` in `packages/formspec-engine` (same `wasm-opt -Os` flags as `package.json`).

| Artifact | Raw bytes | gzip | brotli | Notes |
|----------|-----------|------|--------|--------|
| ~~Monolith~~ `wasm-pkg/formspec_wasm_bg.wasm` | — | — | — | Not re-recorded here; compare from a pre-split commit if a historical row is needed. |
| Runtime `wasm-pkg-runtime/formspec_wasm_runtime_bg.wasm` | 3,400,310 | 1,166,169 | 820,914 | Node measurement host: darwin; `brotli` CLI used. |
| Tools `wasm-pkg-tools/formspec_wasm_tools_bg.wasm` | 3,400,302 | 1,166,163 | 820,285 | Differs only by wasm-pack naming/metadata padding. |

## Timings (rough, Node cold process)

Sequence intent: `await initFormspecEngine()` → (optional) `await initFormspecEngineTools()`.

| Step | ms (approx.) | How measured |
|------|----------------|--------------|
| `initFormspecEngine()` only | **4.26** | Fresh `node --input-type=module` subprocess, `performance.now()` around await. |
| `initFormspecEngine()` + `initFormspecEngineTools()` | **8.62** | Fresh subprocess, both awaits. |

**Not yet recorded:** browser timings; full sequence through `createFormEngine()` + first eval; monolith comparison on same machine.

## Commands (repeat measurements)

```bash
cd packages/formspec-engine
npm run build:wasm

wc -c wasm-pkg-runtime/formspec_wasm_runtime_bg.wasm wasm-pkg-tools/formspec_wasm_tools_bg.wasm
gzip -c wasm-pkg-runtime/formspec_wasm_runtime_bg.wasm | wc -c
gzip -c wasm-pkg-tools/formspec_wasm_tools_bg.wasm | wc -c
brotli -c wasm-pkg-runtime/formspec_wasm_runtime_bg.wasm | wc -c
brotli -c wasm-pkg-tools/formspec_wasm_tools_bg.wasm | wc -c
```

Link this file from the plan §Phase 0; extend with browser + eval sequence when gating ADR acceptance.
