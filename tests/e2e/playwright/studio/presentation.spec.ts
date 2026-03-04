import { test, expect } from '@playwright/test';
import { gotoStudio, selectTreeNode, propertyInput } from './helpers';

function propertyRow(page: import('@playwright/test').Page, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return page
    .locator('.property-row')
    .filter({ has: page.locator('.property-label', { hasText: new RegExp(`^${escaped}`) }) });
}

async function selectRoot(page: import('@playwright/test').Page) {
  await page.locator('[role="treeitem"][aria-level="1"]').click();
  await page.waitForTimeout(100);
}

async function selectFirstField(page: import('@playwright/test').Page) {
  await page.locator('[role="treeitem"][aria-level="3"]').first().click();
  await page.waitForTimeout(100);
}

test.describe('Studio: Presentation Editing', () => {
  test.beforeEach(async ({ page }) => {
    await gotoStudio(page);
  });

  test('enable theme shows token and selector editors in root properties', async ({ page }) => {
    await selectRoot(page);
    await page.getByRole('button', { name: 'Enable Theme' }).click();
    await page.waitForTimeout(100);

    await expect(page.locator('.section-title', { hasText: 'Theme Tokens' })).toBeVisible();
    await expect(page.locator('.section-title', { hasText: 'Theme Selectors' })).toBeVisible();
  });

  test('enable component generates a baseline component tree', async ({ page }) => {
    await selectRoot(page);
    await page.getByRole('button', { name: 'Enable Component' }).click();
    await page.waitForTimeout(100);

    // Verify component JSON has populated tree
    const compJsonRow = propertyRow(page, 'Component JSON');
    const textarea = compJsonRow.locator('textarea');
    const text = await textarea.inputValue();
    const parsed = JSON.parse(text);
    expect(parsed.tree).toBeTruthy();
    expect(parsed.tree.component).toBeTruthy();
    expect(parsed.tree.children.length).toBeGreaterThan(0);
  });

  test('selecting a field shows effective widget with source badge', async ({ page }) => {
    await selectFirstField(page);

    const effectiveRow = propertyRow(page, 'Effective Widget');
    await expect(effectiveRow).toBeVisible();
    const sourceBadge = effectiveRow.locator('.effective-widget-source');
    await expect(sourceBadge).toBeVisible();
    await expect(sourceBadge).toHaveText('renderer-default');
  });

  test('setting theme widget override updates effective widget', async ({ page }) => {
    // Enable theme first via root
    await selectRoot(page);
    await page.getByRole('button', { name: 'Enable Theme' }).click();
    await page.waitForTimeout(50);

    // Select first field
    await selectFirstField(page);

    // Set theme widget override
    const themeSelect = propertyRow(page, 'Theme Widget Override').locator('select');
    await themeSelect.selectOption('Textarea');
    await page.waitForTimeout(100);

    // Effective widget should update
    const effectiveRow = propertyRow(page, 'Effective Widget');
    await expect(effectiveRow).toContainText('Textarea');
    const sourceBadge = effectiveRow.locator('.effective-widget-source');
    await expect(sourceBadge).toHaveText('theme');
  });

  test('component widget override appears when component is enabled', async ({ page }) => {
    // Enable component via root
    await selectRoot(page);
    await page.getByRole('button', { name: 'Enable Component' }).click();
    await page.waitForTimeout(50);

    // Select a field
    await selectFirstField(page);

    const compRow = propertyRow(page, 'Component Widget');
    await expect(compRow).toBeVisible();
  });

  test('disabling theme falls back to renderer-default', async ({ page }) => {
    // Enable theme, set override
    await selectRoot(page);
    await page.getByRole('button', { name: 'Enable Theme' }).click();
    await page.waitForTimeout(50);

    await selectFirstField(page);
    const themeSelect = propertyRow(page, 'Theme Widget Override').locator('select');
    await themeSelect.selectOption('Textarea');
    await page.waitForTimeout(100);

    // Verify theme source
    let sourceBadge = propertyRow(page, 'Effective Widget').locator('.effective-widget-source');
    await expect(sourceBadge).toHaveText('theme');

    // Disable theme via root
    await selectRoot(page);
    await page.getByRole('button', { name: 'Disable Theme' }).click();
    await page.waitForTimeout(50);

    // Select field again
    await selectFirstField(page);

    // Should fall back
    sourceBadge = propertyRow(page, 'Effective Widget').locator('.effective-widget-source');
    await expect(sourceBadge).toHaveText('renderer-default');
  });

  test('numeric constraint sets min in definition binds', async ({ page }) => {
    // Select first field and change dataType to integer
    await selectFirstField(page);
    const dataTypeSelect = propertyInput(page, 'Data Type');
    await dataTypeSelect.selectOption('integer');
    await page.waitForTimeout(100);

    // Min input should now be visible
    const minInput = propertyInput(page, 'Min');
    await expect(minInput).toBeVisible();
    await minInput.fill('5');
    await page.waitForTimeout(200);

    // Switch to JSON mode
    await page.getByRole('button', { name: 'JSON' }).click();
    await page.waitForTimeout(200);

    // Check definition JSON contains the constraint
    const jsonContent = await page.evaluate(() => {
      const textarea = document.querySelector('.json-editor textarea') as HTMLTextAreaElement;
      return textarea?.value ?? '';
    });
    expect(jsonContent).toContain('>= 5');
  });
});
