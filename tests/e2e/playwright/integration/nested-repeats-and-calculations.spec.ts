import { test, expect } from '@playwright/test';
import {
  mountGrantApplication,
  engineSetValue,
  engineValue,
  engineVariable,
  addRepeatInstance,
} from '../helpers/grant-app';

test.describe('Integration: Nested Repeats and Cross-Group Calculations', () => {
  test.beforeEach(async ({ page }) => {
    await mountGrantApplication(page);
  });

  test('should compute taskCost from hours × hourlyRate in a nested repeat', async ({ page }) => {
    await addRepeatInstance(page, 'projectPhases');
    await engineSetValue(page, 'projectPhases[0].phaseName', 'Phase One');
    await addRepeatInstance(page, 'projectPhases[0].phaseTasks');
    await engineSetValue(page, 'projectPhases[0].phaseTasks[0].hours', 10);
    await engineSetValue(page, 'projectPhases[0].phaseTasks[0].hourlyRate', { amount: 50, currency: 'USD' });
    await page.waitForTimeout(100);

    const taskCost = await engineValue(page, 'projectPhases[0].phaseTasks[0].taskCost');
    expect(taskCost).toMatchObject({ amount: 500, currency: 'USD' });
  });

  test('should aggregate phaseTotal from all tasks in a phase', async ({ page }) => {
    await addRepeatInstance(page, 'projectPhases');
    await addRepeatInstance(page, 'projectPhases[0].phaseTasks');
    await engineSetValue(page, 'projectPhases[0].phaseTasks[0].hours', 10);
    await engineSetValue(page, 'projectPhases[0].phaseTasks[0].hourlyRate', { amount: 50, currency: 'USD' });

    await addRepeatInstance(page, 'projectPhases[0].phaseTasks');
    await engineSetValue(page, 'projectPhases[0].phaseTasks[1].hours', 5);
    await engineSetValue(page, 'projectPhases[0].phaseTasks[1].hourlyRate', { amount: 100, currency: 'USD' });
    await page.waitForTimeout(100);

    // phaseTotal = 500 + 500 = 1000
    const phaseTotal = await engineValue(page, 'projectPhases[0].phaseTotal');
    expect(phaseTotal).toMatchObject({ amount: 1000, currency: 'USD' });
  });

  test('should aggregate @projectPhasesTotal across multiple phases', async ({ page }) => {
    await addRepeatInstance(page, 'projectPhases');
    await addRepeatInstance(page, 'projectPhases[0].phaseTasks');
    await engineSetValue(page, 'projectPhases[0].phaseTasks[0].hours', 10);
    await engineSetValue(page, 'projectPhases[0].phaseTasks[0].hourlyRate', { amount: 100, currency: 'USD' });

    await addRepeatInstance(page, 'projectPhases');
    await addRepeatInstance(page, 'projectPhases[1].phaseTasks');
    await engineSetValue(page, 'projectPhases[1].phaseTasks[0].hours', 5);
    await engineSetValue(page, 'projectPhases[1].phaseTasks[0].hourlyRate', { amount: 200, currency: 'USD' });
    await page.waitForTimeout(100);

    // phase[0]=1000, phase[1]=1000 → total=2000
    const total = await engineVariable(page, 'projectPhasesTotal');
    expect(total).toMatchObject({ amount: 2000, currency: 'USD' });
  });

  test('should update phaseTotal when a task is removed', async ({ page }) => {
    await addRepeatInstance(page, 'projectPhases');
    await addRepeatInstance(page, 'projectPhases[0].phaseTasks');
    await engineSetValue(page, 'projectPhases[0].phaseTasks[0].hours', 10);
    await engineSetValue(page, 'projectPhases[0].phaseTasks[0].hourlyRate', { amount: 100, currency: 'USD' });

    await addRepeatInstance(page, 'projectPhases[0].phaseTasks');
    await engineSetValue(page, 'projectPhases[0].phaseTasks[1].hours', 5);
    await engineSetValue(page, 'projectPhases[0].phaseTasks[1].hourlyRate', { amount: 100, currency: 'USD' });
    await page.waitForTimeout(50);

    const before = await engineValue(page, 'projectPhases[0].phaseTotal');
    expect(before).toMatchObject({ amount: 1500, currency: 'USD' });

    await page.evaluate(() => {
      const el: any = document.querySelector('formspec-render');
      el.getEngine().removeRepeatInstance('projectPhases[0].phaseTasks', 0);
    });
    await page.waitForTimeout(100);

    const after = await engineValue(page, 'projectPhases[0].phaseTotal');
    expect(after).toMatchObject({ amount: 500, currency: 'USD' });
  });

  test('should include nested phase data in continuous response', async ({ page }) => {
    await addRepeatInstance(page, 'projectPhases');
    await engineSetValue(page, 'projectPhases[0].phaseName', 'Design');
    await addRepeatInstance(page, 'projectPhases[0].phaseTasks');
    await engineSetValue(page, 'projectPhases[0].phaseTasks[0].taskName', 'Wireframes');
    await engineSetValue(page, 'projectPhases[0].phaseTasks[0].hours', 8);
    await engineSetValue(page, 'projectPhases[0].phaseTasks[0].hourlyRate', { amount: 75, currency: 'USD' });
    await page.waitForTimeout(100);

    const response = await page.evaluate(() => {
      const el: any = document.querySelector('formspec-render');
      return el.getEngine().getResponse({ mode: 'continuous' });
    });

    expect(response.data?.projectPhases?.[0]?.phaseName).toBe('Design');
    expect(response.data?.projectPhases?.[0]?.phaseTasks?.[0]?.taskName).toBe('Wireframes');
    expect(response.data?.projectPhases?.[0]?.phaseTasks?.[0]?.taskCost).toMatchObject({ amount: 600, currency: 'USD' });
  });
});
