import { defineConfig, devices } from '@playwright/test';

/**
 * Storybook-only Playwright project: crawls `/index.json`, screenshots every story iframe.
 * Run: `npm run test:storybook:visual`
 *
 * Optional env:
 * - `STORYBOOK_STORY_PREFIX` — only stories whose id starts with this (e.g. `adapters-uswds`)
 * - `STORYBOOK_STORY_FILTER` — substring match on story id
 */
export default defineConfig({
    testDir: './tests/storybook',
    timeout: 900_000,
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: process.env.CI ? 2 : 4,
    reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-storybook' }]],
    use: {
        baseURL: 'http://127.0.0.1:6006',
        trace: 'off',
        viewport: { width: 1500, height: 900 },
        ...devices['Desktop Chrome'],
    },
    webServer: {
        command: 'npm run storybook',
        url: 'http://127.0.0.1:6006/index.json',
        // Prefer reusing a dev server on 6006; set PW_STORYBOOK_FRESH_SERVER=1 to always spawn Storybook.
        reuseExistingServer: process.env.PW_STORYBOOK_FRESH_SERVER !== '1',
        timeout: 120_000,
    },
});
