import { expect, type Locator, type Page } from '@playwright/test';

export const STUDIO_URL = 'http://127.0.0.1:8080/studio/index.html';

export async function gotoStudio(page: Page) {
  await page.goto(STUDIO_URL);
  await expect(page.locator('.studio-root')).toBeVisible();
  await expect(page.locator('.tree-editor')).toBeVisible();
}

export function treeNodeByLabel(page: Page, label: string): Locator {
  return page.locator('.tree-node').filter({
    has: page.locator('.tree-node-label', { hasText: label }),
  });
}

export function propertyInput(page: Page, label: string): Locator {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return page
    .locator('.property-row')
    .filter({ has: page.locator('.property-label', { hasText: new RegExp(`^${escaped}`) }) })
    .locator('input:visible, select:visible')
    .first();
}

export async function selectTreeNode(page: Page, label: string) {
  await treeNodeByLabel(page, label).click();
}
