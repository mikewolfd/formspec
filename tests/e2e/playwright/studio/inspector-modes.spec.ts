import { expect, test } from '@playwright/test';
import { STUDIO_URL } from './helpers';

test.describe('Formspec Studio - Inspector Modes', () => {
  test('supports simple/advanced mode and collapsed section summaries', async ({ page }) => {
    await page.goto(STUDIO_URL);
    await page.getByText('Blank Form').click();

    const slashInput = page.locator('.document-slash-input');
    await slashInput.fill('/yes');
    await page.keyboard.press('Enter');
    await page.locator('.document-slash-input').fill('/short');
    await page.keyboard.press('Enter');

    const secondField = page.locator('.doc-field-card').nth(1);
    await secondField.click();

    await expect(page.locator('.inspector-mode-toggle')).toBeVisible();
    await expect(page.locator('.inspector-mode-btn.active')).toContainText('Simple');

    const logicSection = page.locator('.inspector-section[data-section="logic"]');
    await logicSection.locator('.inspector-section-toggle').click();

    const showWhenRow = page
      .locator('.property-row')
      .filter({ has: page.locator('.property-label', { hasText: 'Show when' }) });
    await showWhenRow.getByRole('button', { name: 'Add condition' }).click();
    await showWhenRow.locator('.logic-builder-value').fill('true');

    await logicSection.locator('.inspector-section-toggle').click();
    await expect(logicSection.locator('.inspector-section-summary')).toContainText('Show when');

    await page.locator('.inspector-mode-btn', { hasText: 'Advanced' }).click();
    await expect(page.locator('.inspector-mode-btn.active')).toContainText('Advanced');

    await logicSection.locator('.inspector-section-toggle').click();
    await expect(page.locator('.property-label', { hasText: 'Read Only (FEL)' })).toBeVisible();
  });
});
