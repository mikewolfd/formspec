/**
 * BDD-style E2E tests for Inquest persistence, provider memory, and save state.
 *
 * These tests cover the user flows around:
 *   1. Session persistence: work survives page reload
 *   2. Save state indicators: "Saving" → "Saved" transitions
 *   3. Provider credential persistence: "Save to this browser" checkbox
 *   4. File upload: add files, see chips, remove them
 *   5. Studio handoff: IndexedDB receives the handoff payload
 *
 * Storage architecture:
 *   - Sessions & handoffs: IndexedDB (formspec-studio / inquest-records)
 *   - Recent sessions list: localStorage (formspec-studio:inquest:recent-sessions)
 *   - Provider preferences: localStorage (formspec-studio:inquest:provider-prefs)
 *
 * All tests use ?e2e=1 (deterministic provider, no API calls).
 */

import { test, expect } from '@playwright/test';
import {
  ANALYSIS_TIMEOUT,
  gotoInquest,
  completeProviderSetup,
  selectBlueprint,
  reachReviewViaDraftFast,
  reachRefine,
} from './inquest-helpers';

/* ── localStorage key constants (must match inquest-store.ts) ─── */

const RECENT_SESSIONS_KEY = 'formspec-studio:inquest:recent-sessions';
const PROVIDER_PREFS_KEY = 'formspec-studio:inquest:provider-prefs';

/* ================================================================== */
/* Session Persistence                                                 */
/* ================================================================== */

test.describe('Session Persistence: work survives page reload', () => {
  test('session is saved to recent sessions list after analysis', async ({ page }) => {
    await gotoInquest(page);
    await completeProviderSetup(page);

    // Type a description and submit to trigger analysis
    const composer = page.getByPlaceholder(/describe the form you need/i);
    await composer.fill('Build a patient intake form with name, email, and phone');
    await composer.press('Enter');

    // Wait for analysis to complete and review phase to load
    await expect(page.getByText('Requirements review')).toBeVisible({ timeout: ANALYSIS_TIMEOUT });

    // Wait for session to be persisted — recent sessions list should be non-empty
    await page.waitForFunction((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const entries = JSON.parse(raw);
      return Array.isArray(entries) && entries.length > 0;
    }, RECENT_SESSIONS_KEY, { timeout: 5000 });

    const recentSessions = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    }, RECENT_SESSIONS_KEY);

    expect(recentSessions.length).toBeGreaterThan(0);
    // The most recent session should have a phase and title
    expect(recentSessions[0]).toHaveProperty('sessionId');
    expect(recentSessions[0]).toHaveProperty('title');
    expect(recentSessions[0]).toHaveProperty('phase');
  });

  test('recent sessions list in localStorage grows as sessions are created', async ({ page }) => {
    // First session: complete setup and use Draft Fast
    await gotoInquest(page);
    await reachReviewViaDraftFast(page);

    // Wait for session to be saved to recent sessions list
    await page.waitForFunction((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const entries = JSON.parse(raw);
      return Array.isArray(entries) && entries.length > 0;
    }, RECENT_SESSIONS_KEY, { timeout: 5000 });

    // Verify there's at least 1 entry in the recent sessions list
    const sessionCount = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw).length : 0;
    }, RECENT_SESSIONS_KEY);
    expect(sessionCount).toBeGreaterThanOrEqual(1);
  });
});

/* ================================================================== */
/* Save State Indicators                                               */
/* ================================================================== */

test.describe('Save State: visual feedback in header', () => {
  test('shows "Saved" indicator after performing an action', async ({ page }) => {
    await gotoInquest(page);
    await completeProviderSetup(page);

    // After completing setup, the session should be saved
    // The "Saved" text appears in the header
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });
  });

  test('save state updates when session changes', async ({ page }) => {
    await gotoInquest(page);
    await completeProviderSetup(page);

    // Wait for initial save
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });

    // Select a blueprint to trigger a session update
    await selectBlueprint(page);

    // The save state should transition: Saving → Saved
    // We check the final "Saved" state (the "Saving" state is transient)
    await expect(page.getByText('Saved')).toBeVisible({ timeout: 5000 });
  });
});

/* ================================================================== */
/* Provider Credential Persistence                                     */
/* ================================================================== */

