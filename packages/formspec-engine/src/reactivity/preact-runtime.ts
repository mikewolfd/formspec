/** @filedesc Default FormEngine reactive layer using `@preact/signals-core`. */

import { batch as preactBatch, signal as preactSignal } from '@preact/signals-core';
import type { EngineReactiveRuntime } from './types.js';

export const preactReactiveRuntime: EngineReactiveRuntime = {
    signal: <T>(initial: T) => preactSignal(initial),
    batch: <T>(fn: () => T) => preactBatch(fn),
};
