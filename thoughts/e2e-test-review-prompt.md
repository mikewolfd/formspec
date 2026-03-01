# E2E Test Suite Review — Parallel Agent Dispatch

## Objective

Review all 25 Playwright E2E test files in `tests/e2e/playwright/` against sound testing philosophy. Identify tests that should be migrated to unit/integration tests in their respective packages, verify real-world app usage, assess test grouping/readability, and produce a concrete migration plan.

---

## Shared Context (Injected Into Every Agent)

### The Three Test Layers (Not Just Semantics)

Before evaluating any test, be precise about what layer it belongs to. These are not interchangeable labels — they have fundamentally different characteristics:

**Unit Tests** (`packages/formspec-engine/`, `packages/formspec-webcomponent/`):
- What they test: A single module/class/function in isolation.
- How they run: Node.js (or jsdom). No browser. No HTTP server. No file I/O.
- Speed: Milliseconds per test.
- Examples: FEL expression evaluation, `FormEngine.setValue()` behavior, signal dependency wiring, validation report generation, component render function output.
- Key question: "Does this logic work correctly given these inputs?"

**Integration Tests** (could live in `packages/` or a dedicated `tests/integration/`):
- What they test: Multiple modules working together — but still programmatic, no UI.
- How they run: Node.js. May instantiate `FormEngine` + load a real definition + exercise multiple methods together. May mount a web component in jsdom and check rendered DOM structure.
- Speed: Tens of milliseconds per test.
- Examples: Load a definition → set values → verify computed fields update → check validation report. Mount `<formspec-render>` with a definition → verify component tree renders correct elements.
- Key question: "Do these modules compose correctly?"

**E2E Tests** (`tests/e2e/playwright/`):
- What they test: The full system from the user's perspective, in a real browser.
- How they run: Playwright driving Chromium against a running Vite dev server. Real HTTP. Real DOM. Real event loop.
- Speed: Seconds per test.
- Examples: Open the grant application → navigate to page 3 → fill in budget fields → see totals update live → go back to page 1 → verify data persists → submit → verify response.
- Key question: "Can a user accomplish this task through the actual UI?"
- The line: If a test never interacts with the page as a user would (click, type, select, navigate), it's not E2E — it's an integration test wearing an E2E costume. `page.evaluate()` to call engine methods directly is a strong signal that the test is in the wrong layer.

### The Critical Distinction: Integration vs E2E

Many tests in this codebase sit in `tests/e2e/playwright/` but are actually integration tests. The telltale signs:

| E2E (keep in Playwright) | Integration (migrate out) |
|--------------------------|--------------------------|
| Uses `page.click()`, `page.fill()`, `page.selectOption()` | Uses `page.evaluate(() => engine.setValue(...))` |
| Asserts on visible DOM text, element visibility, UI state | Asserts on `page.evaluate(() => engine.signals[x].value)` |
| Navigates between pages via UI buttons | Calls `goToPage()` helper then immediately reads engine state |
| Tests the feedback loop: user action → visual result | Tests engine logic that happens to run in a browser |
| Would break if the UI changed but logic stayed same | Would pass identically if run in Node.js with no browser |

A test that uses `page.evaluate()` to set values and `page.evaluate()` to read results, with no real user interaction in between, is an integration test that should NOT require Playwright.

### Tests Must Validate Core Packages, Not Patch the Example App

A critical anti-pattern to watch for: tests that are really just verifying specific behaviors of the grant-application example, rather than testing the core packages (`formspec-engine`, `formspec-webcomponent`, or the Python `formspec` package).

**The example app is a consumer of the packages, not the thing being tested.** E2E tests should use the example app as a realistic harness to exercise core package behavior. But if a test is only meaningful because of a specific field configuration in `examples/grant-application/definition.json` — and the underlying engine/component behavior it relies on isn't being validated — then it's testing the example, not the product.

