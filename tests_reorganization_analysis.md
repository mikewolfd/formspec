# Formspec Test Suite: Analysis & Reorganization Plan

This document analyzes the current state of the Formspec test suite based on the `tests_inventory.csv` export. It identifies areas of overlap, misclassified tests, and proposes a more structured organization respecting the testing pyramid (Unit > Component/Integration > E2E > Conformance).

## 1. Proposed Test Organization Strategy

Currently, tests are loosely split between `tests/unit/`, `tests/server/`, and `tests/e2e/`. However, the boundaries are blurred, and the suite lacks a rigorous philosophical structure.

A healthier, more maintainable organization requires strict adherence to the Testing Pyramid, explicitly scoped to Formspec's architecture as both a *Data Standard* and a *Library*.

The reorganization separates concerns using the following DAG-enforced rules:

| Category | Proposed Directory | Execution Context | Description |
| :--- | :--- | :--- | :--- |
| **Unit** | `tests/unit/` | Pure logic, memory-bound, fast. | Tests the pure mathematical/logical mechanics of the Formspec engine. Zero file I/O, no network. Covers core Python/TS engine mechanics like FEL parsing, FEL evaluation, mapping transforms, and registry logic. |
| **Component** | `tests/component/` | Isolated DOM, synthetic data. | Isolated UI tests for individual web components, localized DOM interactions, styling (CSS properties), and ARIA attributes. Mocks external dependencies; no backend required. |
| **Integration** | `tests/integration/` | Cross-module plumbing, no E2E harness. | Tests the glue between internal modules (e.g., CLI parsing piping to Evaluator logic and outputting to Stdout). Includes internal static fixture integrity tests to ensure test data is sound before unit testing. |
| **E2E** | `tests/e2e/` | Full-stack harness (`examples/refrences`). | Tests the Formspec standard by running real-world scenarios (`examples/` payloads) through the official full-stack reference implementation. Includes Browser user journeys, API Endpoint checks, and Headless pipeline executions on real data. |
| **Conformance** | `tests/conformance/` | Data bounds, spec extraction, cross-language. | Tests the integrity of the Formspec *Standard*. Validates system behavior against strict mathematical bounds (JSON Schema testing), external specifications (Markdown examples), property-based fuzzing invariants (Hypothesis), and Python vs. TypeScript parity. |

---

## 2. Identified Overlaps & Duplications (Validated)

### A. The "Smoke" Test Duplication
There are currently two parallel tracks for smoke testing:
1. `tests/e2e/playwright/smoke/*.spec.ts` (Standard Playwright test runner)
2. `tests/e2e/smoke/*.smoke.mjs` (Custom Node scripts driving Playwright)
**Validated:** **TRUE**
*   **Evidence:** The test logic in `tests/e2e/playwright/smoke/happy-path.spec.ts` navigates the grant application wizard, adds repeat instances, and checks validation calculations using standard Playwright methods. Simultaneously, `tests/e2e/smoke/grant-application.smoke.mjs` executes a nearly identical flow using custom Node scripts that manually wrap Playwright, iterate through panels, and evaluate similar DOM assertions.
*   **Fix:** Deprecate the custom `.mjs` scripts in favor of the standard Playwright runner (`*.spec.ts`). It provides better reporting, parallelization, and maintenance out of the box.

### B. Evaluator Fixture Checks vs. Schema Validation
Currently, specific fixtures are validated in multiple places:
- `tests/unit/runtime/evaluator/test_grant_definition_fixture.py`
- `tests/unit/runtime/mapping/test_grant_mapping_fixture.py`
- `tests/unit/runtime/theme/test_grant_theme_fixture.py`
**Validated:** **TRUE**
*   **Evidence:** The `test_grant_mapping_fixture.py` file literally contains a test named `test_grant_mapping_is_schema_valid()` which loads the JSON file and asserts it has no validation errors against the JSON schema. We found identical patterns in the theme and registry unit test files. However, `tests/unit/schema/contracts/test_spec_examples.py` contains automated schema validations that execute dozens of identical `validate()` calls across JSON snippets.
*   **Fix:** Consolidate all static fixture validation into a single `tests/integration/fixtures/test_core_fixtures.py` suite to prevent cluttering the runtime unit tests with static data checks.

