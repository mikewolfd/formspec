# E2E Coverage Matrix: Test Suite vs Grant-Application Features

Generated: 2026-02-26

---

## 1. E2E Test Suite Summary

| Test File | Fixture(s) | Features Validated |
|---|---|---|
| `smoke/kitchen-sink-smoke.spec.ts` | `kitchen-sink-smoke.definition.json` + component | Basic wizard flow, field types, calculate, relevant, submit |
| `integration/calculation-visibility-submit.spec.ts` | `shopping-cart.json` | calculate binds, relevant visibility toggle, submit response |
| `integration/core-data-types-binding.spec.ts` | `data-types.json` | boolean, choice, date, multiChoice, money data types |
| `integration/cross-field-constraint-validation.spec.ts` | `validation.json` | Cross-field shape constraints, date range validation |
| `integration/edge-case-behaviors.spec.ts` | `edge-cases.json` | NaN coercion, empty quantity × price multiplication |
| `integration/fel-standard-library-ui.spec.ts` | `fel-functions.json` | 40+ FEL stdlib functions (string, numeric, date, logical, aggregate, money, context) |
| `integration/field-pattern-validation.spec.ts` | `static-validation.json` | Field-level `pattern` regex constraint |
| `integration/kitchen-sink-holistic-conformance.spec.ts` | `kitchen-sink-holistic/` | Full conformance suite: identity, hydration, mixed types, validation, pruning, screener, TS/Python parity |
| `integration/nested-repeats-and-calculations.spec.ts` | `complex-scenarios.json` | Nested repeatable groups (2 levels), cross-level aggregation |
| `integration/repeating-sections-calculation.spec.ts` | `repeating-sections.json` | Repeat add/remove, calculated subtotals, structureVersion |
| `integration/response-pruning-behaviors.spec.ts` | inline | nonRelevantBehavior: remove/keep/empty, response data pruning |
| `integration/response-schema-contract.spec.ts` | `shopping-cart.json` | Response shape: definitionUrl, version, status, data, authored |
| `components/accessibility-responsive-custom-components.spec.ts` | various | ARIA attributes, labels, custom components, responsive breakpoints |
| `components/component-gap-coverage.spec.ts` | inline | Repeatable group bindings, dataType-component compatibility matrix |
| `components/component-tree-engine-alignment.spec.ts` | inline | DOM/engine state alignment, relevance handling |
| `components/component-tree-rendering.spec.ts` | inline | Bound components, conditional visibility, DataTable/Summary |
| `components/core-component-props-and-fixes.spec.ts` | various | RadioGroup, Wizard, Select, DatePicker, Card, Alert, Tabs, Stack, Grid, DataTable, Toggle, CheckboxGroup, optionSet resolution, removeRepeatInstance |
| `components/progressive-component-rendering.spec.ts` | inline | Divider, Collapsible, Columns, Panel, Accordion, Modal, Popover, Slider, Rating, FileUpload, Signature, ProgressBar |
| `components/remote-options-binding.spec.ts` | inline | `remoteOptions` with HTTP mocking |

---

## 2. Grant-Application Feature Inventory

| Feature | How Exercised |
|---|---|
| `string` field | orgName, ein, contactName, contactEmail, contactPhone, subName, subOrg |
| `text` field | abstract (projectNarrative), subScope |
| `integer` field | duration (calculated), budget.lineItems[*].quantity |
| `decimal` field | indirectRate, budget.lineItems[*].unitCost + subtotal, subAmount |
| `date` field | startDate, endDate |
| `choice` field | orgType (optionSet ref), budget.lineItems[*].category (optionSet ref) |
| `boolean` field | budget.usesSubcontractors |
| `money` field | budget.requestedAmount |
| `display` item | applicantInfo.nonprofitPhoneHint (conditional text) |
| `optionSets` (named) | budgetCategories (7), orgTypes (4) |
| `formPresentation.pageMode = wizard` | 5-page wizard navigation |
| `formPresentation.defaultCurrency` | `"USD"` — drives money field badge |
| `formPresentation.labelPosition` | `"top"` |
| `formPresentation.density` | `"comfortable"` |
| `presentation.page` on groups | Maps groups to wizard pages by title |
| `repeatable` group (top-level) | subcontractors: min=1, max=10 |
| `repeatable` group (nested in group) | budget.lineItems: min=1, max=20 |
| `required` bind | 8 fields |
| `relevant` bind | nonprofitPhoneHint (orgType=nonprofit), indirectRate (orgType≠government), subcontractors (usesSubcontractors) |
| `calculate` bind | duration = dateDiff(), lineItems[*].subtotal = qty × unitCost |
| `readonly` bind | duration, lineItems[*].subtotal |
| `constraint` bind | EIN format (matches()), endDate > startDate |
| `constraintMessage` | Both constraint binds |
| `whitespace` bind | normalize on EIN, trim on contactEmail |
| `default` bind | requestedAmount = money(0, 'USD') |
| `prefix` on field | unitCost: "$" |
| `hint` on fields | abstract, ein, indirectRate, requestedAmount, contact fields |
| Global `variables` | totalDirect, indirectCosts (conditional), grandTotal |
| `@variable` references in FEL | @totalDirect, @indirectCosts, @grandTotal |
| `if/then/else` in FEL | indirectCosts: if orgType=government then 0 else ... |
| `sum()` over wildcard path | sum($budget.lineItems[*].subtotal) |
| `money()` / `moneyAmount()` / `moneyAdd()` | variables, shapes |
| `dateDiff()` | calculate on duration |
| `matches()` | EIN constraint |
| `abs()` | budgetMatch shape |
| `length()` | abstractLength shape |
| Shape: `severity: info` | abstractLength (continuous) |
| Shape: `severity: error` | budgetMatch, subcontractorCap |
| Shape: `severity: warning` | budgetReasonable |
| Shape: `timing: continuous` | abstractLength |
| Shape: `activeWhen` | subcontractorCap (activeWhen usesSubcontractors) |
| Shape: `context` expressions | budgetMatch (grandTotal, requested, difference) |
| `nonRelevantBehavior: "remove"` | Form-level setting |
| 3-document stack (def+component+theme) | Full stack loaded in index.html |
| `structureVersion` reactive effect | Footer totals bar update |
| `variableSignals` access | Footer reads @grandTotal |
| `getValidationReport(mode)` | Submit button guard, shape error callouts |
| `getResponse(mode: submit)` | Server POST on submit |
| Server-side validation roundtrip | Python backend re-validates on submit |

