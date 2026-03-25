/** @filedesc Assert tools WASM is fetched at most once; idempotent init + two tokenize calls reuse one module (ADR 0050 §8). */
import { test, expect } from '@playwright/test';

function isToolsWasmAssetUrl(url: string): boolean {
    if (!url.includes('.wasm')) {
        return false;
    }
    return url.includes('formspec_wasm_tools') || url.includes('wasm-pkg-tools');
}

test.describe('WASM tools network (main harness)', () => {
    test('tools WASM loads at most once during startup; one total fetch for idempotent init + two tokenize calls', async ({ page }) => {
        const toolsWasmUrls: string[] = [];

        page.on('response', (response) => {
            const url = response.url();
            if (isToolsWasmAssetUrl(url)) {
                toolsWasmUrls.push(url);
            }
        });

        await page.goto('/');
        await page.waitForFunction(() => (window as unknown as { __wasmReady?: boolean }).__wasmReady === true, {}, {
            timeout: 15000,
        });

        // Main harness loads tools WASM before __wasmReady so <formspec-render> can plan layouts.
        expect(
            toolsWasmUrls.length,
            `Expected at most one tools WASM fetch during startup; got ${toolsWasmUrls.length}: ${toolsWasmUrls.join(' | ')}`,
        ).toBeLessThanOrEqual(1);

        await page.evaluate(async () => {
            const w = window as unknown as {
                initFormspecEngineTools?: () => Promise<void>;
                tokenizeFEL?: (expr: string) => unknown;
            };
            await w.initFormspecEngineTools?.();
            w.tokenizeFEL?.('1 + 2');
            w.tokenizeFEL?.('3 + 4');
        });

        expect(
            toolsWasmUrls.length,
            `Expected exactly one tools WASM request; got ${toolsWasmUrls.length}: ${toolsWasmUrls.join(' | ')}`,
        ).toBe(1);
    });
});