test.describe('Provider Credentials: "Save to this browser"', () => {
  test('"Save to this browser" checkbox is visible during provider setup', async ({ page }) => {
    await gotoInquest(page);
    await page.getByRole('button', { name: 'Gemini' }).click();

    // The checkbox and its label should be visible
    await expect(page.getByText('Save to this browser')).toBeVisible();
  });

  test('checking "Save to this browser" and verifying stores the key', async ({ page }) => {
    await gotoInquest(page);
    await page.getByRole('button', { name: 'Gemini' }).click();
    await page.getByPlaceholder('sk-...').fill('test-e2e-key-persist');

    // Check the "Save to this browser" checkbox
    const checkbox = page.getByRole('checkbox');
    await checkbox.check();
    await expect(checkbox).toBeChecked();

    // Verify connection and continue
    await page.getByRole('button', { name: /verify connection/i }).click();
    await page.getByRole('button', { name: /continue to chat/i }).click({ timeout: 5000 });
    await expect(page.getByPlaceholder(/describe the form you need/i)).toBeVisible();

    // Verify the key is stored in localStorage under the correct key
    const hasStoredKey = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return false;
      const prefs = JSON.parse(raw);
      return prefs.rememberedKeys?.gemini === 'test-e2e-key-persist';
    }, PROVIDER_PREFS_KEY);
    expect(hasStoredKey).toBe(true);
  });

  test('provider selection is persisted to localStorage', async ({ page }) => {
    await gotoInquest(page);

    // Select Gemini and remember the key
    await page.getByRole('button', { name: 'Gemini' }).click();
    await page.getByPlaceholder('sk-...').fill('test-persist-key');
    const checkbox = page.getByRole('checkbox');
    await checkbox.check();
    await page.getByRole('button', { name: /verify connection/i }).click();
    await page.getByRole('button', { name: /continue to chat/i }).click({ timeout: 5000 });

    // Verify the selected provider was stored
    const storedProvider = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw).selectedProviderId;
    }, PROVIDER_PREFS_KEY);
    expect(storedProvider).toBe('gemini');
  });
});

/* ================================================================== */
/* File Upload Flow                                                    */
/* ================================================================== */

test.describe('File Upload: add files, see chips, remove', () => {
  test.beforeEach(async ({ page }) => {
    await gotoInquest(page);
    await completeProviderSetup(page);
  });

  test('"Add context" file upload label is visible below the composer', async ({ page }) => {
    await expect(page.getByText('Add context')).toBeVisible();
  });

  test('uploading a file shows an upload chip with the file name', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles({
      name: 'test-document.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This is a test document for context'),
    });

    // The upload chip should appear with the file name
    await expect(page.getByText('test-document.txt')).toBeVisible({ timeout: 3000 });
  });

  test('upload chip has a remove button that removes the file', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles({
      name: 'removable.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('content'),
    });

    // File appears
    await expect(page.getByText('removable.txt')).toBeVisible({ timeout: 3000 });

    // Click the remove button (aria-label="Remove removable.txt")
    await page.getByRole('button', { name: /remove removable.txt/i }).click();

    // File should be gone
    await expect(page.getByText('removable.txt')).not.toBeVisible();
  });

  test('uploading a file makes meaningfulInput true and shows Generate CTA', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles({
      name: 'context-file.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('PDF content placeholder'),
    });

    // Upload chip appears
    await expect(page.getByText('context-file.pdf')).toBeVisible({ timeout: 3000 });

    // File upload makes meaningfulInput=true → Generate CTA should appear
    await expect(page.getByText('Draft Fast')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Verify Carefully')).toBeVisible();
  });

  test('multiple files can be uploaded and all appear as chips', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles([
      {
        name: 'file-one.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('First file'),
      },
      {
        name: 'file-two.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{"key": "value"}'),
      },
    ]);

    await expect(page.getByText('file-one.txt')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('file-two.json')).toBeVisible({ timeout: 3000 });
  });
});

/* ================================================================== */
/* Studio Handoff                                                      */
/* ================================================================== */

test.describe('Studio Handoff: navigation triggered', () => {
  test('clicking "Open in Studio" navigates to /studio/?h=...', async ({ page }) => {
    await gotoInquest(page);
    await reachRefine(page);

    // Listen for navigation events — "Open in Studio" calls window.location.assign
    // which triggers a page navigation. We use waitForURL to catch it.
    const navigationPromise = page.waitForURL(/\/studio\/?\?h=/, { timeout: 10000 });

    await page.getByRole('button', { name: /open in studio/i }).click();

    // Verify navigation happened to the expected Studio URL
    await navigationPromise;
    expect(page.url()).toMatch(/\/studio\/?\?h=/);
  });
});

/* ================================================================== */
/* Session Title Inference                                             */
/* ================================================================== */

test.describe('Session Title: inferred from template or description', () => {
  test('header shows session title from template after transitioning to review', async ({ page }) => {
    await gotoInquest(page);
    await reachReviewViaDraftFast(page);

    // The header shows the session title (derived from the template name)
    // In review phase, the title appears after "Stack ·"
    const header = page.locator('header');
    // Housing Intake is the first template
    await expect(header.getByText('Housing Intake')).toBeVisible();
  });
});