Signs a test is "patching the example" rather than testing a core capability:
- It was written to fix a bug that only manifested in the grant app's specific configuration
- The assertion is tightly coupled to a specific field name/path in the grant app (e.g., `applicantInfo.orgType`) without the test being generalizable to any field with that behavior
- Removing or restructuring the grant app definition would break the test, even though the engine behavior it tests is unchanged
- The test name references grant-app-specific domain concepts rather than engine/component capabilities

**What good looks like:** The grant app is the vehicle, but the test proves a core capability. Example: "navigating a wizard preserves field values across pages" — this tests the engine's state persistence, using the grant app as the form that happens to have a wizard.

**What bad looks like:** "the orgType field shows orgSubType when 'University' is selected" — this tests one specific field's conditional visibility in the grant app. The core capability (conditional relevance) should be tested at the engine unit level; the E2E should just verify that conditional visibility works in general through the UI.

### Evaluation Criteria

For every `test()` block, answer:

1. **Does it need a browser?** Does it interact with the page as a user would (clicks, typing, selecting)? Or is it using `page.evaluate()` as a glorified Node.js runtime?
2. **Does it use real app data?** Grant app from `examples/` vs synthetic inline fixtures vs test fixtures.
3. **Is it a user journey or an implementation check?** User-facing behavior vs internal engine state verification.
4. **Does it test a core package capability or a grant-app-specific behavior?** Would this test matter if we replaced the grant app with a completely different form? If not, the underlying capability should be tested at the unit/integration level instead.
5. **Test naming:** Does the test name describe the user-visible outcome, not the implementation detail?
   - Bad: `"should set signal value for datetime field"`
   - Good: `"filling a date field shows the selected date in the summary"`
6. **Grouping:** Is this test logically grouped with related tests, or an orphan?

### Classification Labels

For each test, assign exactly one:

- **E2E-KEEP**: Genuine E2E test — real user interaction, real app, browser required. Keep in Playwright.
- **UNIT-MIGRATE**: Pure engine logic test — no DOM needed. Migrate to `packages/formspec-engine/` unit tests.
- **INTEGRATION-MIGRATE**: Multi-module composition test — may need jsdom but not Playwright. Migrate to integration test layer.
- **COMPONENT-MIGRATE**: Component rendering test with synthetic fixtures — migrate to `packages/formspec-webcomponent/` tests.
- **MERGE**: Valid E2E test but belongs in a different file for better grouping.
- **DELETE**: Redundant (covered by another test) or untestable.

---

## Agent A — Grant Application E2E Tests (Sonnet)

**Model:** Sonnet
**Role:** Review the core grant application test files — these are the most likely to be legitimate E2E tests since they use the real app. Your job is to verify that assumption and identify any that are actually engine-level tests in disguise.

**Files to review (8 files):**
```
tests/e2e/playwright/integration/grant-app-budget-calculations.spec.ts
tests/e2e/playwright/integration/grant-app-conformance.spec.ts
tests/e2e/playwright/integration/grant-app-data-types.spec.ts
tests/e2e/playwright/integration/grant-app-discovered-issues.spec.ts
tests/e2e/playwright/integration/grant-app-ux-fixes.spec.ts
tests/e2e/playwright/integration/grant-app-validation.spec.ts
tests/e2e/playwright/integration/grant-app-visibility-and-pruning.spec.ts
tests/e2e/playwright/integration/grant-app-wizard-flow.spec.ts
```

**Also read for context (do not review, just understand the setup):**
```
tests/e2e/playwright/helpers/grant-app.ts
examples/grant-application/definition.json
```

**Instructions:**

1. Read each test file completely. For every `test()` block, classify it using the labels above.
2. Pay special attention to the pattern: `goToPage()` → `engineSetValue()` → `engineValue()` assertion. This is `page.evaluate()` round-tripping with no real user interaction — a strong signal for UNIT-MIGRATE or INTEGRATION-MIGRATE.
3. Contrast with tests that do `page.fill()` → assert visible DOM text. Those are genuine E2E.
4. For `grant-app-discovered-issues.spec.ts` specifically: are these regressions better tested at the unit level? Would the bug resurface without a browser?
5. **For every test, ask: does this test a core engine/component capability, or does it just test a grant-app-specific field configuration?** A test like "orgType conditional visibility" is testing the grant app's definition, not the engine's relevance system. The engine capability should be unit-tested; the E2E should only verify the UI feedback loop works in general.
6. Take screenshots of 2-3 representative tests that you flag as migration candidates to show the `page.evaluate()` pattern.
7. Note any tests that overlap with other files (duplicate assertions across grant-app-*.spec.ts files).
8. Assess whether the 8-file split makes sense or whether these should be reorganized by user journey.

