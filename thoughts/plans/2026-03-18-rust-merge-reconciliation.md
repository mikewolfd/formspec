# Rust Rewrite — Master Plan

Status: **Phases 1–5 + Steps 0–8 complete** — 6 crates, 17,470 lines of Rust, **518 tests** (verified 2026-03-19). All Rust code written. WASM + PyO3 bindings updated. Dependency inversion interfaces extracted on `main` (9811f3f + 20b1f04). Factory functions not yet created. Remaining: interface gap fixes (Step 8.5), factory functions (Step 8.6), TS/Python wiring (Steps 9b–10), branch cleanup (Step 11).

**Last verified:** 2026-03-19 — `cargo test --workspace --exclude formspec-py` passes 518 tests (73 fel-core + 59 formspec-core + 111 formspec-core integration + 36 changelog + 28 formspec-eval + 211 formspec-lint). PyO3 crate skipped (needs Python dev linkage on build machine).

## Overview

Build a **Rust shared kernel** that eliminates the TS↔Python logic duplication without replacing the TypeScript engine's reactivity model.

**Strategy:**
- `packages/formspec-engine/src/index.ts` keeps Preact Signals for reactive UI state — it is the only file in the engine that stays TypeScript.
- Every other file in `packages/formspec-engine/src/` moves to Rust. None of them touch `@preact/signals-core`.
- Rust is also the single implementation for all batch processors (Definition Evaluator, Linter) that TS currently lacks entirely.
- WASM bindings expose the Rust crates to TypeScript (`index.ts` calls WASM internally; public API stays identical). PyO3 bindings expose them to Python.
- Once WASM is wired: delete the TS source files. Once PyO3 is wired: delete the Python FEL source files.

**What stays TypeScript:** `index.ts` only — FormEngine class, Preact Signals reactive state. Plus new interface files (`interfaces.ts`, `fel/runtime.ts`, `fel/chevrotain-runtime.ts`).
**What stays Python:** Adapters (JSON, XML, CSV serialization) and artifact orchestrator (`validate.py`). Everything else moves to Rust.
**What moves to Rust:** Every non-reactive TS file + all batch processors + mapping engine + registry client + changelog.

**Conventions:** Completed work uses "Phase" labels (historical). Remaining work uses "Step" labels (actionable). All remaining work targets `main` directly.

### Execution Order

```
Steps 0–5 (lint)  ──────┐
                         ├──→ Step 9a (WASM bindings) ✅ ──→ Step 8.5 (interface gaps) ──→ Step 8.6 (factories) ──→ Step 9b-c (TS wiring) ──→ Step 11 (cleanup)
Steps 6–8 (scope exp.) ─┘     Step 10 bindings ✅                                          Step 10 wiring ──────────────────────────────────┘
         ✅
```

Steps 0–8 and 9a/10-bindings are complete. Dependency inversion landed on `main` (9811f3f, 20b1f04). Remaining: interface gap fixes (Step 8.5), factory functions (Step 8.6), Step 9b-c (wire WASM into TS engine + delete TS files), Step 10 wiring (replace Python imports + delete Python files), Step 11 (branch cleanup).

---

## Current State

### Crate Status (verified 2026-03-19)

| Crate | Lines | Contents | Tests |
|-------|-------|----------|-------|
| `crates/fel-core` | 4,199 | FEL lexer, parser, evaluator (rust_decimal), environment, extensions, dependencies, printer | 73 |
| `crates/formspec-core` | 5,034 | FEL analysis, path utils, schema validator, extension analysis, runtime mapping (10 transforms), assembler, registry client, changelog | 59 + 111 + 36 |
| `crates/formspec-eval` | 1,578 | Definition Evaluator — 4-phase batch processor with topo sort, inheritance, NRB, wildcards | 28 |
| `crates/formspec-lint` | 5,341 | 8-module linter: tree, references, extensions, expressions, dependencies, component_matrix, pass_theme, pass_component — 35 error codes | 211 |
| `crates/formspec-wasm` | 619 | WASM bindings via wasm-bindgen → TypeScript (all capabilities + registry, changelog, mapping doc) | — |
| `crates/formspec-py` | 699 | PyO3 bindings → Python (all capabilities + registry, changelog, mapping doc) | — (linker-only, needs Python dev headers) |
| **Total** | **17,470** | | **518** |

### TypeScript File Disposition

| File | Lines | Destination | Status |
|------|-------|-------------|--------|
| `src/index.ts` | 2,454 | **Stays TS** — only Preact Signals consumer | — |
| `src/interfaces.ts` | ~240 | **Stays TS** — `IFormEngine`, `IRuntimeMappingEngine`, `MappingDiagnostic` | NEW (9811f3f) |
| `src/fel/runtime.ts` | ~100 | **Stays TS** — `IFelRuntime`, `ICompiledExpression`, `IFelEngineContext`, `FelContext` | NEW (9811f3f + 20b1f04) |
| `src/fel/chevrotain-runtime.ts` | ~83 | **Stays TS** — adapter wrapping Chevrotain pipeline, implements `IFelRuntime` | NEW (9811f3f) |
| `src/fel/lexer.ts` | 255 | `crates/fel-core` | ✅ Rust done, delete when WASM wired |
| `src/fel/parser.ts` | 368 | `crates/fel-core` | ✅ Rust done, delete when WASM wired |
| `src/fel/interpreter.ts` | 1,314 | `crates/fel-core` | ✅ Rust done, delete when WASM wired |
| `src/fel/dependency-visitor.ts` | 97 | `crates/fel-core` | ✅ Rust done, delete when WASM wired |
| `src/fel/analysis.ts` | 435 | `crates/formspec-core` | ✅ Rust done, delete when WASM wired (but see `IFelAnalyzer` gap — Studio needs this) |
| `src/path-utils.ts` | 71 | `crates/formspec-core` | ✅ Rust done, delete when WASM wired |
| `src/schema-validator.ts` | 347 | `crates/formspec-core` | ✅ Rust done, delete when WASM wired |
| `src/extension-analysis.ts` | 97 | `crates/formspec-core` | ✅ Rust done, delete when WASM wired |
| `src/runtime-mapping.ts` | 220 | `crates/formspec-core` | ✅ Rust done, delete when WASM wired |
| `src/assembler.ts` | 695 | `crates/formspec-core` | ✅ Rust done, delete when WASM wired |

