import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const fixturePath = path.resolve(__dirname, '../fixtures/static-validation.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

test.describe('Formspec Static Validation', () => {
  test('regex pattern validation', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/');
    await page.waitForSelector('formspec-render', { state: 'attached' });

    await page.evaluate((data) => {
      const renderer: any = document.querySelector('formspec-render');
      renderer.definition = data;
    }, fixture);

    const zipInput = page.locator('input[name="zipCode"]');
    const zipWrapper = page.locator('.form-field[data-name="zipCode"]');
    const errorDisplay = zipWrapper.locator('.error-message');

    // Initial state: empty string doesn't match ^[0-9]{5}$
    await expect(errorDisplay).toHaveText('Pattern mismatch');

    await zipInput.fill('123');
    await expect(errorDisplay).toHaveText('Pattern mismatch');

    await zipInput.fill('12345');
    await expect(errorDisplay).toHaveText('');

    await zipInput.fill('123456');
    await expect(errorDisplay).toHaveText('Pattern mismatch');

    await zipInput.fill('abcde');
    await expect(errorDisplay).toHaveText('Pattern mismatch');
  });
});
