# Grant Application E2E Refactor — Greenfield Plan

**Philosophy**: Delete everything that isn't earning its keep. The grant-application becomes the
single integration fixture. Synthetic fixtures that duplicate what the grant-app can cover are
deleted. Tests are rebuilt from scratch around the grant-application's actual field keys and
real-world workflow. We do this once and we do it right.

Cross-referenced against `thoughts/feature-implementation-matrix.md` (ADR 0013/0016) —
every ✅ in `formspec-engine` that has no E2E column coverage is a gap this plan closes.

---

## 1. Strategy

The existing E2E integration tests are a collection of one-off synthetic fixtures
(`shopping-cart.json`, `repeating-sections.json`, `validation.json`, `static-validation.json`,
etc.) each testing a narrow slice of the engine in isolation. This approach has two fundamental
problems: the fixtures don't exercise the engine under realistic load (a real field graph, real FEL
variable chains, real shape interactions), and the tests are brittle to refactors because they
couple to toy field keys with no semantic meaning.

The grant-application is the right foundation. It is a realistic multi-page wizard with: repeatable
groups, calculated subtotals feeding a variable chain (`totalDirect → indirectCosts → grandTotal`),
four shape rules at three severity levels including `activeWhen` and `context` expressions,
cross-field constraints, conditional visibility gated on user choices, and a full
definition+component+theme stack. It exercises the engine the way real deployments will.

**The plan:**

1. **Extend the grant-application definition** to close every gap in the feature matrix. Not
   additive patches — design the definition as if writing it fresh with full test coverage in mind.
   Every addition must be realistic for a federal grant form.

2. **Delete synthetic integration fixtures** that are now redundant. `shopping-cart.json`,
   `repeating-sections.json`, `validation.json`, `static-validation.json` are gone. The test files
   that used them are rewritten around the grant-application.

3. **Keep synthetic fixtures only where the grant-application genuinely cannot serve** — deeply
   nested repeats (2+ levels), exhaustive FEL stdlib function isolation, NaN coercion edge cases,
   the screener routing conformance suite. Everything else moves.

4. **Build a proper test infrastructure layer** — a shared `grant-app.ts` helper that mounts the
   grant-application, navigates pages programmatically, and exposes engine internals. Tests stop
   reimplementing setup boilerplate.

5. **Write new tests from scratch** — not migrations. Tests written around toy fixtures were
   written for toy fixtures. Rewriting around the grant-application means writing them correctly,
   asserting the full feature contract, not incidental side effects.

---

## 2. Definition Changes

All changes produce the revised `examples/grant-application/definition.json`. Ordered by impact.

---

### 2.1 Fix `attachment` dataType on upload fields

Change `attachments.narrativeDoc` and `attachments.budgetJustification` from `dataType: "string"`
to `dataType: "attachment"`.

**Closes**: `attachment` dataType (only tested in holistic fixture).

---

### 2.2 Add `multiChoice` for program focus areas

Add `focusAreas` field to `projectNarrative.children` with `dataType: "multiChoice"` and inline
options (health, education, environment, infrastructure, equity). Add bind requiring it.

**Closes**: `multiChoice` dataType, `CheckboxGroup` component in a realistic context.

---

### 2.3 Add `initialValue` + phone pattern constraint via bind

Add `"initialValue": "202-555-0100"` and `"semanticType": "phone"` to the `contactPhone` field
item. Add a bind with `constraint: "matches($applicantInfo.contactPhone, '^[0-9]{3}-[0-9]{3}-[0-9]{4}$')"`.

Note: `pattern` is not in the field item JSON Schema (`additionalProperties: false`), so phone
format validation is done via a bind constraint using `matches()` instead.

**Closes**: `initialValue` on a field item, bind-level pattern constraint, `semanticType` metadata.

---

### 2.4 Add `default` to `orgType`

Modify the existing `orgType` required bind to add `"default": "'nonprofit'"`.

**Closes**: `default` FEL expression on a choice field, default-driven relevance cascade on load.

---

### 2.5 Add `nonRelevantBehavior: "keep"` to subcontractors bind

Modify the existing subcontractors relevance bind to add `"nonRelevantBehavior": "keep"`.