### `main` Branch (compiles, 518 tests pass — verified 2026-03-19)

- `fel-core`: 11 source files including printer — **no touch**
- `formspec-core`: 9 source files (added `registry_client.rs`, `changelog.rs`; expanded `runtime_mapping.rs` with 4 new transforms + MappingDocument) — **Steps 6–8 complete**
- `formspec-eval`: 1 file (`lib.rs` with 28 tests) — **no touch**
- `formspec-lint`: 10 source files (8 typed modules replaced `passes.rs`, 35 error codes, 211 tests) — **Steps 0–5 complete**
- `formspec-wasm`: 1 file (7 new exports: registry, changelog, mapping doc) — **Step 9a complete**
- `formspec-py`: 1 file (6 new exports: registry, changelog, mapping doc) — **Step 10 bindings complete**

### Dependency Inversion (landed on `main` — 2026-03-19)

Commits `9811f3f` and `20b1f04` extracted pluggable interfaces so the engine depends on abstractions, not concrete implementations:

**TypeScript (formspec-engine):**
- `IFelRuntime` + `ICompiledExpression` + `FelContext` — FEL compilation/evaluation contract (`fel/runtime.ts`)
- `IFelEngineContext` — minimal engine surface for FEL stdlib: signals, getInstanceData, getVariableValue (`fel/runtime.ts`)
- `ChevrotainFelRuntime` — adapter wrapping existing Chevrotain pipeline (`fel/chevrotain-runtime.ts`)
- `IFormEngine` + `IRuntimeMappingEngine` — full engine/mapping interfaces (`interfaces.ts`)
- `MappingDiagnostic`, `RuntimeMappingResult` — moved to interface layer
- `FormEngine` accepts `felRuntime` via `FormEngineRuntimeContext`, defaults to Chevrotain
- `RuntimeMappingEngine` accepts `IFelRuntime` via constructor injection
- `BehaviorContext.engine` typed as `IFormEngine` (not concrete `FormEngine`)

**Python (formspec):**
- `FelRuntime` protocol + `DefaultFelRuntime` class (`fel/runtime.py`)
- `FormProcessor`, `FormValidator`, `MappingProcessor`, `DataAdapter` protocols (`protocols.py`)
- `DefinitionEvaluator`, `Linter`, `MappingEngine` accept `fel_runtime` kwarg

**Fix-up (20b1f04):**
- `IFelEngineContext` was too narrow — added `signals`, `relevantSignals`, `requiredSignals`, `readonlySignals`, `validationResults` (MIP lookup needs these)
- `RuntimeMappingResult.diagnostics` typed as `string[]` in interface but `MappingDiagnostic[]` in impl — fixed
- `FELBuiltinFunctionCatalogEntry` missing `signature` + `description` fields — added

### Branch Status (as of 2026-03-19)

| Branch | Status | Action |
|--------|--------|--------|
| `main` | Active — 518 Rust tests, all TS/Python tests pass, interfaces extracted | Continue here |
| `feature/rust-rewrite` | **Obsolete** — 80 commits behind main, 0 ahead. All crate work already on main. | Delete (Step 11) |
| `rust_merged` | **Obsolete** — reference material consumed during Steps 0–5. | Delete (Step 11) |
| `claude/rust-formspec-rewrite-JysP8` | **Obsolete** — superseded by main. | Delete (Step 11) |
| `feature/headless-component-adapters` | Active worktree at `.worktrees/headless-adapters` | Unrelated to Rust transition |

**Worktrees:**
- `/Users/mikewolfd/.codex/worktrees/0cc3/formspec` — detached HEAD `cc27165`, stale
- `/Users/mikewolfd/.codex/worktrees/50af/formspec` — detached HEAD `cc27165`, stale
- `.worktrees/headless-adapters` — active, unrelated

---

## Completed

### Phase 1: FEL Precision + Environment ✅

1. ✅ **Swap `f64` → `rust_decimal`** — base-10 arithmetic, 28-29 significant digits (exceeds spec S3.4.1 18-digit minimum). Eliminates `float_eq` tolerance hacks and custom `bankers_round`. Native `MidpointNearestEven` rounding. `0.1 + 0.2 = 0.3` exact.
2. ✅ **FEL Environment** (`crates/fel-core/src/environment.rs`) — `FormspecEnvironment` with field resolution, `RepeatContext` (@current/@index/@count with push/pop nesting), `MipState` per field, named instances via @instance('name'), definition variables via @name.
3. ✅ **FEL Extensions** (`crates/fel-core/src/extensions.rs`) — `ExtensionRegistry` with null-propagating user-defined functions, shadow prevention against reserved words and 40+ builtins.
4. ✅ **FEL Analysis** (`crates/formspec-core/src/fel_analysis.rs`) — `analyze_fel()` extracts references, variables, functions. `rewrite_fel_references()` with callback-based AST rewriting for field paths, variables, instance names.

### Phase 2: formspec-core ✅

