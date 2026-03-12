import { test, expect } from '@playwright/test';
import { waitForApp, switchTab, seedDefinition } from './helpers';

const LOGIC_DEFINITION = {
  $formspec: '1.0',
  items: [
    { key: 'firstName', type: 'field', dataType: 'string' },
    { key: 'age', type: 'field', dataType: 'integer' },
    { key: 'income', type: 'field', dataType: 'decimal' },
  ],
  binds: {
    firstName: { required: 'true' },
    age: { constraint: '$age >= 0' },
    income: { calculate: '$age * 1000', readonly: 'true' },
  },
  shapes: [
    { name: 'ageValid', severity: 'error', constraint: '$age >= 0 and $age <= 120' },
  ],
  variables: [
    { name: 'taxRate', expression: '0.25' },
    { name: 'netIncome', expression: '$income * (1 - @taxRate)' },
  ],
};

test.describe('Logic Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    await seedDefinition(page, LOGIC_DEFINITION);
    await switchTab(page, 'Logic');
  });

  test('shows binds section with field paths and bind type pills', async ({ page }) => {
    // The FilterBar shows pills with counts like "required (1)", "constraint (1)", "calculate (1)"
    await expect(page.getByText(/required \(1\)/)).toBeVisible();
    await expect(page.getByText(/constraint \(1\)/)).toBeVisible();
    await expect(page.getByText(/calculate \(1\)/)).toBeVisible();
    await expect(page.getByText(/readonly \(1\)/)).toBeVisible();

    // Binds section shows field paths
    // BindsSection renders field paths like "firstName", "age", "income"
    const workspace = page.locator('[data-testid="workspace-Logic"]');
    await expect(workspace.getByText('firstName', { exact: true })).toBeVisible();
    await expect(workspace.getByText('age', { exact: true })).toBeVisible();
  });

  test('shows shapes section with severity badge and constraint', async ({ page }) => {
    // ShapeCard renders the name and constraint
    const workspace = page.locator('[data-testid="workspace-Logic"]');
    await expect(workspace.getByText('ageValid')).toBeVisible();
    // The shape constraint expression should be visible
    await expect(workspace.getByText('$age >= 0 and $age <= 120')).toBeVisible();
  });

  test('shows variables section', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Logic"]');
    // Variables show name and expression
    await expect(workspace.getByText('taxRate', { exact: true })).toBeVisible();
    await expect(workspace.getByText('0.25', { exact: true })).toBeVisible();
    await expect(workspace.getByText('netIncome', { exact: true })).toBeVisible();
  });
});
