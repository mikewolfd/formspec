import { test, expect } from '@playwright/test';
import {
  mountGrantApplication,
  engineSetValue,
  engineValue,
  goToPage,
} from '../helpers/grant-app';

test.describe('Schema Parity Phase 1: Data Type Round-Trips', () => {
  test.beforeEach(async ({ page }) => {
    await mountGrantApplication(page);
  });

  test('dateTime field accepts and validates ISO 8601 date-time', async ({ page }) => {
    await goToPage(page, 'Project Narrative');
    // submissionDeadline should be a dateTime field
    await engineSetValue(page, 'projectNarrative.submissionDeadline', '2026-12-31T23:59:59');
    await page.waitForTimeout(50);
    const val = await engineValue(page, 'projectNarrative.submissionDeadline');
    expect(val).toBe('2026-12-31T23:59:59');
  });

  test('time field accepts and validates HH:MM format', async ({ page }) => {
    await goToPage(page, 'Project Narrative');
    // meetingTime should be a time field
    await engineSetValue(page, 'projectNarrative.meetingTime', '14:30');
    await page.waitForTimeout(50);
    const val = await engineValue(page, 'projectNarrative.meetingTime');
    expect(val).toBe('14:30');
  });

  test('uri field accepts and validates URL values', async ({ page }) => {
    await goToPage(page, 'Applicant Info');
    // projectWebsite should be a uri field
    await engineSetValue(page, 'applicantInfo.projectWebsite', 'https://example.org/project');
    await page.waitForTimeout(50);
    const val = await engineValue(page, 'applicantInfo.projectWebsite');
    expect(val).toBe('https://example.org/project');
  });

  test('initialValue expression "=today()" sets startDate to today', async ({ page }) => {
    // startDate should have initialValue: "=today()" which auto-populates
    const val = await engineValue(page, 'projectNarrative.startDate');
    // Should be today's date in ISO format
    const today = new Date().toISOString().slice(0, 10);
    expect(val).toBe(today);
  });

  test('prePopulate with editable:false makes ein readonly from instance data', async ({ page }) => {
    // ein should be pre-populated from agencyData and locked (editable: false)
    const readonly = await page.evaluate(() => {
      const el: any = document.querySelector('formspec-render');
      const engine = el.getEngine();
      return engine.readonlySignals['applicantInfo.ein']?.value;
    });
    expect(readonly).toBe(true);
  });
});
