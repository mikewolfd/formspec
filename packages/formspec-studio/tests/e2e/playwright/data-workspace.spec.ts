import { test, expect } from '@playwright/test';
import { waitForApp, switchTab, seedDefinition } from './helpers';

const DATA_DEFINITION = {
  $formspec: '1.0',
  items: [
    { key: 'firstName', type: 'field', dataType: 'string', label: 'First Name' },
    { key: 'status', type: 'field', dataType: 'select1', optionSet: 'statusValues' },
    { key: 'address', type: 'group', children: [
      { key: 'street', type: 'field', dataType: 'string', label: 'Street' },
      { key: 'city', type: 'field', dataType: 'string', label: 'City' },
    ]},
  ],
  instances: [
    { name: 'countries', source: 'https://api.example.com/countries' },
  ],
  optionSets: {
    statusValues: {
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'pending', label: 'Pending' },
      ],
    },
  },
};

test.describe('Data Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    await seedDefinition(page, DATA_DEFINITION);
    await switchTab(page, 'Data');
  });

  test('response schema table shows fields with types', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Data"]');
    // ResponseSchema renders a table with Key, Type, Label columns
    // It uses flatItems to show all items including nested ones
    await expect(workspace.getByText('firstName', { exact: true })).toBeVisible();
    // Multiple string-type fields exist; verify at least one type cell shows "string"
    await expect(workspace.getByRole('cell', { name: 'string' }).first()).toBeVisible();
    await expect(workspace.getByText('street', { exact: true })).toBeVisible();
    await expect(workspace.getByText('city', { exact: true })).toBeVisible();
  });

  test('data sources sub-tab shows instances', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Data"]');
    // Click "Data Sources" sub-tab
    await workspace.getByRole('button', { name: 'Data Sources' }).click();
    // Should show the instance name and source
    await expect(workspace.getByText('countries', { exact: true })).toBeVisible();
    await expect(workspace.getByText('https://api.example.com/countries', { exact: true })).toBeVisible();
  });

  test('option sets sub-tab shows option set names and values', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Data"]');
    // Click "Option Sets" sub-tab
    await workspace.getByRole('button', { name: 'Option Sets' }).click();
    // Should show option set name
    await expect(workspace.getByText('statusValues')).toBeVisible();
    // Should show option labels
    await expect(workspace.getByText('Active', { exact: true })).toBeVisible();
    await expect(workspace.getByText('Inactive', { exact: true })).toBeVisible();
    await expect(workspace.getByText('Pending', { exact: true })).toBeVisible();
    // Should show usage count
    await expect(workspace.getByText(/Used by 1 field/)).toBeVisible();
  });
});
