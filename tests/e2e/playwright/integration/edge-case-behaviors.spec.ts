import { test, expect } from '@playwright/test';
import {
  mountGrantApplication,
  engineSetValue,
  engineValue,
  addRepeatInstance,
} from '../helpers/grant-app';

test.describe('Integration: Numeric and Dependency Edge Behaviors', () => {
  test.beforeEach(async ({ page }) => {
    await mountGrantApplication(page);
  });

  test('should keep calculation behavior stable when multiplying unitCost by an empty quantity', async ({ page }) => {
    // Ensure a line item exists
    await addRepeatInstance(page, 'budget.lineItems');
    await page.waitForTimeout(50);

    // Set only unitCost — leave quantity empty (null/undefined)
    await engineSetValue(page, 'budget.lineItems[0].unitCost', 99.99);
    // Do not set quantity — it remains null/undefined
    await page.waitForTimeout(100);

    const subtotal = await engineValue(page, 'budget.lineItems[0].subtotal');

    // Stability assertion: result must not be NaN regardless of coercion policy
    expect(subtotal === null || subtotal === 0 || subtotal === undefined).toBe(true);
    if (subtotal !== null && subtotal !== undefined) {
      expect(Number.isNaN(subtotal)).toBe(false);
    }
  });
});