**Output format:**

```markdown
## Agent A Results: Grant Application Tests

### File-by-File Classification

#### [filename]
- **Summary:** One sentence describing what this file tests.
- **Real app or synthetic?** (should all be real app)
- **Test classifications:**
  | Test Name | Label | Rationale |
  |-----------|-------|-----------|
  | ... | E2E-KEEP / UNIT-MIGRATE / etc. | Why |
- **Grouping notes:** Does this file's scope make sense? What would you merge/split?

### Migration Candidates (detailed)
For each UNIT-MIGRATE or INTEGRATION-MIGRATE test:
- Current location (file:test name)
- What it actually tests (the engine behavior)
- Why it doesn't need a browser
- Suggested target (engine unit test file/describe block)

### Grouping Recommendations
- Which of the 8 files should be merged?
- Which tests are in the wrong file?
- Proposed restructured file layout for grant-app E2E tests.

### Screenshots
[Screenshots of representative migration candidate test code]
```

---

## Agent B — Component & Synthetic Fixture Tests (Sonnet)

**Model:** Sonnet
**Role:** Review the component test files. These are the most likely migration candidates since many use synthetic inline definitions. Your job is to determine which truly need Playwright (real rendering, interaction) vs which are component unit tests that could run in jsdom or Node.

**Files to review (8 files):**
```
tests/e2e/playwright/components/accessibility-responsive-custom-components.spec.ts
tests/e2e/playwright/components/component-gap-coverage.spec.ts
tests/e2e/playwright/components/component-tree-engine-alignment.spec.ts
tests/e2e/playwright/components/component-tree-rendering.spec.ts
tests/e2e/playwright/components/core-component-props-and-fixes.spec.ts
tests/e2e/playwright/components/grant-app-component-props.spec.ts
tests/e2e/playwright/components/progressive-component-rendering.spec.ts
tests/e2e/playwright/components/remote-options-binding.spec.ts
```

**Also read for context:**
```
tests/e2e/playwright/helpers/harness.ts
tests/e2e/playwright/helpers/grant-app.ts
```

**Instructions:**

1. Read each test file completely. For every `test()` block, classify it.
2. Key pattern to watch for: `page.evaluate(() => { el.definition = {...}; el.componentDocument = {...}; })` — this constructs synthetic fixtures inline. The test is not exercising a real app, it's testing a component in isolation. This is almost always COMPONENT-MIGRATE.
3. Exception: if the test then does real user interaction (clicks, keyboard, focus management) and asserts on browser-specific behavior (scroll position, viewport, accessibility tree), it may legitimately need Playwright.
4. For `grant-app-component-props.spec.ts`: does it actually test user-facing component behavior, or is it checking internal prop wiring? Is it testing core component capabilities or grant-app-specific configurations?
5. For `accessibility-responsive-custom-components.spec.ts`: accessibility tests may genuinely need a browser for ARIA tree validation. Evaluate carefully.
6. **Core vs example distinction:** Synthetic fixture tests that test a core component capability (e.g., "NumberInput respects precision prop") are legitimate component tests — they just belong in the webcomponent package, not in E2E. Tests that verify a specific grant-app field renders a specific way are testing the example, not the package.
6. Take screenshots of synthetic fixture construction patterns and the assertions that follow them.
7. For each COMPONENT-MIGRATE candidate, note what test infrastructure would be needed in `packages/formspec-webcomponent/` (does it have a test setup today?).

**Output format:**

