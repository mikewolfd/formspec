# Implementation vs E2E Gap Analysis

Generated: 2026-02-26

Source of truth: `thoughts/feature-implementation-matrix.md` (ADR 0013/0016), cross-referenced
against every file in `tests/e2e/playwright/`, `tests/e2e/fixtures/`, and `tests/unit/`.

---

## 1. Features: Implemented + No E2E Coverage Anywhere

These features have a green checkmark in the `formspec-engine` column of the feature matrix AND
show `--` in the E2E column, AND are NOT covered by the grant-application E2E proposals.

### 1.1 `derivedFrom` — Definition Property

- **Matrix row**: Section 1.1, `derivedFrom` — `formspec-engine`: YES, E2E: `--`
- **Codebase**: `packages/formspec-engine/src/index.ts` (stored on the definition object, passed through in response)
- **Unit tests**: Schema-level only (`tests/unit/schema/definition/test_definition_schema.py`)
- **E2E tests**: None. The holistic fixture has no `derivedFrom` property.
- **Grant-app plan**: Not mentioned.
- **Severity**: Low. Metadata property. Not user-facing in form rendering. But if a consumer reads the response and expects `derivedFrom` to be preserved, it could silently regress.

### 1.2 `formPresentation` — Top-Level Presentation Object

- **Matrix row**: Section 1.1, `formPresentation` — `formspec-engine`: YES, `formspec-webcomponent`: YES, E2E: `--`
- **Codebase**: `packages/formspec-engine/src/index.ts` line ~1401 (defaultCurrency), `packages/formspec-webcomponent/src/index.ts` line ~803 (defaultCurrency rendering)
- **E2E tests**: Only exercised incidentally in the holistic fixture (`definition.v1.json` has `formPresentation` with `pageMode`, `labelPosition`, `density`), but no test ASSERTS any `formPresentation` behavior.
- **Grant-app plan**: Mentions `defaultCurrency` as a gap but no concrete test for `labelPosition`, `density`, or the `formPresentation` object itself.
- **Severity**: **Medium-High**. `defaultCurrency` drives MoneyInput currency badge rendering. `labelPosition` and `density` affect the entire form layout. The holistic fixture sets them but the conformance test never validates them.

### 1.3 `nonRelevantBehavior` — Top-Level Form Setting

- **Matrix row**: Section 1.1, `nonRelevantBehavior` — `formspec-engine`: YES, E2E: `--`
- **Codebase**: `packages/formspec-engine/src/index.ts` (used in `getResponse()` to prune/empty/keep non-relevant fields)
- **E2E tests**: The holistic fixture `definition.v1.json` sets `"nonRelevantBehavior": "remove"` and the conformance test at check `P3-NONRELEVANT-BEHAVIORS` validates all three modes (remove/keep/empty). `response-pruning-behaviors.spec.ts` tests the default `remove` behavior with an inline fixture.
- **Grant-app plan**: Proposes testing the form-level `"remove"` plus per-bind `"keep"` override.
- **Severity**: Low. Already covered incidentally by holistic + pruning tests. The grant-app plan adds realistic coverage.

### 1.4 `instances` (Data Sources) — Inline and URL Data

- **Matrix row**: Section 1.7, all 4 rows (inline data, URL data, function-type, readonly) — `formspec-engine`: YES, E2E: `--`
- **Codebase**: `packages/formspec-engine/src/index.ts` (stored as `instanceData`, populated during `setDefinition()`)
- **E2E tests**: The holistic `definition.v1.json` has `instances.referenceData` (inline) and `instances.liveRates` (function source), but the conformance test never validates them directly.
- **Grant-app plan**: Not mentioned.
- **Severity**: **Medium**. `instances` is a real feature for pre-populating reference data. No test verifies that `instanceData` is accessible or that a `formspec-fn:` URI is resolved.

### 1.5 `extensions` on Items and Definition

- **Matrix row**: Section 1.8, `extensions on all objects` — `formspec-engine`: YES, E2E: `--`
- **Codebase**: `packages/formspec-engine/src/index.ts` (passed through transparently)
- **Unit tests**: Schema tests validate `x-` prefixed keys are allowed.
- **E2E tests**: None.
- **Grant-app plan**: Not mentioned.
- **Severity**: Low. Extension points are pass-through. Schema tests ensure they're accepted.

