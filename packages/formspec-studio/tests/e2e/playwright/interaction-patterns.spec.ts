import { test, expect } from '@playwright/test';
import { waitForApp, seedDefinition } from './helpers';

const SEED_DEFINITION = {
  $formspec: '1.0',
  items: [
    { key: 'myField', type: 'field', dataType: 'string', label: 'My Field' },
  ],
};

test.describe('Interaction Patterns', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    await seedDefinition(page, SEED_DEFINITION);
    await page.waitForSelector('[data-testid="field-myField"]', { timeout: 5000 });
  });

  test.describe('Context Menu', () => {
    test('right-click on field block shows context menu with all actions', async ({ page }) => {
      // Right-click the field block
      await page.click('[data-testid="field-myField"]', { button: 'right' });

      // Context menu appears
      await expect(page.locator('[data-testid="context-menu"]')).toBeVisible();

      // Verify all expected menu items
      await expect(page.locator('[data-testid="ctx-duplicate"]')).toBeVisible();
      await expect(page.locator('[data-testid="ctx-delete"]')).toBeVisible();
      await expect(page.locator('[data-testid="ctx-moveUp"]')).toBeVisible();
      await expect(page.locator('[data-testid="ctx-moveDown"]')).toBeVisible();
      await expect(page.locator('[data-testid="ctx-wrapInGroup"]')).toBeVisible();
    });

    test('clicking Duplicate in context menu duplicates the field', async ({ page }) => {
      // Right-click the field
      await page.click('[data-testid="field-myField"]', { button: 'right' });
      await expect(page.locator('[data-testid="context-menu"]')).toBeVisible();

      // Click Duplicate
      await page.click('[data-testid="ctx-duplicate"]');

      // Context menu should close
      await expect(page.locator('[data-testid="context-menu"]')).not.toBeVisible();

      // There should now be 2 field blocks in the canvas
      const canvas = page.locator('[data-testid="workspace-Editor"]');
      const fieldBlocks = canvas.locator('[data-testid^="field-"]');
      await expect(fieldBlocks).toHaveCount(2);
    });

    test('pressing Escape closes the context menu', async ({ page }) => {
      // Right-click to open context menu
      await page.click('[data-testid="field-myField"]', { button: 'right' });
      await expect(page.locator('[data-testid="context-menu"]')).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');

      // Context menu should close
      await expect(page.locator('[data-testid="context-menu"]')).not.toBeVisible();
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('Delete key removes the selected field', async ({ page }) => {
      // Click to select the field
      await page.click('[data-testid="field-myField"]');

      // Press Delete
      await page.keyboard.press('Delete');

      // Field should be removed
      await expect(page.locator('[data-testid="field-myField"]')).not.toBeVisible();
    });

    test('Backspace key removes the selected field', async ({ page }) => {
      // Seed a second field to delete via Backspace
      await seedDefinition(page, {
        $formspec: '1.0',
        items: [
          { key: 'toRemove', type: 'field', dataType: 'string', label: 'To Remove' },
        ],
      });
      await page.waitForSelector('[data-testid="field-toRemove"]', { timeout: 5000 });

      // Click to select the field
      await page.click('[data-testid="field-toRemove"]');

      // Press Backspace
      await page.keyboard.press('Backspace');

      // Field should be removed
      await expect(page.locator('[data-testid="field-toRemove"]')).not.toBeVisible();
    });

    test('Escape closes command palette', async ({ page }) => {
      // Open command palette
      await page.keyboard.press('Meta+k');
      await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');

      // Palette closes
      await expect(page.locator('[data-testid="command-palette"]')).not.toBeVisible();
    });
  });

  test.describe('Keyboard Autofocus', () => {
    test('Meta+k opens command palette and focuses search input', async ({ page }) => {
      // Press Meta+k to open palette
      await page.keyboard.press('Meta+k');
      await page.waitForSelector('[data-testid="command-palette"]');

      // Search input should be focused
      const searchInput = page.locator('[data-testid="command-palette"] input');
      await expect(searchInput).toBeFocused();
    });

    test('typing after Meta+k flows into search input', async ({ page }) => {
      // Open palette
      await page.keyboard.press('Meta+k');
      await page.waitForSelector('[data-testid="command-palette"]');

      // Type without clicking
      await page.keyboard.type('myF');

      // Characters appear in the input
      const searchInput = page.locator('[data-testid="command-palette"] input');
      await expect(searchInput).toHaveValue('myF');
    });
  });
});
