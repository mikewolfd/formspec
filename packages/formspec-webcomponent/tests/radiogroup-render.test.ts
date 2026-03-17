import { describe, it, expect, beforeAll, afterEach } from 'vitest';

let FormspecRender: any;

beforeAll(async () => {
    const mod = await import('../src/index');
    FormspecRender = mod.FormspecRender;
    if (!customElements.get('formspec-render-radio')) {
        customElements.define('formspec-render-radio', FormspecRender);
    }
});

afterEach(() => {
    document.body.querySelectorAll('formspec-render-radio').forEach(el => el.remove());
});

describe('RadioGroup rendering', () => {
    it('renders radio buttons for a choice field with widgetHint: radio', () => {
        const el = document.createElement('formspec-render-radio') as any;
        document.body.appendChild(el);

        el.definition = {
            $formspec: '1.0',
            url: 'urn:test:radio',
            version: '1.0.0',
            title: 'Radio Test',
            items: [
                {
                    key: 'marital',
                    type: 'field',
                    label: 'Marital Status',
                    dataType: 'choice',
                    options: [
                        { value: 'single', label: 'Single' },
                        { value: 'married', label: 'Married' },
                    ],
                    presentation: { widgetHint: 'radio' },
                },
            ],
        };

        el.componentDocument = {
            $formspecComponent: '1.0',
            version: '1.0.0',
            targetDefinition: { url: 'urn:test:radio' },
            tree: {
                component: 'Stack',
                nodeId: 'root',
                children: [
                    { component: 'RadioGroup', bind: 'marital' },
                ],
            },
        };

        el.render();

        const radioGroup = el.querySelector('[role="radiogroup"]');
        expect(radioGroup, 'RadioGroup container should be in DOM').not.toBeNull();

        const radios = el.querySelectorAll('input[type="radio"]');
        expect(radios.length, 'Should render 2 radio buttons').toBe(2);
    });

    it('renders radio buttons via scheduled render (Studio flow)', async () => {
        const el = document.createElement('formspec-render-radio') as any;
        document.body.appendChild(el);

        // Mimic Studio's syncToElement: set properties without calling render()
        el.definition = {
            $formspec: '1.0',
            url: 'urn:test:radio-scheduled',
            version: '1.0.0',
            title: 'Radio Scheduled Test',
            items: [
                {
                    key: 'marital',
                    type: 'field',
                    label: 'Marital Status',
                    dataType: 'choice',
                    options: [
                        { value: 'single', label: 'Single' },
                        { value: 'married', label: 'Married' },
                    ],
                    presentation: { widgetHint: 'radio' },
                },
            ],
        };

        el.componentDocument = {
            $formspecComponent: '1.0',
            version: '1.0.0',
            targetDefinition: { url: 'urn:test:radio-scheduled' },
            tree: {
                component: 'Stack',
                nodeId: 'root',
                children: [
                    { component: 'RadioGroup', bind: 'marital' },
                ],
            },
        };

        // Wait for scheduleRender's microtask
        await new Promise(resolve => setTimeout(resolve, 50));

        const radioGroup = el.querySelector('[role="radiogroup"]');
        expect(radioGroup, 'RadioGroup container should be in DOM').not.toBeNull();

        const radios = el.querySelectorAll('input[type="radio"]');
        expect(radios.length, 'Should render 2 radio buttons via scheduled render').toBe(2);

        // Also check that the engine actually has the options
        const engineOptions = el.getEngine().getOptions('marital');
        expect(engineOptions.length, 'Engine should have 2 options').toBe(2);
    });

    it('renders radio buttons after JSON round-trip (plain() simulation)', () => {
        const el = document.createElement('formspec-render-radio') as any;
        document.body.appendChild(el);

        // Simulate Studio's plain() function: JSON stringify/parse
        const def = JSON.parse(JSON.stringify({
            $formspec: '1.0',
            url: 'urn:test:radio-plain',
            version: '1.0.0',
            title: 'Radio Plain Test',
            items: [
                {
                    key: 'marital',
                    type: 'field',
                    label: 'Marital Status',
                    dataType: 'choice',
                    options: [
                        { value: 'single', label: 'Single' },
                        { value: 'married', label: 'Married' },
                    ],
                    presentation: { widgetHint: 'radio' },
                },
            ],
        }));

        const compDoc = JSON.parse(JSON.stringify({
            $formspecComponent: '1.0',
            version: '1.0.0',
            'x-studio-generated': true,
            targetDefinition: { url: 'urn:test:radio-plain' },
            tree: {
                component: 'Stack',
                nodeId: 'root',
                children: [
                    { component: 'RadioGroup', bind: 'marital' },
                ],
            },
        }));

        el.definition = def;
        el.componentDocument = compDoc;
        el.render();

        const radios = el.querySelectorAll('input[type="radio"]');
        expect(radios.length, 'Should render 2 radio buttons after JSON round-trip').toBe(2);
    });

    it('renders radio buttons via definition fallback (no component doc)', () => {
        const el = document.createElement('formspec-render-radio') as any;
        document.body.appendChild(el);

        el.definition = {
            $formspec: '1.0',
            url: 'urn:test:radio2',
            version: '1.0.0',
            title: 'Radio Test 2',
            items: [
                {
                    key: 'color',
                    type: 'field',
                    label: 'Favorite Color',
                    dataType: 'choice',
                    options: [
                        { value: 'red', label: 'Red' },
                        { value: 'blue', label: 'Blue' },
                        { value: 'green', label: 'Green' },
                    ],
                    presentation: { widgetHint: 'radio' },
                },
            ],
        };

        el.render();

        const radios = el.querySelectorAll('input[type="radio"]');
        expect(radios.length, 'Should render 3 radio buttons').toBe(3);
    });
});
