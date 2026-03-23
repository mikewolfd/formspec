#!/usr/bin/env node
/** @filedesc Assert `fel-api-runtime.js` has no tools bridge / tools wasm paths (ADR 0050). */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const path = join(here, '..', 'dist', 'fel', 'fel-api-runtime.js');
const src = readFileSync(path, 'utf8');

assert.ok(!src.includes('wasm-bridge-tools'), 'fel-runtime must not reference tools bridge');
assert.ok(!src.includes('wasm-pkg-tools'), 'fel-runtime must not reference tools wasm package path');
assert.ok(!src.includes('formspec_wasm_tools'), 'fel-runtime must not reference tools wasm module name');
