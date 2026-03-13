import { test, expect } from '@playwright/test';
import { waitForApp, switchTab, importDefinition } from './helpers';

const DATA_DEFINITION = {
  $formspec: '1.0',
  items: [
    { key: 'firstName', type: 'field', dataType: 'string', label: 'First Name' },
    { key: 'status', type: 'field', dataType: 'select1', optionSet: 'statusValues' },
    { key: 'address', type: 'group', children: [
      { key: 'street', type: 'field', dataType: 'string', label: 'Street' },
      { key: 'city', type: 'field', dataType: 'string', label: 'City' },
    ]},
  ],
  instances: [
    { name: 'countries', source: 'https://api.example.com/countries' },
  ],
  optionSets: {
    statusValues: {
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'pending', label: 'Pending' },
      ],
    },
  },
};

/** Definition with a repeatable group (members) to test bug #33 */
const REPEATABLE_DEFINITION = {
  $formspec: '1.0',
  items: [
    { key: 'name', type: 'field', dataType: 'string', label: 'Name' },
    {
      key: 'members',
      type: 'group',
      label: 'Members',
      repeatable: true,
      minRepeat: 0,
      maxRepeat: 10,
      children: [
        { key: 'mName', type: 'field', label: 'Member Name', dataType: 'string' },
      ],
    },
  ],
};

test.describe('Data Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    await importDefinition(page, DATA_DEFINITION);
    await switchTab(page, 'Data');
  });

  test('response schema tree shows fields with types', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Data"]');
    // ResponseSchema renders a JSON tree. Keys are displayed with surrounding quotes e.g. "firstName"
    await expect(workspace.getByText('"firstName"', { exact: true })).toBeVisible();
    // Type badges are rendered as uppercased spans next to each key
    // Multiple string-type fields exist; verify at least one type badge shows "string"
    await expect(workspace.getByText('string', { exact: true }).first()).toBeVisible();
    await expect(workspace.getByText('"street"', { exact: true })).toBeVisible();
    await expect(workspace.getByText('"city"', { exact: true })).toBeVisible();
  });

  test('data sources section shows instances', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Data"]');
    // Click "Sources" filter button
    await workspace.getByRole('button', { name: 'Sources' }).click();
    // Should show the instance name and source
    await expect(workspace.getByText('countries', { exact: true })).toBeVisible();
    await expect(workspace.getByText('https://api.example.com/countries', { exact: true })).toBeVisible();
  });

  test('option sets section shows option set names and values', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Data"]');
    // Click "Tables" filter button (covers Lookup Tables / Option Sets)
    await workspace.getByRole('button', { name: 'Tables' }).click();
    // Should show option set name
    await expect(workspace.getByText('statusValues')).toBeVisible();
    // Expand the card to see the option values
    await workspace.locator('[data-testid="option-set-statusValues"]').click();
    // Should show option labels inside the expanded editor table.
    // Options are rendered as <input> elements with value="Active" etc., not as visible text nodes.
    await expect(workspace.getByRole('textbox', { name: 'key' }).first()).toBeVisible();
    await expect(workspace.getByRole('textbox').filter({ hasText: '' }).nth(1)).toBeVisible();
    // Verify option values appear as textbox values in the table
    await expect(workspace.locator('tbody tr').first().locator('input').first()).toHaveValue('active');
    await expect(workspace.locator('tbody tr').first().locator('input').nth(1)).toHaveValue('Active');
    await expect(workspace.locator('tbody tr').nth(1).locator('input').first()).toHaveValue('inactive');
    await expect(workspace.locator('tbody tr').nth(2).locator('input').first()).toHaveValue('pending');
    // Should show usage count (1 field references statusValues): displayed as "1 Refs"
    await expect(workspace.getByText(/1 Ref/)).toBeVisible();
  });
});

