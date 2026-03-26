/** @filedesc Resolve $ref fragments and assemble a FormDefinition via WASM. */

import type { FormDefinition } from '@formspec/types';
import type { AssemblyResult, DefinitionResolver } from '../interfaces.js';
import { cloneValue } from '../engine/helpers.js';
import { initWasmTools, isWasmToolsReady, wasmAssembleDefinition } from '../wasm-bridge-tools.js';
function parseRef(ref: string): { url: string; version?: string; fragment?: string } {
    let remainder = ref;
    let fragment: string | undefined;
    const hashIdx = remainder.indexOf('#');
    if (hashIdx !== -1) {
        fragment = remainder.slice(hashIdx + 1);
        remainder = remainder.slice(0, hashIdx);
    }
    const pipeIndex = remainder.indexOf('|');
    if (pipeIndex === -1) {
        return { url: remainder, fragment };
    }
    return {
        url: remainder.slice(0, pipeIndex),
        version: remainder.slice(pipeIndex + 1),
        fragment,
    };
}

function collectRefs(node: unknown, refs: Set<string>): void {
    if (!node || typeof node !== 'object') {
        return;
    }
    if (Array.isArray(node)) {
        for (const entry of node) {
            collectRefs(entry, refs);
        }
        return;
    }
    const object = node as Record<string, unknown>;
    if (typeof object.$ref === 'string') {
        refs.add(object.$ref);
    }
    for (const value of Object.values(object)) {
        collectRefs(value, refs);
    }
}

async function collectResolvedFragmentsAsync(
    definition: FormDefinition,
    resolver: DefinitionResolver,
): Promise<Record<string, unknown>> {
    const fragments: Record<string, unknown> = {};
    const visiting = new Set<string>();

    const visit = async (node: unknown): Promise<void> => {
        const refs = new Set<string>();
        collectRefs(node, refs);
        for (const refUri of refs) {
            const { url, version } = parseRef(refUri);
            const cacheKey = version ? `${url}|${version}` : url;
            if (cacheKey in fragments || visiting.has(cacheKey)) {
                continue;
            }
            visiting.add(cacheKey);
            const resolved = cloneValue(await resolver(url, version));
            fragments[cacheKey] = resolved;
            if (!(url in fragments)) {
                fragments[url] = resolved;
            }
            await visit(resolved);
            visiting.delete(cacheKey);
        }
    };

    await visit(definition);
    return fragments;
}

function collectResolvedFragmentsSync(
    definition: FormDefinition,
    resolver: (url: string, version?: string) => unknown,
): Record<string, unknown> {
    const fragments: Record<string, unknown> = {};
    const visiting = new Set<string>();

    const visit = (node: unknown): void => {
        const refs = new Set<string>();
        collectRefs(node, refs);
        for (const refUri of refs) {
            const { url, version } = parseRef(refUri);
            const cacheKey = version ? `${url}|${version}` : url;
            if (cacheKey in fragments || visiting.has(cacheKey)) {
                continue;
            }
            visiting.add(cacheKey);
            const resolved = cloneValue(resolver(url, version));
            fragments[cacheKey] = resolved;
            if (!(url in fragments)) {
                fragments[url] = resolved;
            }
            visit(resolved);
            visiting.delete(cacheKey);
        }
    };

    visit(definition);
    return fragments;
}

async function assembleDefinitionAsyncInternal(
    definition: FormDefinition,
    resolver: DefinitionResolver,
): Promise<AssemblyResult> {
    await initWasmTools();
    const fragments = await collectResolvedFragmentsAsync(definition, resolver);
    const result = wasmAssembleDefinition(cloneValue(definition), fragments);
    if (result.errors?.length) {
        throw new Error(result.errors.join('\n'));
    }
    return {
        definition: result.definition,
        assembledFrom: result.assembledFrom ?? [],
    };
}

function assembleDefinitionSyncInternal(
    definition: FormDefinition,
    resolver: Record<string, unknown> | ((url: string, version?: string) => unknown),
): AssemblyResult {
    if (!isWasmToolsReady()) {
        throw new Error(
            'assembleDefinitionSync requires tools WASM. Call await initFormspecEngineTools() after await initFormspecEngine(), ' +
            'or use await assembleDefinition() to load tools lazily.',
        );
    }
    const resolveOne = typeof resolver === 'function'
        ? resolver
        : (url: string, version?: string) => resolver[version ? `${url}|${version}` : url] ?? resolver[url];
    const fragments = collectResolvedFragmentsSync(definition, resolveOne);
    const result = wasmAssembleDefinition(cloneValue(definition), fragments);
    if (result.errors?.length) {
        throw new Error(result.errors.join('\n'));
    }
    return {
        definition: result.definition,
        assembledFrom: result.assembledFrom ?? [],
    };
}

export function assembleDefinitionSync(
    definition: FormDefinition,
    resolver: Record<string, unknown> | ((url: string, version?: string) => unknown),
): AssemblyResult {
    return assembleDefinitionSyncInternal(definition, resolver);
}

export async function assembleDefinition(
    definition: FormDefinition,
    resolver: DefinitionResolver,
): Promise<AssemblyResult> {
    return assembleDefinitionAsyncInternal(definition, resolver);
}