### 1.6 Dependency DAG / Cycle Detection

- **Matrix row**: Section 1.9, `Dependency DAG / cycle detection` — `formspec-engine`: YES, E2E: `--`
- **Codebase**: `packages/formspec-engine/src/index.ts` (method `detectCycles()`, called during `rebuild()`)
- **Unit tests**: `tests/unit/runtime/validator/test_validator_expressions.py` tests cycle detection in the Python linter. `tests/unit/runtime/fel/test_fel_integration.py` tests dependency extraction.
- **E2E tests**: None. No test creates a cyclic definition and verifies the engine throws.
- **Grant-app plan**: Not mentioned.
- **Severity**: **Medium-High**. Cycle detection is a correctness safety net. If it regresses, infinite loops in the engine. However, this is inherently a unit-test-shaped feature, not an E2E feature.

### 1.7 `validationResults` in Response — Full Shape

- **Matrix row**: Section 2, `validationResults` and ValidationResult sub-properties — `formspec-engine`: YES, E2E: `--`
- **Codebase**: `packages/formspec-engine/src/index.ts` (built during `getResponse({mode: 'submit'})`)
- **E2E tests**: The holistic conformance test checks `response.validationResults.filter(r => r.severity === 'error')` but never validates the full `ValidationResult` shape (severity, path, message, constraintKind, code, source, shapeId, constraint, context).
- **Grant-app plan**: Proposes testing `context` expressions on `budgetMatch` shape. Does not propose testing the full `ValidationResult` property bag.
- **Severity**: **High**. `ValidationResult` is the primary contract consumers read. If a property (e.g., `constraintKind`, `shapeId`) is dropped, downstream systems break silently.

### 1.8 `ValidationReport` — Full Shape (valid, results, counts, timestamp)

- **Matrix row**: Section 3, all 4 rows — `formspec-engine`: YES, E2E: `--`
- **Codebase**: `packages/formspec-engine/src/index.ts` (method `getValidationReport()`)
- **E2E tests**: The holistic test accesses `report.continuous.counts.warning` and `report.continuous.results.some(...)` but never checks the `valid`, `timestamp`, or full `counts` shape.
- **Grant-app plan**: Mentions `getValidationReport(mode)` as covered, but no test validates the full report contract.
- **Severity**: **Medium**. The report shape is simple (4 fields), but `valid` (the boolean) is the primary gate used by submit buttons.

### 1.9 `$ref` / `keyPrefix` — Modular Composition

- **Matrix row**: Section 1.3, `$ref` and `keyPrefix` — `formspec-engine`: YES, E2E: `--`
- **Codebase**: `packages/formspec-engine/src/assembler.ts` (implements `assembleDefinitionSync`)
- **E2E tests**: The holistic conformance test exercises `assembleDefinitionSync` in check `P2-SCREENER-AND-ASSEMBLY`, validating that `keyPrefix` prefixes child keys. This is the ONLY test.
- **Grant-app plan**: Not mentioned.
- **Severity**: Low-Medium. The holistic test covers the basic case. But it only tests one level of composition with one child.

### 1.10 `precision` on Field Items

- **Matrix row**: Section 1.4, `precision` — `formspec-engine`: YES, E2E: `--`
- **Codebase**: `packages/formspec-engine/src/index.ts` (stored on bind config, used in numeric rounding)
- **E2E tests**: None. No fixture uses `precision`.
- **Grant-app plan**: Not mentioned.
- **Severity**: **Medium**. Decimal precision controls how many digits are preserved in calculations. The grant-app has `unitCost` and `subtotal` fields where precision matters for currency.

### 1.11 `semanticType` on Field Items

- **Matrix row**: Section 1.4, `semanticType` — `formspec-engine`: YES, E2E: `--`
- **Codebase**: `packages/formspec-engine/src/index.ts` (pass-through metadata)
- **E2E tests**: None.
- **Grant-app plan**: Not mentioned.
- **Severity**: Low. Pure metadata, no runtime behavior.

### 1.12 `prePopulate` on Field Items

- **Matrix row**: Section 1.4, `prePopulate` — `formspec-engine`: YES, E2E: `--`
- **Codebase**: `packages/formspec-engine/src/index.ts` (used during field initialization)
- **E2E tests**: None.
- **Grant-app plan**: Not mentioned.
- **Severity**: **Medium**. Pre-population is a real use case (URL-sourced field defaults). No test validates this feature.

