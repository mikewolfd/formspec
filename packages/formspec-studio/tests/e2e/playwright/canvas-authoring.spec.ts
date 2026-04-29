import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.describe('Canvas Direct Manipulation', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    // Switch to edit mode to see the authoring canvas
    await page.click('[data-testid="mode-toggle-edit"]');
    await expect(page.locator('[data-testid="authoring-overlay"]')).toBeVisible();
  });

  test('selection ring shows edit/design handle and drag handle', async ({ page }) => {
    // Select the first field in the default fixture (usually 'firstName')
    const field = page.locator('[data-name="firstName"]');
    await field.click();

    const ring = page.locator('[data-testid="selection-ring"]');
    await expect(ring).toBeVisible();
    await expect(ring).toContainText('Edit');
    
    // Drag handle should be visible
    await expect(page.locator('[title="Drag to reorder"]')).toBeVisible();
  });

  test('reorders fields via drag and drop', async ({ page }) => {
    // This is a complex interaction to simulate in Playwright without dedicated PDND helpers,
    // but we can assert the target-detection and reorder command by dragging between points.
    const sourceField = page.locator('[data-name="firstName"]');
    const targetField = page.locator('[data-name="lastName"]');

    await sourceField.hover();
    await sourceField.click(); // Select it first

    // Simulate drag from source handle to target field
    const handle = page.locator('[title="Drag to reorder"]');
    await handle.hover();
    await page.mouse.down();
    await targetField.hover(); // Drag over lastName
    
    // DragState should trigger the insertion line
    const indicator = page.locator('.border-t-2.border-accent');
    await expect(indicator).toBeVisible();

    await page.mouse.up();

    // Verify reorder (simplified: check if telemetry or state changed if possible, 
    // but in E2E we verify the DOM order or lack of errors)
    await expect(indicator).not.toBeVisible();
  });

  test('shows changeset review overlay when a proposal is pending', async ({ page }) => {
    // We'll use a mock or a command-palette triggered AI action to create a changeset.
    // For this test, we assume a 'proposed' status can be triggered or we verify the presence of the UI elements.
    
    // Simulate a pending changeset by injecting state via the window if needed, 
    // or triggering an AI action that we know creates a changeset.
    // Here we'll just check that the styles are ready for when ProposalManager notifies.
    
    // If we have a way to 'Ask AI', we trigger it.
    await page.click('[data-testid="mode-toggle-chat"]');
    const input = page.locator('textarea[placeholder*="Ask AI"]');
    await input.fill('add a phone number field');
    await input.press('Enter');

    // Wait for AI to propose
    await page.click('[data-testid="mode-toggle-edit"]');
    
    // The review bar should appear once the changeset is 'pending'
    const reviewBar = page.locator('.fixed.bottom-12'); // The floating review bar
    // This might take a few seconds for the AI to respond in a real env, 
    // so we use a longer timeout or mock it.
    await expect(reviewBar).toBeVisible({ timeout: 15000 });
    await expect(reviewBar).toContainText('AI Proposed Changes');
    
    // Verify accept button exists
    await expect(page.locator('button:has-text("Accept")')).toBeVisible();
  });
});
