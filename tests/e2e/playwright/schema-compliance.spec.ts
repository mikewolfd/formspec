import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const fixturePath = path.resolve(__dirname, '../fixtures/shopping-cart.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

test('Response should comply with basic response schema requirements', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/');
    await page.waitForSelector('formspec-render', { state: 'attached' });

    await page.evaluate((data) => {
      const renderer: any = document.querySelector('formspec-render');
      renderer.definition = data;
    }, fixture);

    const response: any = await page.evaluate(() => {
        return new Promise((resolve) => {
            document.addEventListener('formspec-submit', (e: any) => resolve(e.detail), { once: true });
            const buttons = Array.from(document.querySelectorAll('button'));
            const submitBtn = buttons.find(b => b.textContent === 'Submit');
            submitBtn?.click();
        });
    });

    expect(response).toHaveProperty('definitionUrl');
    expect(response).toHaveProperty('definitionVersion');
    expect(response).toHaveProperty('status');
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('authored');
    
    expect(typeof response.definitionUrl).toBe('string');
    expect(typeof response.authored).toBe('string');
    expect(new Date(response.authored).toString()).not.toBe('Invalid Date');
});