### 1.13 `labels` (Context-Keyed Labels) on Items

- **Matrix row**: Section 1.2, `labels` — `formspec-engine`: YES, E2E: `--`
- **Codebase**: Stored on item, accessible to renderers.
- **E2E tests**: None.
- **Grant-app plan**: Not mentioned.
- **Severity**: Low. Metadata for i18n/context-switching. No runtime behavior in engine.

### 1.14 FEL Functions Without E2E: `countWhere`, `typeOf`, `number()`, `present()`, `empty()`, `coalesce()`, `relevant()`, `required()`, `readonly()`

- **Matrix row**: Section 4.5, all marked `--` in E2E column
- **Codebase**: `packages/formspec-engine/src/fel/interpreter.ts` (implemented in stdlib)
- **Unit tests**: All have Python unit tests in `tests/unit/runtime/fel/test_fel_functions.py` and `test_fel_mip.py`.
- **E2E tests**:
  - `coalesce()` — HAS E2E coverage in `fel-standard-library-ui.spec.ts` (fills `opt1`/`opt2` fields)
  - `empty()` — HAS E2E in `fel-standard-library-ui.spec.ts` (`typeEmpty` field)
  - `typeOf()` — HAS E2E in `fel-standard-library-ui.spec.ts` (`valTypeOf` field)
  - `number()` — HAS E2E in `fel-standard-library-ui.spec.ts` (`valToNumber` field)
  - `countWhere()`, `present()`, `relevant()`, `required()`, `readonly()` — NO E2E coverage
- **Grant-app plan**: `present()` will be used in the `narrativeDocRequired` shape. Others not mentioned.
- **Severity**: Low for most. `present()` is critical for submit-gating. `countWhere()` is useful but niche. MIP state functions (`relevant()`, `required()`, `readonly()`) are extremely hard to test in E2E because they require FEL expressions that read MIP state — this is fundamentally a unit-test domain.

### 1.15 Shape Composition: `or`, `not`, `xone`

- **Matrix row**: Section 1.6, `Composition: and/or/not/xone` — `formspec-engine`: YES, E2E: `--`
- **Codebase**: `packages/formspec-engine/src/index.ts` (method `evaluateShapeConstraints`)
- **E2E tests**: The holistic `definition.v1.json` has ONE shape using `"and"` composition (`composite_guard`). No `"or"`, `"not"`, or `"xone"` composition in any fixture.
- **Grant-app plan**: Not mentioned.
- **Severity**: **Medium**. `and` gets incidental holistic coverage. `or`, `not`, `xone` have zero E2E coverage.

### 1.16 Bind Inheritance Rules (AND/OR Semantics for Multiple Binds)

- **Matrix row**: Section 1.5, `Inheritance rules (AND/OR semantics)` — `formspec-engine`: YES, E2E: `--`
- **Codebase**: `packages/formspec-engine/src/index.ts` (when multiple binds target the same path, `required` uses OR, `relevant` uses AND, etc.)
- **E2E tests**: None. No fixture has multiple binds targeting the same path.
- **Grant-app plan**: Not mentioned.
- **Severity**: **Medium**. This is a correctness invariant. If the semantics flip (AND becomes OR), forms with multiple binds silently misbehave.

### 1.17 Theme: Selector Cascade (Level 2 Selectors)

- **Matrix row**: Section 5.4, `selectors with match/apply` — `formspec-webcomponent`: YES, E2E: `--`
- **Codebase**: `packages/formspec-webcomponent/src/index.ts` (applies selectors during render)
- **E2E tests**: The holistic `theme.json` includes `selectors`, but the conformance test never validates that selector-based styling is actually applied.
- **Grant-app plan**: Not mentioned.
- **Severity**: Medium. Theme selectors are the primary per-field styling mechanism. No test validates they work.

### 1.18 Theme: Null Suppression (`"none"` sentinel)

- **Matrix row**: Section 5.4, `Null suppression` — `formspec-webcomponent`: YES, E2E: `--`
- **Codebase**: `packages/formspec-webcomponent/src/index.ts`
- **E2E tests**: None.
- **Grant-app plan**: Not mentioned.
- **Severity**: Low-Medium. Specific suppression mechanism for inherited theme values.

