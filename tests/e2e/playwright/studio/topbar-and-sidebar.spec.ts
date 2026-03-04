import { expect, test } from '@playwright/test';
import { gotoStudio, propertyInput } from './helpers';

test.describe('Formspec Studio - Topbar', () => {
  test.beforeEach(async ({ page }) => {
    await gotoStudio(page);
  });

  test('edits form title and updates topbar metadata from root properties', async ({ page }) => {
    const titleInput = page.getByLabel('Form title');
    await titleInput.fill('Grant Intake');
    await expect(titleInput).toHaveValue('Grant Intake');

    await page.locator('.tree-header').click();
    await propertyInput(page, 'Version').fill('2.1.0');
    await propertyInput(page, 'Status').selectOption('active');

    const meta = page.locator('.topbar-meta');
    await expect(meta).toContainText('v2.1.0');
    await expect(meta).toContainText('active');
  });

  test('export definition triggers download toast', async ({ page }) => {
    await page.getByRole('button', { name: 'Export definition' }).click();
    await expect(page.locator('.toast')).toContainText('Definition exported');
  });

  test('toggles between guided and JSON modes for definition', async ({ page }) => {
    await page.getByRole('button', { name: 'JSON' }).click();
    await expect(page.locator('.json-editor-textarea')).toBeVisible();

    await page.getByRole('button', { name: 'Guided' }).click();
    await expect(page.locator('.tree-editor')).toBeVisible();
  });
});