```markdown
## Agent B Results: Component & Synthetic Fixture Tests

### File-by-File Classification

#### [filename]
- **Summary:** One sentence.
- **Real app or synthetic?**
- **Synthetic fixture count:** How many tests construct inline definitions?
- **Test classifications:**
  | Test Name | Label | Rationale |
  |-----------|-------|-----------|
- **Grouping notes:**

### Migration Candidates (detailed)
For each COMPONENT-MIGRATE or INTEGRATION-MIGRATE test:
- What component/behavior it tests
- Why it doesn't need Playwright
- Suggested test approach in packages/formspec-webcomponent/ (jsdom? vitest? what assertions?)

### Tests That Legitimately Need a Browser
List any component tests that genuinely require Playwright, with justification.

### Infrastructure Needs
- Does `packages/formspec-webcomponent/` have an existing test setup?
- What would be needed to run component tests there? (vitest config, jsdom setup, test utilities)

### Screenshots
[Screenshots of synthetic fixture patterns and their assertions]
```

---

## Agent C — Non-Grant-App Integration & Specialty Tests (Sonnet)

**Model:** Sonnet
**Role:** Review the remaining test files — kitchen-sink conformance, schema parity, screener routing, and other specialty tests. These are a mixed bag and likely contain the most candidates for migration.

**Files to review (9 files):**
```
tests/e2e/playwright/smoke/kitchen-sink-smoke.spec.ts
tests/e2e/playwright/integration/edge-case-behaviors.spec.ts
tests/e2e/playwright/integration/fel-standard-library-ui.spec.ts
tests/e2e/playwright/integration/kitchen-sink-holistic-conformance.spec.ts
tests/e2e/playwright/integration/nested-repeats-and-calculations.spec.ts
tests/e2e/playwright/integration/renderer-parity-gaps.spec.ts
tests/e2e/playwright/integration/schema-parity-phase1.spec.ts
tests/e2e/playwright/integration/screener-routing.spec.ts
tests/e2e/playwright/integration/writable-instances.spec.ts
```

**Also read for context:**
```
tests/e2e/playwright/helpers/harness.ts
tests/e2e/playwright/helpers/conformance.ts
tests/e2e/fixtures/
```

**Instructions:**

1. Read each test file completely. For every `test()` block, classify it.
2. `schema-parity-phase1.spec.ts` (798 lines) is the largest file — scrutinize it heavily. "Schema parity" sounds like it belongs in the Python conformance suite or engine unit tests, not E2E.
3. `kitchen-sink-holistic-conformance.spec.ts` (678 lines) — what is it actually testing? TypeScript ↔ Python FEL parity can be tested without a browser.
4. `fel-standard-library-ui.spec.ts` — is this testing FEL functions (unit test) or testing that FEL results display correctly in the UI (E2E)?
5. `screener-routing.spec.ts` — conditional form routing could be pure engine logic or could involve real page navigation. Determine which. Is it testing the engine's routing capability or just verifying one specific screener configuration works?
6. `renderer-parity-gaps.spec.ts` — "parity gaps" sounds like an audit, not a test. Evaluate if this is useful or should be deleted.
7. **Core vs example for all files:** Many of these specialty tests may be testing specific fixture configurations rather than core capabilities. For each test, ask: "If I replaced the fixture/definition with a completely different form, would this test still be meaningful? Or would it need to be rewritten from scratch?" If the latter, the test is coupled to the fixture, not testing the package.
8. Take screenshots of the largest/most complex test files to show the testing patterns used.
9. For the kitchen-sink fixture set (`tests/e2e/fixtures/`), note whether these fixtures represent realistic forms or synthetic test constructions.

**Output format:**

```markdown
## Agent C Results: Specialty & Non-Grant-App Tests

### File-by-File Classification

#### [filename]
- **Summary:** One sentence.
- **Real app, fixture, or synthetic?**
- **Test classifications:**
  | Test Name | Label | Rationale |
  |-----------|-------|-----------|
- **Grouping notes:**

### High-Priority Migration Candidates
Tests in this batch that are most clearly in the wrong layer, ordered by confidence.

### Questionable Tests
Tests whose value is unclear — they may be testing implementation details that no one would notice if they broke.

### Fixture Assessment
- Are the kitchen-sink fixtures realistic form scenarios?
- Should any fixtures be promoted to `examples/` as real apps?
- Should any fixtures be moved to engine/webcomponent package test directories?

### Screenshots
[Screenshots of the most egregious misplaced-layer tests]
```

