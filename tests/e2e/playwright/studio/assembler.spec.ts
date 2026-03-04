import { expect, test } from '@playwright/test';
import { gotoStudio, selectTreeNode, treeNodeByLabel, propertyInput } from './helpers';

const LIBRARY_DEF = {
  $formspec: '1.0',
  url: 'https://example.gov/forms/common-contact',
  version: '1.0.0',
  title: 'Common Contact Fields',
  status: 'active',
  items: [
    { key: 'email', type: 'field', label: 'Email Address', dataType: 'string' },
    { key: 'phone', type: 'field', label: 'Phone Number', dataType: 'string' },
  ],
};

test.describe('Formspec Studio - Definition Assembler', () => {
  test.beforeEach(async ({ page }) => {
    await gotoStudio(page);
  });

  test('$ref group shows linked badge and resolves children from library', async ({ page }) => {
    // Inject library definition into project state via evaluate
    await page.evaluate((libDef) => {
      const state = (window as any).__FORMSPEC_STUDIO_STATE__;
      if (!state) throw new Error('Studio state not exposed');
      state.project.value = {
        ...state.project.value,
        library: [{ url: libDef.url, version: libDef.version, definition: libDef }],
      };
    }, LIBRARY_DEF);

    // Add a group with $ref by switching to JSON mode and editing
    await page.getByRole('button', { name: 'JSON' }).click();
    await expect(page.locator('.json-editor-textarea')).toBeVisible();
    await page.locator('.json-editor-textarea').fill(JSON.stringify({
      $formspec: '1.0',
      url: 'https://example.gov/forms/host',
      version: '1.0.0',
      title: 'Host Form',
      status: 'draft',
      items: [
        {
          key: 'contact',
          type: 'group',
          label: 'Contact Info',
          $ref: 'https://example.gov/forms/common-contact|1.0.0',
        },
      ],
    }, null, 2));
    await page.getByRole('button', { name: 'Apply Changes' }).click();
    await expect(page.locator('.json-editor-status.applied')).toContainText('Applied');

    // Switch back to guided mode
    await page.getByRole('button', { name: 'Guided' }).click();

    // Verify tree shows the linked badge
    const contactNode = treeNodeByLabel(page, 'Contact Info');
    await expect(contactNode).toBeVisible();
    await expect(contactNode.locator('.tree-ref-badge')).toBeVisible();
    await expect(contactNode.locator('.tree-ref-badge')).toHaveText('linked');

    // Verify assembled children are shown as read-only previews
    await expect(page.locator('.tree-ref-child')).toHaveCount(2);
  });

  test('fork action converts $ref group to local children', async ({ page }) => {
    // Inject library
    await page.evaluate((libDef) => {
      const state = (window as any).__FORMSPEC_STUDIO_STATE__;
      if (!state) throw new Error('Studio state not exposed');
      state.project.value = {
        ...state.project.value,
        library: [{ url: libDef.url, version: libDef.version, definition: libDef }],
      };
    }, LIBRARY_DEF);

    // Set definition with $ref group via JSON mode
    await page.getByRole('button', { name: 'JSON' }).click();
    await expect(page.locator('.json-editor-textarea')).toBeVisible();
    await page.locator('.json-editor-textarea').fill(JSON.stringify({
      $formspec: '1.0',
      url: 'https://example.gov/forms/host',
      version: '1.0.0',
      title: 'Host Form',
      status: 'draft',
      items: [
        {
          key: 'contact',
          type: 'group',
          label: 'Contact Info',
          $ref: 'https://example.gov/forms/common-contact|1.0.0',
        },
      ],
    }, null, 2));
    await page.getByRole('button', { name: 'Apply Changes' }).click();
    await expect(page.locator('.json-editor-status.applied')).toContainText('Applied');
    await page.getByRole('button', { name: 'Guided' }).click();

    // Select the $ref group
    await selectTreeNode(page, 'Contact Info');

    // Click Fork button in properties panel
    await page.getByRole('button', { name: /Fork/i }).click();

    // After fork: badge should be gone, children should be regular (not read-only)
    const contactNode = treeNodeByLabel(page, 'Contact Info');
    await expect(contactNode.locator('.tree-ref-badge')).toHaveCount(0);
    await expect(page.locator('.tree-ref-child')).toHaveCount(0);

    // Children should now be visible as regular tree nodes
    await expect(treeNodeByLabel(page, 'Email Address')).toBeVisible();
    await expect(treeNodeByLabel(page, 'Phone Number')).toBeVisible();
  });
});