5. ✅ **Path Utils** (`src/path_utils.rs`) — `normalize_indexed_path`, `split_normalized_path`, `item_at_path`, `item_location_at_path`, `parent_path`, `leaf_key`. Generic `TreeItem` trait for tree traversal.
6. ✅ **Schema Validator** (`src/schema_validator.rs`) — `detect_document_type` for all 8 artifact types (marker fields + heuristic fallback). `JsonSchemaValidator` trait for dependency inversion (host provides JSON Schema engine). `json_pointer_to_jsonpath` converter.
7. ✅ **Extension Analysis** (`src/extension_analysis.rs`) — `validate_extension_usage` with `RegistryLookup` trait. Detects unresolved (error), retired (warning), deprecated (info) extensions. Tree walk with path accumulation.
8. ✅ **Runtime Mapping** (`src/runtime_mapping.rs`) — `execute_mapping` with bidirectional transforms: preserve, drop, constant, valueMap (auto-invert for reverse), coerce (string/number/integer/boolean/date/datetime), expression (FEL with source field access). Priority-ordered rules, condition guards, nested path output.
9. ✅ **Assembler** (`src/assembler.rs`) — `assemble_definition` with `RefResolver` trait. Key prefix application, circular ref detection, bind/shape/variable import with proper AST-based FEL path rewriting (parse → transform → print).
10. ✅ **FEL Printer** (`crates/fel-core/src/printer.rs`) — `print_expr()` serializes AST back to valid FEL source. 15 round-trip tests verify parse → print → reparse identity.

### Phase 3: WASM Bindings ✅

11. ✅ **`crates/formspec-wasm`** — wasm-bindgen layer exposing all capabilities:
    - FEL: `evalFEL`, `parseFEL`, `printFEL`, `getFELDependencies`, `extractDependencies`, `analyzeFEL`
    - Path: `normalizeIndexedPath`
    - Schema: `detectDocumentType`
    - Lint: `lintDocument`, `lintDocumentWithRegistries`
    - Eval: `evaluateDefinition`
    - Assembly: `assembleDefinition`
    - Mapping: `executeMapping`

### Phase 4: Batch Processors ✅

12. ✅ **Definition Evaluator** (`crates/formspec-eval`) — 4-phase pipeline:
    - Rebuild: item tree from definition, bind index merge (object + array styles)
    - Recalculate: whitespace normalization → variable evaluation (topo-sorted with cycle detection) → relevance (AND inheritance) → readonly (OR inheritance) → required (no inheritance) → calculate (continues when non-relevant per S5.6)
    - Revalidate: required/constraint/shape with null context defaults per S3.8.1, activeWhen guards
    - Notify: NRB modes (remove/empty/keep) with lookup precedence (exact → wildcard → stripped → parent → definition default)
    - Wildcard bind expansion against actual repeat data

13. ✅ **Linter** (`crates/formspec-lint`) — 8-module pipeline with 35 error codes, 199 tests:
    - `tree.rs`: E200/E201 — ItemTreeIndex with duplicate key/path detection
    - `references.rs`: E300/E301/E302/W300 — bind path + shape target + optionSet validation
    - `extensions.rs`: E600/E601/E602 — extension resolution via MapRegistry
    - `expressions.rs`: E400 — CompiledExpression for all FEL slots (binds, shapes, screener, variables, composed shapes)
    - `dependencies.rs`: E500 — DFS cycle detection with canonical dedup
    - `component_matrix.rs`: 12 input component compatibility rules
    - `pass_theme.rs`: W700–W707/W711/E710 — token validation, reference integrity, cross-artifact, page semantics
    - `pass_component.rs`: E800–E807/W800–W804 — tree validation, type compatibility, bind resolution, custom cycles
    - Pass gating, LintMode (Authoring/Runtime) with W300+W802 suppressions, diagnostic sorting, `definition_document` for cross-artifact checks

### Phase 5: PyO3 Bindings ✅

14. ✅ **`crates/formspec-py`** — PyO3 module `formspec_rust` exposing: `eval_fel`, `parse_fel`, `get_dependencies`, `extract_deps`, `analyze_expression`, `detect_type`, `lint_document`, `evaluate_def`. Full Python↔Rust type conversion (None/bool/int/float/str/list/dict ↔ FelValue).

### Phase 6: Scope Expansion ✅

15. ✅ **Mapping Engine expansion** (`runtime_mapping.rs`) — 4 new transforms (flatten, nest, concat, split), `MappingDocument` with autoMap + defaults, per-rule `default` and `bidirectional` flag. All 10 transform types now implemented.
16. ✅ **Registry Client** (`registry_client.rs`) — `Registry::from_json()`, semver constraint matching, lifecycle state machine validation, well-known URL construction, `RegistryLookup` implementation. 35 tests, validates against real `formspec-common.registry.json`.
17. ✅ **Changelog** (`changelog.rs`) — `generate_changelog()` with section-by-section diff, impact classification (Breaking/Compatible/Cosmetic), semver impact computation. 36 integration tests.
18. ✅ **WASM bindings updated** — 7 new exports: `parseRegistry`, `findRegistryEntry`, `validateLifecycleTransition`, `wellKnownRegistryUrl`, `generateChangelog`, `executeMappingDoc`. All 10 transform types in WASM parser.
19. ✅ **PyO3 bindings updated** — 6 new exports: `parse_registry`, `find_registry_entry`, `validate_lifecycle`, `well_known_url`, `generate_changelog`, `execute_mapping_doc`.

---

## Steps 0–5: Lint Reconciliation ✅

**Completed 2026-03-18.** All 8 lint modules written from scratch against `main`'s architecture, informed by `rust_merged` diff. `passes.rs` deleted entirely.

**Results:** 27 → 199 tests, 12 → 35 error codes, 1,392 → 5,341 lines.

### Modules implemented

| Module | Error codes | Tests | What it does |
|--------|-------------|-------|-------------|
| `tree.rs` | E200, E201 | 9 | ItemTreeIndex with by_key/by_full_path/repeatable_groups/ambiguous_keys |
| `references.rs` | E300, E301, E302, W300 | 19 | Bind path + shape target validation against ItemTreeIndex |
| `extensions.rs` | E600, E601, E602 | 15 | Extension resolution via MapRegistry from registry documents |
| `expressions.rs` | E400 | 17 | CompiledExpression with bind_target for all FEL slots |
| `dependencies.rs` | E500 | 12 | Cycle detection with canonical dedup on CompiledExpression graph |
| `component_matrix.rs` | — | 13 | 12 input component compatibility rules (data-only, no diagnostics) |
| `pass_theme.rs` | W700–W707, W711, E710 | 54 | Token validation, reference integrity, cross-artifact, page semantics |
| `pass_component.rs` | E800–E807, W800–W804 | 34 | Tree validation, type compatibility, bind resolution, custom cycles |

