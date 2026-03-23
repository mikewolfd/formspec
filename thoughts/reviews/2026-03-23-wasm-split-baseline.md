# WASM runtime/tools split — size & timing baseline (ADR 0050)

**Status:** Partial — sizes + Node timings + `twiggy` on shipped `.wasm` (2026-03-24)  
**Date:** 2026-03-23 (updated 2026-03-24)  
**Plan:** [2026-03-23-wasm-runtime-tools-split.md](../plans/2026-03-23-wasm-runtime-tools-split.md)

## Implementation note (current tree)

Runtime and tools artifacts are built from **`crates/formspec-wasm`** with two Cargo feature sets:

- **Runtime** — `wasm-pack … -- --no-default-features` — **no `full-wasm`**: omits **`formspec-lint`**, **`document-api`**, **`definition-assembly`**, **`mapping-api`**, **`registry-api`**, **`changelog-api`**, **`fel-authoring`** (see crate `Cargo.toml`). The runtime `.wasm` keeps **eval / screener / coerce / migrations / option sets / core FEL + `analyzeFEL` / path helpers / `prepareFelExpression` / `getFELDependencies`** only.
- **Tools** — default features (`full-wasm` → all of the above + `lint`) — full `wasm_bindgen` surface for lazy-loaded tools.

Further splits (e.g. trimming **`formspec-core`** / **`formspec-eval`** / **`fel-core`** for the runtime eval path) are optional follow-ups — see [2026-03-24-wasm-runtime-rust-size-trim.md](../research/2026-03-24-wasm-runtime-rust-size-trim.md).

## Artifact sizes

Measured after `npm run build:wasm` in `packages/formspec-engine` (same `wasm-opt -Os` flags as `package.json`).

| Artifact | Raw bytes | gzip | brotli | Notes |
|----------|-----------|------|--------|--------|
| ~~Monolith~~ `wasm-pkg/formspec_wasm_bg.wasm` | — | — | — | Not re-recorded here; compare from a pre-split commit if a historical row is needed. |
| Runtime `wasm-pkg-runtime/formspec_wasm_runtime_bg.wasm` | **1,666,941** | **615,642** | **439,659** | `--no-default-features` (minimal `wasm_bindgen` surface + no `formspec-lint`); darwin; `brotli` CLI. *Updated 2026-03-24 after granular Cargo features.* |
| Tools `wasm-pkg-tools/formspec_wasm_tools_bg.wasm` | 3,400,302 | 1,166,144 | 820,344 | Default `full-wasm` + `lint`; same `wasm-opt -Os` flags as runtime. |

## Timings (rough, Node cold process)

Sequence intent: `await initFormspecEngine()` → (optional) `await initFormspecEngineTools()`.

| Step | ms (approx.) | How measured |
|------|----------------|--------------|
| `initFormspecEngine()` only | **4.26** | Fresh `node --input-type=module` subprocess, `performance.now()` around await. |
| `initFormspecEngine()` + `initFormspecEngineTools()` | **8.62** | Fresh subprocess, both awaits. |
| `createFormEngine(kitchen-sink)` after runtime init | **19.77** | Fresh subprocess; `tests/e2e/fixtures/kitchen-sink-holistic/definition.v2.json`. |
| First `setValue('fullName', …)` after construction | **1.22** | Same subprocess as previous row. |

**Not yet recorded:** browser **timings**; explicit `_evaluate()` / full validation hot path microbench; monolith comparison on same machine.

**Browser network (load order, not timings):** Playwright specs `tests/e2e/browser/wasm/wasm-runtime-network.spec.ts` (slim harness — no tools WASM during runtime init) and `tests/e2e/browser/wasm/wasm-tools-network.spec.ts` (tools WASM fetched only after `initFormspecEngineTools`). See plan §8.

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

## `cargo bloat` + `twiggy` (use together)

