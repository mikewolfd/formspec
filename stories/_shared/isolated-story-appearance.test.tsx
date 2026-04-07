// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { initFormspecEngine } from '@formspec-org/engine/init-formspec-engine';
import { IsolatedFormStory } from './IsolatedFormStory';
import { IsolatedWebComponentStory } from './IsolatedWebComponentStory';
import { contactFormDef } from './definitions';

beforeAll(async () => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    await initFormspecEngine();
});

async function renderStory(element: React.ReactElement): Promise<HTMLDivElement> {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
        root.render(element);
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
    });
    return container;
}

function findShadowHost(container: HTMLDivElement): HTMLDivElement | null {
    return Array.from(container.querySelectorAll('div')).find((el) => !!(el as HTMLDivElement).shadowRoot) as HTMLDivElement | null;
}

describe('isolated story appearance wrappers', () => {
    it('applies the forced light appearance class directly on the React formspec container', async () => {
        const container = await renderStory(
            <IsolatedFormStory definition={contactFormDef} showSubmit={false} appearance="light" />,
        );

        const host = findShadowHost(container);
        const shadowRoot = host?.shadowRoot;

        expect(shadowRoot).toBeTruthy();
        expect(shadowRoot?.querySelector('.formspec-container.formspec-appearance-light')).not.toBeNull();
    });

    it('drives the web component through a native appearance attribute instead of injected token CSS', async () => {
        const container = await renderStory(
            <IsolatedWebComponentStory definition={contactFormDef} showSubmit={false} appearance="light" />,
        );

        const host = findShadowHost(container);
        const shadowRoot = host?.shadowRoot;
        const formspecElement = shadowRoot?.querySelector('formspec-render') as HTMLElement | null;
        const styleText = Array.from(shadowRoot?.querySelectorAll('style') ?? [])
            .map((styleEl) => styleEl.textContent ?? '')
            .join('\n');

        expect(shadowRoot).toBeTruthy();
        expect(shadowRoot?.querySelector('.isolated-story-root')).not.toBeNull();
        expect(formspecElement?.getAttribute('data-formspec-appearance')).toBe('light');
        expect(styleText).toContain('.isolated-story-root');
        expect(styleText).not.toContain('--formspec-default-bg');
    });
});