### 1.19 Component: Custom Components Registry and Instantiation

- **Matrix row**: Section 6.5, all 3 rows — `formspec-webcomponent`: YES, E2E: `--`
- **Codebase**: `packages/formspec-webcomponent/src/index.ts`
- **E2E tests**: `accessibility-responsive-custom-components.spec.ts` has a test for custom component template expansion and recursive cycle detection. This IS E2E coverage.
- **Grant-app plan**: Not mentioned.
- **Severity**: Low. Already covered by component tests.

### 1.20 Component: Responsive Design (Breakpoints + Responsive Props)

- **Matrix row**: Section 6.6, both rows — `formspec-webcomponent`: YES, E2E: `--`
- **Codebase**: `packages/formspec-webcomponent/src/index.ts`
- **E2E tests**: `accessibility-responsive-custom-components.spec.ts` tests viewport resizing and responsive prop overrides on a Grid. This IS E2E coverage.
- **Grant-app plan**: Not mentioned.
- **Severity**: Low. Already covered by component tests.

### 1.21 `children` on Field Items (Dependent Sub-Questions)

- **Matrix row**: Section 1.4, `children (dependent sub-questions)` — `formspec-engine`: YES, E2E: `--`
- **Codebase**: `packages/formspec-engine/src/index.ts` (processed during `setDefinition()`)
- **E2E tests**: None. No fixture uses field-level `children`.
- **Grant-app plan**: Not mentioned.
- **Severity**: **Medium**. Dependent sub-questions are a meaningful UX pattern. Zero test coverage.

---

## 2. Features: In Grant-App Plan But Already Tested Indirectly

These features from the grant-app proposals already have adequate existing E2E coverage, meaning
the grant-app test would be additive (testing in a realistic context) but NOT filling a true gap.

### 2.1 `multiChoice` Data Type

- **Grant-app plan**: Section 2.1 proposes `focusAreas` field with `dataType: "multiChoice"`.
- **Existing coverage**: `core-data-types-binding.spec.ts` already tests multiChoice with inline fixture (checks checkboxes, submits array). `component-gap-coverage.spec.ts` tests CheckboxGroup rendering with `selectAll` and `columns`. The holistic fixture also has `tags` as multiChoice.
- **Assessment**: Grant-app adds realistic context but multiChoice is NOT a true gap. Additive, not essential.

### 2.2 `pattern` Field Constraint

- **Grant-app plan**: Section 2.2 proposes `pattern` on `contactPhone`.
- **Existing coverage**: `field-pattern-validation.spec.ts` tests `^[0-9]{5}$` pattern on a zip code field with a dedicated fixture. This is a direct, dedicated test.
- **Assessment**: Grant-app test replaces this fixture with a realistic one (phone number). Equivalent coverage, not a gap closure.

### 2.3 Basic Repeatable Group + Calculate + Readonly

- **Grant-app plan**: `grant-app-budget-calculations.spec.ts` proposes testing line item subtotals.
- **Existing coverage**: `repeating-sections-calculation.spec.ts` tests exactly this (price * quantity = subtotal). `calculation-visibility-submit.spec.ts` also tests calculate + relevant + submit. `core-component-props-and-fixes.spec.ts` tests DataTable with calculated subtotals and grand total.
- **Assessment**: Grant-app provides a more realistic fixture but this is thoroughly tested.

### 2.4 Cross-Field Constraint Validation

- **Grant-app plan**: `grant-app-validation.spec.ts` proposes testing endDate > startDate.
- **Existing coverage**: `cross-field-constraint-validation.spec.ts` tests exactly this (though with numeric integers rather than dates). The holistic fixture also has a `date_order` shape.
- **Assessment**: Grant-app provides a realistic upgrade. Not a gap closure.

### 2.5 Response Schema Contract (Top-Level Fields)

- **Grant-app plan**: Included in `grant-app-validation.spec.ts`.
- **Existing coverage**: `response-schema-contract.spec.ts` validates `definitionUrl`, `definitionVersion`, `status`, `data`, `authored`. The holistic conformance test validates these too.
- **Assessment**: Fully covered. Grant-app version is redundant for gap closure purposes.

### 2.6 Wizard Navigation