### Key decisions made during implementation

- **Binds format:** Kept `main`'s binds-as-object convention (not schema-correct arrays). All new modules handle `binds` as `{path: {slots}}`.
- **W700 semantics:** Old W700 (token ref checking) replaced with proper color validation. Token ref checking moved to W704.
- **W802 suppression:** Added to `suppressed_in` in authoring mode. E802 always fires regardless of mode.
- **`definition_document`:** Added as `Option<Value>` to `LintOptions`. Cross-artifact checks in pass_theme (W705–W707) and pass_component (W800, E802–E803) are conditional.
- **LintDiagnostic constructors:** Added `error()`, `warning()`, `info()` convenience methods.

---

## Steps 6–8: Scope Expansion ✅

**Completed 2026-03-18.** All three modules ported to Rust.

### Step 6: Mapping Engine ✅

Expanded `runtime_mapping.rs` (738 → ~900 lines, 27 tests):
- [x] 4 new `TransformType` variants: `Flatten { separator }`, `Nest { separator }`, `Concat(String)`, `Split(String)`
- [x] `MappingDocument` struct with `rules`, `defaults`, `auto_map`
- [x] `execute_mapping_doc()` — document-level entry point with defaults + autoMap
- [x] Per-rule `default: Option<Value>` — fallback when source is null/absent
- [x] Per-rule `bidirectional: bool` — skip rule in reverse when false
- [x] Backwards compatible: existing `execute_mapping()` unchanged

All 10 transform types now implemented: preserve, drop, constant, valueMap, coerce, expression, flatten, nest, concat, split.

### Step 7: Registry Client ✅

New `registry_client.rs` (965 lines, 35 tests):
- [x] `Registry::from_json()` — parse registry document from JSON
- [x] `Registry::find()` / `find_one()` — query by name + semver constraint, sorted version-descending
- [x] `Registry::list_by_category()` / `list_by_status()`
- [x] `Registry::validate()` — structural validation (name pattern, deprecation notice, category fields)
- [x] `impl RegistryLookup for Registry` — bridges to `RegistryEntryInfo`
- [x] `validate_lifecycle_transition()` — spec-compliant state machine (draft→stable→deprecated→retired + un-deprecation)
- [x] `well_known_url()` — `/.well-known/formspec-registry.json`
- [x] `version_satisfies()` — semver constraint matching with `>=`, `<=`, `>`, `<`, exact, compound AND
- [x] Passes validation against real `formspec-common.registry.json`

### Step 8: Changelog ✅

New `changelog.rs` (602 lines) + `tests/changelog_test.rs` (568 lines, 36 tests):
- [x] `generate_changelog()` — section-by-section diff (items, binds, shapes, optionSets, dataSources, screener, migrations, metadata)
- [x] Impact classification: Breaking/Compatible/Cosmetic per change type and target
- [x] Semver impact: max(Breaking→Major, Compatible→Minor, Cosmetic→Patch)
- [x] Change objects with type, target, path, impact, key, before/after, migration hints

---

## Step 8.5: Interface Gap Fixes (spec-mandated)

**Status: NOT STARTED.** Spec expert review (2026-03-19) identified gaps between the extracted interfaces and normative spec requirements. These must be fixed before WASM wiring — the interfaces are the permanent API contract.

### P0 — Architectural Blocker

| # | Gap | Spec | Interface | Issue |
|---|-----|------|-----------|-------|
| 1 | **Preact Signal coupling in `IFormEngine`** | S2.4 Phase 4 (impl-defined notify) | `interfaces.ts` | `IFormEngine` exposes `Signal<T>` types from `@preact/signals-core` throughout (e.g. `relevantSignals: Record<string, Signal<boolean>>`). A Rust/WASM backend cannot provide Preact signals. Either abstract over reactivity (`Subscribable<T>` wrapper) or require WASM backend to produce signal-compatible wrappers. |

**Decision needed:** The transition plan says `index.ts` stays TypeScript and owns all signal wiring. `IFormEngine` is consumed by the webcomponent layer which needs signals. Two options:
1. **Keep signals on IFormEngine** — accept that `IFormEngine` is a TS-side contract only. Rust provides pure computation via WASM; `index.ts` (the sole `IFormEngine` impl) wraps WASM calls in signals. No other `IFormEngine` impl is needed.
2. **Abstract signals out** — create `Subscribable<T>` or equivalent. More work, but enables a hypothetical pure-WASM engine.

Option 1 aligns with the existing strategy ("index.ts stays TS, owns reactivity"). The interface is for consumers (webcomponent, studio), not for swapping engine implementations.

### P1 — Spec-Normative Gaps

| # | Gap | Spec | Interface | Fix |
|---|-----|------|-----------|-----|
| 2 | **External validation injection missing** | S5.7 (MUST) | `IFormEngine` | Add `injectExternalValidation()` and `clearExternalValidation()` to `IFormEngine`. Concrete `FormEngine` may also need impl. |
| 3 | **Extension function registration missing** | S3.12 (SHOULD), S8.1 | `IFelRuntime` | Add `registerFunction(name, entry, impl)` or equivalent. Currently extension functions reach through to Chevrotain internals. |
| 4 | **Registry entry loading missing** | S8.1 | `IFormEngine` | `FormEngine` takes registries via constructor but `IFormEngine` has no `setRegistryEntries()`. Add it or document that registry injection is constructor-time only. |
| 5 | **Standalone dependency extraction missing from TS** | S3.6.1 (MUST) | `IFelRuntime` | Python `FelRuntime` protocol has `extract_dependencies()` but TS `IFelRuntime` lacks it. Currently only available on `ICompiledExpression.dependencies`. Add `extractDependencies(expression: string): string[]` to `IFelRuntime`. |
| 6 | **2 mapping error codes missing** | Mapping S7.2 | `MappingDiagnostic` | `errorCode` union is missing `VERSION_MISMATCH` and `INVALID_FEL`. Add to the union type. |

