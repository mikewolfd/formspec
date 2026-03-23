# WASM runtime/tools split — size & timing baseline (ADR 0050)

**Status:** Template — measurements not yet recorded  
**Date:** 2026-03-23  
**Plan:** [2026-03-23-wasm-runtime-tools-split.md](../plans/2026-03-23-wasm-runtime-tools-split.md)

## How to record

Fill this in when comparing **monolith** vs **split** artifacts using the **same** `wasm-opt` flags as `packages/formspec-engine/package.json` (`-Os` + bulk-memory + nontrapping-float-to-int + SIMD).

### Artifact sizes

| Artifact | Raw bytes | gzip | brotli | Notes |
|----------|-----------|------|--------|--------|
| ~~Monolith~~ `wasm-pkg/formspec_wasm_bg.wasm` | _TBD_ | _TBD_ | _TBD_ | Baseline from commit before split (or rebuild from historical `package.json` if needed) |
| Runtime `wasm-pkg-runtime/formspec_wasm_runtime_bg.wasm` | _TBD_ | _TBD_ | _TBD_ | |
| Tools `wasm-pkg-tools/formspec_wasm_tools_bg.wasm` | _TBD_ | _TBD_ | _TBD_ | |

### Timings (same sequence for each row)

Sequence: `await initFormspecEngine()` → first `createFormEngine()` → first definition evaluation (e.g. engine-driven `_evaluate` / equivalent).

| Environment | Monolith | Runtime-only init | Runtime + tools init | Notes |
|-------------|----------|-------------------|----------------------|--------|
| Node (representative) | _TBD_ | _TBD_ | _TBD_ | |
| Browser (optional) | _TBD_ | _TBD_ | _TBD_ | |

### Commands (examples)

```bash
# Sizes (from repo root, after npm run build in packages/formspec-engine)
wc -c packages/formspec-engine/wasm-pkg-runtime/formspec_wasm_runtime_bg.wasm
wc -c packages/formspec-engine/wasm-pkg-tools/formspec_wasm_tools_bg.wasm
gzip -c packages/formspec-engine/wasm-pkg-runtime/formspec_wasm_runtime_bg.wasm | wc -c
# brotli -c … | wc -c  (if brotli CLI available)
```

Link this file from the plan §Phase 0 when numbers exist.