- **Grant-app plan**: `grant-app-wizard-flow.spec.ts` proposes testing 5-page wizard.
- **Existing coverage**: `core-component-props-and-fixes.spec.ts` tests Wizard with Next/Previous navigation and progress indicator. The smoke test navigates a 3-page wizard. The holistic conformance test navigates a wizard.
- **Assessment**: Grant-app adds realistic page count and required-field gating. Additive.

---

## 3. Features: Tested Indirectly But Should Have Direct Tests

These features ONLY have incidental E2E coverage -- they are exercised as a side effect of the
holistic conformance suite or another test, but no test specifically validates the feature contract.
These are the highest-risk items because they could regress silently.

### 3.1 `activeWhen` on Shapes

- **Incidental coverage**: NONE in E2E. The holistic fixture has no `activeWhen` shapes. The only mention is in schema unit tests (`tests/unit/schema/contracts/test_cross_spec_contracts.py`).
- **Engine implementation**: `packages/formspec-engine/src/index.ts` lines ~552-554 — evaluates `shape.activeWhen` FEL expression and skips the shape if it returns false.
- **Risk**: **Critical**. `activeWhen` is the primary mechanism for conditional shape activation. The grant-app `subcontractorCap` shape uses it. If the engine stops evaluating `activeWhen`, shapes fire unconditionally, producing spurious validation errors.
- **Grant-app plan**: DOES propose testing this. But it is the only planned coverage.

### 3.2 Shape `context` Expressions

- **Incidental coverage**: NONE in E2E. No fixture uses shape `context`. The engine code at `packages/formspec-engine/src/index.ts` lines ~561-566 evaluates context expressions and attaches them to `ValidationResult`.
- **Risk**: **Critical**. Context expressions are how forms provide detailed error information (e.g., "expected $500, got $300, difference $200"). If `context` evaluation breaks, error messages lose their dynamic data.
- **Grant-app plan**: DOES propose testing `budgetMatch` shape context. But it is the only planned coverage.

### 3.3 `structureVersion` Reactive Update

- **Incidental coverage**: The holistic conformance test calls `getResponse()` which reads `structureVersion`, but no test validates that `structureVersion` INCREMENTS when it should (after repeat add/remove, after `rebuild()`).
- **Engine implementation**: `packages/formspec-engine/src/index.ts` lines ~225, ~706, ~992, ~1118 — incremented on rebuild, addRepeatInstance, removeRepeatInstance.
- **Risk**: **Medium-High**. `structureVersion` is the cache-busting signal for computed expressions. If it stops incrementing, calculated fields go stale after structural changes.
- **Grant-app plan**: Proposes testing footer totals bar update when `structureVersion` increments. This is the only planned coverage.

### 3.4 `variableSignals` Reactive Access

- **Incidental coverage**: NONE. No E2E test reads `variableSignals` directly. The holistic conformance test accesses variables indirectly through `getResponse()`.
- **Engine implementation**: `packages/formspec-engine/src/index.ts` line ~210 (public property), lines ~511 (populated during variable init).
- **Risk**: **Medium-High**. `variableSignals` is the public API for external consumers (footer bars, dashboards) to reactively read computed variables. The grant-app footer bar depends on this.
- **Grant-app plan**: Proposes testing `@grandTotal` access from the footer via `variableSignals`. Only planned coverage.

### 3.5 `whitespace` Bind Processing

- **Incidental coverage**: The holistic fixture `definition.v1.json` has `whitespace: "trim"` on `fullName` and `whitespace: "normalize"` on `notes`. The conformance test at `P4-RESPONSE-AND-REPORT-CONTRACT` asserts `response.data.fullName === 'Shelley Agent'` and `response.data.notes === 'alpha beta gamma'` — this IS testing whitespace processing, but only implicitly.
- **Risk**: **Medium**. The holistic test would fail if whitespace processing broke, but the assertion message wouldn't tell you WHY. The error would be "expected 'Shelley Agent' but got '  Shelley Agent  '" which is confusing without context.
- **Grant-app plan**: Proposes dedicated whitespace assertions for EIN normalize and contactEmail trim.

### 3.6 `default` Bind (FEL Expression Default)