**Closes**: Per-bind `nonRelevantBehavior` override against form-level `"remove"`.

---

### 2.6 Add `timing: "submit"` shape for narrative document

Add `narrativeDocRequired` shape with `timing: "submit"` and `constraint: "present($attachments.narrativeDoc)"`.

**Closes**: `timing: "submit"` shape validation, `present()` FEL function in a real constraint.

---

### 2.7 Add `excludedValue` to `requestedAmount`

Modify the existing `requestedAmount` bind to add `"excludedValue": "null"`. The schema enum only
allows `"preserve"` or `"null"` — not FEL expressions. Using `"null"` means the default `money(0, 'USD')`
value is treated as empty for required validation.

**Closes**: `excludedValue` bind.

---

### 2.8 Add `precision: 2` to decimal budget fields

Add `"precision": 2` to `unitCost` and `subtotal` field items.

**Closes**: `precision` field property — never tested in any fixture.

---

### 2.9 Add `or` composition shape for contact validation

Add `contactProvided` shape with `"or"` composition using FEL expression strings:
`["present($applicantInfo.contactEmail)", "present($applicantInfo.contactPhone)"]`.

Note: Schema defines `or` as an array of strings (FEL expressions), not an array of objects.

**Closes**: `or` shape composition.

---

### 2.10 Add `instances` block for agency reference data

Add `instances.agencyData` with inline `data: { maxAward: 500000, fiscalYear: "FY2026" }`,
`readonly: true`.

**Closes**: `instances` (inline data source).

---

### 2.11 Add `children` (dependent sub-questions) to `orgType`

Add `orgSubType` field as a child of `orgType`.

**Closes**: Field `children` (dependent sub-questions) — zero E2E coverage.

---

### 2.12 Add `disabledDisplay: "protected"` to `duration` bind

Modify the existing duration bind to add `"disabledDisplay": "protected"`.

**Closes**: `disabledDisplay` — "protected" means disabled input, still visible.

---

### 2.13 Add `not` composition shape on abstract

Add `abstractNotPlaceholder` shape with `"not": "contains(lower($projectNarrative.abstract), 'tbd')"`.
Severity `warning`. Fires if the abstract contains placeholder text.

**Closes**: `not` shape composition — zero E2E coverage.

---

### 2.14 Add `xone` composition shape on date range

Add `dateRangeXone` shape with `"xone"` targeting `#` (form-level). Requires exactly one of:
start date in the future OR end date in the past. Severity `info`.

**Closes**: `xone` shape composition — zero E2E coverage.

---

### 2.15 Add `and` composition shape for subcontractor entry

Add `subcontractorEntryRequired` shape with `"and"` composition and `activeWhen: "$budget.usesSubcontractors"`.
Requires that when subcontractors are enabled, at least one entry exists.

**Closes**: `and` shape composition in grant-app (previously only in holistic).

---

### 2.16 Add second bind on `contactEmail` (bind inheritance test)

Add a second bind entry for `applicantInfo.contactEmail` with
`constraint: "contains($applicantInfo.contactEmail, '@')"`. The first bind has `whitespace: "trim"`.
Two binds on the same path tests bind inheritance AND semantics for constraints.

**Closes**: Bind inheritance AND/OR semantics — zero E2E coverage.

---

### 2.17 Add `semanticType` to email and phone fields

Add `"semanticType": "email"` to `contactEmail` and `"semanticType": "phone"` to `contactPhone`.

**Closes**: `semanticType` metadata — zero E2E coverage.

---

### 2.18 Add `prePopulate` to `orgName`

Add `"prePopulate": { "instance": "agencyData", "path": "orgName", "editable": true }` to the
`orgName` field item. Uses the `agencyData` instance added in 2.10.

Note: Testing requires the instance to actually contain an `orgName` value at runtime. The
`agencyData` inline data doesn't include `orgName`, so the prePopulate will resolve to null. Tests
should verify the property is preserved in the definition and that the engine processes it without
error.

**Closes**: `prePopulate` definition property.

---

### 2.19 Add `labels` (context-keyed labels) to `orgName`

