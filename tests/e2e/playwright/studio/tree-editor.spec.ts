import { expect, test } from '@playwright/test';
import { gotoStudio, selectTreeNode, treeNodeByLabel } from './helpers';

test.describe('Formspec Studio - Tree Editor', () => {
  test.beforeEach(async ({ page }) => {
    await gotoStudio(page);
  });

  test('renders the seeded definition tree', async ({ page }) => {
    await expect(page.locator('.tree-header-title')).toHaveText('Untitled Form');
    await expect(page.locator('.tree-node')).toHaveCount(4);
  });

  test('adds a new component via add picker and auto-selects it', async ({ page }) => {
    await page.locator('.tree-add-root .tree-add-btn').click();
    await expect(page.locator('.add-picker')).toBeVisible();

    // Input tab is default; pick Text Input
    await page.locator('.add-picker-option', { hasText: 'Text Input' }).click();

    // Enter a label and confirm
    await page.fill('.add-picker-label input', 'Phone Number');
    await page.locator('.add-picker-actions .btn-primary').click();

    await expect(treeNodeByLabel(page, 'Phone Number')).toBeVisible();
    await expect(page.locator('.property-type-header')).toContainText('Field');
  });

  test('deletes an item and clears selected item panel', async ({ page }) => {
    const notesNode = treeNodeByLabel(page, 'Additional Notes');
    await notesNode.click();
    await notesNode.locator('button[title="Delete"]').click();

    await expect(treeNodeByLabel(page, 'Additional Notes')).toHaveCount(0);
    await expect(page.locator('.properties-empty')).toContainText('Select an item');
  });

  test('collapses and expands groups in tree', async ({ page }) => {
    await expect(treeNodeByLabel(page, 'Full Name')).toBeVisible();
    await treeNodeByLabel(page, 'Basic Information').locator('.tree-node-toggle').click();
    await expect(treeNodeByLabel(page, 'Full Name')).toHaveCount(0);

    await treeNodeByLabel(page, 'Basic Information').locator('.tree-node-toggle').click();
    await expect(treeNodeByLabel(page, 'Full Name')).toBeVisible();
  });

  test('shows item keys and data type badges', async ({ page }) => {
    const nameNode = treeNodeByLabel(page, 'Full Name');
    await expect(nameNode.locator('.tree-node-key')).toContainText('fullName');
    await expect(nameNode.locator('.tree-node-badge')).toHaveText('string');
  });
});
