/** @filedesc Playwright crawl of Storybook index.json — full-page iframe screenshots + manifest (sorted, deterministic). */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ConsoleMessage } from '@playwright/test';
import { test, expect } from '@playwright/test';

type IndexJson = {
    v: number;
    entries: Record<
        string,
        {
            type: string;
            id: string;
            title?: string;
            name?: string;
        }
    >;
};

const OUT_DIR = path.join(process.cwd(), 'test-results', 'storybook-crawl');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');
const SETTLE_MS = Number(process.env.STORYBOOK_SETTLE_MS ?? '1200');

function filterStoryIds(ids: string[]): string[] {
    const prefix = process.env.STORYBOOK_STORY_PREFIX?.trim();
    const substr = process.env.STORYBOOK_STORY_FILTER?.trim();
    let out = ids;
    if (prefix) {
        out = out.filter((id) => id.startsWith(prefix));
    }
    if (substr) {
        out = out.filter((id) => id.includes(substr));
    }
    return out;
}

test.describe('Storybook story crawl', () => {
    test('screenshot every story iframe (sorted) and write manifest', async ({ page, request }) => {
        test.setTimeout(900_000);

        const res = await request.get('/index.json');
        expect(res.ok(), `index.json ${res.status()}`).toBeTruthy();
        const data = (await res.json()) as IndexJson;
        expect(data.entries).toBeTruthy();

        const allIds = Object.values(data.entries)
            .filter((e) => e.type === 'story')
            .map((e) => e.id)
            .sort((a, b) => a.localeCompare(b, 'en'));

        const ids = filterStoryIds(allIds);
        expect(ids.length, 'at least one story after filters').toBeGreaterThan(0);

        await mkdir(OUT_DIR, { recursive: true });

        const rows: Array<{
            id: string;
            title?: string;
            name?: string;
            png: string;
            consoleErrors: string[];
            ok: boolean;
        }> = [];

        for (const id of ids) {
            const meta = data.entries[id];
            const safeFile = `${id.replace(/[^a-zA-Z0-9-]+/g, '_')}.png`;
            const pngPath = path.join(OUT_DIR, safeFile);

            const consoleErrors: string[] = [];
            const handler = (msg: ConsoleMessage) => {
                if (msg.type() === 'error') {
                    consoleErrors.push(msg.text());
                }
            };
            page.on('console', handler);

            try {
                const url = `/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`;
                await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
                await page.waitForTimeout(SETTLE_MS);
                await page.screenshot({ path: pngPath, fullPage: true });
            } finally {
                page.off('console', handler);
            }

            rows.push({
                id,
                title: meta?.title,
                name: meta?.name,
                png: safeFile,
                consoleErrors,
                ok: consoleErrors.length === 0,
            });
        }

        await writeFile(
            MANIFEST,
            `${JSON.stringify({ generatedAt: new Date().toISOString(), count: rows.length, stories: rows }, null, 2)}\n`,
            'utf8',
        );

        const withErrors = rows.filter((r) => !r.ok);
        if (withErrors.length > 0) {
            // eslint-disable-next-line no-console
            console.warn(
                'Storybook crawl: console errors on',
                withErrors.length,
                'stories — see',
                MANIFEST,
            );
        }
    });
});