Add `"labels": { "short": "Org", "aria": "Applying Organization Full Legal Name" }` to `orgName`.

**Closes**: `labels` metadata — zero E2E coverage.

---

### 2.20 Add `versionAlgorithm` to top-level definition

Add `"versionAlgorithm": "semver"` to the top level.

**Closes**: `versionAlgorithm` — zero E2E coverage.

---

### 2.21 Add `migrations` to top-level definition

Add `"migrations": { "from": {} }` to the top level. Empty `from` map — no prior versions to
migrate from yet. Validates the schema structure.

**Closes**: `migrations` structure — zero E2E coverage.

---

## 3. Component Document Changes

In `component.json`:

- Applicant Info page: add `TextInput` for `applicantInfo.orgSubType` (replaces `Spacer` after `RadioGroup`)
- Project Narrative page: add `CheckboxGroup` for `projectNarrative.focusAreas`
- Review & Submit page: add `orgSubType` and `focusAreas` to their respective Summary sections
- FileUpload components for both attachment fields already exist — no change needed

---

## 4. Test Infrastructure: `tests/e2e/playwright/helpers/grant-app.ts`

Every integration test that uses the grant-application imports from here. No test reimplements
setup.

```typescript
import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../../../');
const GRANT_DIR = path.join(ROOT, 'examples/grant-application');

export function loadGrantArtifacts() {
  return {
    definition: JSON.parse(fs.readFileSync(path.join(GRANT_DIR, 'definition.json'), 'utf8')),
    component:  JSON.parse(fs.readFileSync(path.join(GRANT_DIR, 'component.json'),  'utf8')),
    theme:      JSON.parse(fs.readFileSync(path.join(GRANT_DIR, 'theme.json'),       'utf8')),
  };
}

export async function mountGrantApplication(page: Page): Promise<void> {
  const { definition, component, theme } = loadGrantArtifacts();
  await page.goto('/');
  await page.waitForSelector('formspec-render');
  await page.evaluate(({ def, comp, thm }) => {
    const el: any = document.querySelector('formspec-render');
    el.definition        = def;
    el.componentDocument = comp;
    el.themeDocument     = thm;
  }, { def: definition, comp: component, thm: theme });
  await page.waitForSelector('.formspec-wizard-steps, .formspec-container');
}

/** Navigate wizard to a named page. */
export async function goToPage(page: Page, title: string): Promise<void> {
  for (let i = 0; i < 10; i++) {
    const heading = await page.locator('formspec-render h2').textContent().catch(() => '');
    if (heading?.trim() === title) return;
    await page.locator('.formspec-wizard-next:not([disabled])').click();
    await page.waitForTimeout(100);
  }
  throw new Error(`Could not navigate to wizard page "${title}"`);
}

/** Get raw field signal value from engine. */
export async function engineValue(page: Page, path: string): Promise<any> {
  return page.evaluate((p) => {
    const el: any = document.querySelector('formspec-render');
    return el.getEngine().signals[p]?.value;
  }, path);
}

/** Get a global variable value from engine. */
export async function engineVariable(page: Page, name: string): Promise<any> {
  return page.evaluate((n) => {
    const el: any = document.querySelector('formspec-render');
    return el.getEngine().variableSignals[`#:${n}`]?.value;
  }, name);
}

/** Set a field value via engine (bypasses UI). */
export async function engineSetValue(page: Page, path: string, value: any): Promise<void> {
  await page.evaluate(({ p, v }) => {
    const el: any = document.querySelector('formspec-render');
    el.getEngine().setValue(p, v);
  }, { p: path, v: value });
}

/** Get the full validation report. */
export async function getValidationReport(page: Page, mode: 'continuous' | 'submit' | 'demand' = 'continuous') {
  return page.evaluate((m) => {
    const el: any = document.querySelector('formspec-render');
    return el.getEngine().getValidationReport({ mode: m });
  }, mode);
}

/** Get the full response. */
export async function getResponse(page: Page, mode: 'continuous' | 'submit' = 'submit') {
  return page.evaluate((m) => {
    const el: any = document.querySelector('formspec-render');
    return el.getEngine().getResponse({ mode: m });
  }, mode);
}

