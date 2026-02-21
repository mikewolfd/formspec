# Formspec End-to-End Testing Plan

This document outlines the strategy for end-to-end (E2E) testing the Formspec standard.

## 1. Philosophy: Prove Implementability

As a declarative standard, testing Formspec's validity requires proving it can successfully drive a real-world user interface. A purely headless Python state machine validates the math but not the developer experience or the completeness of the presentation layer.

Our E2E testing strategy is to build a **Reference Implementation** using Web Components and test it using a real browser automation framework.

This achieves three goals:
1.  **Validates Tier 1 (Core):** Proves the data model, validation rules, and FEL expressions work in practice.
2.  **Validates Tiers 2 & 3 (Theme/Components):** Proves the presentation hints and component models cleanly map to actual DOM structures and CSS.
3.  **Provides a Reference:** Gives adopters a working, zero-dependency codebase showing exactly how to implement the standard.

## 2. Architecture

The E2E suite will consist of three layers:

### Layer A: Core State Engine (TypeScript)
A headless, functional library that manages form state.
*   **Input:** A Formspec JSON definition.
*   **State Tree:** Maintains the current data values and metadata (touched, dirty).
*   **Reactivity:** Re-evaluates FEL expressions (`calculate`, `visible`, `valid`) when dependencies change.
*   **Output:** Generates standard `Response` and `ValidationReport` JSON documents.

*Note: The FEL evaluator will need a lightweight JavaScript/TypeScript port to run natively in the browser, matching the behavior of the Python reference implementation.*

### Layer B: Web Component Renderer (HTML/JS)
A zero-dependency custom element (`<formspec-render>`) that binds the State Engine to the DOM.
*   Parses the Formspec definition and dynamically generates native HTML input widgets.
*   Maps Tier 2 (Theme) properties to CSS custom properties (variables) or utility classes.
*   Maps Tier 3 (Components) to specific DOM structures (e.g., date pickers, select dropdowns).
*   Listens to DOM `input` events, updates the State Engine, and reactively updates the DOM (e.g., hiding/showing fields based on FEL).

### Layer C: Browser Automation (Playwright)
The actual E2E tests driving the browser.
*   Loads a test harness HTML page with specific Formspec JSON fixtures.
*   Simulates user interactions (typing, clicking, submitting).
*   Asserts DOM state (e.g., "Is the 'spouse name' field visible?").
*   Asserts standard compliance (e.g., "Did the form generate a valid `response.schema.json`?").

## 3. Implementation Phases

### Phase 1: Core JavaScript State Engine & FEL Port
1.  Port the FEL AST and evaluator from Python (`src/fel/`) to TypeScript.
2.  Build the reactive state manager that tracks values, paths, and validation errors.

### Phase 2: The `<formspec-render>` Web Component
1.  Create the custom element.
2.  Implement basic field rendering (text, number, boolean).
3.  Wire up two-way data binding between the DOM inputs and the State Engine.
4.  Implement dynamic visibility and calculated values in the DOM.

### Phase 3: Playwright Test Harness
1.  Set up Playwright.
2.  Create a directory of JSON Formspec fixtures representing complex scenarios (cross-field validation, repeating groups, conditional visibility).
3.  Write tests that load the fixtures, interact with the Web Component, and assert the final JSON response matches the Formspec schemas.

## 4. Key E2E Scenarios to Automate

*   **Static Validation:** Typing invalid data (e.g., failing a `pattern` regex) immediately shows an error message and prevents valid submission.
*   **Dynamic Calculation:** Typing a `price` and `quantity` immediately updates a readonly `total` field via FEL.
*   **Conditional Visibility:** Toggling a checkbox unhides a nested section of the form; when hidden, the nested data is pruned from the final response.
*   **Repeating Sections:** Adding multiple instances of an item block, verifying `$index` contextual FEL variables work, and aggregating data across instances.
*   **Cross-field Validation:** Ensuring an `endDate` input cannot precede a `startDate` input, with the error state correctly attached to the `endDate` DOM element.

## 5. Directory Structure

```text
packages/
  formspec-engine/       # Headless JS State Manager & FEL Evaluator
  formspec-webcomponent/ # <formspec-render> implementation
tests/
  e2e/
    fixtures/            # JSON Formspec definitions
    playwright/          # Playwright test files
```
