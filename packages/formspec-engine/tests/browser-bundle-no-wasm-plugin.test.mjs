/** @filedesc Verifies Vite can bundle formspec-engine from source without vite-plugin-wasm. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fixtureDir = resolve(here, 'fixtures/no-wasm-plugin');
const viteBin = resolve(here, '../../../node_modules/vite/bin/vite.js');
const viteConfig = resolve(fixtureDir, 'vite.config.mjs');

test('vite bundles formspec-engine source without vite-plugin-wasm', () => {
    const output = execFileSync(
        process.execPath,
        [viteBin, 'build', '--config', viteConfig],
        {
            cwd: fixtureDir,
            encoding: 'utf8',
            maxBuffer: 1024 * 1024 * 10,
        },
    );

    assert.match(output, /built in/i);
});
