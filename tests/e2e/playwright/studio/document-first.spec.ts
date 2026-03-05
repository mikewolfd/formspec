import { expect, test } from '@playwright/test';
import { STUDIO_URL } from './helpers';

test.describe('Formspec Studio - Document First', () => {
  test('adds fields with slash menu, edits inline, and shows required badge', async ({ page }) => {
    await page.goto(STUDIO_URL);

    // Start from blank template
    await page.getByText('Blank Form').click();

    await expect(page.locator('.document-editor')).toBeVisible();
    await expect(page.locator('.document-empty-prompt')).toContainText('Type / to add a field');

    const slashInput = page.locator('.document-slash-input');
    await slashInput.fill('/email');
    await page.keyboard.press('Enter');

    const fieldCard = page.locator('.doc-field-card').first();
    await expect(fieldCard).toBeVisible();

    const labelInput = fieldCard.locator('.doc-field-label-input');
    await labelInput.fill('Work Email');
    await expect(labelInput).toHaveValue('Work Email');

    const descInput = fieldCard.locator('.doc-field-description-input');
    await descInput.fill('Use your agency address');
    await expect(descInput).toHaveValue('Use your agency address');

    const requiredToggle = fieldCard.getByRole('switch', { name: 'Required' });
    await requiredToggle.click();

    await expect(fieldCard.locator('.doc-logic-badges')).toContainText('●');
  });
});
