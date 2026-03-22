/** @filedesc Factory for FormEngine instances. */

import type { FormDefinition } from 'formspec-types';
import type { FormEngineRuntimeContext, RegistryEntry } from '../interfaces.js';
import { preactReactiveRuntime } from '../reactivity/preact-runtime.js';
import type { EngineReactiveRuntime } from '../reactivity/types.js';
import { FormEngine } from './FormEngine.js';

export function createFormEngine(
    definition: FormDefinition,
    context?: FormEngineRuntimeContext,
    registryEntries?: RegistryEntry[],
    reactiveRuntime: EngineReactiveRuntime = preactReactiveRuntime,
): FormEngine {
    return new FormEngine(definition, context, registryEntries, reactiveRuntime);
}
