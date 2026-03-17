import { test, expect } from '@playwright/test';
import { waitForApp, waitForAppWithExport, switchTab, importProject } from './helpers';

const SEED = {
  definition: {
    $formspec: '1.0',
    items: [
      { key: 'name', type: 'field', dataType: 'string', label: 'FullName' },
      { key: 'age', type: 'field', dataType: 'integer', label: 'Age' }
    ],
  },
  mapping: {
    direction: 'forward',
    version: '1.2.3',
    definitionRef: 'urn:formspec:test',
    rules: [
      { sourcePath: 'name', targetPath: 'fullName', transform: 'preserve' },
      { sourcePath: 'age', targetPath: 'years', transform: 'coerce' },
    ],
    targetSchema: { format: 'json' },
  },
};

test.describe('Mapping Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    await importProject(page, SEED);
    await switchTab(page, 'Mapping');
  });

  test('blueprint section shows direction, version and target format', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Mapping"]');

    // Check direction
    await expect(workspace.locator('[data-testid="direction-picker"]')).toHaveText('forward');

    // Check version
    await expect(workspace.locator('input[value="1.2.3"]')).toBeVisible();

    // Check definition ref
    await expect(workspace.getByText('urn:formspec:test')).toBeVisible();

    // Check target schema summary
    await expect(workspace.getByText('Format: JSON')).toBeVisible();
  });

  test('rules section shows interactive rule cards', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Mapping"]');

    // Verify first rule card content
    const firstRule = workspace.locator('[data-testid="rule-source-0"]');
    await expect(firstRule).toHaveValue('name');

    const firstTarget = workspace.locator('[data-testid="rule-target-0"]');
    await expect(firstTarget).toHaveValue('fullName');

    // Verify transform pill
    await expect(workspace.getByRole('button', { name: 'preserve' })).toBeVisible();
  });

  test('filter bar navigates to sections', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Mapping"]');

    // Click "Preview" in the sticky filter bar
    await workspace.locator('[data-testid="filter-tab-preview"]').click();

    // Blueprint should be hidden (since sectionFilter !== 'all')
    await expect(workspace.getByText('Mapping Blueprint')).toBeHidden();

    // Preview should be visible
    await expect(workspace.getByText('Output Preview')).toBeVisible();

    // Logic: checking for Source and Output headers in the preview section
    await expect(workspace.locator('[data-testid="preview-source-header"]')).toBeVisible();
    await expect(workspace.locator('[data-testid="preview-output-header"]')).toBeVisible();
  });

  test('editing a rule updates the project state', async ({ page }) => {
    // Need export access for this
    await waitForAppWithExport(page);
    await importProject(page, SEED);
    await switchTab(page, 'Mapping');

    const workspace = page.locator('[data-testid="workspace-Mapping"]');

    // Find the target input for the first rule and change it
    const targetInput = workspace.locator('[data-testid="rule-target-0"]');
    await targetInput.fill('newFullName');
    await targetInput.blur(); // Triggers final update if needed

    // Validate the change in the exported bundle
    const exportData = await page.evaluate(() => (window as any).__FORMSPEC_TEST_EXPORT());
    expect(exportData.mapping.rules[0].targetPath).toBe('newFullName');
  });

  test('preview transforms real-time with sample data', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Mapping"]');

    // Go to preview section
    await workspace.locator('[data-testid="filter-tab-preview"]').click();

    // Type sample data into the "Input" JSON editor (textarea)
    const inputArea = workspace.locator('textarea').first();
    await inputArea.clear();
    await inputArea.fill(JSON.stringify({ name: 'Bob', age: 40 }));

    // The output should update to show the mapped data
    // { "fullName": "Bob", "years": 40 }
    // We look for parts of the JSON in the output area
    const outputArea = workspace.locator('pre');
    await expect(outputArea).toContainText('"fullName": "Bob"');
    await expect(outputArea).toContainText('"years": 40');
  });

  test('direction picker updates mapping direction', async ({ page }) => {
    await waitForAppWithExport(page);
    await importProject(page, SEED);
    await switchTab(page, 'Mapping');

    const workspace = page.locator('[data-testid="workspace-Mapping"]');

    // Open picker
    await workspace.locator('[data-testid="direction-picker"]').click();

    // Select "reverse"
    await workspace.getByRole('button', { name: 'reverse', exact: true }).click();

    // Verify UI reflects change
    await expect(workspace.getByRole('button', { name: 'reverse', exact: true })).toBeVisible();

    // Verify state reflects change
    const exportData = await page.evaluate(() => (window as any).__FORMSPEC_TEST_EXPORT());
    expect(exportData.mapping.direction).toBe('reverse');
  });
});
