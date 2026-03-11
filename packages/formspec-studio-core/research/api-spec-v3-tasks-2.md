# API Spec v3 — Phase 2: DRY Refactoring & Architectural Alignment

This track focuses on eliminating logic duplication between `formspec-engine` and `formspec-studio-core`, moving semantic "source of truth" logic into the engine while keeping the studio focused on command orchestration.

---

## FEL Static Analysis & Rewriting

- [ ] **Unified FEL Static Analysis**
    - [ ] Create `FelAnalyzer` in `formspec-engine` using Chevrotain parser (replaces Studio regex).
    - [ ] Update `Project.parseFEL` to use parser-backed analysis.
    - [ ] Update `Project.expressionDependencies` and `Project.dependencyGraph` to use `FelAnalyzer`.
    - [ ] Ensure analyzer correctly handles comments and string literals (avoiding false positives).

- [ ] **Robust Reference Rewriting**
    - [ ] Consolidate `engine/rewriteFEL` and `studio/rewriteFieldRef` into `engine/FelRewriter`.
    - [ ] Implement parser-aware rewriting (prevents renaming variables inside strings).
    - [ ] Update `renameItem` handler to use `FelRewriter`.
    - [ ] Update `renameInstance` handler to use `FelRewriter` (handles `@instance` refs robustly).

## Tree Traversal & Pathing

- [ ] **Shared Tree Utilities**
    - [ ] Extract `resolveItemLocation`, `itemAt`, and `findItem` into `formspec-engine/tree-utils`.
    - [ ] Standardize dot-path segment traversal (handling indices consistently).
    - [ ] Update Studio handlers (`definition-items.ts`, etc.) to use shared tree utils.

- [ ] **Path Semantics Unification**
    - [ ] Unify 0-indexed (internal) vs 1-indexed (external/UI) path conversion logic.
    - [ ] Share wildcard expansion (`items[*]`) logic between engine validation and studio queries.

## Diagnostics & Extensions

- [ ] **Standardized Extension Diagnostics**
    - [ ] Export `validateExtensionUsage(item, registry)` from the engine.
    - [ ] Refactor `Project.diagnose()` to use shared engine logic for extension resolution.
    - [ ] Ensure identical error codes (`UNRESOLVED_EXTENSION`) and message formatting.

- [ ] **Cross-Artifact Consistency Pass**
    - [ ] Share logic for detecting "Stale" references (mapping rules → definition paths).
    - [ ] Move "Orphan" detection (component → definition) to a shared consistency utility if possible.
    - [ ] Refactor `mapping.preview` in Studio-core to use the engine's `RuntimeMappingEngine` for 100% accuracy.

## Type & Schema Alignment

- [ ] **Canonical Type Exports**
    - [ ] Audit `formspec-engine` exports to ensure all Studio command payloads use canonical interfaces.
    - [ ] Remove any remaining redundant type redeclarations in `formspec-studio-core/src/types.ts`.
