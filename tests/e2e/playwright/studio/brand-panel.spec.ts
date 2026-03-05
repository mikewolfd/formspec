import { expect, test } from '@playwright/test';
import { STUDIO_URL, propertyInput } from './helpers';

test.describe('Formspec Studio - Brand Panel', () => {
  test('edits brand tokens from form root inspector', async ({ page }) => {
    await page.goto(STUDIO_URL);
    await page.getByText('Blank Form').click();

    await page.getByRole('button', { name: 'Toggle structure panel' }).click();
    await page.locator('.tree-header').click();
    await expect(page.locator('.property-type-header')).toContainText('Form Root');

    await propertyInput(page, 'Primary').fill('#1a73e8');
    await propertyInput(page, 'Secondary').fill('#f5f5f5');
    await propertyInput(page, 'Error').fill('#d93025');
    await propertyInput(page, 'Font').fill('Public Sans');

    await expect(propertyInput(page, 'Primary')).toHaveValue('#1a73e8');
    await expect(propertyInput(page, 'Font')).toHaveValue('Public Sans');
  });
});
