import { test, expect } from '@playwright/test';
import { waitForApp, switchTab } from './helpers';

test.describe('Workspace Navigation — Tab Switching', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
  });

  test('Editor tab renders Build/Manage toggle', async ({ page }) => {
    await switchTab(page, 'Editor');
    const workspace = page.locator('[data-testid="workspace-Editor"]');
    await expect(workspace.getByRole('radiogroup', { name: /editor view/i })).toBeVisible();
    await expect(workspace.getByRole('radio', { name: 'Build' })).toBeVisible();
    await expect(workspace.getByRole('radio', { name: 'Manage' })).toBeVisible();
  });

  test('Editor Manage view renders manage sections', async ({ page }) => {
    await switchTab(page, 'Editor');
    await page.getByRole('radio', { name: 'Manage' }).click();
    await expect(page.getByTestId('manage-section-option-sets')).toBeVisible();
    await expect(page.getByTestId('manage-section-variables')).toBeVisible();
    await expect(page.getByTestId('manage-section-data-sources')).toBeVisible();
  });

  test('Design tab shows brand & style sections in the blueprint sidebar', async ({ page }) => {
    await switchTab(page, 'Design');
    const workspace = page.locator('[data-testid="design-canvas-shell"]');
    await expect(workspace.getByRole('button', { name: /brand colors/i })).toBeVisible();
    await expect(workspace.getByRole('button', { name: /typography/i })).toBeVisible();
  });

  test('Design mode renders design workspace', async ({ page }) => {
    await switchTab(page, 'Design');
    const workspace = page.locator('[data-testid="design-canvas-shell"]');
    await expect(workspace.getByRole('heading', { name: 'Brand Colors' })).toBeVisible();
    await expect(workspace.getByRole('button', { name: /typography/i })).toBeVisible();
  });

  test('Mapping workspace is accessible via Advanced section', async ({ page }) => {
    await switchTab(page, 'Editor');
    const sidebar = page.locator('[data-testid="blueprint-sidebar"]');
    await expect(sidebar.getByText('Advanced')).toBeVisible();
    await sidebar.getByRole('button', { name: 'Open Mappings tab' }).click();
    await expect(page.locator('[data-testid="workspace-Mapping"]')).toBeVisible();
  });

  test('Preview mode renders preview workspace', async ({ page }) => {
    await switchTab(page, 'Preview');
    await expect(page.getByText('Desktop')).toBeVisible();
    await expect(page.getByText('Tablet')).toBeVisible();
    await expect(page.getByText('Mobile')).toBeVisible();
  });

  test('can navigate back to Edit mode', async ({ page }) => {
    await switchTab(page, 'Design');
    await switchTab(page, 'Editor');
    await expect(page.locator('[data-testid="mode-toggle-edit"]')).toHaveClass(/bg-accent/);
    await expect(page.locator('[data-testid="workspace-Editor"]')).toBeVisible();
  });
});
