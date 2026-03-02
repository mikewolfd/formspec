import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { singleFieldDef, minimalComponentDoc, multiFieldDef } from './helpers/engine-fixtures';

let FormspecRender: any;

beforeAll(async () => {
    const mod = await import('../src/index');
    FormspecRender = mod.FormspecRender;
    if (!customElements.get('formspec-render')) {
        customElements.define('formspec-render', FormspecRender);
    }
});

describe('render lifecycle', () => {
    let el: InstanceType<any>;

    beforeEach(() => {
        el = document.createElement('formspec-render');
        document.body.appendChild(el);
    });

    afterEach(() => {
        el.remove();
    });

    it('setting definition creates engine and renders container + fields', () => {
        el.definition = singleFieldDef();
        el.render();
        expect(el.getEngine()).not.toBeNull();
        expect(el.querySelector('.formspec-container')).not.toBeNull();
        expect(el.querySelector('.formspec-field')).not.toBeNull();
    });

    it('setting definition again re-renders in place (root container preserved)', () => {
        el.definition = singleFieldDef();
        el.render();
        const firstContainer = el.querySelector('.formspec-container');
        expect(firstContainer).not.toBeNull();

        el.definition = multiFieldDef([
            { key: 'a', dataType: 'string' },
            { key: 'b', dataType: 'integer' },
        ]);
        el.render();
        // Root container remains stable; children are refreshed.
        expect(el.querySelector('.formspec-container')).toBe(firstContainer);
        // Two fields now
        expect(el.querySelectorAll('.formspec-field').length).toBe(2);
    });

    it('submit() dispatches formspec-submit event with response payload', async () => {
        el.definition = singleFieldDef();
        el.render();
        el.getEngine().setValue('name', 'Alice');

        const received = new Promise<any>((resolve) => {
            el.addEventListener('formspec-submit', (e: CustomEvent) => resolve(e.detail));
        });

        const detail = el.submit();
        expect(detail).toBeDefined();

        const response = await received;
        expect(response).toBeDefined();
        expect(response.response.data?.name).toBe('Alice');
        expect(response.validationReport).toBeDefined();
    });

    it('does not auto-append a submit button', () => {
        el.definition = singleFieldDef();
        el.render();
        expect(el.querySelector('.formspec-submit')).toBeNull();
    });

    it('focusField navigates wizard and tabs to reveal target field', () => {
        el.definition = {
            $formspec: '1.0',
            url: 'urn:test:form',
            version: '1.0.0',
            title: 'Test',
            items: [
                {
                    key: 'applicant',
                    type: 'group',
                    children: [
                        { key: 'name', type: 'field', dataType: 'string', label: 'Name' },
                    ],
                },
                {
                    key: 'narrative',
                    type: 'group',
                    children: [
                        { key: 'summary', type: 'field', dataType: 'string', label: 'Summary' },
                        { key: 'details', type: 'field', dataType: 'string', label: 'Details' },
                    ],
                },
            ],
        };
        el.componentDocument = minimalComponentDoc({
            component: 'Wizard',
            children: [
                {
                    component: 'Page',
                    title: 'Applicant',
                    children: [{ component: 'TextInput', bind: 'applicant.name' }],
                },
                {
                    component: 'Page',
                    title: 'Narrative',
                    children: [
                        {
                            component: 'Tabs',
                            tabLabels: ['Summary', 'Details'],
                            children: [
                                { component: 'TextInput', bind: 'narrative.summary' },
                                { component: 'TextInput', bind: 'narrative.details' },
                            ],
                        },
                    ],
                },
            ],
        });
        el.render();

        const focused = el.focusField('narrative.details');
        expect(focused).toBe(true);

        const panels = el.querySelectorAll('.formspec-wizard-panel');
        expect(panels[0].classList.contains('formspec-hidden')).toBe(true);
        expect(panels[1].classList.contains('formspec-hidden')).toBe(false);

        const tabs = el.querySelectorAll('.formspec-tab');
        expect(tabs[1].classList.contains('formspec-tab--active')).toBe(true);
    });

    it('unknown component type in tree logs warning', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        el.definition = {
            $formspec: '1.0',
            url: 'urn:test:form',
            version: '1.0.0',
            title: 'Test',
            items: [],
        };
        el.componentDocument = minimalComponentDoc({
            component: 'TotallyFakeWidget',
        });
        el.render();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('TotallyFakeWidget'));
        warn.mockRestore();
    });

    it('custom component recursion detected with console.warn', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        el.definition = {
            $formspec: '1.0',
            url: 'urn:test:form',
            version: '1.0.0',
            title: 'Test',
            items: [],
        };
        el.componentDocument = {
            $formspecComponent: '1.0',
            version: '1.0.0',
            targetDefinition: { url: 'urn:test:form' },
            tree: { component: 'SelfRef' },
            components: {
                SelfRef: { tree: { component: 'SelfRef' } },
            },
        };
        el.render();
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('Recursive'));
        warn.mockRestore();
    });

    it('disconnectedCallback drains cleanup functions', () => {
        el.definition = singleFieldDef();
        el.render();
        // After setting a definition, there should be reactive effects in cleanupFns
        // disconnectedCallback should clear them
        el.remove();
        // Re-append to verify it's truly cleaned up (no errors)
        document.body.appendChild(el);
        // Should be empty — no leftover DOM
        expect(el.querySelector('.formspec-container')).toBeNull();
    });

    it('reference-counts external theme stylesheets across multiple instances', () => {
        document.head.querySelectorAll('link[data-formspec-theme]').forEach(link => link.remove());

        const theme = {
            $formspecTheme: '1.0' as const,
            version: '1.0.0',
            targetDefinition: { url: 'urn:test:form' },
            stylesheets: ['data:text/css,.formspec-test%7Bcolor%3Ainherit%7D'],
        };

        el.themeDocument = theme;
        el.definition = singleFieldDef();
        el.render();
        expect(document.head.querySelectorAll('link[data-formspec-theme]').length).toBe(1);

        const el2 = document.createElement('formspec-render') as InstanceType<any>;
        document.body.appendChild(el2);
        el2.themeDocument = theme;
        el2.definition = singleFieldDef();
        el2.render();
        expect(document.head.querySelectorAll('link[data-formspec-theme]').length).toBe(1);

        el.remove();
        expect(document.head.querySelectorAll('link[data-formspec-theme]').length).toBe(1);

        el2.remove();
        expect(document.head.querySelectorAll('link[data-formspec-theme]').length).toBe(0);

        // Recreate for suite afterEach cleanup contract.
        el = document.createElement('formspec-render');
        document.body.appendChild(el);
    });
});
