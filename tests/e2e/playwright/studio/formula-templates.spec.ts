import { expect, test } from '@playwright/test';
import { STUDIO_URL } from './helpers';

test.describe('Formspec Studio - Formula Templates', () => {
  test('applies sum template to calculate bind', async ({ page }) => {
    await page.goto(STUDIO_URL);
    await page.getByText('Blank Form').click();

    const slashInput = page.locator('.document-slash-input');
    await slashInput.fill('/number');
    await page.keyboard.press('Enter');

    await page.locator('.document-slash-input').fill('/number');
    await page.keyboard.press('Enter');

    const secondField = page.locator('.doc-field-card').nth(1);
    await secondField.click();

    const logicSection = page.locator('.inspector-section[data-section="logic"]');
    await logicSection.locator('.inspector-section-toggle').click();

    const formulaRow = page
      .locator('.property-row')
      .filter({ has: page.locator('.property-label', { hasText: 'Calculate Template' }) });

    await formulaRow.locator('.logic-builder-field').selectOption('number');
    await formulaRow.getByRole('button', { name: 'Sum' }).click();

    await expect(secondField.locator('.doc-logic-badges')).toContainText('=');

    await page.getByRole('button', { name: 'Toggle structure panel' }).click();
    await page.getByRole('button', { name: 'JSON' }).click();

    const json = await page.locator('.json-editor-textarea').inputValue();
    expect(json).toContain('"calculate": "sum($number)"');
  });
});
