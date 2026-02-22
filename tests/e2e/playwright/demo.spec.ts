import { test, expect } from '@playwright/test';

test('Kitchen Sink Demo Site loads and functions', async ({ page }) => {
  await page.goto('http://127.0.0.1:8080/');
  
  // Wait for Wizard (Step 1)
  await expect(page.locator('h2', { hasText: 'Basic Information' })).toBeVisible({ timeout: 15000 });
  
  await page.fill('input[name="userName"]', 'Shelley Agent');
  await page.locator('input[name="showAdvanced"]').check();
  await expect(page.locator('.formspec-alert')).toBeVisible();
  
  await page.click('button:has-text("Next")');
  await expect(page.locator('h2', { hasText: 'Inventory Management' })).toBeVisible();

  await page.fill('input[name="inventory[0].price"]', '100');
  await page.fill('input[name="inventory[0].quantity"]', '2');
  await expect(page.locator('dd')).toHaveText('200');

  await page.click('button:has-text("Next")');
  await expect(page.locator('h2', { hasText: 'Financials & Schedule' })).toBeVisible();

  await page.click('button:has-text("Dates")');
  await expect(page.locator('input[name="startDate"]')).toBeVisible();

  await page.click('button:has-text("Submit")');
  
  const output = page.locator('#output');
  await expect(output).toContainText('"userName": "Shelley Agent"');
  await expect(output).toContainText('"grandTotal": 200');
});
