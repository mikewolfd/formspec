/** @filedesc E2E tests for the ChangesetReview component via a dedicated test harness page. */
import { test, expect } from '@playwright/test';

/**
 * Navigate to the changeset review test harness.
 * The harness mounts ChangesetReview with fixture data and an action log.
 * Use ?fixture=<name> to select: default, merged, rejected, empty.
 */
async function openHarness(page: import('@playwright/test').Page, fixture = 'default') {
  await page.goto(`/studio/changeset-review-harness.html?fixture=${fixture}`);
  await page.waitForSelector('[data-testid="changeset-review"]', { timeout: 5000 });
}

test.describe('Changeset Review UI', () => {
  test('displays changeset with dependency groups', async ({ page }) => {
    await openHarness(page);

    // Changeset review container is visible
    await expect(page.locator('[data-testid="changeset-review"]')).toBeVisible();

    // Status shows 'open'
    await expect(page.locator('[data-testid="changeset-status"]')).toHaveText('open');

    // Dependency groups section renders with 2 groups
    const groups = page.locator('[data-testid="dependency-groups"]');
    await expect(groups).toBeVisible();
    // Use direct children selector: the container has data-testid="dependency-group-N"
    // but also contains nested elements with data-testid="dependency-group-header-N" etc.
    await expect(page.locator('[data-testid="dependency-group-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="dependency-group-1"]')).toBeVisible();

    // Summary stats line shows correct counts
    const reviewRoot = page.locator('[data-testid="changeset-review"]');
    await expect(reviewRoot).toContainText('3 AI entries');
    await expect(reviewRoot).toContainText('2 groups');
  });

  test('dependency group expands on click', async ({ page }) => {
    await openHarness(page);

    const groupHeader = page.locator('[data-testid="dependency-group-header-0"]');
    await expect(groupHeader).toBeVisible();

    // Entries not visible before expanding
    await expect(page.locator('[data-testid="dependency-group-entry-0"]')).toBeHidden();

    // Click header to expand
    await groupHeader.click();

    // Now entries are visible
    await expect(page.locator('[data-testid="dependency-group-entry-0"]')).toBeVisible();
    await expect(page.locator('[data-testid="dependency-group-entry-2"]')).toBeVisible();

    // Group shows entry count badge
    await expect(groupHeader).toContainText('2 entries');

    // Group shows reason
    await expect(groupHeader).toContainText('Entry #2 depends on field created by entry #0');
  });

  test('expanded group shows tool names and summaries', async ({ page }) => {
    await openHarness(page);

    // Expand group 0
    await page.click('[data-testid="dependency-group-header-0"]');

    const entry0 = page.locator('[data-testid="dependency-group-entry-0"]');
    await expect(entry0).toContainText('formspec_field');
    await expect(entry0).toContainText('Add first name text field');

    const entry2 = page.locator('[data-testid="dependency-group-entry-2"]');
    await expect(entry2).toContainText('formspec_behavior');
    await expect(entry2).toContainText('Add required constraint to first name');
  });

  test('expanded group shows warnings on entries that have them', async ({ page }) => {
    await openHarness(page);

    // Expand group 1 (contains entry #1 which has a warning)
    await page.click('[data-testid="dependency-group-header-1"]');

    const entry1 = page.locator('[data-testid="dependency-group-entry-1"]');
    await expect(entry1).toContainText('conflicts with existing variable');
  });

  test('accept group transitions changeset to merged', async ({ page }) => {
    await openHarness(page);

    // Expand group 0 to access the accept button
    await page.click('[data-testid="dependency-group-header-0"]');

    // Click accept
    await page.click('[data-testid="accept-group-0"]');

    // Status transitions to merged
    await expect(page.locator('[data-testid="changeset-status"]')).toHaveText('merged');

    // Terminal status message shows merged text
    await expect(page.locator('[data-testid="changeset-terminal-status"]')).toContainText(
      'This changeset has been merged into the project.',
    );

    // Action log records the accept
    await expect(page.locator('[data-testid="log-entry-0"]')).toHaveText('accept-group:0');
  });

  test('reject group transitions changeset to rejected', async ({ page }) => {
    await openHarness(page);

    // Expand group 0
    await page.click('[data-testid="dependency-group-header-0"]');

    // Click reject
    await page.click('[data-testid="reject-group-0"]');

    // Status transitions to rejected
    await expect(page.locator('[data-testid="changeset-status"]')).toHaveText('rejected');

    // Terminal status message shows rejected text
    await expect(page.locator('[data-testid="changeset-terminal-status"]')).toContainText(
      'Changes were rolled back.',
    );

    // Action log records the reject
    await expect(page.locator('[data-testid="log-entry-0"]')).toHaveText('reject-group:0');
  });

  test('accept all merges entire changeset', async ({ page }) => {
    await openHarness(page);

    await page.click('[data-testid="accept-all"]');

    await expect(page.locator('[data-testid="changeset-status"]')).toHaveText('merged');
    await expect(page.locator('[data-testid="changeset-terminal-status"]')).toContainText(
      'merged into the project',
    );
    await expect(page.locator('[data-testid="log-entry-0"]')).toHaveText('accept-all');
  });

  test('reject all rolls back entire changeset', async ({ page }) => {
    await openHarness(page);

    await page.click('[data-testid="reject-all"]');

    await expect(page.locator('[data-testid="changeset-status"]')).toHaveText('rejected');
    await expect(page.locator('[data-testid="changeset-terminal-status"]')).toContainText(
      'rolled back',
    );
    await expect(page.locator('[data-testid="log-entry-0"]')).toHaveText('reject-all');
  });

  test('user overlay section is visible when user edits exist', async ({ page }) => {
    await openHarness(page);

    const overlay = page.locator('[data-testid="user-overlay"]');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('Your Edits');

    const entry0 = page.locator('[data-testid="user-overlay-entry-0"]');
    await expect(entry0).toContainText('Adjusted field label');
    await expect(entry0).toContainText('items[0].label');
  });

  test('terminal changeset disables action buttons', async ({ page }) => {
    await openHarness(page, 'merged');

    // Bulk accept/reject buttons should not be visible for terminal changesets
    await expect(page.locator('[data-testid="accept-all"]')).toBeHidden();
    await expect(page.locator('[data-testid="reject-all"]')).toBeHidden();

    // Expand a group — its accept/reject buttons should be disabled
    await page.click('[data-testid="dependency-group-header-0"]');
    await expect(page.locator('[data-testid="accept-group-0"]')).toBeDisabled();
    await expect(page.locator('[data-testid="reject-group-0"]')).toBeDisabled();

    // Terminal status message is visible
    await expect(page.locator('[data-testid="changeset-terminal-status"]')).toBeVisible();
  });

  test('rejected terminal changeset shows rejection message and disables actions', async ({ page }) => {
    await openHarness(page, 'rejected');

    await expect(page.locator('[data-testid="changeset-status"]')).toHaveText('rejected');
    await expect(page.locator('[data-testid="changeset-terminal-status"]')).toContainText(
      'rolled back',
    );

    // Bulk buttons hidden
    await expect(page.locator('[data-testid="accept-all"]')).toBeHidden();
    await expect(page.locator('[data-testid="reject-all"]')).toBeHidden();
  });

  test('empty changeset shows no-groups message', async ({ page }) => {
    await openHarness(page, 'empty');

    await expect(page.locator('[data-testid="changeset-review"]')).toBeVisible();
    await expect(page.locator('[data-testid="changeset-review"]')).toContainText(
      'No dependency groups',
    );

    // No bulk action buttons for empty changeset
    await expect(page.locator('[data-testid="accept-all"]')).toBeHidden();
    await expect(page.locator('[data-testid="reject-all"]')).toBeHidden();

    // No user overlay section
    await expect(page.locator('[data-testid="user-overlay"]')).toBeHidden();
  });
});
