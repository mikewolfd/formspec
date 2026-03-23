#!/usr/bin/env node
/** @filedesc Assert compiled `init-formspec-engine.js` has no static tools-wasm path (ADR 0050 §8). */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const initPath = join(here, '..', 'dist', 'init-formspec-engine.js');
const src = readFileSync(initPath, 'utf8');

assert.ok(!src.includes('wasm-pkg-tools'), 'init entry must not reference tools wasm package path');
assert.ok(!src.includes('formspec_wasm_tools'), 'init entry must not reference tools wasm module name');
assert.ok(src.includes('wasm-bridge-runtime'), 'init entry should load runtime bridge only');