- **Incidental coverage**: The holistic fixture has `"default": "email"` on `contactMethod` and `"default": "AUTO-VIP"` on `vipCode`. The conformance test at `P2-DATA-ENTRY-MIXED-TYPES` asserts `vipCode` has value `'AUTO-VIP'` which validates the default. But no test validates a FEL-expression default (e.g., `"default": "money(0, 'USD')"`) or a choice field default.
- **Risk**: **Medium**. Simple string defaults work. Expression defaults (`money(0, 'USD')`) are untested end-to-end.
- **Grant-app plan**: Proposes `"default": "'nonprofit'"` on orgType. Does NOT test expression defaults like `money()`.

### 3.7 `excludedValue` Bind

- **Incidental coverage**: The holistic fixture has `"excludedValue": "null"` on `vipCode`. The conformance test never specifically validates this behavior.
- **Engine implementation**: `packages/formspec-engine/src/index.ts` lines ~1216-1220 — when `excludedValue` is `"null"`, non-relevant fields return null to FEL expressions.
- **Risk**: **Medium**. `excludedValue` controls whether fields with a specific value are treated as "empty" for required validation. The grant-app proposes `excludedValue: "money(0, 'USD')"` for `requestedAmount`.
- **Grant-app plan**: DOES propose testing this. But the holistic fixture tests a different `excludedValue` mode (`"null"` vs the FEL-expression mode in the proposals).

### 3.8 `disabledDisplay` Bind

- **Incidental coverage**: The holistic fixture has `"disabledDisplay": "protected"` on `vipCode`. The conformance test never validates that the field renders as protected (disabled but visible).
- **Engine implementation**: `packages/formspec-engine/src/index.ts` (stored on bind config, used by webcomponent during render)
- **Risk**: **Medium**. `disabledDisplay` controls readonly field UX. "protected" means disabled input, "hidden" means no render. No test validates either mode.
- **Grant-app plan**: Proposes testing `duration` as readonly with `disabledDisplay`, but does not explicitly mention asserting the disabled/protected rendering.

### 3.9 Shape Timing: `submit` vs `continuous` vs `demand`

- **Incidental coverage**: The holistic fixture has all three timing modes. The conformance test at `P3-SHAPE-AND-BIND-VALIDATION` validates that `submit_total_positive` does NOT fire in continuous mode (checks `report.submit.results.some(...)` and `report.demand`). This IS testing timing differentiation, but minimally.
- **Risk**: **Medium-High**. If the timing filter breaks, submit-only shapes fire during continuous editing (UX regression) or continuous shapes fail to fire at all.
- **Grant-app plan**: Proposes dedicated timing tests with `narrativeDocRequired` (submit-only).

### 3.10 Shape Severity Levels (warning, info)

- **Incidental coverage**: The holistic fixture has `warning` (`budget_warning`) and `info` (`profile_info`) shapes. The conformance test checks `report.continuous.counts.warning >= 1` and `report.continuous.counts.info >= 1`. This verifies severity levels exist but does not validate that they render differently or that specific shapes fire at the correct severity.
- **Risk**: **Low-Medium**. The assertions are minimal but would catch a complete regression.
- **Grant-app plan**: Has shapes at all three severities. Would provide better coverage.

### 3.11 `display` Item Type Visibility

- **Incidental coverage**: The holistic fixture has a `display` item (`intro`), but the conformance test never checks whether display items render or respond to relevance.
- **Risk**: **Medium**. Display items are common in real forms (instructions, warnings). The grant-app has `nonprofitPhoneHint` as a conditional display item.
- **Grant-app plan**: Proposes testing `nonprofitPhoneHint` visibility toggle. Would be the first dedicated display-item test.

### 3.12 `minRepeat` / `maxRepeat` Enforcement

- **Incidental coverage**: The holistic fixture has `maxRepeat: 3` on lineItems. The conformance test adds 2 instances but never tests the boundary. `core-component-props-and-fixes.spec.ts` has `minRepeat: 2` and verifies 2 rows render, and adds a 3rd.
- **Risk**: **Medium**. No test verifies that the Add button is disabled at maxRepeat or that removing below minRepeat is prevented.
- **Grant-app plan**: Proposes `maxRepeat: 20` enforcement but is generic about how.

---

## 4. Recommended Additions to the Grant-Application Proposals

Based on sections 1 and 3, these are concrete additions that close the most critical gaps.

### 4.1 Add `precision: 2` to Budget Line Item Fields

