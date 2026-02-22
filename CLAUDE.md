# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Formspec is a JSON-native declarative form specification with a TypeScript reference implementation. It defines form fields, computed values, validation rules, conditional logic, repeatable sections, and structured validation results — independent of any rendering technology.

The specification is organized into three tiers: Core (data & logic), Theme (presentation), and Components (interaction). FEL (Formspec Expression Language) is a built-in expression language for calculated values and conditional logic.

## Monorepo Structure

- **`packages/formspec-engine/`** — Core form state management. FormEngine class, FEL lexer/parser/interpreter, path resolution, validation. Uses `@preact/signals-core` for reactivity and `chevrotain` for parsing.
- **`packages/formspec-webcomponent/`** — `<formspec-render>` custom element that binds FormEngine to the DOM. Component registry pattern for extensibility.
- **`schemas/`** — JSON Schema files (definition, response, validationReport, mapping, theme, component, registry).
- **`specs/`** — Markdown specification documents organized by tier.
- **`tests/`** — Python conformance test suite (pytest + jsonschema + hypothesis).
- **`tests/e2e/`** — Playwright E2E tests and JSON fixtures.

## Build & Development Commands

```bash
# Build TypeScript packages
npm run build                    # runs tsc in each package

# Start Vite dev server (serves demo pages and test fixtures)
npm run start:test-server        # http://127.0.0.1:8080

# Run Playwright E2E tests (auto-starts Vite server)
npm test

# Run a single Playwright test file
npx playwright test tests/e2e/playwright/fel-functions.spec.ts

# Run Playwright tests matching a pattern
npx playwright test --grep "pattern"

# Run Python conformance tests
python3 -m pytest tests/ -v

# Run a single Python test file
python3 -m pytest tests/test_fel_evaluator.py -v

# Run a specific Python test
python3 -m pytest tests/test_fel_evaluator.py::TestClassName::test_name -v
```

## Architecture

### FormEngine (`packages/formspec-engine/src/index.ts`)
Central class that manages form state. Maintains separate Preact Signals for: field values, relevance, required state, readonly state, validation results, and repeat counts. Computed signals auto-update when dependencies change. Key methods: `setDefinition()`, `setValue()`, `getResponse()`, `getValidationReport()`, `compileFEL()`.

### FEL Pipeline (`packages/formspec-engine/src/fel/`)
1. **Lexer** (`lexer.ts`) — Chevrotain-based tokenization
2. **Parser** (`parser.ts`) — Chevrotain CstParser producing CST
3. **Interpreter** (`interpreter.ts`) — CstVisitor that evaluates expressions; includes ~40+ stdlib functions (aggregates, strings, dates, logical, math, type checking)
4. **DependencyVisitor** (`dependency-visitor.ts`) — Extracts field references from CST to wire up reactive dependencies

### Web Component (`packages/formspec-webcomponent/src/`)
`<formspec-render>` element with a component registry. Components are organized by category (layout, inputs, display, interactive, special). Each component implements a type string and render function receiving a `RenderContext` with engine access and path resolution.

### Validation
Two mechanisms: **bind constraints** (field-level: required, constraint, readonly, calculate) and **shape rules** (cross-field/form-level constraints). `ValidationReport` contains results with severity levels (error/warning/info) and constraint kinds. Path-based field targeting supports wildcards (e.g., `items[*].field`).

### Repeatable Groups
Tracked via separate `repeats` signals mapping group names to instance counts. Uses indexed paths like `group[0].field`. Supports nesting and min/max cardinality validation.

## Testing Layers

**Python conformance suite** (`tests/`): Schema conformance, spec example extraction, property-based generative testing (hypothesis), cross-spec contracts, FEL implementation validation.

**Playwright E2E** (`tests/e2e/playwright/`): Browser automation tests loading JSON fixture definitions, filling inputs, and asserting DOM state and engine output. Fixtures live in `tests/e2e/fixtures/`.

## Commit Convention

Use semantic prefixes: `feat:`, `fix:`, `build:`, `docs:`, `test:`, `refactor:`.