### C. Multi-Layer Testing of FEL Evaluation
FEL logic is tested at 4 distinct layers:
1. **Unit:** `test_fel_evaluator.py`, `test_fel_functions.py`
2. **Property-based:** `test_fel_property_based.py`
3. **API Integration:** `server/test_evaluate.py`
4. **Component:** `playwright/tools-dashboard/expression-tester.spec.ts`
**Validated:** **TRUE**
*   **Evidence:** Core FEL expressions are deeply tested in Python unit logic, fuzzed in hypothesis tests, tested via HTTP in the server integration tests, and tested via mocked network routes in the dashboard Playwright tests.
*   **Fix:** This overlap is actually **healthy** (the Test Pyramid in action). The only fix needed is structurally relabeling the dashboard specs as `Component` tests and moving them to `tests/component/tools-dashboard/` since they use synthetic data and mock the backend.

### D. Adapter & Engine Round-Trip Assertions
During the programmatic analysis, we found 11 distinct "round-trip" tests spread across `test_adapters.py`, `test_mapping_engine.py`, and `test_fel_property_based.py`.
**Validated:** **TRUE**
*   **Evidence:** Functions like `test_forward_then_reverse_roundtrip`, `test_pretty_roundtrip`, and `test_roundtrip_string_values` verify serialization identity across multiple layers. 
*   **Fix:** While overlapping, this redundancy serves as defense-in-depth. Consider centralizing the core contract checks into `tests/conformance/test_roundtrip_contracts.py` to ensure all format adapters meet the identical bidirectional mapping constraints.

---

## 3. Misclassifications (Validated)

### 1. Web Component Tests masquerading as E2E
**Validated:** **TRUE**
*   **Evidence in `interactive-components.spec.ts` & `responsive-and-a11y.spec.ts`:**
    These tests do not navigate the application. Instead, they use `page.evaluate()` to inject a minimal, hardcoded `definition` and `componentDocument` directly into a single `<formspec-render>` web component instance on a blank harness page. They then assert on localized DOM outputs like `getComputedStyle(el).boxShadow` or `aria-required` attributes.
*   **Fix:** Move these to a dedicated Component Testing framework (e.g., Playwright Component Testing `playwright-ct` or Vitest Browser Mode) which mounts components in isolation much faster.

### 2. Tools Dashboard E2E tests are actually Component tests
**Validated:** **TRUE**
*   **Evidence in `changelog.spec.ts` & `expression-tester.spec.ts`:**
    Both of these files heavily utilize Playwright's network interception (`page.route('**/changelog', ...)` and `page.route('**/evaluate', ...)`). They completely mock out the Python backend's responses with hardcoded JSON payloads.
*   **Fix:** Move these into a `tests/component/tools-dashboard/` folder since they isolate the frontend UI using stubs, which aligns with the Component tier rather than Integration (which is Python cross-module plumbing) or E2E (which tests the unmocked full stack).

### 3. Kitchen Sink Parity is a Conformance Test
**Validated:** **TRUE**
*   **Evidence in `kitchen-sink-holistic.spec.ts`:**
    This test spawns a raw Node child process (`spawnSync('python3', ...)`) to execute a Python script (`python_fel_eval.py`). It captures the Python engine's evaluation of FEL expressions, runs the identical expressions through the TypeScript `FormEngine` in the browser, and iterates through them to ensure mathematical and logical parity (`compareParity`). 
*   **Fix:** Move this to `tests/conformance/parity/`. It is a highly specialized architectural contract test enforcing that the Python and TypeScript runtimes compute the exact same results for the same inputs, not a user journey.

