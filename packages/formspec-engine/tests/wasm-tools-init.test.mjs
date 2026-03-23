/** @filedesc initFormspecEngineTools idempotence (global setup already loads tools once). */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
    initFormspecEngineTools,
    isFormspecEngineToolsInitialized,
} from '../dist/init-formspec-engine.js';

test('initFormspecEngineTools is idempotent', async () => {
    assert.equal(isFormspecEngineToolsInitialized(), true);
    await initFormspecEngineTools();
    await initFormspecEngineTools();
    assert.equal(isFormspecEngineToolsInitialized(), true);
});
