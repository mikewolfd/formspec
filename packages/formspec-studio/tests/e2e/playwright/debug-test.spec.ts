import { test, expect } from '@playwright/test';
import { waitForApp, switchTab, importDefinition } from './tests/e2e/playwright/helpers';

const DATA_DEFINITION = {
  $formspec: '1.0',
  items: [
    { key: 'firstName', type: 'field', dataType: 'string', label: 'First Name' },
  ],
  optionSets: {
    statusValues: {
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
    },
  },
};

const REPEATABLE_DEFINITION = {
  $formspec: '1.0',
  items: [
    { key: 'members', type: 'group', label: 'Members', repeatable: true, minRepeat: 0, maxRepeat: 10, children: [
      { key: 'mName', type: 'field', label: 'Member Name', dataType: 'string' },
    ]},
  ],
};

test('debug option sets', async ({ page }) => {
  await waitForApp(page);
  await importDefinition(page, DATA_DEFINITION);
  await switchTab(page, 'Data');
  const workspace = page.locator('[data-testid="workspace-Data"]');
  await workspace.getByRole('button', { name: 'Tables' }).click();
  await workspace.locator('[data-testid="option-set-statusValues"]').click();
  await page.waitForTimeout(500);
  
  const html = await workspace.locator('[data-testid="option-set-statusValues"]').innerHTML();
  console.log('CARD HTML:', html.substring(0, 3000));
});

test('debug repeatable schema', async ({ page }) => {
  await waitForApp(page);
  await importDefinition(page, REPEATABLE_DEFINITION);
  await switchTab(page, 'Data');
  const workspace = page.locator('[data-testid="workspace-Data"]');
  await page.waitForTimeout(500);
  
  const html = await workspace.locator('.bg-surface.rounded-xl.border').first().innerHTML();
  console.log('SCHEMA HTML:', html.substring(0, 3000));
});
