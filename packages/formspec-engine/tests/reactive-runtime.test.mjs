/**
 * Reactive Runtime abstraction tests.
 *
 * Verifies that EngineReactiveRuntime exposes computed() and effect()
 * alongside the existing signal() and batch() primitives.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { preactReactiveRuntime } from '../dist/reactivity/preact-runtime.js';

test('computed() derives value from source signal', () => {
    const rt = preactReactiveRuntime;
    const source = rt.signal(2);
    const doubled = rt.computed(() => source.value * 2);

    assert.equal(doubled.value, 4);

    source.value = 5;
    assert.equal(doubled.value, 10);
});

test('computed() returns a read-only signal', () => {
    const rt = preactReactiveRuntime;
    const source = rt.signal(1);
    const derived = rt.computed(() => source.value + 1);

    // Attempting to write should throw or be ignored.
    // Preact computed signals throw on write.
    assert.throws(() => {
        derived.value = 99;
    });
});

test('effect() runs when dependency changes', () => {
    const rt = preactReactiveRuntime;
    const source = rt.signal(0);
    const observed = [];

    const dispose = rt.effect(() => {
        observed.push(source.value);
    });

    // Effect runs immediately with initial value
    assert.deepEqual(observed, [0]);

    source.value = 1;
    assert.deepEqual(observed, [0, 1]);

    source.value = 2;
    assert.deepEqual(observed, [0, 1, 2]);

    // After dispose, no more tracking
    dispose();
    source.value = 3;
    assert.deepEqual(observed, [0, 1, 2]);
});

test('computed() chains through multiple levels', () => {
    const rt = preactReactiveRuntime;
    const a = rt.signal(1);
    const b = rt.computed(() => a.value * 2);
    const c = rt.computed(() => b.value + 10);

    assert.equal(c.value, 12);

    a.value = 5;
    assert.equal(b.value, 10);
    assert.equal(c.value, 20);
});

test('batch() defers computed recalculation', () => {
    const rt = preactReactiveRuntime;
    const a = rt.signal(1);
    const b = rt.signal(1);
    const sum = rt.computed(() => a.value + b.value);
    const observed = [];

    rt.effect(() => {
        observed.push(sum.value);
    });

    // Initial
    assert.deepEqual(observed, [2]);

    // Batch update — effect should fire once, not twice
    rt.batch(() => {
        a.value = 10;
        b.value = 20;
    });

    assert.deepEqual(observed, [2, 30]);
});
