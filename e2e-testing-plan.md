# Formspec End-to-End Testing Plan

This document outlines the strategy for end-to-end (E2E) testing the Formspec standard.

## 1. Philosophy: Prove Implementability

As a declarative standard, testing Formspec's validity requires proving it can successfully drive a real-world user interface. A purely headless Python state machine validates the math but not the developer experience or the completeness of the presentation layer.

Our E2E testing strategy is to build a **Reference Implementation** using Web Components and test it using a real browser automation framework.

This achieves three goals:
1.  **Validates Tier 1 (Core):** Proves the data model, validation rules, and FEL expressions work in practice.
2.  **Validates Tiers 2 & 3 (Theme/Components):** Proves the presentation hints and component models cleanly map to actual DOM structures and CSS.
3.  **Provides a Reference:** Gives adopters a working codebase showing exactly how to implement the standard, accelerating adoption.

## 2. Architecture

The E2E suite will consist of three layers:

### Layer A: Core State Engine (TypeScript)
A framework-agnostic library that manages form state.
*   **Input:** A Formspec JSON definition.
*   **State Tree:** Maintains the current data values and metadata (touched, dirty, valid).
*   **Reactivity:** Re-evaluates FEL expressions (`calculate`, `visible`, `valid`) when dependencies change.
*   **Output:** Generates standard `Response` and `ValidationReport` JSON documents.

*Architectural Note: Porting the Python FEL evaluator to TypeScript represents a dual-maintenance burden. However, since the majority of Formspec adopters will build web UIs, a JavaScript/TypeScript reference implementation of FEL and the State Engine is arguably a necessity for the standard's success. We will use a lightweight reactivity primitive (e.g., Signals) rather than reinventing reactive state management from scratch.*

### Layer B: Web Component Renderer (HTML/JS)
A custom element (`<formspec-render>`) that binds the State Engine to the DOM.
*   Parses the Formspec definition and dynamically generates native HTML input widgets.
*   Maps Tier 2 (Theme) properties to CSS custom properties (variables) or utility classes.
*   Maps Tier 3 (Components) to specific DOM structures (e.g., date pickers, select dropdowns).
*   Listens to DOM `input` events, updates the State Engine, and reactively updates the DOM (e.g., hiding/showing fields based on FEL).

### Layer C: Browser Automation (Playwright)
The actual E2E tests driving the browser.
*   Loads a test harness HTML page with specific Formspec JSON fixtures.
*   Simulates user interactions (typing, clicking, submitting).
*   Asserts DOM state (e.g., "Is the 'spouse name' field visible in the DOM?").
*   Asserts standard compliance (e.g., "Did the form generate a valid `response.schema.json` upon submission?").

## 3. Implementation Phases

### Phase 1: Core JavaScript State Engine & FEL Port
1.  Port the FEL AST and evaluator from Python (`src/fel/`) to TypeScript. This serves as the official JS Reference Implementation.
2.  Build the reactive state manager that tracks values, paths, and validation errors using a stable, lightweight primitive (e.g., `@preact/signals-core`).

### Phase 2: The `<formspec-render>` Web Component
1.  Create the custom element.
2.  Implement basic field rendering (text, number, boolean).
3.  Wire up data binding between the DOM inputs and the State Engine.
4.  Implement dynamic visibility and calculated values in the DOM.

### Phase 3: Playwright Test Harness
1.  Set up Playwright.
2.  Create a directory of JSON Formspec fixtures representing complex scenarios.
3.  Write tests that load the fixtures, interact with the Web Component, and assert the final JSON response matches the Formspec schemas exactly.

## 4. Key E2E Scenarios to Automate

*   **Static Validation:** Typing invalid data (e.g., failing a `pattern` regex) immediately shows an error message and prevents valid submission.
*   **Dynamic Calculation:** Typing a `price` and `quantity` immediately updates a readonly `total` field via FEL.
*   **Conditional Visibility:** Toggling a checkbox unhides a nested section of the form; when hidden, the nested data is strictly omitted/pruned from the final `response.schema.json` as dictated by the spec.
*   **Repeating Sections:** Adding multiple instances of an item block, verifying `$index` contextual FEL variables work, and aggregating data across instances.
*   **Cross-field Validation:** Ensuring an `endDate` input cannot precede a `startDate` input, with the error state correctly attached to the `endDate` DOM element in the generated `ValidationReport`.

## 5. Directory Structure

```text
packages/
  formspec-engine/       # JS State Manager & FEL Evaluator
  formspec-webcomponent/ # <formspec-render> implementation
tests/
  e2e/
    fixtures/            # JSON Formspec definitions
    playwright/          # Playwright test files
```
