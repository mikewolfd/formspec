/** @filedesc Asserts runtime-only init does not load tools WASM (ADR 0050). No global test setup import. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
    initFormspecEngine,
    isFormspecEngineToolsInitialized,
} from '../../dist/init-formspec-engine.js';
import { isWasmToolsReady, wasmTokenizeFEL } from '../../dist/wasm-bridge.js';

test('initFormspecEngine leaves tools WASM unloaded', async () => {
    await initFormspecEngine();
    assert.equal(isWasmToolsReady(), false);
    assert.equal(isFormspecEngineToolsInitialized(), false);
});

test('tools bridge throws until initFormspecEngineTools', async () => {
    await initFormspecEngine();
    assert.throws(
        () => wasmTokenizeFEL('$a + 1'),
        /tools WASM/,
    );
});