**Definition change**: Add `"precision": 2` to the `unitCost` and `subtotal` field items.

**Test addition** to `grant-app-budget-calculations.spec.ts`:
```
should round subtotal to 2 decimal places when unitCost has excess precision
```
- Set `unitCost` to `33.333` and `quantity` to `3`
- Assert `subtotal` equals `100.00` (not `99.999`)

**Closes**: Feature 1.10 (`precision` — zero E2E coverage).

### 4.2 Add Full `ValidationResult` Shape Assertion

**Test addition** to `grant-app-validation.spec.ts`:
```
should include all ValidationResult properties when budgetMatch shape fires
```
- Trigger `BUDGET_MISMATCH` shape by setting `requestedAmount` to differ from `@grandTotal`
- Get `getValidationReport({mode: 'continuous'})`
- Assert that the result object has: `severity`, `path`, `message`, `constraintKind` (= `'shape'`), `code` (= `'BUDGET_MISMATCH'`), `source` (= `'shape'`), `shapeId` (= `'budgetMatch'`), `constraint`, `context` (with `grandTotal`, `requested`, `difference`)

**Closes**: Feature 1.7 (`validationResults` full shape — no dedicated test).

### 4.3 Add Full `ValidationReport` Shape Assertion

**Test addition** to `grant-app-validation.spec.ts`:
```
should return a ValidationReport with valid counts and timestamp on continuous mode
```
- Fill the form partially
- Get `getValidationReport({mode: 'continuous'})`
- Assert: `report.valid` is boolean, `report.counts.error` is a number, `report.counts.warning` is a number, `report.counts.info` is a number, `report.timestamp` is a valid ISO 8601 string, `report.results` is an array

**Closes**: Feature 1.8 (`ValidationReport` full shape — no dedicated test).

### 4.4 Add `or` Composition Shape

**Definition change**: Add a shape using `"or"` composition:

```json
{
  "id": "contactProvided",
  "target": "applicantInfo.contactEmail",
  "severity": "warning",
  "message": "Provide either email or phone for contact.",
  "or": [
    "present($applicantInfo.contactEmail)",
    "present($applicantInfo.contactPhone)"
  ]
}
```

**Test addition** to `grant-app-validation.spec.ts`:
```
should clear contactProvided warning when either email or phone is provided (or composition)
```
- Leave both empty, verify warning fires
- Fill only email, verify warning clears
- Clear email, fill only phone, verify warning clears

**Closes**: Feature 1.15 (`or`, `not`, `xone` shape composition — zero E2E for anything except `and`).

### 4.5 Add `disabledDisplay` Render Assertion

**Test addition** to `grant-app-data-types.spec.ts`:
```
should render duration field as disabled input when disabledDisplay is protected
```
- Navigate to the Project Narrative page
- Assert `input[name="projectNarrative.duration"]` has `disabled` attribute
- Assert the field wrapper does NOT have `formspec-hidden` class

**Closes**: Feature 3.8 (`disabledDisplay` — never rendered/asserted).

### 4.6 Add `defaultCurrency` Render Assertion

**Test addition** to `grant-app-data-types.spec.ts`:
```
should render money field with USD badge from formPresentation.defaultCurrency
```
- Navigate to the Budget page
- Assert the `requestedAmount` money field has a currency indicator showing "USD"
- Verify no explicit `currency` property is on the field item itself

**Closes**: Feature 1.2 (`defaultCurrency` — no test validates the rendering).

### 4.7 Add `minRepeat` / `maxRepeat` Boundary Tests

**Test addition** to `grant-app-budget-calculations.spec.ts`:
```
should disable Add Row button when lineItems reaches maxRepeat of 20
```
- Programmatically add 19 instances via `engine.addRepeatInstance('budget.lineItems')` in a loop
- Assert the Add Row button is disabled or hidden

```
should prevent removal below minRepeat of 1
```
- With only 1 line item, assert the Remove button is disabled or hidden

**Closes**: Feature 3.12 (`minRepeat`/`maxRepeat` enforcement — never boundary-tested).

### 4.8 Add `instances` (Data Source) Accessibility Test

**Definition change**: Add an `instances` block to the grant-application definition:

```json
"instances": {
  "agencyData": {
    "description": "Pre-loaded agency reference data",
    "readonly": true,
    "data": {
      "maxAward": 500000,
      "fiscalYear": "FY2026"
    }
  }
}
```

