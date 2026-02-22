import { test, expect } from '@playwright/test';

test('Milestone 4: Tier 3 Alignment - Component Tree and State', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  await page.goto('http://localhost:8080/index.html');
  await page.waitForSelector('formspec-render');

  await page.evaluate(() => {
    const definition = {
      "$formspec": "1.0",
      "url": "http://example.org/test",
      "version": "1.0.0",
      "title": "Test Form",
      "items": [
        { "key": "user_email", "type": "field", "dataType": "string", "label": "Email Address" },
        { "key": "user_name", "type": "field", "dataType": "string", "label": "Full Name" }
      ]
    };
    
    const componentDoc = {
      "$formspecComponent": "1.0",
      "version": "1.0.0",
      "targetDefinition": { "url": "http://example.org/test" },
      "tree": {
        "component": "Stack",
        "children": [
          { "component": "Heading", "level": 1, "text": "Contact Info" },
          { "component": "TextInput", "bind": "user_email", "labelOverride": "E-mail" },
          { "component": "Text", "bind": "user_email" }
        ]
      }
    };

    const render = document.querySelector('formspec-render') as any;
    render.definition = definition;
    render.componentDocument = componentDoc;
  });

  // Assert DOM structure matches Component tree
  await expect(page.locator('h1')).toHaveText('Contact Info');
  await expect(page.locator('label').first()).toHaveText('E-mail');
  
  // Assert state management is driven by Tier 1 Engine
  await page.fill('input[name="user_email"]', 'test@example.com');
  
  // The 'Text' component bound to 'user_email' should update
  await expect(page.locator('p').first()).toHaveText('test@example.com');

  const response = await page.evaluate(() => {
    const render = document.querySelector('formspec-render') as any;
    return render.getEngine().getResponse();
  });
  expect(response.data.user_email).toBe('test@example.com');
});
