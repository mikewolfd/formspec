/** @filedesc Split runtime/tools ABI string guard — pure TS assertion (no WASM load required). */
import assert from 'node:assert/strict';
import test from 'node:test';
import { assertRuntimeToolsSplitAbiMatch } from '../dist/wasm-bridge-tools.js';

test('assertRuntimeToolsSplitAbiMatch allows identical versions', () => {
    assert.doesNotThrow(() => assertRuntimeToolsSplitAbiMatch('1', '1'));
});

test('assertRuntimeToolsSplitAbiMatch throws on mismatch', () => {
    assert.throws(
        () => assertRuntimeToolsSplitAbiMatch('1', '2'),
        /WASM runtime\/tools compatibility mismatch/,
    );
    assert.throws(
        () => assertRuntimeToolsSplitAbiMatch('1', '99'),
        /runtime ABI=1, tools ABI=99/,
    );
});