### 4. Evaluator tests doing E2E Headless work
**Validated:** **TRUE**
*   **Evidence in `test_definition_evaluator.py`:**
    While the top 80% of this file contains isolated unit tests for the `DefinitionEvaluator` class, the bottom 20% contains a class named `TestGrantApplicationIntegration`. This class loads the full `examples/grant-application/definition.json` file from disk, constructs a massive `_valid_grant_data()` dictionary simulating a real-world multi-page submission, and runs end-to-end validation over it.
*   **Fix:** Split `TestGrantApplicationIntegration` out of the unit test file and move it to `tests/e2e/headless/test_grant_app_processing.py`. Unit tests should remain isolated and fast, without large external file dependencies.

### 5. FEL Integration Suite in Unit Directory
**Validated:** **TRUE**
*   **Evidence in `tests/unit/runtime/fel/test_fel_integration.py`:**
    This file explicitly identifies itself as "Stage 7: Integration / End-to-End Smoke Tests". It tests multi-field dependency chains and cross-instance data resolution across the entire evaluation pipeline.
*   **Fix:** Move `test_fel_integration.py` to `tests/integration/test_fel_pipeline.py`.

### 6. Conformance Contracts in Unit Directory
**Validated:** **TRUE**
*   **Evidence in `tests/unit/schema/contracts/`:**
    Files like `test_spec_examples.py` and `test_property_based.py` do not test runtime logic. They parse markdown specs for JSON snippets to validate against JSON schemas, and use `hypothesis` to fuzz generation constraints. 
*   **Fix:** Move the entire `tests/unit/schema/contracts/` folder to `tests/conformance/spec/`.

### 7. Schema Math/Bounds Testing in Unit Directory
**Validated:** **TRUE**
*   **Evidence in `tests/unit/schema/`:**
    There are over 400 tests inside folders like `tests/unit/schema/mapping/` and `tests/unit/schema/theme/`. These tests generate mock JSON dictionaries and test them against the static `.schema.json` files to ensure the schemas themselves correctly accept or reject edge cases.
*   **Fix:** Move the entire `tests/unit/schema/` directory (excluding the already-moved `contracts/`) to `tests/conformance/schemas/`. They test the mathematical bounds of the data contracts, not the Python runtime code.

### 8. FEL Spec Contract Examples Embedded in Unit Tests
**Validated:** **TRUE**
*   **Evidence in `tests/unit/runtime/fel/test_fel_api.py`:**
    There are classes named `TestConformanceGrammar`, `TestConformanceSemantics`, `TestSpecExamples`, and `TestSpecSection3Examples`. The descriptions literally read: *"Conformance points from fel-grammar.md §7."* and *"Examples directly from spec.md §3."*
*   **Fix:** Extract these specific classes and move them to `tests/conformance/spec/test_fel_spec_examples.py`.

### 9. Massive Edge-Case Integrations Hiding as Evaluator Unit Tests
**Validated:** **TRUE**
*   **Evidence in `tests/unit/runtime/evaluator/test_definition_edge_case_fixtures.py`:**
    Tests like `test_microgrant_payload_emits_expected_shape_failures` and `test_clinical_payload_emits_chronology_and_submit_time_failures` process massive, real-world multi-page form payloads against the evaluation engine.
*   **Fix:** Move this file to `tests/e2e/headless/test_edge_case_payloads.py` alongside the `TestGrantApplicationIntegration` we already identified.

### 10. DOM/CSS Styling Tests Hiding in Grant App E2E
**Validated:** **TRUE**
*   **Evidence in `tests/e2e/playwright/grant-app/readonly-and-styling.spec.ts`:**
    Contains tests like *"readonly field input should appear visually distinct"* and *"Stack horizontal renders as flex-direction row"*. This perfectly matches the misclassification found earlier with `interactive-components.spec.ts`.
*   **Fix:** Move this file out of the `grant-app/` E2E folder and into the new dedicated Component testing strategy as `tests/component/layout-styling.spec.ts`.

