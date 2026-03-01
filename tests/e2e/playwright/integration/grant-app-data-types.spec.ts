import { test, expect } from '@playwright/test';
import {
  mountGrantApplication,
  engineSetValue,
  engineValue,
  getResponse,
} from '../helpers/grant-app';

test.describe('Grant Application: Data Types', () => {
  test.beforeEach(async ({ page }) => {
    await mountGrantApplication(page);
  });

  // ── Money Field ────────────────────────────────────────────────────

  test('should accept numeric input and store requestedAmount as money object', async ({ page }) => {
    await engineSetValue(page, 'budget.requestedAmount', 50000);
    await page.waitForTimeout(50);

    const val = await engineValue(page, 'budget.requestedAmount');
    // money type coerces number to {amount, currency}
    expect(val).toMatchObject({ amount: 50000, currency: 'USD' });
  });

  test('should accept a money object directly for requestedAmount', async ({ page }) => {
    await engineSetValue(page, 'budget.requestedAmount', { amount: 75000, currency: 'USD' });
    await page.waitForTimeout(50);

    const val = await engineValue(page, 'budget.requestedAmount');
    expect(val).toMatchObject({ amount: 75000, currency: 'USD' });
  });

  // ── multiChoice ────────────────────────────────────────────────────

  test('should render multiChoice CheckboxGroup and return array of selected values', async ({ page }) => {
    await engineSetValue(page, 'projectNarrative.focusAreas', ['health', 'environment']);
    await page.waitForTimeout(50);

    const val = await engineValue(page, 'projectNarrative.focusAreas');
    expect(Array.isArray(val)).toBe(true);
    expect(val).toContain('health');
    expect(val).toContain('environment');
  });

  test('should include focusAreas array in response data', async ({ page }) => {
    await engineSetValue(page, 'projectNarrative.focusAreas', ['education', 'equity']);
    await page.waitForTimeout(50);

    const response = await getResponse(page, 'continuous');
    expect(response.data?.projectNarrative?.focusAreas).toEqual(
      expect.arrayContaining(['education', 'equity'])
    );
  });

  // ── attachment DataType ────────────────────────────────────────────

  test('should store string value for narrativeDoc attachment field', async ({ page }) => {
    await engineSetValue(page, 'attachments.narrativeDoc', 'narrative.pdf');
    await page.waitForTimeout(50);

    const val = await engineValue(page, 'attachments.narrativeDoc');
    expect(val).toBe('narrative.pdf');
  });

  test('should store value for budgetJustification attachment field', async ({ page }) => {
    await engineSetValue(page, 'attachments.budgetJustification', 'budget.xlsx');
    await page.waitForTimeout(50);

    const val = await engineValue(page, 'attachments.budgetJustification');
    expect(val).toBe('budget.xlsx');
  });

  // ── Date Fields ────────────────────────────────────────────────────

  test('should store startDate and endDate as ISO date strings', async ({ page }) => {
    await engineSetValue(page, 'projectNarrative.startDate', '2027-01-01');
    await engineSetValue(page, 'projectNarrative.endDate', '2028-06-30');
    await page.waitForTimeout(50);

    const start = await engineValue(page, 'projectNarrative.startDate');
    const end = await engineValue(page, 'projectNarrative.endDate');
    expect(start).toBe('2027-01-01');
    expect(end).toBe('2028-06-30');
  });

  test('should calculate duration in months from date range (readonly calculate bind)', async ({ page }) => {
    await engineSetValue(page, 'projectNarrative.startDate', '2027-01-01');
    await engineSetValue(page, 'projectNarrative.endDate', '2028-01-01');
    await page.waitForTimeout(100);

    const duration = await engineValue(page, 'projectNarrative.duration');
    // dateDiff('2028-01-01', '2027-01-01', 'months') should be 12
    expect(duration).toBe(12);
  });

  test('should report duration field as readonly via engine readonlySignals (disabledDisplay: protected)', async ({ page }) => {
    // duration has readonly: "true" bind — engine marks it readonly regardless of page visibility
    const isReadonly = await page.evaluate(() => {
      const el: any = document.querySelector('formspec-render');
      return el.getEngine().readonlySignals['projectNarrative.duration']?.value;
    });
    expect(isReadonly).toBe(true);
  });

  // ── initialValue ───────────────────────────────────────────────────

  test('should initialize contactPhone with initialValue of 202-555-0100', async ({ page }) => {
    // contactPhone has initialValue: "202-555-0100" in the definition
    const val = await engineValue(page, 'applicantInfo.contactPhone');
    expect(val).toBe('202-555-0100');
  });

  // ── orgSubType (field children) ────────────────────────────────────

  test('should render orgSubType child field and include value in response', async ({ page }) => {
    await engineSetValue(page, 'applicantInfo.orgSubType', '501(c)(3)');
    await page.waitForTimeout(50);

    const response = await getResponse(page, 'continuous');
    // orgSubType is a child of orgType — it may appear as applicantInfo.orgSubType or nested
    const data = response.data?.applicantInfo;
    const subTypeInResponse =
      data?.orgSubType !== undefined ||
      data?.orgType?.orgSubType !== undefined;
    expect(subTypeInResponse).toBe(true);
  });
});
