/** @filedesc Asserts tools JS glue is dynamically imported at most once across repeated initWasmTools (ADR 0050 §8). */
import assert from 'node:assert/strict';
import test from 'node:test';
import { initFormspecEngine, initFormspecEngineTools } from '../../dist/init-formspec-engine.js';
import {
    getToolsWasmDynamicImportCountForTest,
    resetToolsWasmDynamicImportCountForTest,
} from '../../dist/wasm-bridge-tools.js';

test('initWasmTools triggers one dynamic import; second init reuses', async () => {
    resetToolsWasmDynamicImportCountForTest();
    await initFormspecEngine();
    assert.equal(getToolsWasmDynamicImportCountForTest(), 0);
    await initFormspecEngineTools();
    assert.equal(getToolsWasmDynamicImportCountForTest(), 1);
    await initFormspecEngineTools();
    assert.equal(getToolsWasmDynamicImportCountForTest(), 1);
});