**Test addition** to `grant-app-wizard-flow.spec.ts`:
```
should make instance data accessible via engine.instanceData
```
- Assert `engine.instanceData.agencyData.maxAward === 500000`
- Assert `engine.instanceData.agencyData.fiscalYear === 'FY2026'`

**Closes**: Feature 1.4 (`instances` — zero E2E coverage for a real, implemented feature).

### 4.9 Add `present()` Function to Grant-App Shape

The `narrativeDocRequired` shape already uses `present()` in the proposals. This is good. Add an explicit assertion:

**Test addition** to `grant-app-validation.spec.ts`:
```
should not fire narrativeDocRequired on continuous mode (submit-timing only)
```
- Leave `narrativeDoc` empty
- Get `getValidationReport({mode: 'continuous'})`
- Assert NO result with `code: 'NARRATIVE_DOC_REQUIRED'`
- Get `getValidationReport({mode: 'submit'})`
- Assert result with `code: 'NARRATIVE_DOC_REQUIRED'` IS present

**Closes**: Feature 1.14 (`present()` E2E coverage) and 3.9 (submit vs continuous timing).

### 4.10 Add `children` on Field Items (Dependent Sub-Questions)

**Definition change**: Add dependent sub-questions to `orgType`:

```json
{
  "type": "field",
  "key": "orgType",
  "dataType": "choice",
  "label": "Organization Type",
  "optionSet": "orgTypes",
  "children": [
    {
      "type": "field",
      "key": "orgSubType",
      "dataType": "string",
      "label": "Organization Sub-Type",
      "hint": "Specify sub-category if applicable."
    }
  ]
}
```

**Test addition** to `grant-app-wizard-flow.spec.ts`:
```
should render orgSubType as a child field of orgType
```
- Assert `orgSubType` field is visible and nested within the `orgType` field wrapper

**Closes**: Feature 1.21 (`children` on field items — zero E2E coverage).

---

## Summary Table

| Gap ID | Feature | Severity | Covered by Holistic? | Covered by Grant-App Plan? | Recommended Action |
|--------|---------|----------|---------------------|---------------------------|-------------------|
| 1.1 | `derivedFrom` | Low | No | No | Skip — metadata only |
| 1.2 | `formPresentation` + `defaultCurrency` | Medium-High | Incidental | Partial | Add 4.6 |
| 1.4 | `instances` (data sources) | Medium | Incidental | No | Add 4.8 |
| 1.6 | Cycle detection | Medium-High | No | No | Unit test domain — skip E2E |
| 1.7 | `validationResults` full shape | High | Minimal | Partial | Add 4.2 |
| 1.8 | `ValidationReport` full shape | Medium | Minimal | No | Add 4.3 |
| 1.10 | `precision` | Medium | No | No | Add 4.1 |
| 1.12 | `prePopulate` | Medium | No | No | Future — needs URL mocking |
| 1.15 | Shape composition: `or`/`not`/`xone` | Medium | Only `and` | No | Add 4.4 |
| 1.16 | Bind inheritance (AND/OR) | Medium | No | No | Future — needs multi-bind fixture |
| 1.17 | Theme selectors cascade | Medium | Incidental | No | Future — needs theme-focused test |
| 1.21 | Field `children` | Medium | No | No | Add 4.10 |
| 3.1 | `activeWhen` on shapes | Critical | No | Yes | Confirm grant-app covers |
| 3.2 | Shape `context` | Critical | No | Yes | Confirm grant-app covers + add 4.2 |
| 3.3 | `structureVersion` reactive | Medium-High | Incidental | Yes | Confirm grant-app covers |
| 3.4 | `variableSignals` access | Medium-High | No | Yes | Confirm grant-app covers |
| 3.5 | `whitespace` bind | Medium | Incidental (holistic) | Yes | Confirm grant-app covers |
| 3.7 | `excludedValue` | Medium | Incidental | Yes | Confirm grant-app covers |
| 3.8 | `disabledDisplay` | Medium | No | Partial | Add 4.5 |
| 3.9 | Shape timing differentiation | Medium-High | Minimal | Yes | Add 4.9 |
| 3.12 | `minRepeat`/`maxRepeat` boundaries | Medium | No | Partial | Add 4.7 |