### P2 — Tooling Gaps (not spec-mandated, but needed for Studio)

| # | Gap | Spec | Interface | Fix |
|---|-----|------|-----------|-----|
| 7 | **`IFelAnalyzer` needed for Studio** | Not spec-mandated | New interface | `analyzeFEL()`, `rewriteFELReferences()`, `tokenize()` (syntax highlighting) all depend on Chevrotain internals. Create `IFelAnalyzer` interface with `analyze()`, `rewrite()`, `tokenize()`. Priority 2 in transition plan. |
| 8 | **Host function data sources not abstracted** | S2.1.7 | `IFormEngine` | `formspec-fn:` URI host callbacks have no interface contract. Currently internal to `index.ts`. Acceptable for now since `index.ts` stays TS. |

### P3 — Nice-to-have

| # | Gap | Spec | Interface | Decision |
|---|-----|------|-----------|----------|
| 9 | Mapping direction not queryable | Mapping S3.1.2 | `IRuntimeMappingEngine` | **Defer.** Implementation validates internally. |
| 10 | Conformance level not queryable | Mapping S1.5 | `IRuntimeMappingEngine` | **Defer.** Not needed for wiring. |

---

## Step 8.6: Factory Functions (from transition plan Phase 1)

**Status: NOT STARTED.** The original transition plan (`2026-03-17-rust-backend-transition.md`) calls for factory functions as the last refactoring step before Rust wiring. Neither `factories.ts` nor `factories.py` exists yet.

### TypeScript

Create `packages/formspec-engine/src/factories.ts`:

```typescript
export function createFormEngine(
    definition: FormspecDefinition,
    runtimeContext?: FormEngineRuntimeContext,
    registryEntries?: RegistryEntry[],
): IFormEngine {
    return new FormEngine(definition, runtimeContext, registryEntries);
}

export function createMappingEngine(doc: any): IRuntimeMappingEngine {
    return new RuntimeMappingEngine(doc);
}
```

Update call sites (from transition plan Priority 1):

| File | Current | Fix |
|------|---------|-----|
| `formspec-webcomponent/src/element.ts` | `new FormEngine(def)` | `createFormEngine(def, ctx)` |
| `formspec-studio/.../BehaviorPreview.tsx` | `new FormEngine(def)` | `createFormEngine(def)` |
| `formspec-studio/.../TestResponse.tsx` | `new FormEngine(def)` | `createFormEngine(def)` |
| `formspec-studio-core/src/evaluation-helpers.ts` | `new FormEngine(def)` | `createFormEngine(def)` |
| `formspec-core/src/handlers/mapping.ts` | `new RuntimeMappingEngine(doc)` | `createMappingEngine(doc)` |

### Python

Create `src/formspec/factories.py`:

```python
def create_form_processor(definition, registries=None, fel_runtime=None):
    from .evaluator import DefinitionEvaluator
    return DefinitionEvaluator(definition, registries, fel_runtime)

def create_mapping_engine(doc, fel_runtime=None):
    from .mapping.engine import MappingEngine
    return MappingEngine(doc, fel_runtime)
```

Update call sites:

| File | Current | Fix |
|------|---------|-----|
| `src/formspec/validate.py` | `DefinitionEvaluator(...)` | `create_form_processor(...)` |
| `examples/references/server/main.py` | Direct construction | `create_form_processor(...)` |
| Tests (8 files) | `DefinitionEvaluator(...)` | Factory or parametrize |
| Tests (3 files) | `MappingEngine(...)` | Factory or parametrize |

---

## Step 9: Wire WASM into TypeScript

**9a. Update WASM bindings** ✅ (2026-03-18):
- [x] `parseRegistry`, `findRegistryEntry`, `validateLifecycleTransition`, `wellKnownRegistryUrl`
- [x] `generateChangelog`
- [x] `executeMappingDoc`
- [x] Updated `parse_mapping_rules` to handle all 10 transform types

**9b. Wire into TypeScript engine:**
- [ ] Install toolchain: `rustup target add wasm32-unknown-unknown` + `cargo install wasm-pack`
- [ ] Build WASM package: `wasm-pack build crates/formspec-wasm --target bundler`
- [ ] Add WASM package as npm dependency in `packages/formspec-engine/package.json`
- [ ] Create thin TS wrapper module that loads WASM and re-exports typed functions
- [ ] Wire `index.ts` to call WASM for:
  - [ ] FEL evaluation (`compileFEL`, `evaluateFEL`)
  - [ ] FEL dependency extraction (reactive signal wiring)
  - [ ] FEL analysis (`analyzeFEL`, `getFELDependencies`)
  - [ ] Assembly (`assembleDefinitionSync`)
  - [ ] Schema validation (`createSchemaValidator`)
  - [ ] Path utilities (`normalizeIndexedPath`)
  - [ ] Runtime mapping (`RuntimeMappingEngine`)

**9c. Verify + decommission TS:**
- [ ] Delete all non-reactive TS files (see Decommission Milestones)
- [ ] Run full Playwright E2E suite — verify zero regressions
- [ ] Run `npm run docs:check` — verify doc gates pass

## Step 10: Wire PyO3 into Python

- [ ] Install maturin: `pip install maturin`
- [ ] Build: `maturin develop --release` in `crates/formspec-py`
- [x] Add mapping engine, registry client, changelog exports to `formspec-py` (2026-03-18: `parse_registry`, `find_registry_entry`, `validate_lifecycle`, `well_known_url`, `generate_changelog`, `execute_mapping_doc`)
- [ ] Wire Python backend — replace imports with `import formspec_rust`:
  - [ ] `formspec.fel.parser.parse` → `formspec_rust.parse_fel`
  - [ ] `formspec.fel.evaluator.evaluate` → `formspec_rust.eval_fel`
  - [ ] `formspec.fel.dependencies.extract_dependencies` → `formspec_rust.extract_deps`
  - [ ] `formspec.validator` → `formspec_rust.lint_document`
  - [ ] `formspec.evaluator` → `formspec_rust.evaluate_def`
  - [ ] `formspec.mapping` → `formspec_rust.execute_mapping`
  - [ ] `formspec.registry` → `formspec_rust.registry_*`
  - [ ] `formspec.changelog` → `formspec_rust.changelog_*`
