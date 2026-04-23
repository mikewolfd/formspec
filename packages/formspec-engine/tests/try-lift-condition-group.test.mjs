/** @filedesc JSON shape for `tryLiftConditionGroup` (tools WASM). */
import assert from 'node:assert/strict';
import test from 'node:test';
import { wasmTryLiftConditionGroup } from '../dist/wasm-bridge-tools.js';

test('tryLiftConditionGroup matches Studio condition JSON shape', () => {
    const lifted = wasmTryLiftConditionGroup('$a = 1 and $b > 2');
    assert.equal(lifted.status, 'lifted');
    assert.equal(lifted.logic, 'and');
    assert.equal(lifted.conditions.length, 2);
    assert.deepEqual(lifted.conditions[0], { field: 'a', operator: 'eq', value: '1' });
    assert.deepEqual(lifted.conditions[1], { field: 'b', operator: 'gt', value: '2' });

    const unlift = wasmTryLiftConditionGroup('$a = 1 and $b = 2 or $c = 3');
    assert.equal(unlift.status, 'unlifted');
    assert.equal(unlift.valid, true);
    assert.match(unlift.reason, /logical/i);

    const bad = wasmTryLiftConditionGroup('$x ==');
    assert.equal(bad.status, 'unlifted');
    assert.equal(bad.valid, false);
});
