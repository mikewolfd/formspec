#!/usr/bin/env node
/** @filedesc Assert compiled `engine-render-entry.js` has no static `fel-api` / tools bridge / tools wasm paths (ADR 0050 §8). */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const path = join(here, '..', 'dist', 'engine-render-entry.js');
const src = readFileSync(path, 'utf8');

assert.ok(!src.includes('./fel/fel-api'), 'render entry must not import fel tooling facade module');
assert.ok(!src.includes('wasm-bridge-tools'), 'render entry must not statically reference tools bridge');
assert.ok(!src.includes('wasm-pkg-tools'), 'render entry must not reference tools wasm package path');
assert.ok(!src.includes('formspec_wasm_tools'), 'render entry must not reference tools wasm module name');