| Question | Tool | Notes |
|----------|------|--------|
| Which **Rust crates** dominate **host** `.text` for the runtime vs tools **dependency graph**? | **`cargo bloat`** on proxy bins | Crate names (`jsonschema`, `formspec_lint`, `regex_automata`, …). Not wasm codegen. |
| What actually landed in the **shipped** `.wasm` (post **`wasm-opt -Os`**)? | **`twiggy`** | `code[]` / `data[]` / exports / retained size on the **real** artifact. |
| What **grew** from runtime artifact to tools artifact? | **`twiggy diff`** | Same indices can **shift** between builds; read large **positive** deltas as “tools added mass here.” |

**`cargo bloat` (wasm32):** Only understands **ELF / Mach-O / PE** — not WebAssembly. Use **proxy binaries** on `formspec-wasm`:

| Binary | Features | Mirrors |
|--------|----------|---------|
| `formspec-wasm-bloat-runtime` | `--no-default-features` | Runtime WASM (no `formspec-lint`) |
| `formspec-wasm-bloat-tools` | default (`lint`) | Tools WASM |

```bash
cargo bloat --release -p formspec-wasm --bin formspec-wasm-bloat-runtime --no-default-features --crates -n 35
cargo bloat --release -p formspec-wasm --bin formspec-wasm-bloat-tools --crates -n 35
```

**Caveat (bloat):** Native `.text` is a **proxy** — ordering still tracks the graph (e.g. tools shows large **`jsonschema`** / **`formspec_lint`**). Example (darwin, one run): runtime ~1.1 MiB `.text`; tools ~2.0 MiB `.text` with **`jsonschema` ~27%**, **`formspec_lint` ~4%**.

### `twiggy` — one-shot script

From repo root (after `npm run build:wasm` in `packages/formspec-engine`):

```bash
bash scripts/twiggy-wasm.sh              # top + retained + diff + monos + garbage
bash scripts/twiggy-wasm.sh diff         # fastest: runtime → tools delta only
bash scripts/twiggy-wasm.sh --help
# or from packages/formspec-engine:
npm run profile:twiggy
```

Optional env: `TOP_N` (default 25), `DIFF_N` (default 35). Requires `twiggy` on PATH (`cargo install twiggy`).

### `twiggy` — manual commands (same artifacts)

Paths relative to repo root; files are **`wasm-opt -Os`** outputs from `packages/formspec-engine`:

```bash
twiggy top packages/formspec-engine/wasm-pkg-runtime/formspec_wasm_runtime_bg.wasm -n 30
twiggy top packages/formspec-engine/wasm-pkg-tools/formspec_wasm_tools_bg.wasm -n 30
twiggy top packages/formspec-engine/wasm-pkg-runtime/formspec_wasm_runtime_bg.wasm -n 25 --retained
twiggy top packages/formspec-engine/wasm-pkg-tools/formspec_wasm_tools_bg.wasm -n 25 --retained
twiggy diff packages/formspec-engine/wasm-pkg-runtime/formspec_wasm_runtime_bg.wasm \
             packages/formspec-engine/wasm-pkg-tools/formspec_wasm_tools_bg.wasm -n 35
twiggy monos packages/formspec-engine/wasm-pkg-runtime/formspec_wasm_runtime_bg.wasm -n 25
```

**`twiggy monos`:** Often **0** rows (2026-03-24, twiggy 0.8.0) — no monomorphization bloat signal here.

**`twiggy top --retained` (high level):**

| Build | Standouts |
|-------|-----------|
| **Runtime** | Large `code[]` / `data[]` blobs, `table[0]` / `elem[0]`. Named exports: `evaluateDefinition`, `prepareFelExpression`, etc. (full non-lint surface still in runtime `.wasm` today; **lint** is the main Cargo feature split). |
| **Tools** | **`table[0]` / `elem[0]` ~29% retained each** — bigger indirect-call graph than runtime. Extra large `data[]` segments vs runtime. |

**`twiggy garbage`:** Often reports huge “potential false-positive data segments”; treat as **hints** only.

Twiggy item names are **wasm indices / export names**, not Rust crates — pair with **`cargo bloat`** for crate-level hypotheses, then **`twiggy diff`** + **`--retained`** on wasm to see shipped impact.
