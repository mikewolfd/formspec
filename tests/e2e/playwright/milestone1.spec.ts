import { test, expect } from '@playwright/test';

test('Milestone 1: Relevancy Pruning in getResponse', async ({ page }) => {
  await page.goto('http://localhost:8080/index.html');
  
  await page.evaluate(() => {
    const definition = {
      "$formspec": "1.0",
      "url": "http://example.org/test",
      "version": "1.0.0",
      "title": "Test Form",
      "items": [
        { "key": "show", "type": "field", "dataType": "boolean", "label": "Show" },
        { "key": "hiddenField", "type": "field", "dataType": "string", "label": "Hidden", "initialValue": "Secret" }
      ],
      "binds": [
        { "target": "hiddenField", "relevant": "show == true" }
      ]
    };
    const render = document.querySelector('formspec-render') as any;
    render.definition = definition;
  });

  const render = page.locator('formspec-render');
  await expect(page.locator('input[name="hiddenField"]')).not.toBeVisible();

  await page.check('input[name="show"]');
  await expect(page.locator('input[name="hiddenField"]')).toBeVisible();

  let response = await page.evaluate(() => {
    const render = document.querySelector('formspec-render') as any;
    return render.getEngine().getResponse();
  });
  expect(response.data.hiddenField).toBe("Secret");

  await page.uncheck('input[name="show"]');
  await expect(page.locator('input[name="hiddenField"]')).not.toBeVisible();

  response = await page.evaluate(() => {
    const render = document.querySelector('formspec-render') as any;
    return render.getEngine().getResponse();
  });
  expect(response.data.hiddenField).toBeUndefined();
});
