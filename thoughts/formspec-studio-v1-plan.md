# Formspec Studio V1 — Definition-First, Reuse-First Plan

**Visual Design Spec:** [`formspec-studio-design-spec.md`](formspec-studio-design-spec.md) — colors, typography, layout, component specs, accessibility, motion.

## Summary
Build a greenfield web tool at `examples/form-builder` focused on no-code authoring of `definition.json` as the primary workflow, with always-visible optional tabs for `component`, `theme`, `mapping`, `registry`, and `changelog`.  
Do not implement new parsers/validators for Formspec semantics. Reuse existing `packages/formspec-engine` and `packages/formspec-webcomponent` at runtime, and reuse `src/formspec` in contract tests/tooling to enforce parity.

## Scope
1. Primary required capability: full no-code create/edit/validate/preview/export for `definition.json`.
2. Optional capabilities: create/edit/validate/export for `component`, `theme`, `mapping`, `registry`, `changelog`.
3. Optional artifacts must not block the primary definition workflow.
4. Runtime stack is browser-only JavaScript for end users.
5. No runtime Python sidecar in V1.
6. Support partial projects: definition-only projects are first-class.
7. Keep optional editors always visible as tabs.

## Reuse-First Architecture
1. Use `FormEngine` for all definition semantics:
1. FEL parsing and evaluation.
2. Bind logic.
3. Shape validation.
4. Screener evaluation.
5. Response serialization.
2. Use `RuntimeMappingEngine` for mapping preview where applicable.
3. Use `<formspec-render>` for live preview and component/theme integration.
4. Use repository `schemas/*.json` with AJV for schema-level document validation.
5. Use `src/formspec` in non-runtime parity tooling:
1. `formspec.validator.lint` for semantic cross-checks in CI/e2e contracts.
2. `formspec.evaluator.DefinitionEvaluator` for server-grade validation parity checks.
3. `formspec.mapping.MappingEngine` for mapping parity checks.

## Product UX

See [`formspec-studio-design-spec.md`](formspec-studio-design-spec.md) for full visual specifications (colors, typography, layout dimensions, component anatomy, motion, accessibility). Summary of the information architecture:

1. **Three-panel workspace:** sidebar (200px) · editor (flex) · inspector (340px). Topbar (50px) spans full width.
2. **Sidebar** — artifact tabs: `Definition`, `Component`, `Theme`, `Mapping`, `Registry`, `Changelog`. Each shows configured/unconfigured status.
3. **Editor** — mode toggle between `Guided` (tree editor) and `JSON` (raw editor). Tree is the primary interaction surface for the Definition tab; other tabs use JSON or empty-state prompts.
4. **Inspector** — three tabs: `Properties` (context-sensitive for selected tree node), `Preview` (live `<formspec-render>`), `Diagnostics` (normalized validation results with severity counts).
5. Definition tab is the default landing tab and has highest UX polish.
6. Optional tabs show “Not configured yet” state with create/import actions and can be skipped safely.

## Data Model and I/O
1. `BuilderProject` model contains independent artifact slots, each nullable except `definition`.
2. Minimal valid project requires only `definition`.
3. Import supports:
1. Single JSON file (`definition`).
2. Multi-file upload.
3. ZIP bundle.
4. Export supports:
1. Definition-only ZIP.
2. Extended ZIP including any optional artifacts present.
3. Unknown extra files preserved on round-trip when imported from ZIP.

## Validation and Diagnostics Flow
1. Schema pass for each loaded artifact against canonical repo schema.
2. Definition semantic pass via `FormEngine` instantiation and validation report.
3. Preview compatibility pass via `<formspec-render>` render lifecycle warnings/errors.
4. Mapping runtime pass via `RuntimeMappingEngine` diagnostics.
5. Diagnostics are normalized into one UI format with `severity`, `artifact`, `path`, `message`, `source`.
6. Blocking rules:
1. Definition schema/semantic errors block publish/export.
2. Optional artifact errors do not block definition-only export.
3. Optional artifact errors block “full bundle export” only when that artifact is included.

## Random Response Preview
1. Add deterministic generator seeded by user input.
2. Generate candidate data from definition structure and data types.
3. Validate candidates through `FormEngine.getValidationReport`.
4. Retry bounded times for better validity.
5. Always show unresolved rule list when perfect validity cannot be achieved.

## Important Changes/Additions to Public APIs/Interfaces/Types
1. App-local types in `examples/form-builder/src/types.ts`:
1. `ArtifactKind`.
2. `ArtifactState`.
3. `BuilderProject`.
4. `BuilderDiagnostic`.
5. `ExportProfile` (`definition-only` | `full-bundle`).
2. Non-breaking enhancement in `formspec-webcomponent`:
1. Add structured diagnostics event `formspec-diagnostic` emitted alongside existing warnings.
2. Event payload includes `code?`, `severity`, `message`, `path?`, `source`.
3. No breaking change in `formspec-engine` API required.
4. Add test-time parity harness interface (app-local) that serializes current artifacts for Python contract checks.

## Implementation Phases
1. Phase 1: Scaffold `examples/form-builder`, routing, project state, definition-first editor shell.
2. Phase 2: Integrate definition guided tree editor + advanced JSON + FormEngine diagnostics.
3. Phase 3: Integrate live preview with `<formspec-render>` and response preview panel.
4. Phase 4: Add optional tabs (`component/theme/mapping/registry/changelog`) with schema validation and save/export support.
5. Phase 5: Add deterministic random response generation and regeneration controls.
6. Phase 6: Add import/export profiles (`definition-only`, `full-bundle`) and robust ZIP round-trip.
7. Phase 7: Add Python parity contract suite using `src/formspec` in CI and e2e fixtures.

## Test Cases and Scenarios
1. Definition-only project can be created, validated, previewed, and exported.
2. Optional artifact tabs can stay empty without blocking definition workflow.
3. Optional artifact with invalid schema surfaces diagnostics in its tab.
4. Full bundle export includes only valid selected optional artifacts plus definition.
5. FEL behavior in editor uses engine results only (no custom parser path).
6. Random generator is deterministic for a fixed seed.
7. Generated response validation report is visible and reproducible.
8. Import definition-only JSON then re-export preserves semantic content.
9. Import full ZIP then re-export preserves known artifacts and unknown extras.
10. Python parity test: exported definition lint result from `src/formspec.validator` matches app blocking status.
11. Python parity test: generated response evaluated by `DefinitionEvaluator` does not contradict engine validity for shared supported cases.
12. Python parity test: mapping output parity checks on supported transform subset.

## Acceptance Criteria
1. Non-technical user can build/edit a definition without touching raw JSON.
2. Definition validation and preview rely on existing Formspec runtime components, not custom parsers.
3. Optional artifacts are editable but not mandatory.
4. Definition-only export is always available when definition is valid.
5. Full-bundle export is available when included artifacts pass validation.
6. CI enforces parity contracts using `src/formspec` to prevent drift.

## Assumptions and Defaults
1. V1 runtime uses JS only; Python is used in tooling/tests, not in-browser.
2. `definition` is mandatory; all other artifact files are optional.
3. Optional artifact tabs remain always visible per preference.
4. “Reuse-first” forbids introducing a new FEL grammar/parser/semantic validator in the app.
5. Full schema authoring support remains available via advanced JSON fallback in every tab.