---

## Agent D — Synthesis & Migration Plan (Opus)

**Model:** Opus
**Role:** You are the synthesis agent. You receive the results from Agents A, B, and C and produce the final review report with a concrete, actionable migration plan.

**Depends on:** Agents A, B, C (wait for all three to complete).

**Inputs:** The full output from Agents A, B, and C (provided in your prompt).

**Instructions:**

1. **Merge classifications** into a single master table of all 25 files and every test block. Resolve any disagreements or edge cases.

2. **Produce summary statistics:**
   - Total test blocks reviewed
   - Count and % by classification (E2E-KEEP, UNIT-MIGRATE, INTEGRATION-MIGRATE, COMPONENT-MIGRATE, MERGE, DELETE)
   - Count by data source (real app, fixture, synthetic inline)

3. **Answer the key questions:**
   - What percentage of E2E tests actually require a browser?
   - How many tests use synthetic fixtures vs the real grant app?
   - Which tests are just calling engine methods through the browser?
   - How many tests are testing core package capabilities vs grant-app/fixture-specific configurations?
   - Is the current file grouping serving readability?
   - Are there duplicate assertions across files?
   - What's the minimal set of E2E tests that gives high confidence?

4. **Design the target state:**

   Propose the final file structure for ALL test layers:

   ```
   packages/formspec-engine/tests/          # Unit tests (new)
   packages/formspec-webcomponent/tests/     # Component tests (new or expanded)
   tests/integration/                        # Integration tests (new)
   tests/e2e/playwright/                     # Remaining true E2E tests (slimmed down)
   ```

   For each directory, list the files and what they contain.

5. **Produce the migration backlog** — ordered by priority (highest-value migrations first):

   For each migration item:
   | # | Source File(s) | Test Count | Target | Effort | Infrastructure Needed | Risk if Deferred |
   |---|---------------|-----------|--------|--------|----------------------|-----------------|

6. **Infrastructure requirements:**
   - What test setup is needed in `packages/formspec-engine/`? (vitest? mocha? test utilities?)
   - What test setup is needed in `packages/formspec-webcomponent/`? (jsdom? custom mount helpers?)
   - What about `tests/integration/`? (full engine instantiation helpers, definition loaders)

7. **Proposed E2E restructuring:**
   - New file names and grouping rationale
   - Which existing tests merge into which new files
   - Which tests move between files

8. **Final recommendations** — the top 3-5 actions to take first, with clear justification.

**Output format:**

```markdown
## E2E Test Suite Review — Final Report

### Executive Summary
[2-3 sentences: what we found, what the main problem is, what to do about it]

### Classification Summary
| Label | Count | % | Description |
|-------|-------|---|-------------|

### Master Classification Table
[All 25 files, all test blocks, with labels]

### Key Findings
[Answers to the 6 key questions]

### Target State
[Proposed file structure for all test layers]

### Migration Backlog
[Priority-ordered table]

### Infrastructure Requirements
[What needs to be set up before migrations can happen]

### E2E Restructuring
[New grouping, file names, merge/split plan]

### Top Actions
1. ...
2. ...
3. ...
```

---

## Dispatch Summary

| Agent | Model | Files | Focus | Depends On |
|-------|-------|-------|-------|------------|
| A | Sonnet | 8 grant-app integration tests | Real app E2E validation | — |
| B | Sonnet | 8 component tests | Synthetic fixture migration | — |
| C | Sonnet | 9 specialty/other tests | Mixed-bag triage | — |
| D | Opus | All agent outputs | Synthesis + migration plan | A, B, C |

**A, B, C run in parallel. D runs after all three complete.**

Total estimated agent turns: A(~15), B(~15), C(~15), D(~10) = ~55 turns.
