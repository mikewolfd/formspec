/**
 * E2E Playwright tests for the Inquest ("Stack") form builder app.
 *
 * These tests exercise real user flows through the browser DOM.
 * All tests use ?e2e=1 which activates the deterministic provider — no live
 * API keys or network calls are required.
 *
 * User flows tested:
 *   1. Provider setup (select, enter key, verify, continue)
 *   2. Welcome / chat input phase (greeting, quick starts, composer)
 *   3. Blueprint gallery (browse, select, dismiss)
 *   4. Generate CTA → Draft Fast → review phase
 *   5. Generate CTA → Verify Carefully → review phase
 *   6. Review workspace content (field inventory, logic rules)
 *   7. Review → Refine → Studio handoff navigation
 *   8. Phase stepper visibility and navigation
 *   9. Recent sessions sidebar
 */

import { test, expect, type Page } from '@playwright/test';

/* ── Constants ──────────────────────────────────── */

const INQUEST_E2E_URL = '/inquest/?e2e=1';
const ANALYSIS_TIMEOUT = 8000; // deterministic provider is fast, but save some buffer

/* ── Helpers ────────────────────────────────────── */

/** Navigate to the inquest app in E2E mode (deterministic provider, no API calls). */
async function gotoInquest(page: Page) {
  await page.goto(INQUEST_E2E_URL);
  await page.waitForSelector('[data-testid="stack-assistant"]');
}

/**
 * Complete the provider setup flow:
 * 1. Select Gemini provider (session gets providerId)
 * 2. Enter any API key (deterministic adapter accepts any non-empty key)
 * 3. Click "Verify Connection" → succeeds immediately
 * 4. Click "Continue to Chat"
 */
async function completeProviderSetup(page: Page) {
  await expect(page.getByText('Intelligence Setup')).toBeVisible();
  await page.getByRole('button', { name: 'Gemini' }).click();
  await page.getByPlaceholder('sk-...').fill('test-e2e-key');
  await page.getByRole('button', { name: /verify connection/i }).click();
  await page.getByRole('button', { name: /continue to chat/i }).click({ timeout: 5000 });
  // Chat composer confirms we're past setup
  await expect(page.getByPlaceholder(/describe the form you need/i)).toBeVisible();
}

/** Select a blueprint from the gallery (does NOT trigger analysis — Draft Fast stays enabled). */
async function selectBlueprint(page: Page) {
  await page.getByRole('button', { name: /browse all blueprints/i }).click();
  const useBlueprintBtns = page.getByRole('button', { name: /use blueprint/i });
  await useBlueprintBtns.first().click();
}

/** Reach the review phase via: blueprint selection → Draft Fast. */
async function reachReviewViaDraftFast(page: Page) {
  await completeProviderSetup(page);
  await selectBlueprint(page);
  await page.getByText('Draft Fast').click();
  await expect(page.getByText('Requirements review')).toBeVisible({ timeout: ANALYSIS_TIMEOUT });
}

/* ── Test Suite ─────────────────────────────────── */

test.describe('Inquest — Provider Setup', () => {
  test('shows the provider setup panel on fresh load', async ({ page }) => {
    await gotoInquest(page);
    await expect(page.getByText('Intelligence Setup')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gemini' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'OpenAI' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Anthropic' })).toBeVisible();
  });

  test('Verify Connection button is disabled until API key is entered', async ({ page }) => {
    await gotoInquest(page);
    await page.getByRole('button', { name: 'Gemini' }).click();
    await expect(page.getByRole('button', { name: /verify connection/i })).toBeDisabled();
  });

  test('shows verified state after successful connection test', async ({ page }) => {
    await gotoInquest(page);
    await page.getByRole('button', { name: 'Gemini' }).click();
    await page.getByPlaceholder('sk-...').fill('test-e2e-key');
    await page.getByRole('button', { name: /verify connection/i }).click();
    // "Verified" status indicator appears
    await expect(page.getByText(/verified/i)).toBeVisible({ timeout: 5000 });
    // "Continue to Chat" button replaces the verify button
    await expect(page.getByRole('button', { name: /continue to chat/i })).toBeVisible({ timeout: 5000 });
  });

  test('transitions to chat interface after completing setup', async ({ page }) => {
    await gotoInquest(page);
    await completeProviderSetup(page);
    // Chat is visible, setup panel is gone
    await expect(page.getByText('Intelligence Setup')).not.toBeVisible();
    await expect(page.getByPlaceholder(/describe the form you need/i)).toBeVisible();
  });

  test('Clear Credentials button resets API key field', async ({ page }) => {
    await gotoInquest(page);
    await page.getByRole('button', { name: 'Gemini' }).click();
    await page.getByPlaceholder('sk-...').fill('some-key');
    await page.getByRole('button', { name: /clear credentials/i }).click();
    await expect(page.getByPlaceholder('sk-...')).toHaveValue('');
  });
});