- [ ] Delete `src/formspec/fel/`
- [ ] Delete `src/formspec/mapping/engine.py`, `src/formspec/mapping/transforms.py`
- [ ] Delete `src/formspec/registry.py`
- [ ] Delete `src/formspec/changelog.py`
- [ ] Keep `src/formspec/adapters/` (JSON, XML, CSV) — stays Python
- [ ] Run full Python conformance suite: `python3 -m pytest tests/ -v`

## Step 11: Cleanup

- [ ] Delete branch `claude/rust-formspec-rewrite-JysP8` (obsolete — superseded by main)
- [ ] Delete branch `rust_merged` (obsolete — all logic rewritten on main during Steps 0–5)
- [ ] Delete branch `feature/rust-rewrite` (obsolete — 80 commits behind main, 0 ahead, all crate work on main)
- [ ] Prune codex worktree `0cc3` (detached HEAD cc27165, stale)
- [ ] Prune codex worktree `50af` (detached HEAD cc27165, stale)
- [ ] Clean up remote tracking: `remotes/origin/claude/rust-formspec-rewrite-JysP8`, `remotes/origin/claude/formspec-user-features-0bFje`

---

## Decommission Milestones

**After WASM wired into `index.ts` (Step 9):** delete all of:
- `src/fel/lexer.ts`, `src/fel/parser.ts`, `src/fel/interpreter.ts`, `src/fel/dependency-visitor.ts`
- `src/fel/analysis.ts`
- `src/path-utils.ts`, `src/schema-validator.ts`, `src/extension-analysis.ts`, `src/runtime-mapping.ts`, `src/assembler.ts`

**After PyO3 wired into Python backend (Step 10):** delete:
- `src/formspec/fel/` (lexer, parser, evaluator, ast_nodes, types, errors, dependencies, environment, extensions)
- `src/formspec/mapping/engine.py`, `src/formspec/mapping/transforms.py`
- `src/formspec/registry.py`
- `src/formspec/changelog.py`

---

## Remaining — `index.ts` (stays TypeScript)

### FormEngine — Very High Complexity

The only TypeScript file. Manages form state via Preact Signals:

- Field values, relevance (visibility), required/readonly state
- Validation results, repeat group counts, option lists, computed variables
- **Option Sets (S4.6)**: named reusable option lists, dynamic filtering, conditional options
- **Variables (S4.5)**: `@name` references, lexical scoping via `scope`, DAG-ordered recalculation
- **Data Sources (S2.1.7)**: inline `data`, URL `source`, host callbacks via `formspec-fn:` URI scheme; schema declarations, fallback behavior, read-only enforcement
- **4-phase processing** (S2.4): Rebuild → Recalculate → Revalidate → **Notify**
  - NRB (non-relevant blanking) is part of Recalculate and Response serialization, NOT a separate phase
  - Deferred processing: batch writes accumulate, one cycle runs with union of dirty nodes
- Bind constraints (field-level: required, readonly, calculate, constraint, relevance)
- Shape evaluation: composition operators (`and`/`or`/`not`/`xone`), per-shape `timing`, `code`, `context`, `activeWhen`
- Repeat group lifecycle (add/remove instances, min/max cardinality)
- **Response serialization**: `nonRelevantBehavior` modes (`remove`/`empty`/`keep`), per-bind `excludedValue` override
- Version migrations, screener evaluation, `disabledDisplay` presentation hints
- **Validation modes (S5.5)**: `continuous`, `deferred`, `disabled`
- **External validation results (S5.7)**: inject/clear with `source: "external"`, idempotent merge

`index.ts` calls WASM for all pure logic (FEL evaluation, assembly, schema validation, path resolution). Its job is signal wiring, reactivity, and the notify phase only.

**Host callbacks:** `formspec-fn:` URIs call back into the JS host. Data source loading can be async — the spec requires fetching before the first Rebuild phase.

---

## Remaining — Python Backend (`src/formspec/`)

After Steps 6–10, only format adapters and the artifact orchestrator stay Python:

| Module | File | Why it stays |
|--------|------|-------------|
| Base adapter ABC | `adapters/base.py` | Python abstract interface for format adapters |
| JSON adapter | `adapters/json_adapter.py` | Server-side serialization, Python `json` stdlib |
| XML adapter | `adapters/xml_adapter.py` | Server-side serialization, `xml.etree` stdlib |
| CSV adapter | `adapters/csv_adapter.py` | Server-side serialization, `csv` stdlib |
| Artifact Orchestrator | `validate.py` | CLI entry point, calls into Rust via PyO3 |

### Adapter Details

| Adapter | File | Description |
|---------|------|-------------|
| Base ABC | `adapters/base.py` | `serialize(JsonValue) -> bytes`, `deserialize(bytes) -> JsonValue` |
| JSON | `adapters/json_adapter.py` | Pretty/sort/null-handling options, Decimal serialization |
| XML | `adapters/xml_adapter.py` | Attributes (@-prefix), CDATA, namespaces, root element |
| CSV | `adapters/csv_adapter.py` | RFC 4180, repeat group row expansion, configurable delimiter/quote |

---

## Deferred / Out of Scope (Tier 2 & 3)

- **Theme Processor** — selector cascade (6 levels), 12-column layout, token resolution, widget-dataType compatibility matrix (33 widgets). Currently in the webcomponent layer.
- **Component Tree Resolver** — slot binding, `when` conditional rendering (FEL), custom instantiation, progressive-to-core fallback, responsive merge. Currently in the webcomponent layer.

---

## Reference

### Error Code Inventory (35 total ✅)

