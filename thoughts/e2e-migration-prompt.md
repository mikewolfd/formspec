# E2E Test Migration

You are migrating Playwright E2E tests to their correct test layers (engine unit tests, webcomponent unit tests) and restructuring the remaining genuine E2E tests.

## First: Read Your State

Before doing ANYTHING, read these two files:
1. `thoughts/e2e-migration-tracker.md` — phases, tasks, and current state
2. `thoughts/e2e-test-review-report.md` — the full review with per-test classifications and rationale

## How This Works

You work **one phase at a time**. Each time you are invoked:

1. **Read the tracker.** Look at the "Current Phase" field at the top to find which phase you're on.
2. **Work through every task in that phase**, in order, checking each off as you go.
3. **When all tasks in the phase are done**, run the phase's verification gate (listed at the bottom of each phase section).
4. **If verification passes**: update the tracker — check off the gate, set "Current Phase" to the next phase, commit with the phase's commit message.
5. **If verification fails**: DO NOT advance. Fix the failures. Re-run verification. Only advance when green.
6. **After committing**, output exactly: `Phase N complete.` and stop. You will be re-invoked for the next phase.

DO NOT work on tasks from future phases. ONE phase per invocation. Complete it fully, verify it, commit it.

## Phase Definitions

The tracker (`thoughts/e2e-migration-tracker.md`) contains 7 phases (0-6). Each phase has:
- A list of tasks with checkboxes
- A verification gate (test commands that must pass)
- A commit message to use

Work through phases sequentially. Phase 0 must be done before Phase 1, etc.

## Migration Patterns

### Engine tests (Phases 0-3)

Playwright tests use helpers that wrap `page.evaluate()`. The migration strips the browser layer:

**Before (Playwright):**
```typescript
test('should aggregate subtotals into @totalDirect variable', async ({ page }) => {
  await mountGrantApplication(page);
  await engineSetValue(page, 'lineItems[0].category', 'Travel');
  await engineSetValue(page, 'lineItems[0].quantity', 2);
  await engineSetValue(page, 'lineItems[0].unitCost', 500);
  const total = await engineVariable(page, 'totalDirect');
  expect(total).toEqual({ amount: 1000, currency: 'USD' });
});
```

**After (engine unit test):**
```javascript
test('should aggregate subtotals into @totalDirect variable', () => {
  const engine = createGrantEngine();
  engine.setValue('lineItems[0].category', 'Travel');
  engine.setValue('lineItems[0].quantity', 2);
  engine.setValue('lineItems[0].unitCost', 500);
  const total = engine.variableSignals['#:totalDirect'].value;
  assert.deepEqual(total, { amount: 1000, currency: 'USD' });
});
```

Follow existing engine test conventions — see `packages/formspec-engine/tests/bind-behaviors.test.mjs`:
```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { FormEngine } from '../dist/index.js';
```

Assertion mapping: `expect(x).toEqual(y)` → `assert.deepEqual(x, y)` for objects/arrays, `assert.equal(x, y)` for primitives, `assert.strictEqual` for identity.

### Grant-app fixture helper (created in Phase 0)

```javascript
// packages/formspec-engine/tests/helpers/grant-app.mjs
import { readFileSync } from 'node:fs';
import { FormEngine } from '../../dist/index.js';

const definition = JSON.parse(
  readFileSync(new URL('../fixtures/grant-app-definition.json', import.meta.url), 'utf8')
);

export function createGrantEngine() {
  const engine = new FormEngine(definition);
  engine.skipScreener();  // E2E tests called skipScreener() in mountGrantApplication
  return engine;
}

export function engineValue(engine, path) {
  return engine.signals[path]?.value;
}

export function engineVariable(engine, name) {
  return engine.variableSignals[`#:${name}`]?.value;
}

export function getValidationReport(engine, mode) {
  return engine.getValidationReport({ mode });
}

export function getResponse(engine) {
  return engine.getResponse();
}

export function addRepeatInstance(engine, name) {
  return engine.addRepeatInstance(name);
}

export function removeRepeatInstance(engine, name, index) {
  return engine.removeRepeatInstance(name, index);
}
```

**Signal access mapping** (many tests check these directly):
```
engine.relevantSignals[path]?.value   — field visibility (true/false)
engine.readonlySignals[path]?.value   — field readonly state
engine.requiredSignals[path]?.value   — field required state
engine.repeats[name]?.value           — repeat instance count
engine.structureVersion.value         — increments on repeat add/remove
```

If `engine.skipScreener` doesn't exist, check what the Playwright helper (`tests/e2e/playwright/helpers/grant-app.ts`) does and replicate that setup.

### Webcomponent tests (Phase 4)

Follow existing conventions — see `packages/formspec-webcomponent/tests/input-rendering.test.ts`:
```typescript
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { singleFieldDef, minimalComponentDoc, minimalTheme } from './helpers/engine-fixtures';
```

Uses `happy-dom` (configured in vitest.config.ts). `getComputedStyle` assertions CANNOT work in happy-dom — those tests must stay in Playwright.

**Before (Playwright — synthetic fixture):**
```typescript
test('should apply min max and step attributes when rendering NumberInput', async ({ page }) => {
  await page.evaluate(() => {
    const el = document.querySelector('formspec-render');
    el.definition = { /* inline definition with NumberInput */ };
    el.componentDocument = { /* inline component doc */ };
  });
  const input = page.locator('[data-name="quantity"] input');
  await expect(input).toHaveAttribute('min', '0');
  await expect(input).toHaveAttribute('max', '100');
  await expect(input).toHaveAttribute('step', '1');
});
```

**After (vitest + happy-dom):**
```typescript
it('should apply min max and step attributes when rendering NumberInput', () => {
  const el = renderField({ key: 'quantity', dataType: 'integer' }, [
    { type: 'NumberInput', bind: 'quantity', props: { min: 0, max: 100, step: 1 } }
  ]);
  const input = el.querySelector('input[type="number"]');
  expect(input?.getAttribute('min')).toBe('0');
  expect(input?.getAttribute('max')).toBe('100');
  expect(input?.getAttribute('step')).toBe('1');
});
```

Adapt the `renderField` helper from `input-rendering.test.ts` to match the component being tested.

### Build and test commands

Engine tests import from `../dist/index.js`. Always build first:
```bash
# Engine unit tests (builds automatically)
npm run test:unit --workspace=packages/formspec-engine

# Webcomponent unit tests (vitest + happy-dom)
npx vitest run --config packages/formspec-webcomponent/vitest.config.ts

# Playwright E2E
npx playwright test

# All three (use for phase gates)
npm run build && npm run test:unit --workspace=packages/formspec-engine && npx vitest run --config packages/formspec-webcomponent/vitest.config.ts && npx playwright test
```

## Rules

- **Do NOT modify engine or webcomponent source code.** Test migration only.
- **Port test assertions faithfully.** If the original asserted `=== null`, your migration asserts `=== null`.
- **Do NOT delete a Playwright file that still contains E2E-KEEP tests.** Only remove the migrated tests from it.
- **Do NOT skip verification.** Every phase commit requires green tests.
- **One commit per phase.** Use the exact commit message from the tracker.

## Emergency Stop

If you hit a systemic blocker (fixture doesn't load, `skipScreener` doesn't exist, engine behavior differs from Playwright), add a `## BLOCKED` section to the tracker with details and stop. Do not work around fundamental issues.

## Completion

When ALL phases are complete and all test suites pass, output:

<promise>E2E MIGRATION COMPLETE</promise>