test.describe('Inquest — Chat and Input Phase', () => {
  test.beforeEach(async ({ page }) => {
    await gotoInquest(page);
    await completeProviderSetup(page);
  });

  test('shows the Stack greeting message in the chat thread', async ({ page }) => {
    await expect(page.getByText(/I'm Stack/i)).toBeVisible();
  });

  test('shows all four quick start buttons in welcome state', async ({ page }) => {
    await expect(page.getByRole('button', { name: /patient intake/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /grant application/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /customer survey/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /event registration/i })).toBeVisible();
  });

  test('clicking a quick start shows the message in the thread', async ({ page }) => {
    await page.getByRole('button', { name: /patient intake/i }).click();
    // The prompt text appears as a user message in the thread
    await expect(page.getByText(/patient intake/i)).toBeVisible({ timeout: 3000 });
  });

  test('clicking a quick start triggers analysis and removes the welcome section', async ({ page }) => {
    await page.getByRole('button', { name: /event registration/i }).click();
    // With the deterministic provider, analysis completes instantly → transitions to review.
    // Either way, the welcome quick-start buttons must no longer be visible.
    await expect(page.getByRole('button', { name: /event registration/i })).not.toBeVisible({
      timeout: ANALYSIS_TIMEOUT,
    });
  });

  test('composer textarea accepts input', async ({ page }) => {
    const textarea = page.getByPlaceholder(/describe the form you need/i);
    await textarea.fill('Build a volunteer application form');
    await expect(textarea).toHaveValue('Build a volunteer application form');
  });

  test('shows Generate CTA (enabled) after selecting a blueprint', async ({ page }) => {
    // Blueprint selection sets templateId → meaningfulInput=true → CTA appears.
    // Unlike quick-start clicks, blueprint selection does NOT trigger analysis,
    // so both buttons are enabled and ready to click.
    await selectBlueprint(page);
    await expect(page.getByText('Draft Fast')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Verify Carefully')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Draft Fast' })).not.toBeDisabled();
    await expect(page.getByRole('button', { name: 'Verify Carefully' })).not.toBeDisabled();
  });

  test('Blueprint gallery opens and shows templates', async ({ page }) => {
    await page.getByRole('button', { name: /browse all blueprints/i }).click();
    await expect(page.getByRole('button', { name: /use blueprint/i }).first()).toBeVisible({ timeout: 3000 });
  });

  test('Blueprint gallery dismisses when Dismiss is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /browse all blueprints/i }).click();
    await page.getByRole('button', { name: /dismiss/i }).click();
    await expect(page.getByRole('button', { name: /use blueprint/i }).first()).not.toBeVisible({
      timeout: 2000,
    });
  });

  test('selecting a blueprint activates the Generate CTA without auto-running analysis', async ({ page }) => {
    await selectBlueprint(page);
    // Both CTA buttons should be ENABLED (no analysis running)
    const draftFast = page.getByText('Draft Fast');
    const verifyCaerfully = page.getByText('Verify Carefully');
    await expect(draftFast).toBeVisible({ timeout: 3000 });
    await expect(verifyCaerfully).toBeVisible();
    // Buttons are enabled (not disabled)
    await expect(page.getByRole('button', { name: 'Draft Fast' })).not.toBeDisabled();
  });
});

test.describe('Inquest — Draft Fast → Review Phase', () => {
  test.beforeEach(async ({ page }) => {
    await gotoInquest(page);
  });

  test('transitions to Review phase and shows "Requirements review"', async ({ page }) => {
    await reachReviewViaDraftFast(page);
    await expect(page.getByText('Requirements review')).toBeVisible();
  });

  test('shows the Analysis section heading', async ({ page }) => {
    await reachReviewViaDraftFast(page);
    await expect(page.getByText('Analysis', { exact: true })).toBeVisible();
  });

  test('shows Field inventory section', async ({ page }) => {
    await reachReviewViaDraftFast(page);
    await expect(page.getByText(/field inventory/i)).toBeVisible();
  });

  test('shows Logic rules section', async ({ page }) => {
    await reachReviewViaDraftFast(page);
    await expect(page.getByText(/logic rules/i)).toBeVisible();
  });

  test('shows "Open Refine →" button (proposal is generated by Draft Fast)', async ({ page }) => {
    await reachReviewViaDraftFast(page);
    await expect(page.getByRole('button', { name: /open refine/i })).toBeVisible({
      timeout: ANALYSIS_TIMEOUT,
    });
  });

  test('shows "Scaffold ready" when proposal is generated', async ({ page }) => {
    await reachReviewViaDraftFast(page);
    await expect(page.getByText(/scaffold ready/i)).toBeVisible({ timeout: ANALYSIS_TIMEOUT });
  });
});