/** Read the engine's structureVersion. */
export async function structureVersion(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el: any = document.querySelector('formspec-render');
    return el.getEngine().structureVersion.value;
  });
}

/** Programmatically add a repeat instance via engine. */
export async function addRepeatInstance(page: Page, itemName: string): Promise<number> {
  return page.evaluate((name) => {
    const el: any = document.querySelector('formspec-render');
    return el.getEngine().addRepeatInstance(name);
  }, itemName);
}
```

---

## 5. New Test Files

These replace the deleted tests. Each is self-contained around the grant-application.

---

### `integration/grant-app-budget-calculations.spec.ts`

**Replaces**: `repeating-sections-calculation.spec.ts` + `calculation-visibility-submit.spec.ts`
**Deletes**: `repeating-sections.json`, `shopping-cart.json`

- `should calculate line item subtotal reactively as quantity and unitCost change`
- `should round subtotal to 2 decimal places (precision: 2 on unitCost/subtotal)`
  - Set `unitCost = 33.333`, `quantity = 3`, assert `subtotal = 100.00`
- `should aggregate subtotals into @totalDirect variable`
- `should compute @indirectCosts from indirectRate percentage of @totalDirect`
- `should compute @grandTotal as moneyAdd(@totalDirect, @indirectCosts)`
- `should set @indirectCosts to money(0, USD) when orgType switches to government`
- `should increment structureVersion when a line item is added`
- `should increment structureVersion when a line item is removed`
- `should preserve remaining row data after a line item is deleted (batch fix regression)`
- `should disable Add Row button when lineItems reaches maxRepeat of 20`
  - Add 19 instances programmatically via `addRepeatInstance`, assert button disabled
- `should disable Remove button when lineItems is at minRepeat of 1`

---

### `integration/grant-app-validation.spec.ts`

**Replaces**: `cross-field-constraint-validation.spec.ts` + `field-pattern-validation.spec.ts` + `response-schema-contract.spec.ts`
**Deletes**: `validation.json`, `static-validation.json`

- `should reject endDate before startDate with constraintMessage`
- `should accept endDate after startDate and clear the constraint error`
- `should reject EIN not matching XX-XXXXXXX pattern via constraint bind`
- `should reject contactPhone not matching pattern via bind constraint (matches())`
- `should normalize whitespace from EIN input (whitespace: normalize)`
- `should trim whitespace from contactEmail input (whitespace: trim)`
- `should surface BUDGET_MISMATCH shape with full ValidationResult contract`
  - Assert result has: `severity`, `path`, `message`, `constraintKind = 'shape'`,
    `code = 'BUDGET_MISMATCH'`, `source = 'shape'`, `shapeId = 'budgetMatch'`,
    `constraint`, and `context` with keys `grandTotal`, `requested`, `difference`
- `should clear BUDGET_MISMATCH when requestedAmount matches @grandTotal`
- `should activate subcontractorCap shape only when usesSubcontractors is true (activeWhen)`
  - Fill subcontractors to exceed 49%, verify shape fires
  - Uncheck usesSubcontractors, verify shape does NOT fire
- `should not fire narrativeDocRequired in continuous mode (timing: submit)`
- `should fire narrativeDocRequired in submit mode when no attachment present`
- `should clear narrativeDocRequired when attachment field is set`
- `should fire contactProvided warning when both email and phone are empty (or composition)`
- `should clear contactProvided warning when only email is provided (or composition)`
- `should clear contactProvided warning when only phone is provided (or composition)`
- `should fire abstractNotPlaceholder warning when abstract contains TBD (not composition)`
  - Set abstract to "Project scope TBD", verify warning with code `ABSTRACT_PLACEHOLDER`
  - Change abstract to "Detailed project scope", verify warning clears
- `should fire dateRangeXone info when neither date condition is met (xone composition)`
  - Set startDate in the past and endDate in the future (neither matches xone), verify fires
  - Set startDate in the future only (exactly one), verify clears
- `should fire subcontractorEntryRequired when usesSubcontractors is true but no entries (and composition)`
  - Enable usesSubcontractors, verify shape fires with code `SUBCONTRACTOR_ENTRY_MISSING`
  - Add a subcontractor entry, verify shape clears
- `should apply constraint from second bind on contactEmail (bind inheritance AND semantics)`
  - Set contactEmail to "notanemail", verify constraint error "Contact email must contain @."
  - Set contactEmail to "jane@example.org", verify constraint clears
  - Verify whitespace trim from first bind still applies
- `should return ValidationReport with valid boolean, counts, results, and timestamp`
  - Assert: `report.valid` is boolean, `report.counts.error` is number,
    `report.counts.warning` is number, `report.counts.info` is number,
    `report.timestamp` matches ISO 8601, `report.results` is array
- `should include definitionUrl, version, status, data, authored in submit response`
- `should reject requestedAmount of $0 due to excludedValue (money(0, USD))`

---

### `integration/grant-app-visibility-and-pruning.spec.ts`

**Replaces**: `response-pruning-behaviors.spec.ts`
**Deletes**: inline fixture in that test

- `should show nonprofitPhoneHint display item when orgType defaults to nonprofit`
- `should hide nonprofitPhoneHint when orgType changes to university`
- `should show indirectRate field for non-government org types`
- `should hide indirectRate field when orgType is government`
- `should hide entire subcontractors page when usesSubcontractors is false`
- `should show subcontractors page when usesSubcontractors is checked`
- `should cascade default orgType through relevance binds immediately on load`
- `should remove non-relevant fields from submit response (form-level nonRelevantBehavior: remove)`
- `should retain subcontractor data in response when usesSubcontractors toggled off (per-bind keep)`
  - Fill subcontractor, uncheck usesSubcontractors, assert `response.data.subcontractors`
    is present with entered data

---

### `integration/grant-app-wizard-flow.spec.ts`

**New** — no equivalent exists

- `should render all 5 wizard pages accessible by clicking Next`
- `should block Next when required fields on current page are empty`
- `should allow Next after all required fields on current page are filled`
- `should show completed-step indicator on prior pages`
- `should render orgSubType as a child field nested under orgType`
- `should make instance data accessible via engine (agencyData.maxAward, fiscalYear)`
- `should render CheckboxGroup for focusAreas on Project Narrative page`
- `should render FileUpload components for both attachment fields on Review page`
- `should render budget summary card with @grandTotal on Budget page`
- `should have versionAlgorithm set to semver in the loaded definition`
- `should have migrations object present in the loaded definition`
- `should have labels metadata on orgName field (short and aria keys)`
- `should have semanticType metadata on contactEmail (email) and contactPhone (phone)`
- `should have prePopulate property on orgName referencing agencyData instance`

---

### `integration/grant-app-data-types.spec.ts`

**Replaces**: portions of `core-data-types-binding.spec.ts` for types now covered by grant-app

- `should render money field with USD badge from formPresentation.defaultCurrency`
  - Assert currency badge shows "USD" — no explicit `currency` on the field item
- `should accept numeric input and store requestedAmount as { amount, currency } object`
- `should render multiChoice CheckboxGroup and return array of selected values`
- `should render attachment FileUpload for narrativeDoc and budgetJustification`
- `should render date pickers for startDate and endDate`
- `should calculate duration in months from date range (readonly calculate bind)`
- `should render duration as disabled input (disabledDisplay: protected)`
  - Assert `input` for `duration` has `disabled` attribute and is visible (not hidden)
- `should render orgSubType child field and submit its value in response`
- `should initialize contactPhone with initialValue of 202-555-0100`

---

## 6. Files to Delete

| File | Reason |
|---|---|
| `tests/e2e/fixtures/shopping-cart.json` | Replaced by grant-app budget + submit tests |
| `tests/e2e/fixtures/repeating-sections.json` | Replaced by grant-app budget calculation tests |
| `tests/e2e/fixtures/validation.json` | Replaced by grant-app validation tests |
| `tests/e2e/fixtures/static-validation.json` | Replaced by grant-app pattern + whitespace tests |
| `tests/e2e/playwright/integration/calculation-visibility-submit.spec.ts` | → `grant-app-budget-calculations.spec.ts` |
| `tests/e2e/playwright/integration/repeating-sections-calculation.spec.ts` | → `grant-app-budget-calculations.spec.ts` |
| `tests/e2e/playwright/integration/cross-field-constraint-validation.spec.ts` | → `grant-app-validation.spec.ts` |
| `tests/e2e/playwright/integration/field-pattern-validation.spec.ts` | → `grant-app-validation.spec.ts` |
| `tests/e2e/playwright/integration/response-schema-contract.spec.ts` | → `grant-app-validation.spec.ts` |
| `tests/e2e/playwright/integration/response-pruning-behaviors.spec.ts` | → `grant-app-visibility-and-pruning.spec.ts` |

---

## 7. Files to Keep

| File | Reason |
|---|---|
| `tests/e2e/fixtures/complex-scenarios.json` | 2-level nested repeats — grant-app has 1 level |
| `tests/e2e/fixtures/edge-cases.json` | NaN coercion — not realistic in grant context |
| `tests/e2e/fixtures/fel-functions.json` | FEL stdlib isolation — 40+ functions, stays purpose-built |
| `tests/e2e/fixtures/kitchen-sink-holistic/` | Formal conformance suite — stays independent |
| `tests/e2e/fixtures/data-types.json` | Kept for `dateTime`, `url`, `time` not in grant-app |
| `tests/e2e/playwright/integration/nested-repeats-and-calculations.spec.ts` | 2-level nesting |
| `tests/e2e/playwright/integration/edge-case-behaviors.spec.ts` | NaN / coercion edge cases |
| `tests/e2e/playwright/integration/fel-standard-library-ui.spec.ts` | FEL stdlib coverage |
| `tests/e2e/playwright/integration/kitchen-sink-holistic-conformance.spec.ts` | Conformance suite |
| `tests/e2e/playwright/integration/core-data-types-binding.spec.ts` | Trim to types not in grant-app |
| `tests/e2e/playwright/components/*.spec.ts` | Component unit tests — stay on minimal fixtures |
| `tests/e2e/playwright/smoke/kitchen-sink-smoke.spec.ts` | Fast smoke regression |

---

## 8. Remaining Known Gaps — Genuinely Not Definition-Testable

These cannot be tested via definition changes alone.

| Feature | Why Deferred |
|---|---|
| Dependency cycle detection | Unit-test-shaped: engine throws on invalid input. Not an E2E concern. |
| Theme selector cascade validation | Requires a theme-focused test with non-trivial selectors. Grant-app theme is too simple. |
| `$ref` / `keyPrefix` composition | Requires external definition fragments and the assembler. Grant-app is a single file. Holistic covers the basic case. |
| `prePopulate` runtime resolution | Definition property is present (2.18), but verifying actual pre-population requires host injection or a mock data source at runtime. |
| `derivedFrom` metadata passthrough | Pure metadata; schema tests are sufficient. |

---

## 9. Execution Order

Sequential. Each step validates the previous.

1. **Make definition changes** (Section 2). Rebuild. Manually verify the example still renders
   and the server accepts a submission. Update `sample-submission.json` to include new fields.

2. **Make component document changes** (Section 3). Verify CheckboxGroup and FileUpload render
   on the correct pages in the browser.

3. **Create `helpers/grant-app.ts`** (Section 4). Verify `mountGrantApplication` and `goToPage`
   work against the updated definition before writing any test files.

4. **Write `grant-app-budget-calculations.spec.ts`**. Most self-contained, exercises the core
   engine path (repeat, calculate, variables, precision, structureVersion). Get it green.

5. **Write `grant-app-validation.spec.ts`**. Depends on the definition changes from step 1.
   The `ValidationResult` full contract test is highest priority here.

6. **Write `grant-app-visibility-and-pruning.spec.ts`**. Tests conditional logic and response pruning.

7. **Write `grant-app-wizard-flow.spec.ts`**. Integration-level wizard test. Write last since it
   requires all pages to be complete and working.

8. **Write `grant-app-data-types.spec.ts`**. Fills the remaining type and rendering gaps.

9. **Delete** the replaced files (Section 6). Run full suite. Fix anything that breaks.

10. **Trim `core-data-types-binding.spec.ts`** to remove tests now covered by the grant-app.