**Errors (20):** E100, E200, E201, E300, E301, E302, E400, E500, E600, E601, E602, E710, E800, E801, E802, E803, E804, E805, E806, E807

**Warnings (15):** W300, W700, W701, W702, W703, W704, W705, W706, W707, W711, W800, W801, W802, W803, W804

### Known Gaps (from spec review + spec-expert analysis 2026-03-19)

#### Rust/Lint Gaps (from Steps 0–5)

| # | Gap | Risk | Decision |
|---|-----|------|----------|
| 1 | **E101 (JSON Schema validation)** — Python linter validates documents against JSON Schema via `jsonschema` and uses E101 errors for pass gating. Rust has no equivalent. | Medium | **Accept.** Rust linter's value is in semantic passes 2-7. Caller can do schema validation externally. Pass gating in Rust uses E200/E201 structural errors instead. |
| 2 | **`when` expression FEL validation** — Component spec says `when` is a FEL boolean expression, but neither Python nor Rust validates `when` in component trees. Malformed `when` silently passes lint. | Low | **Defer.** Presentation-only, no data semantics impact. Add as future enhancement. |
| 3 | **`decimal` vs `number` vocabulary** — Spec prose says "number" in compatibility matrix, schema uses `decimal`. | Low | **Follow schema.** Python reference already uses `decimal`. Rust must match. (Addressed in Step 3.1.) |
| 4 | **WASM/PyO3 binding gap** — Adding `definition_document` to `LintOptions` compiles cleanly (defaults to `None`), but cross-artifact checks (W705-W707, W800-W804) are unreachable from WASM/Python until bindings are updated to pass `definition_document`. | Low | **Defer.** Follow-up adds `lintDocumentWithContext(doc, registries, definition)` to WASM and equivalent to PyO3. |

#### Interface Gaps (from spec-expert review 2026-03-19) — see Step 8.5

| # | Gap | Spec | Severity | Decision |
|---|-----|------|----------|----------|
| 5 | **Preact Signal coupling in `IFormEngine`** | S2.4 Phase 4 | P0 Architectural | **Accept for now.** `index.ts` stays TS and owns reactivity; `IFormEngine` is a TS-consumer contract, not a backend-swap contract. Rust provides pure computation via WASM. |
| 6 | **External validation injection missing** | S5.7 (MUST) | P1 Normative | **Fix in Step 8.5.** Add `injectExternalValidation()` / `clearExternalValidation()` to `IFormEngine`. |
| 7 | **Extension function registration missing from `IFelRuntime`** | S3.12 (SHOULD) | P1 Normative | **Fix in Step 8.5.** Add `registerFunction()` to `IFelRuntime`. |
| 8 | **Registry entry loading missing from `IFormEngine`** | S8.1 | P1 | **Fix in Step 8.5** or document as constructor-time only. |
| 9 | **Standalone dependency extraction missing from TS `IFelRuntime`** | S3.6.1 (MUST) | P1 Normative | **Fix in Step 8.5.** Python protocol already has it; add `extractDependencies()` to TS `IFelRuntime`. |
| 10 | **2 mapping error codes missing** (`VERSION_MISMATCH`, `INVALID_FEL`) | Mapping S7.2 | P1 | **Fix in Step 8.5.** Add to `MappingDiagnostic.errorCode` union. |
| 11 | **`IFelAnalyzer` needed for Studio tooling** | Not spec-mandated | P2 Tooling | **Defer to Step 8.5 P2.** `analyzeFEL`, `rewriteFELReferences`, `tokenize` need their own interface. |
| 12 | **Host function data sources not abstracted** | S2.1.7 | P2 | **Accept.** Internal to `index.ts` which stays TS. |
| 13 | **Mapping direction/conformance not queryable** | Mapping S3.1.2, S1.5 | P3 | **Defer.** Not needed for wiring. |

### What NOT to do

- Don't `git merge` or `git cherry-pick` from `rust_merged` — the branches have diverged too much
- Don't copy files verbatim — they use old types (`diagnostic::LintDiagnostic`, `policy::LintMode`) that don't exist on `main`
- Don't copy bind-walking code from either branch without understanding the shape — `rust_merged` uses binds-as-array (schema-correct), `main` uses binds-as-object (deviation). Decide which shape to target.
- Don't try to make the old test files compile as-is — they reference old module names and APIs
- Don't replace the new orchestrator with the old one — `main`'s `lib.rs` has pass gating and LintMode
- Don't touch `fel-core`, `formspec-core`, `formspec-wasm`, `formspec-py` — those are clean
- Don't touch `formspec-eval` during lint reconciliation (Steps 0–5) — `main`'s `lib.rs` is strictly better than the old `evaluator.rs`

### Conformance Traps

#### Dual Indexing (S4.3.3 + FEL Grammar S6.2)
- **Bind paths and ValidationResult paths**: **0-based**. `items[0].field`
- **FEL expressions**: **1-based**. `$items[1].field` is the first instance. Out-of-bounds signals an error.

#### Context-Sensitive Null Propagation (S3.8.1)
| Bind type | null treatment |
|-----------|---------------|
| `relevant` | `true` (show the field) |
| `required` | `false` (not required) |
| `readonly` | `false` (allow editing) |
| `constraint` | `true` (passes validation) |
| `if()` condition | **error** |

