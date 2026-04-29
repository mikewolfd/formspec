import { test, expect } from '@playwright/test';
import { waitForApp } from './helpers';

test.describe('Studio Design Mode', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    // Switch to design mode
    await page.click('[data-testid="mode-toggle-design"]');
    await expect(page.locator('[data-testid="authoring-overlay"]')).toBeVisible();
  });

  test('selection ring shows design handle and resize handles', async ({ page }) => {
    const field = page.locator('[data-name="firstName"]');
    await field.click();

    const ring = page.locator('[data-testid="selection-ring"]');
    await expect(ring).toBeVisible();
    await expect(ring).toContainText('Design');
    
    // Resize handles should be visible in design mode
    const resizeHandle = page.locator('.cursor-ew-resize');
    await expect(resizeHandle).toBeVisible();
  });

  test('toggles component variants via selection ring', async ({ page }) => {
    const field = page.locator('[data-name="firstName"]');
    await field.click();

    const outlineBtn = page.locator('button:has-text("Outline")');
    await expect(outlineBtn).toBeVisible();
    await outlineBtn.click();

    // Verify it stays active
    await expect(outlineBtn).toHaveClass(/bg-accent\/10/);
  });

  test('detects region drop targets for header/footer', async ({ page }) => {
    // First, ensure regions are active in the theme
    // We might need to toggle them via the Design sidebar if the fixture doesn't have them
    await page.click('button:has-text("Structure & Regions")');
    const headerToggle = page.locator('div:has-text("Header") button');
    await headerToggle.click();

    const field = page.locator('[data-name="firstName"]');
    const handle = page.locator('[title="Drag to reorder"]');
    
    await field.hover();
    await field.click();
    
    await handle.hover();
    await page.mouse.down();
    
    // Drag to the header area
    const headerRegion = page.locator('[data-region-id="header"]');
    await headerRegion.hover();
    
    // Drop
    await page.mouse.up();
    
    // Verify the field is now in the header (via DOM structure check)
    await expect(headerRegion.locator('[data-name="firstName"]')).toBeVisible();
  });

  test('resizes field width (span) via drag handles', async ({ page }) => {
    const field = page.locator('[data-name="firstName"]');
    await field.click();

    const ring = page.locator('[data-testid="selection-ring"]');
    const handle = ring.locator('.cursor-ew-resize').first(); // Right handle
    
    const initialBox = await field.boundingBox();
    if (!initialBox) throw new Error('Could not get initial bounding box');

    await handle.hover();
    await page.mouse.down();
    
    // Drag left to decrease span (-50px is a safer relative drag than -200px to avoid viewport edge cases)
    await page.mouse.move(initialBox.x + initialBox.width - 50, initialBox.y + initialBox.height / 2, { steps: 5 });
    await page.mouse.up();

    // The field should be smaller now
    const newBox = await field.boundingBox();
    if (!newBox) throw new Error('Could not get new bounding box');
    
    expect(newBox.width).toBeLessThan(initialBox.width);
  });
});