---

## 3. Coverage Matrix

Symbols: ✓ covered · ~ partial · ✗ not covered

| Feature | calc-vis-submit | core-datatypes | cross-field | edge-cases | fel-stdlib | field-pattern | holistic | nested-repeats | repeating-calc | response-pruning | response-contract | comp-gap | comp-tree | core-props | prog-render | smoke | Gap |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **Field Types** | | | | | | | | | | | | | | | | | |
| string | ✓ | ✓ | ✓ | | | | ✓ | | | | ✓ | ~ | ✓ | ✓ | | ✓ | none |
| text | | | | | | | ✓ | | | | | | | | | | none |
| integer | ✓ | | | ✓ | | | ✓ | | | | | | | ✓ | | ✓ | none |
| decimal | ✓ | | | ✓ | | | ✓ | | ✓ | | | | | ✓ | | | none |
| date | | ✓ | ✓ | | ✓ | | ✓ | | | | | | | ✓ | | ✓ | none |
| choice | ✓ | ✓ | | | | | ✓ | | | | | ✓ | ✓ | ✓ | ✓ | ✓ | none |
| **multiChoice** | | ✓ | | | | | ✓ | | | | | | | ✓ | | | **✗ in grant-app** |
| boolean | ✓ | ✓ | | | | | ✓ | | | | | ✓ | ✓ | ✓ | ✓ | ✓ | none |
| money | | ✓ | | | ✓ | | ✓ | | | | | | | ✓ | | | none |
| **attachment / file** | | | | | | | ✓ | | | | | | | | ✓ | | **✗ in grant-app** (string proxy) |
| **display item** | | | | | | | | | | | | | ✓ | | | | ~ (only in holistic) |
| **Structure** | | | | | | | | | | | | | | | | | |
| Groups | ✓ | | | | | | ✓ | | | | | ✓ | ✓ | | | ✓ | none |
| Nested repeatable groups | | | | | | | ✓ | ✓ | | | | | | | | | none |
| Top-level repeatable group | ✓ | | | | | | ✓ | | ✓ | | | ✓ | | ✓ | | ✓ | none |
| **Binds** | | | | | | | | | | | | | | | | | |
| required | ✓ | | ✓ | | | | ✓ | | | | | | ✓ | ✓ | | ✓ | none |
| relevant | ✓ | | | | | | ✓ | | | ✓ | | ✓ | ✓ | | | ✓ | none |
| constraint | | | ✓ | | | | ✓ | | | | | | | ✓ | | | none |
| constraintMessage | | | ✓ | | | | ✓ | | | | | | | ✓ | | | none |
| **whitespace (normalize/trim)** | | | | | | | ✓ | | | | | | | | | | **✗ no dedicated test** |
| calculate | ✓ | | | | ✓ | | ✓ | ✓ | ✓ | | | | | | | ✓ | none |
| readonly | ✓ | | | | | | ✓ | | ✓ | | | | | ✓ | | ✓ | none |
| **default** | | | | | | | ✓ | | | | | | | | | | **~ only in holistic** |
| **initialValue** | | | | | | | ✓ | | | | | | | | | | **~ only in holistic** |
| prefix/suffix | | | | | | | ✓ | | | | | | | ✓ | | | none |
| hint | | | | | | | ✓ | | | | | | ✓ | ✓ | | | none |
| **Variables** | | | | | | | | | | | | | | | | | |
| Global variables | | | | | ✓ | | ✓ | | | | | | | | | | ~ |
| @variable FEL references | | | | | ✓ | | ✓ | | | | | | | | | | ~ |
| if/then/else in variables | | | | | ✓ | | ✓ | | | | | | | | | | ~ |
| **Money arithmetic chain** | | | | | ✓ | | ✓ | | | | | | | | | | **✗ no e2e for reactive update** |
| **Shapes** | | | | | | | | | | | | | | | | | |
| Shape severity: error | | | ✓ | | | | ✓ | | | | | | | | | | none |
| Shape severity: warning | | | | | | | ✓ | | | | | | | | | | ~ |
| Shape severity: info | | | | | | | ✓ | | | | | | | | | | ~ |
| **Shape timing: continuous** | | | | | | | ✓ | | | | | | | | | | ~ |
| **Shape timing: submit** | | | | | | | ✓ | | | | | | | | | | **✗ no dedicated grant-app test** |
| **Shape timing: demand** | | | | | | | ✓ | | | | | | | | | | **✗ no dedicated test** |
| **Shape activeWhen** | | | | | | | ✓ | | | | | | | | | | **✗ no dedicated test** |
| **Shape context block** | | | | | | | ✓ | | | | | | | | | | **✗ no dedicated test** |
| **optionSets (named)** | | | | | | | ✓ | | | | | ✓ | | ✓ | | ✓ | none |
| **Presentation** | | | | | | | | | | | | | | | | | |
| pageMode: wizard | ✓ | | | | | | ✓ | | | | | | | ✓ | | ✓ | none |
| **defaultCurrency** | | | | | | | | | | | | | | | | | **✗ no test** |
| **labelPosition / density** | | | | | | | ✓ | | | | | | | | | | ~ |
| presentation.page targeting | ✓ | | | | | | ✓ | | | | | | | | | ✓ | none |
| **nonRelevantBehavior (form-level)** | | | | | | | ✓ | | | ✓ | | | | | | | ~ |
| **nonRelevantBehavior (per-bind)** | | | | | | | ✓ | | | ✓ | | | | | | | ~ |
| **Response contract** | | | | | | | ✓ | | | | ✓ | | | | | ✓ | none |
| **structureVersion reactivity** | | | | | | | ✓ | | | | | | | | | | **✗ no dedicated test** |
| **variableSignals reactive update** | | | | | | | | | | | | | | | | | **✗ no test at all** |
| **getValidationReport modes** | | | ✓ | | | | ✓ | | | | ✓ | | | | | | ~ |
| **getResponse modes** | ✓ | | | | | | ✓ | | | | ✓ | | | | | ✓ | none |

