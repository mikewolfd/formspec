import { test, expect } from '@playwright/test';
import { waitForApp, switchTab, importProject } from './helpers';

const SEED = {
  definition: {
    $formspec: '1.0',
    items: [
      { key: 'name', type: 'field', dataType: 'string' },
    ],
  },
  theme: {
    tokens: { 'color.primary': '#3b82f6', 'typography.fontSize': '14px', 'spacing.md': '8px' },
    defaults: { labelPosition: 'top' },
    selectors: [
      { match: { type: 'field', dataType: 'string' }, apply: { widget: 'text-input' } },
    ],
    pages: [
      { id: 'intro', title: 'Introduction', regions: [{ key: 'name', span: 12 }] },
    ],
    breakpoints: { mobile: 0, tablet: 768, desktop: 1024 },
  },
};

test.describe('Theme Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    await importProject(page, SEED);
    await switchTab(page, 'Theme');
  });

  test('shows all 6 pillar headings in "All Theme" filter', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Theme"]');
    await expect(workspace.getByText('Color Palette')).toBeVisible();
    await expect(workspace.getByText('Typography & Spacing')).toBeVisible();
    await expect(workspace.getByText('All Tokens')).toBeVisible();
    await expect(workspace.getByText('Default Field Style')).toBeVisible();
    await expect(workspace.getByText('Field Type Rules')).toBeVisible();
    await expect(workspace.getByText('Screen Sizes')).toBeVisible();
  });

  test('Brand & Colors filter shows only brand pillars', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Theme"]');
    await workspace.getByRole('button', { name: /brand & colors/i }).click();
    await expect(workspace.getByText('Color Palette')).toBeVisible();
    await expect(workspace.getByText('Typography & Spacing')).toBeVisible();
    await expect(workspace.getByText('All Tokens')).toBeVisible();
    await expect(workspace.getByText('Default Field Style')).not.toBeVisible();
  });

  test('color palette shows color tokens', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Theme"]');
    await expect(workspace.getByText('primary').first()).toBeVisible();
  });

  test('field type rules show selector summary', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Theme"]');
    await expect(workspace.getByText('field + string')).toBeVisible();
  });

  test('screen sizes show breakpoints sorted by width', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Theme"]');
    await expect(workspace.getByText('3 breakpoints')).toBeVisible();
  });

  test('empty theme shows empty states', async ({ page }) => {
    await importProject(page, {
      definition: SEED.definition,
      theme: {},
    });
    const workspace = page.locator('[data-testid="workspace-Theme"]');
    await expect(workspace.getByText(/no color tokens/i)).toBeVisible();
    await expect(workspace.getByText(/no.*rules/i)).toBeVisible();
    await expect(workspace.getByText(/0 breakpoints/i)).toBeVisible();
  });
});
