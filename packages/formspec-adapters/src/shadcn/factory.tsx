/** @filedesc React-to-adapter bridge — wraps React components as AdapterRenderFns. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { AdapterRenderFn, AdapterContext } from 'formspec-webcomponent';

/**
 * Bridge a React component into the formspec adapter contract.
 *
 * The factory creates an `AdapterRenderFn` that:
 * 1. Renders the React component directly into the parent via `flushSync`
 * 2. Registers cleanup (unmount) on `actx.onDispose`
 *
 * React components should call `behavior.bind(refs)` in `useLayoutEffect`
 * so the bind completes within the synchronous `flushSync` window.
 *
 * No wrapper div is created — React renders directly into the parent,
 * matching how imperative adapters append to parent.
 */
export function createReactAdapter<B>(
    Component: React.ComponentType<{ behavior: B }>,
): AdapterRenderFn<B> {
    return (behavior: B, parent: HTMLElement, actx: AdapterContext) => {
        const root = createRoot(parent);

        flushSync(() => {
            root.render(<Component behavior={behavior} />);
        });

        actx.onDispose(() => {
            root.unmount();
        });
    };
}