---

## 4. Coverage Gaps Summary

The following features are present in the grant-application but have no dedicated test that exercises
them through the grant-application fixture specifically:

**High-impact gaps (should be closed):**

1. **`activeWhen` on shapes** — `subcontractorCap` fires only when `usesSubcontractors` is true. No
   test validates that toggling `usesSubcontractors` activates/deactivates this shape.

2. **Shape `context` block** — `budgetMatch` shape exposes `grandTotal`, `requested`, and `difference`
   in its context. No test asserts these context values are present and correct in validation reports.

3. **Variable chain reactive update in UI** — The footer bar reads `@grandTotal` via `variableSignals`
   in a reactive `effect()`. No test validates that modifying line items causes the footer to update.

4. **Shape `timing: submit` vs `timing: continuous`** — The grant-app has a continuous shape
   (`abstractLength`). No test verifies submit-only shapes don't fire during continuous editing.

5. **`whitespace` bind processing** — EIN normalize and email trim are defined but never asserted.

6. **`defaultCurrency` presentation property** — No test validates that money fields render the USD
   badge without an explicit `currency` field property.

7. **`nonRelevantBehavior` hierarchy** — Form-level `"remove"` plus the `subcontractors` bind
   interaction is never tested end-to-end in a response assertion.

**Medium-impact gaps:**

8. `multiChoice` data type — not present in the definition at all.
9. `default` bind in a realistic wizard context (only tested in holistic fixture).
10. `display` item relevance in wizard — `nonprofitPhoneHint` visibility toggle not explicitly tested.
11. `minRepeat`/`maxRepeat` enforcement — no test tries to exceed `maxRepeat: 20` or go below `minRepeat: 1`.

**Out of scope for grant-application (keep in synthetic fixtures):**

- Deeply nested repeats (2+ levels) — grant-app has only one level
- Exhaustive FEL stdlib function coverage — purpose-built `fel-functions.json` fixture serves this
- NaN/edge-case coercion — not realistic in a grant form context
- `screener` routing — not used in the grant-app
- `remoteOptions` — not used in the grant-app
- Component unit tests (Slider, Rating, Signature, etc.) — tested with minimal inline definitions