test.describe('Inquest — Verify Carefully → Review Phase', () => {
  test.beforeEach(async ({ page }) => {
    await gotoInquest(page);
  });

  test('transitions to Review phase after clicking Verify Carefully', async ({ page }) => {
    await completeProviderSetup(page);
    // Select a blueprint — this gives meaningful input WITHOUT triggering analysis,
    // so the Verify Carefully button is enabled and ready to click.
    await selectBlueprint(page);
    await page.getByRole('button', { name: /verify carefully/i }).click({ timeout: 3000 });
    await expect(page.getByText('Requirements review')).toBeVisible({ timeout: ANALYSIS_TIMEOUT });
  });

  test('shows "Generate scaffold" button (no proposal auto-generated in verify-carefully)', async ({ page }) => {
    await completeProviderSetup(page);
    await selectBlueprint(page);
    await page.getByText('Verify Carefully').click({ timeout: 3000 });
    await expect(page.getByText('Requirements review')).toBeVisible({ timeout: ANALYSIS_TIMEOUT });
    await expect(page.getByRole('button', { name: /generate scaffold/i })).toBeVisible();
  });

  test('generating scaffold from review shows Open Refine button', async ({ page }) => {
    await completeProviderSetup(page);
    await selectBlueprint(page);
    await page.getByText('Verify Carefully').click({ timeout: 3000 });
    await expect(page.getByText('Requirements review')).toBeVisible({ timeout: ANALYSIS_TIMEOUT });
    await page.getByRole('button', { name: /generate scaffold/i }).click();
    await expect(page.getByRole('button', { name: /open refine/i })).toBeVisible({
      timeout: ANALYSIS_TIMEOUT,
    });
  });
});

test.describe('Inquest — Refine Phase', () => {
  test('transitions to refine workspace after clicking Open Refine', async ({ page }) => {
    await gotoInquest(page);
    await reachReviewViaDraftFast(page);
    await page.getByRole('button', { name: /open refine/i }).click({ timeout: ANALYSIS_TIMEOUT });
    // Refine workspace has an "Open in Studio" button and a "← Review" back button
    await expect(page.getByRole('button', { name: /open in studio/i })).toBeVisible({ timeout: 5000 });
  });

  test('"← Review" back button navigates back to review workspace', async ({ page }) => {
    await gotoInquest(page);
    await reachReviewViaDraftFast(page);
    await page.getByRole('button', { name: /open refine/i }).click({ timeout: ANALYSIS_TIMEOUT });
    await expect(page.getByRole('button', { name: /open in studio/i })).toBeVisible({ timeout: 5000 });
    // Navigate back to review via the "← Review" back button
    await page.getByRole('button', { name: /← review/i }).click();
    await expect(page.getByText('Requirements review')).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Inquest — Phase Stepper', () => {
  test.beforeEach(async ({ page }) => {
    await gotoInquest(page);
  });

  test('shows all three phase steps in the header', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: /workflow phases/i });
    await expect(nav).toBeVisible();
    await expect(nav.getByText('Describe')).toBeVisible();
    await expect(nav.getByText('Review')).toBeVisible();
    await expect(nav.getByText('Refine')).toBeVisible();
  });

  test('Review and Refine steps are disabled on initial load', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: /workflow phases/i });
    // Buttons in the stepper that contain "Review" and "Refine" are disabled
    const reviewBtn = nav.getByRole('button').filter({ hasText: 'Review' });
    const refineBtn = nav.getByRole('button').filter({ hasText: 'Refine' });
    await expect(reviewBtn).toBeDisabled();
    await expect(refineBtn).toBeDisabled();
  });
});

test.describe('Inquest — Header and Save State', () => {
  test('shows "Stack" and "Form Builder" in the header during inputs phase', async ({ page }) => {
    await gotoInquest(page);
    await expect(page.getByText('Stack')).toBeVisible();
    await expect(page.getByText('Form Builder')).toBeVisible();
  });

  test('shows provider status pill with provider name', async ({ page }) => {
    await gotoInquest(page);
    await completeProviderSetup(page);
    // Provider pill shows "Gemini"
    await expect(page.getByText('Gemini')).toBeVisible();
  });
});

test.describe('Inquest — Recent Sessions Sidebar', () => {
  test('shows "Start fresh" or "New project" button in the sidebar', async ({ page }) => {
    await gotoInquest(page);
    // Sidebar always shows a way to start a new session
    await expect(
      page.getByRole('button', { name: /start fresh|new project|new session/i }),
    ).toBeVisible();
  });
});
