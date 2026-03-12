import { test, expect } from '@playwright/test';
import { waitForApp, switchTab, seedDefinition, seedProject, dispatch } from './helpers';

test.describe('Cross-Workspace Authoring', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
  });

  test('Editor → Data → Preview round-trip', async ({ page }) => {
    const definition = {
      $formspec: '1.0',
      items: [
        { key: 'firstName', type: 'field', dataType: 'string', label: 'First Name' },
        { key: 'lastName', type: 'field', dataType: 'string', label: 'Last Name' },
        { key: 'dob', type: 'field', dataType: 'date', label: 'Date of Birth' },
      ],
    };

    await seedDefinition(page, definition);

    // Editor: verify 3 field blocks are visible
    const canvas = page.locator('[data-testid="workspace-Editor"]');
    await expect(canvas.locator('[data-testid="field-firstName"]')).toBeVisible();
    await expect(canvas.locator('[data-testid="field-lastName"]')).toBeVisible();
    await expect(canvas.locator('[data-testid="field-dob"]')).toBeVisible();

    // Switch to Data tab — all 3 fields should appear in the response schema
    await switchTab(page, 'Data');
    const dataWorkspace = page.locator('[data-testid="workspace-Data"]');
    await expect(dataWorkspace.getByText('firstName', { exact: true })).toBeVisible();
    await expect(dataWorkspace.getByText('lastName', { exact: true })).toBeVisible();
    await expect(dataWorkspace.getByText('dob', { exact: true })).toBeVisible();

    // Switch to Preview tab — 3 form inputs should render
    await switchTab(page, 'Preview');
    const previewWorkspace = page.locator('[data-testid="workspace-Preview"]');
    await expect(previewWorkspace.getByLabel('First Name')).toBeVisible();
    await expect(previewWorkspace.getByLabel('Last Name')).toBeVisible();
    await expect(previewWorkspace.getByLabel('Date of Birth')).toBeVisible();
  });

  test('Editor → Logic round-trip with required bind', async ({ page }) => {
    const definition = {
      $formspec: '1.0',
      items: [{ key: 'income', type: 'field', dataType: 'decimal', label: 'Income' }],
      binds: { income: { required: 'true' } },
    };

    await seedDefinition(page, definition);

    // Editor: field block shows "Required" pill
    const canvas = page.locator('[data-testid="workspace-Editor"]');
    const incomeBlock = canvas.locator('[data-testid="field-income"]');
    await expect(incomeBlock).toBeVisible();
    await expect(incomeBlock.getByText('req')).toBeVisible();

    // Switch to Logic tab — bind appears with "required (1)" in FilterBar
    await switchTab(page, 'Logic');
    await expect(page.getByText(/required \(1\)/)).toBeVisible();

    // Switch back to Editor tab — income field still shows "Required" pill
    await switchTab(page, 'Editor');
    const incomeBlockAgain = page.locator('[data-testid="workspace-Editor"]').locator('[data-testid="field-income"]');
    await expect(incomeBlockAgain).toBeVisible();
    await expect(incomeBlockAgain.getByText('req')).toBeVisible();
  });

  test('Full authoring cycle — all workspaces show seeded content', async ({ page }) => {
    const projectState = {
      definition: {
        $formspec: '1.0',
        items: [
          { key: 'name', type: 'field', dataType: 'string', label: 'Name' },
          { key: 'email', type: 'field', dataType: 'string', label: 'Email' },
          { key: 'age', type: 'field', dataType: 'integer', label: 'Age' },
          { key: 'address', type: 'group', label: 'Address', children: [
            { key: 'street', type: 'field', dataType: 'string', label: 'Street' },
          ]},
        ],
        binds: [
          { path: 'name', required: 'true' },
          { path: 'age', constraint: '$age >= 0' },
        ],
        shapes: [
          { id: 'ageCheck', target: 'age', severity: 'error', constraint: '$age >= 0', message: '' },
        ],
      },
      theme: {
        tokens: { primaryColor: '#3b82f6', spacing: '8px' },
      },
      mapping: {
        direction: 'outbound',
        definitionRef: 'urn:formspec:test',
        rules: [
          { source: 'name', target: 'fullName', transform: 'preserve' },
        ],
        adapter: { format: 'JSON', options: {} },
      },
    };

    await seedProject(page, projectState);

    // Editor: all items visible
    const editorWorkspace = page.locator('[data-testid="workspace-Editor"]');
    await expect(editorWorkspace.locator('[data-testid="field-name"]')).toBeVisible();
    await expect(editorWorkspace.locator('[data-testid="field-email"]')).toBeVisible();
    await expect(editorWorkspace.locator('[data-testid="field-age"]')).toBeVisible();
    await expect(editorWorkspace.locator('[data-testid="group-address"]')).toBeVisible();

    // Logic: bind and shape visible
    await switchTab(page, 'Logic');
    const logicWorkspace = page.locator('[data-testid="workspace-Logic"]');
    await expect(page.getByText(/required \(1\)/)).toBeVisible();
    await expect(logicWorkspace.getByText('ageCheck')).toBeVisible();

    // Data: response schema shows fields
    await switchTab(page, 'Data');
    const dataWorkspace = page.locator('[data-testid="workspace-Data"]');
    await expect(dataWorkspace.getByText('name', { exact: true })).toBeVisible();
    await expect(dataWorkspace.getByText('email', { exact: true })).toBeVisible();

    // Theme: tokens render
    await switchTab(page, 'Theme');
    const themeWorkspace = page.locator('[data-testid="workspace-Theme"]');
    await expect(themeWorkspace.getByText('primaryColor', { exact: true })).toBeVisible();
    await expect(themeWorkspace.getByText('#3b82f6', { exact: true })).toBeVisible();

    // Mapping: rule renders
    await switchTab(page, 'Mapping');
    const mappingWorkspace = page.locator('[data-testid="workspace-Mapping"]');
    await expect(mappingWorkspace.getByText('outbound')).toBeVisible();

    // Preview: form renders with all fields
    await switchTab(page, 'Preview');
    const previewWorkspace = page.locator('[data-testid="workspace-Preview"]');
    await expect(previewWorkspace.getByLabel('Name')).toBeVisible();
    await expect(previewWorkspace.getByLabel('Email')).toBeVisible();

    // Go back to Editor, add a new field via dispatch (creates undoable history entry)
    await switchTab(page, 'Editor');
    await dispatch(page, {
      type: 'definition.addItem',
      payload: { key: 'tempField', type: 'field', dataType: 'string' },
    });
    await page.waitForSelector('[data-testid="field-tempField"]', { timeout: 5000 });

    // Undo the last action — tempField should disappear
    await page.click('[data-testid="undo-btn"]');
    await expect(page.locator('[data-testid="field-tempField"]')).not.toBeVisible();

    // Redo button is now enabled
    await expect(page.locator('[data-testid="redo-btn"]')).not.toBeDisabled();

    // Redo restores tempField
    await page.click('[data-testid="redo-btn"]');
    await expect(page.locator('[data-testid="field-tempField"]')).toBeVisible();
  });
});