### 11. API Client Tests Hiding in Unit Directory
**Validated:** **TRUE**
*   **Evidence in `tests/unit/runtime/validator/test_validator_cli.py`:**
    Contains tests like `test_cli_json_output_and_exit_code` and `test_cli_invalid_json_returns_2`. Testing CLI exit codes and STDOUT/STDERR streams is not a pure unit test of the validation logic.
*   **Fix:** Move to `tests/integration/cli/test_validator_cli.py`.

### 12. Missing E2E Spec Files in Plan
**Validated:** **TRUE**
*   **Evidence:** `project-phases-ui.spec.ts` and `review-and-submit.spec.ts` exist in the `grant-app` E2E folder in the CSV but were omitted from the reorganization list. Additionally, `smoke/invoice.spec.ts` is misnamed in the plan, and `tribal-short.spec.ts` does not exist (the tests are actually in `render-and-relevance.spec.ts`).
*   **Fix:** Include the missing files in the E2E section and correct the filenames.

### 13. Fixture Validation Missed in Consolidation
**Validated:** **TRUE**
*   **Evidence in `tests/unit/runtime/changelog/test_grant_changelog_fixture.py`:**
    Like the other fixtures, this validates a JSON payload against a schema (`test_grant_changelog_is_schema_valid`). It was missed in the initial fixture integrity consolidation.
*   **Fix:** Add it to the consolidated `test_core_fixtures.py` suite.

### 14. Server Submit Integrations in E2E
**Validated:** **TRUE**
*   **Evidence in `tests/e2e/playwright/references/server-response-tab.spec.ts`:**
    This test verifies server responses and mapped data generation. While it uses Playwright, it's an integration test across the stack rather than a pure user journey. (It was correctly placed in Section 4 but missing an explanation in Section 3).
*   **Fix:** Formally classify it as a Server Submit Integration test.

### 15. Cross-Language Parity Scaffold
**Validated:** **TRUE**
*   **Evidence in `tests/unit/runtime/evaluator/test_core_semantics_matrix_scaffold.py`:**
    This validates the structure of the core semantics matrix used for cross-language parity. It belongs in the conformance suite, not unit tests. (It was correctly placed in Section 4 but missing an explanation in Section 3).
*   **Fix:** Formally classify it as a Cross-language Parity conformance test.

### 16. Presentation Hints Schema Testing Missing from Conformance
**Validated:** **TRUE**
*   **Evidence in `tests/unit/schema/definition/test_presentation_hints.py`:**
    This file contains extensive edge-case and validation tests for form presentation hints (e.g., layout, accessibility properties) against the definition schema, but it was completely missing from the reorganization plan.
*   **Fix:** Add it to the `Conformance & Standards` tier alongside the other schema contract validations.


### 17. The `examples/` and `refrences` App ARE the E2E Harness
**Validated:** **TRUE**
*   **Evidence:** As a library/framework, Formspec doesn't have a built-in app to test. The `examples/refrences` application (Vite frontend + FastAPI backend) was built specifically to instantiate and serve these examples. Therefore, any test that targets this reference app or executes these full-scale examples is, by definition, an E2E test.
*   **Fix:** 
    1. Move `tests/server/*.py` to `tests/e2e/api/` since they are testing the reference server.
    2. Acknowledge that the massive edge-case evaluator tests on example payloads (e.g. `TestGrantApplicationIntegration`) are effectively "Headless E2E" tests and group them under `tests/e2e/headless/` rather than Integration.
    3. Keep UI integrations that test the reference app's frontend under `tests/e2e/browser/`.

---
## 4. Reorganized View of the Test Suite

If refactored, the test inventory would logically group into these explicit directories:

### 🧩 `tests/unit/` (Python core)
- **Parser/AST:** `test_fel_parser.py`
- **Evaluator:** `test_fel_evaluator.py`, `test_fel_functions.py`, `test_fel_repeat.py`, `test_fel_mip.py`, `test_fel_builtin_availability_signaling.py`, `test_screener_routing.py`, `test_extension_preservation.py`
- **Mapping:** `test_mapping_engine.py`, `test_adapters.py`
- **Validation:** `test_validator_schema.py`, `test_validator_references.py`, `test_validator_linter.py`, `test_validator_expressions.py`, `test_validator_theme_semantics.py`, `test_validator_component_semantics.py`
- **Response:** `test_response_pinning_version_substitution.py`
- **API/Utils:** `test_fel_api.py` (excluding spec examples)
- **Changelog:** `test_changelog.py`
- **Registry:** `test_registry.py`

