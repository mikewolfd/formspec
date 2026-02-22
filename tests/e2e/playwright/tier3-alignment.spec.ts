import { test, expect } from '@playwright/test';

const definition = {
  "$formspec": "1.0",
  "url": "http://example.org/tier3-test",
  "version": "1.0.0",
  "title": "Tier 3 Alignment Test",
  "items": [
    {
      "type": "field",
      "dataType": "string",
      "key": "user_email",
      "label": "Email Address",
      "required": true
    },
    {
      "type": "field",
      "dataType": "string",
      "key": "user_name",
      "label": "Full Name"
    },
    {
      "type": "field",
      "dataType": "string",
      "key": "user_phone",
      "label": "Phone Number",
      "relevant": "false"
    }
  ]
};

const componentDocument = {
  "$formspecComponent": "1.0",
  "version": "1.0.0",
  "targetDefinition": {
    "url": "http://example.org/tier3-test"
  },
  "tree": {
    "component": "Page",
    "id": "root-page",
    "title": "Welcome",
    "children": [
      {
        "component": "Stack",
        "id": "main-stack",
        "direction": "vertical",
        "gap": "20px",
        "children": [
          {
            "component": "Heading",
            "level": 1,
            "text": "User Profile"
          },
          {
            "component": "TextInput",
            "id": "email-input",
            "bind": "user_email",
            "placeholder": "enter email"
          },
          {
            "component": "TextInput",
            "id": "name-input",
            "bind": "user_name"
          },
          {
            "component": "TextInput",
            "id": "phone-input",
            "bind": "user_phone"
          }
        ]
      }
    ]
  }
};

test.describe('Tier 3 Alignment Verification', () => {
  test('renders Tier 3 tree driven by Tier 1 engine', async ({ page }) => {
    await page.goto('http://127.0.0.1:8080/');
    await page.waitForSelector('formspec-render', { state: 'attached' });

    await page.evaluate(({ def, comp }) => {
      const renderer: any = document.querySelector('formspec-render');
      renderer.definition = def;
      renderer.componentDocument = comp;
    }, { def: definition, comp: componentDocument });

    // Assert DOM structure matches Component tree
    const rootPage = page.locator('section#root-page');
    await expect(rootPage).toBeVisible();
    await expect(rootPage.locator('h2')).toHaveText('Welcome');

    const mainStack = rootPage.locator('div#main-stack');
    await expect(mainStack).toHaveCSS('display', 'flex');
    await expect(mainStack).toHaveCSS('flex-direction', 'column');
    await expect(mainStack).toHaveCSS('gap', '20px');

    const emailInput = page.locator('input#email-input');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('placeholder', 'enter email');

    const phoneInput = page.locator('input#phone-input');
    // It should be hidden because relevant: "false"
    const phoneWrapper = page.locator('div.form-field:has(input#phone-input)');
    await expect(phoneWrapper).toBeHidden();

    // Assert state management is driven by Tier 1 Engine
    // Check for required indicator (we added this to label)
    const emailLabel = page.locator('div.form-field:has(input#email-input) label');
    await expect(emailLabel).toContainText('*');

    // Test interactivity
    await emailInput.fill('test@example.com');
    
    const response = await page.evaluate(() => {
        return new Promise((resolve) => {
            document.addEventListener('formspec-submit', (e: any) => resolve(e.detail), { once: true });
            const buttons = Array.from(document.querySelectorAll('button'));
            const submitBtn = buttons.find(b => b.textContent === 'Submit');
            submitBtn?.click();
        });
    }) as any;

    expect(response.data.user_email).toBe('test@example.com');
    // Ensure irrelevant field is pruned
    expect(response.data).not.toHaveProperty('user_phone');
  });
});
