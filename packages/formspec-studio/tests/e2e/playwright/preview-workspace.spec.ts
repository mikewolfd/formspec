import { test, expect } from '@playwright/test';
import { waitForApp, switchTab, seedDefinition } from './helpers';

const PREVIEW_DEF = {
  $formspec: '1.0',
  items: [
    { key: 'firstName', type: 'field', dataType: 'string', label: 'First Name' },
    { key: 'lastName', type: 'field', dataType: 'string', label: 'Last Name' },
    { key: 'notes', type: 'display', label: 'Please review carefully' },
    {
      key: 'address',
      type: 'group',
      label: 'Address',
      children: [
        { key: 'street', type: 'field', dataType: 'string', label: 'Street' },
      ],
    },
  ],
};

test.describe('Preview Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    await seedDefinition(page, PREVIEW_DEF);
    await switchTab(page, 'Preview');
  });

  test('renders form inputs for fields, group fieldset, and display text', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Preview"]');

    // Field items render label text (label has no htmlFor so use getByText)
    // and inputs rendered with placeholder matching the label
    await expect(workspace.getByText('First Name', { exact: true })).toBeVisible();
    await expect(workspace.getByPlaceholder('First Name')).toBeVisible();
    await expect(workspace.getByText('Last Name', { exact: true })).toBeVisible();
    await expect(workspace.getByPlaceholder('Last Name')).toBeVisible();

    // Group renders as fieldset with legend text
    await expect(workspace.locator('legend').filter({ hasText: 'Address' })).toBeVisible();
    // Nested street field also renders
    await expect(workspace.getByPlaceholder('Street')).toBeVisible();

    // Display item renders its label text
    await expect(workspace.getByText('Please review carefully')).toBeVisible();
  });

  test('viewport switcher changes preview container width to tablet (768px)', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Preview"]');

    // Click Tablet button
    await workspace.getByRole('button', { name: 'Tablet' }).click();

    // The preview container has style.width = '768px' (may be constrained by maxWidth: 100%)
    // Check the inline style attribute rather than the computed CSS value
    const container = workspace.locator('.bg-surface.rounded.border.border-border.p-4');
    const widthStyle = await container.evaluate((el: HTMLElement) => el.style.width);
    expect(widthStyle).toBe('768px');
  });

  test('viewport switcher changes preview container width to mobile (375px)', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Preview"]');

    await workspace.getByRole('button', { name: 'Mobile' }).click();

    const container = workspace.locator('.bg-surface.rounded.border.border-border.p-4');
    const widthStyle = await container.evaluate((el: HTMLElement) => el.style.width);
    expect(widthStyle).toBe('375px');
  });

  test('viewport switcher resets to desktop (100%) width', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Preview"]');

    // First go to mobile, then back to desktop
    await workspace.getByRole('button', { name: 'Mobile' }).click();
    await workspace.getByRole('button', { name: 'Desktop' }).click();

    const container = workspace.locator('.bg-surface.rounded.border.border-border.p-4');
    const widthStyle = await container.evaluate((el: HTMLElement) => el.style.width);
    expect(widthStyle).toBe('100%');
  });
});
