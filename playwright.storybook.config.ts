/** @filedesc Playwright config for Storybook (port 6006); run `npm run storybook` before tests. */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/storybook',
    fullyParallel: false,
    workers: 1,
    reporter: 'list',
    use: {
        baseURL: process.env.STORYBOOK_URL ?? 'http://127.0.0.1:6006',
        trace: 'off',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