### 🏗 `tests/component/` (Web Components - Move from E2E)
- **DOM Rendering:** `grant-app-component-rendering.spec.ts`
- **Interactivity:** `interactive-components.spec.ts`
- **Accessibility:** `responsive-and-a11y.spec.ts`
- **Remote Data:** `remote-options.spec.ts`
- **Layout & Styling:** `layout-styling.spec.ts` (moved from `readonly-and-styling.spec.ts`)
- **Tools Dashboard:** `tools-dashboard/*.spec.ts` (moved from E2E)

### 🔗 `tests/integration/` (API & Data)
- **Fixture Integrity:** `fixtures/test_core_fixtures.py` (consolidated from `test_grant_mapping_fixture.py`, `test_grant_registry_fixture.py`, `test_grant_definition_fixture.py`, `test_grant_theme_fixture.py`, `test_grant_response_fixtures.py`, `test_grant_changelog_fixture.py`)
- **Evaluator Integration:** `test_fel_pipeline.py` (moved from `test_fel_integration.py`), `test_definition_schema_acceptance.py`
- **CLI Workflows:** `cli/test_validator_cli.py`

### 🚦 `tests/e2e/` (The `examples/refrences` Harness)
- **Reference API (`tests/e2e/api/`):** `test_health.py`, `test_registry.py`, `test_evaluate.py`, `test_dependencies.py`, `test_export.py`, `test_changelog.py`
- **Headless Pipeline (`tests/e2e/headless/`):** `test_grant_app_processing.py`, `test_edge_case_payloads.py`
- **Browser User Journeys (`tests/e2e/browser/`):**
  - **Clinical Intake:** `clinical-intake.spec.ts`
  - **Invoice:** `smoke/invoice.spec.ts`
  - **Grant Application:** `grant-app/wizard-navigation.spec.ts`, `grant-app/budget-ui.spec.ts`, `grant-app/conditional-visibility.spec.ts`, `grant-app/field-interaction.spec.ts`, `grant-app/project-phases-ui.spec.ts`, `grant-app/review-and-submit.spec.ts`, `smoke/happy-path.spec.ts`
  - **Grant Report:** `grant-report/tribal-long.spec.ts`, `grant-report/render-and-relevance.spec.ts`
  - **Screener Routing:** `screener-routing.spec.ts`
  - **Server Submit Tab:** `references/server-response-tab.spec.ts`
  - **Form Builder Studio:** `studio/studio-core-workflows.spec.ts`

### ⚖️ `tests/conformance/` (Standards)
- **Schema Contracts (`tests/conformance/schemas/`):** `test_mapping_schema.py`, `test_response_schema.py`, `test_component_schema.py`, `test_theme_schema.py`, `test_registry_schema.py`, `test_definition_schema.py`, `test_presentation_hints.py`, `test_mapping_adapter_schema_contracts.py`
- **Spec Cross-checking (`tests/conformance/spec/`):** `test_cross_spec_contracts.py`, `test_spec_examples.py` (moved from Unit), `test_fel_spec_examples.py` (extracted from `test_fel_api.py`)
- **Round-Trip Fidelity (`tests/conformance/roundtrip/`):** `test_roundtrip_contracts.py` (consolidated from `test_adapters.py`, `test_mapping_engine.py`)
- **Property-based Fuzzing (`tests/conformance/fuzzing/`):** `test_fel_property_based.py`, `test_property_based.py` (moved from Unit)
- **Cross-language Parity (`tests/conformance/parity/`):** `kitchen-sink-holistic.spec.ts` (moved from E2E), `test_core_semantics_matrix_scaffold.py`

