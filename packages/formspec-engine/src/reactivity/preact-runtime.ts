/** @filedesc Default FormEngine reactive layer using `@preact/signals-core`. */

import {
    batch as preactBatch,
    computed as preactComputed,
    effect as preactEffect,
    signal as preactSignal,
} from '@preact/signals-core';
import type { EngineReactiveRuntime } from './types.js';

export const preactReactiveRuntime: EngineReactiveRuntime = {
    signal: <T>(initial: T) => preactSignal(initial),
    computed: <T>(fn: () => T) => preactComputed(fn),
    effect: (fn: () => void) => preactEffect(fn),
    batch: <T>(fn: () => T) => preactBatch(fn),
};
