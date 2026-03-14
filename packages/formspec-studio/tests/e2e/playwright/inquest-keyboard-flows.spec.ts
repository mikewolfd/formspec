/**
 * BDD-style E2E tests for keyboard-driven Inquest interactions.
 *
 * These tests verify that the app works correctly through keyboard input,
 * ensuring accessibility and matching how real users interact with
 * chat-style interfaces.
 *
 * All tests use ?e2e=1 (deterministic provider, no API calls).
 *
 * Scenarios:
 *   1. Composer: Enter submits, empty/whitespace Enter is ignored
 *   2. Refine prompt: Enter applies edits, Shift+Enter inserts newline
 *   3. Empty refine: Enter on empty prompt is a no-op
 */

import { test, expect } from '@playwright/test';
import {
  ANALYSIS_TIMEOUT,
  gotoInquest,
  completeProviderSetup,
  reachRefine,
} from './inquest-helpers';

/* ── Composer keyboard behavior ───────────────── */

test.describe('Keyboard: Composer submission', () => {
  test.beforeEach(async ({ page }) => {
    await gotoInquest(page);
    await completeProviderSetup(page);
  });

  test('pressing Enter in the composer submits the message and triggers analysis', async ({ page }) => {
    const composer = page.getByPlaceholder(/describe the form you need/i);
    await composer.fill('Build a patient intake form with name and email');
    await composer.press('Enter');

    // Should auto-analyze and transition to review
    await expect(page.getByText('Requirements review')).toBeVisible({ timeout: ANALYSIS_TIMEOUT });
    await expect(page.getByText(/field inventory/i)).toBeVisible();
  });

  test('pressing Enter on an empty composer does not submit or navigate away', async ({ page }) => {
    const composer = page.getByPlaceholder(/describe the form you need/i);
    await composer.press('Enter');

    // Should still be on the inputs phase
    await expect(page.getByText(/I'm Stack/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /patient intake/i })).toBeVisible();
  });

  test('pressing Enter on whitespace-only input does not submit', async ({ page }) => {
    const composer = page.getByPlaceholder(/describe the form you need/i);
    await composer.fill('   ');
    await composer.press('Enter');

    // Should still be on the inputs phase
    await expect(page.getByText(/I'm Stack/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /patient intake/i })).toBeVisible();
  });
});

/* ── Refine prompt keyboard behavior ──────────── */

test.describe('Keyboard: Refine prompt submission', () => {
  test('pressing Enter in the refine prompt submits the edit', async ({ page }) => {
    await gotoInquest(page);
    await reachRefine(page);

    const promptArea = page.getByPlaceholder(/describe a change/i);
    await promptArea.fill('make email required');
    await promptArea.press('Enter');

    // Prompt should clear after successful application
    await expect(promptArea).toHaveValue('', { timeout: 5000 });
    // No error
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });

  test('pressing Shift+Enter in refine prompt does NOT submit (inserts newline)', async ({ page }) => {
    await gotoInquest(page);
    await reachRefine(page);

    const promptArea = page.getByPlaceholder(/describe a change/i);
    await promptArea.fill('line one');
    await promptArea.press('Shift+Enter');
    await promptArea.type('line two');

    // The prompt should still contain text (not cleared by submission)
    const value = await promptArea.inputValue();
    expect(value).toContain('line one');
    expect(value).toContain('line two');
  });

  test('pressing Enter on an empty refine prompt does nothing', async ({ page }) => {
    await gotoInquest(page);
    await reachRefine(page);

    const promptArea = page.getByPlaceholder(/describe a change/i);
    await promptArea.press('Enter');

    // Should still be on the refine workspace
    await expect(page.getByText(/adjust before handoff/i)).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
  });
});