#### Bind Inheritance Rules (S4.3.2)
- `relevant`: logical AND (child can't be relevant if parent isn't)
- `readonly`: logical OR (child can't be editable if parent is readonly)
- `required`, `calculate`, `constraint`: **no inheritance**

#### NRB Calculation Continuation (S5.6)
`calculate` binds MUST continue to evaluate when non-relevant. Only validation and required checks are suppressed.

#### Element-Wise Array Operations (S3.9)
- Equal-length arrays: element-wise operation; different lengths: error; scalar+array: broadcast.

#### `let`/`in` Parser Ambiguity (FEL Grammar)
`in` inside `let`-value position needs parens: `let x = (1 in $arr) in ...`

#### Wildcard Dependency Tracking (S3.6.4)
`$repeat[*].field` — dependency is on the collection, not per-instance. Add/remove instances marks dirty.

#### Whitespace Normalization (S4.3.1)
`whitespace` bind applied BEFORE storage and BEFORE constraint evaluation. Integer/decimal always trimmed regardless.

#### `money` Type Serialization (S3.4.1)
Money amounts MUST be serialized as JSON strings. `moneyAmount()` returns a string, not a number.

#### Deferred Processing (S2.4)
Batch operations accumulate writes; one cycle runs at end with union of dirty nodes.

### Architecture Decisions Made

#### ADR: rust_decimal over f64 (Phase 1)
- `f64` gives 15-17 significant digits; spec requires 18 minimum
- `rust_decimal::Decimal` gives 28-29 significant digits, base-10 arithmetic
- Native `MidpointNearestEven` rounding strategy replaces custom `bankers_round`
- Exact equality (`==`) replaces tolerance-based `float_eq`
- `0.1 + 0.2 = 0.3` is exact (would fail with f64)
- Scientific notation (`1e3`) falls back through f64 in the lexer (lossless for integer results)
- `power()` falls back to f64 for fractional exponents (inherently imprecise)

#### ADR: Dependency Inversion for Schema Validation (Phase 2)
- `JsonSchemaValidator` trait in `formspec-core` — host provides the actual JSON Schema engine
- WASM layer can use AJV; PyO3 layer can use `jsonschema-rs`
- Keeps `formspec-core` free of heavy JSON Schema validator dependencies
- `formspec-core` provides: document type detection, path translation, component tree walk strategy

#### ADR: Trait-based Registry Lookup (Phase 2)
- `RegistryLookup` trait for extension validation
- `RefResolver` trait for assembler
- Both allow different implementations per binding layer
- Test implementations use simple `HashMap` wrappers

### Build History

#### Iteration 1 (2026-03-18)
Built all 6 crates from scratch. 175 tests.
- `fel-core`: decimal migration, environment, extensions
- `formspec-core`: all 6 modules
- `formspec-eval`, `formspec-lint`: initial implementations
- `formspec-wasm`, `formspec-py`: binding layers

#### Iteration 2 (2026-03-18)
Deepened eval and lint. 239 tests (↑64).
- `fel-core`: added FEL printer (15 round-trip tests)
- `formspec-core`: fixed assembler FEL rewriting (AST-based), improved runtime mapping expression transform
- `formspec-eval`: added topo sort, AND/OR inheritance, wildcard expansion, NRB modes, whitespace normalization (6→28 tests)
- `formspec-lint`: added E302/W300/E301/E600, wildcard validation, screener parsing, pass gating, LintMode, diagnostic sorting (9→27 tests)

#### Iteration 3 (2026-03-18)
Expanded WASM bindings. 239 tests (maintained).
- `formspec-wasm`: added linter, evaluator, assembler, printer exports — all processing capabilities now exposed to TypeScript

#### Iteration 4 (2026-03-18)
Lint reconciliation (Steps 0–5). 239→494 tests (↑255).
- `formspec-lint`: replaced monolithic `passes.rs` with 8 typed modules. 27→199 tests, 12→35 error codes, 1,392→5,341 lines. Deleted `passes.rs`.
- Added `definition_document` to `LintOptions` for cross-artifact validation.
- Added `LintDiagnostic` convenience constructors, W802 authoring suppression.

#### Iteration 5 (2026-03-18)
Scope expansion (Steps 6–8) + binding updates. 494 tests (maintained test count, expanded scope).
- `formspec-core`: added `registry_client.rs` (35 tests), `changelog.rs` (36 integration tests). Expanded `runtime_mapping.rs` with 4 new transforms + MappingDocument + autoMap + defaults.
- `formspec-wasm`: 7 new WASM exports (registry, changelog, mapping doc). Fixed transform parser for all 10 types.
- `formspec-py`: 6 new PyO3 exports (registry, changelog, mapping doc).

#### Iteration 6 (2026-03-19)
Dependency inversion + interface extraction. 518 tests (↑24 from test count correction).
- `formspec-engine`: extracted `IFelRuntime`, `ICompiledExpression`, `IFelEngineContext`, `FelContext` (`fel/runtime.ts`), `ChevrotainFelRuntime` adapter (`fel/chevrotain-runtime.ts`), `IFormEngine`, `IRuntimeMappingEngine`, `MappingDiagnostic` (`interfaces.ts`)
- `formspec` (Python): `FelRuntime` protocol + `DefaultFelRuntime` (`fel/runtime.py`), `FormProcessor`/`FormValidator`/`MappingProcessor`/`DataAdapter` protocols (`protocols.py`)
- Fix-up: `IFelEngineContext` signal properties, `MappingDiagnostic` type alignment, `BehaviorContext.engine` → `IFormEngine`
- Spec-expert review: identified 11 interface gaps (6 normative, 5 tooling/nice-to-have)

### Dependency Graph

```
index.ts (stays TS — Preact Signals)
└── crates/formspec-wasm (WASM boundary) ✅
    ├── crates/formspec-core ✅
    │   ├── FEL Analysis ✅
    │   ├── Path Utils ✅
    │   ├── Schema Validator ✅
    │   ├── Extension Analysis ✅
    │   ├── Runtime Mapping (10 transforms + MappingDocument) ✅
    │   ├── Assembler ✅
    │   ├── Registry Client (semver, lifecycle, RegistryLookup) ✅  ← NEW
    │   └── Changelog (diff, impact classification) ✅  ← NEW
    ├── crates/formspec-eval ✅
    ├── crates/formspec-lint (8 modules, 35 codes, 199 tests) ✅  ← EXPANDED
    └── crates/fel-core ✅
        ├── Lexer, Parser, AST (rust_decimal) ✅
        ├── Evaluator + ~61 stdlib ✅
        ├── Dependencies ✅
        ├── Environment ✅
        ├── Extensions ✅
        └── Printer ✅

crates/formspec-py ✅
└── all of the above ✅
```