test.describe('Data Workspace — Bug Tests', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    await importDefinition(page, DATA_DEFINITION);
    await switchTab(page, 'Data');
  });

  // BUG #2: Dark borders in light shell
  // ResponseSchema uses border-neutral-700 and border-neutral-800 (dark Tailwind colors)
  // in a light-mode shell. The correct token for light-mode borders is border-border
  // (mapped to --color-border: #e2e8f0 in index.css).
  // RED: The computed border color will be a dark neutral (~#374151 or #1f2937)
  // instead of the expected light theme border (#e2e8f0).
  test('response schema tree borders use light-theme token, not dark neutral [BUG-002]', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Data"]');
    // ResponseSchema is rendered as a div-based tree (no table).
    // The outer container has class "border border-border".
    // Wait for the key "firstName" to be visible, confirming the tree has rendered.
    await expect(workspace.getByText('"firstName"', { exact: true })).toBeVisible();

    // Get the computed border color of the outer ResponseSchema container
    // border-neutral-700 in Tailwind v3/v4 resolves to approximately #374151
    // The correct light-mode border token resolves to #e2e8f0
    const borderColor = await workspace.locator('.bg-surface.rounded-xl.border').first().evaluate((el) => {
      return window.getComputedStyle(el).borderColor;
    });

    // Parse the RGB components. Light border #e2e8f0 has high RGB values (>200).
    // Dark neutral-700 (#374151) has low RGB values (<80).
    // We assert the border is NOT dark (i.e., not a dark neutral color).
    const rgbMatch = borderColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    expect(rgbMatch).not.toBeNull();
    const [, r, g, b] = rgbMatch!.map(Number);
    // All three channels should be high (light color) for a correct light-mode border.
    // BUG: border-neutral-800 gives ~rgb(31,41,55) where r,g,b are all <60.
    expect(r).toBeGreaterThan(200);
    expect(g).toBeGreaterThan(200);
    expect(b).toBeGreaterThan(200);
  });

  // BUG #2 (continued): DataSources and OptionSets also use border-neutral-700
  test('data sources card borders use light-theme token, not dark neutral [BUG-002]', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Data"]');
    // Navigate to the Sources section via the "Sources" filter button
    await workspace.getByRole('button', { name: 'Sources' }).click();

    // The instance card has data-testid="instance-countries" and uses border-border class
    const card = workspace.locator('[data-testid="instance-countries"]');
    await expect(card).toBeVisible();

    const borderColor = await card.evaluate((el) => {
      return window.getComputedStyle(el).borderColor;
    });

    const rgbMatch = borderColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    expect(rgbMatch).not.toBeNull();
    const [, r, g, b] = rgbMatch!.map(Number);
    // BUG: border-neutral-700 resolves to ~rgb(55,65,81) — all channels below 100.
    expect(r).toBeGreaterThan(200);
    expect(g).toBeGreaterThan(200);
    expect(b).toBeGreaterThan(200);
  });

  // BUG #33: Repeatable groups show "object" instead of "array" in Response Schema.
  // ResponseSchema.tsx line: item.type === 'group' ? 'object' : (item.dataType || item.type)
  // A repeatable group (repeatable: true) should display "array" not "object".
  // RED: The current implementation does not check item.repeatable — it always
  // shows "object" for any group, including repeatable ones.
  test('repeatable group shows "array" type in Response Schema, not "object" [BUG-033]', async ({ page }) => {
    // Re-seed with a definition that has a repeatable group
    await importDefinition(page, REPEATABLE_DEFINITION);

    const workspace = page.locator('[data-testid="workspace-Data"]');
    // ResponseSchema is rendered as a div-based JSON tree (no table).
    // Wait for the members key to appear in the tree (displayed with quotes).
    await expect(workspace.getByText('"members"', { exact: true })).toBeVisible();

    // The type badge for the members group should show "array" for repeatable groups.
    // SchemaNode renders the key as an orange-colored span and the type badge next to it.
    // The key span contains the text '"members"' and is a sibling of the type badge span.
    // We locate the type badge by finding it as the sibling after '"members"' within the row.
    // Since the row div contains: [expand button span] [key span] [colon span] [type badge span] [label button]
    // we can locate the type badge as the span with class containing 'rounded' that follows the '"members"' span.
    // Strategy: find the row container that contains the '"members"' span, then get its type badge.
    const membersKeySpan = workspace.getByText('"members"', { exact: true });
    // The type badge is the next sibling span after the colon — locate it relative to the key's parent row.
    // The row is the flex container (a div with flex layout) that is the direct parent of the key span.
    const membersRow = membersKeySpan.locator('xpath=ancestor::div[contains(@class,"flex") and contains(@class,"items-center")][1]');
    await expect(membersRow).toBeVisible();

    // BUG: Currently shows "object" — should show "array" for repeatable groups.
    // The type badge text is uppercased via CSS (uppercase class), so look for "array" text.
    await expect(membersRow.getByText('array', { exact: true })).toBeVisible();
  });

  test('empty data sources state stays informational without a fake creation button', async ({ page }) => {
    // Seed with a definition that has no instances
    await importDefinition(page, {
      $formspec: '1.0',
      items: [{ key: 'name', type: 'field', dataType: 'string', label: 'Name' }],
    });

    const workspace = page.locator('[data-testid="workspace-Data"]');
    await workspace.getByRole('button', { name: 'Sources' }).click();

    await expect(workspace.getByText('No external sources connected.')).toBeVisible();
    await expect(workspace.getByRole('button', { name: /add data source/i })).toHaveCount(0);
  });

  test('Simulation section shows a working engine simulation without fake placeholder controls', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Data"]');
    // Click the "Simulation" filter button — use exact match to avoid matching "Run Simulation"
    await workspace.getByRole('button', { name: 'Simulation', exact: true }).click();

    // The Simulation section renders the TestResponse component which shows "Engine Simulation"
    await expect(workspace.getByText('Engine Simulation')).toBeVisible();
    // A real "Run Simulation" button should exist (not a disabled placeholder)
    const runBtn = workspace.getByRole('button', { name: /run simulation/i });
    await expect(runBtn).toBeVisible();
    await expect(runBtn).toBeEnabled();
    // There should be no "not yet implemented" placeholder text
    await expect(workspace.getByText(/not yet implemented/i)).toHaveCount(0);
  });

  test('option set cards are informational panels, not misleading buttons', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Data"]');
    await workspace.getByRole('button', { name: 'Tables' }).click();

    await expect(workspace.getByText('statusValues')).toBeVisible();

    const optionSetCard = workspace.locator('[data-testid="option-set-statusValues"]');
    await expect(optionSetCard).toBeVisible();
    await expect(workspace.getByRole('button', { name: /statusValues/i })).toHaveCount(0);
  });

  // BUG #54: Option labels in the expanded OptionSets table editor must have
  // accessible contrast (WCAG 4.5:1) against their background in a light-mode shell.
  // If the option row background were dark (e.g. bg-neutral-800 ≈ #1f2937) while
  // text is also dark (text-ink ≈ #0f172a), contrast would be near 1:1 (failing WCAG).
  // RED: The contrast ratio between the label text and its cell background will fail WCAG 4.5:1.
  test('option label text has accessible contrast ratio (WCAG 4.5:1) [BUG-054]', async ({ page }) => {
    const workspace = page.locator('[data-testid="workspace-Data"]');
    await workspace.getByRole('button', { name: 'Tables' }).click();

    // Expand the statusValues card to reveal the option editor table
    await workspace.locator('[data-testid="option-set-statusValues"]').click();

    // Wait for the expanded editor table to be visible (options are <input> elements with values)
    await expect(workspace.locator('tbody tr').first()).toBeVisible();
    // Verify the first row label input has value "Active"
    await expect(workspace.locator('tbody tr').first().locator('input').nth(1)).toHaveValue('Active');

    // Get the computed colors of the table row containing the "Active" label.
    // The label is rendered in an <input> inside a <td> inside a <tr>.
    // We check contrast of the <input> element's text color against the nearest
    // opaque ancestor background. Semi-transparent backgrounds (rgba with alpha < 1)
    // are blended against white (the shell background) for a conservative estimate.
    const rowColors = await workspace.locator('tbody tr').first().locator('input').nth(1).evaluate((el) => {
      // Helper: parse any rgb/rgba color string into [r, g, b, a]
      function parseColor(colorStr: string): [number, number, number, number] | null {
        const m = colorStr.match(/rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*(\d+(?:\.\d+)?))?\)/);
        if (!m) return null;
        return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), m[4] !== undefined ? parseFloat(m[4]) : 1];
      }

      // Walk up the tree to find the effective background color.
      // Collect semi-transparent layers and blend them against white (255,255,255).
      const style = window.getComputedStyle(el);
      const fgColor = style.color;

      // Walk up from the element to the document root collecting background layers
      let compositeR = 255, compositeG = 255, compositeB = 255; // start with white base
      let foundOpaque = false;
      let node: Element | null = el;
      const layers: [number, number, number, number][] = [];

      while (node) {
        const bg = window.getComputedStyle(node).backgroundColor;
        const parsed = parseColor(bg);
        if (parsed && parsed[3] > 0) {
          layers.unshift(parsed); // collect from outermost to innermost
          if (parsed[3] >= 1) { foundOpaque = true; break; }
        }
        node = node.parentElement;
      }

      // Blend layers top-down over white base
      if (layers.length > 0) {
        for (const [r, g, b, a] of layers) {
          compositeR = Math.round(r * a + compositeR * (1 - a));
          compositeG = Math.round(g * a + compositeG * (1 - a));
          compositeB = Math.round(b * a + compositeB * (1 - a));
        }
      }

      return {
        color: fgColor,
        backgroundColor: `rgb(${compositeR}, ${compositeG}, ${compositeB})`,
        foundOpaque,
      };
    });

    // Helper: parse rgb() string to [r, g, b]
    function parseRgb(colorStr: string): [number, number, number] | null {
      const m = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!m) return null;
      return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
    }

    // Helper: compute relative luminance per WCAG 2.1
    function relativeLuminance(r: number, g: number, b: number): number {
      const toLinear = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    }

    // Helper: compute contrast ratio between two luminances
    function contrastRatio(l1: number, l2: number): number {
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    const fgRgb = parseRgb(rowColors.color);
    const bgRgb = parseRgb(rowColors.backgroundColor);

    expect(fgRgb).not.toBeNull();
    expect(bgRgb).not.toBeNull();

    const fgLum = relativeLuminance(...fgRgb!);
    const bgLum = relativeLuminance(...bgRgb!);
    const ratio = contrastRatio(fgLum, bgLum);

    // WCAG AA requires 4.5:1 for normal text.
    // BUG: bg-neutral-800 (#1f2937 ≈ rgb(31,41,55)) as row background with dark
    // text gives dark-on-dark — contrast near 1:1.
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
