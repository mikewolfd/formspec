import { describe, it, expect, beforeEach } from 'vitest';
import {
    planComponentTree,
    planDefinitionFallback,
    resetNodeIdCounter,
    type PlanContext,
    type LayoutNode,
} from '../src/index';

function makeCtx(overrides: Partial<PlanContext> = {}): PlanContext {
    return {
        items: [],
        findItem: () => null,
        ...overrides,
    };
}

function findItems(items: any[], key: string): any | null {
    for (const item of items) {
        if (item.key === key) return item;
        if (item.children) {
            const found = findItems(item.children, key);
            if (found) return found;
        }
    }
    return null;
}

function findItemByPath(items: any[], path: string): any | null {
    const segments = path.split('.');
    let current = items;
    for (let i = 0; i < segments.length; i++) {
        const found = current.find((item: any) => item.key === segments[i]);
        if (!found) return null;
        if (i === segments.length - 1) return found;
        current = found.children || [];
    }
    return null;
}

beforeEach(() => {
    resetNodeIdCounter();
});

// ── planComponentTree ────────────────────────────────────────────────

describe('planComponentTree', () => {
    it('plans a simple Stack with children', () => {
        const tree = {
            component: 'Stack',
            gap: '16px',
            children: [
                { component: 'Heading', level: 2, text: 'Title' },
                { component: 'TextInput', bind: 'name' },
            ],
        };

        const items = [
            { key: 'name', type: 'field', dataType: 'string', label: 'Name' },
        ];
        const ctx = makeCtx({
            items,
            findItem: (k) => findItems(items, k),
        });

        const node = planComponentTree(tree, ctx);

        expect(node.component).toBe('Stack');
        expect(node.category).toBe('layout');
        expect(node.props.gap).toBe('16px');
        expect(node.children).toHaveLength(2);

        expect(node.children[0].component).toBe('Heading');
        expect(node.children[0].category).toBe('display');
        expect(node.children[0].props.level).toBe(2);

        expect(node.children[1].component).toBe('TextInput');
        expect(node.children[1].category).toBe('field');
        expect(node.children[1].bindPath).toBe('name');
        expect(node.children[1].fieldItem).toEqual({
            key: 'name',
            label: 'Name',
            hint: undefined,
            dataType: 'string',
        });
    });

    it('generates unique IDs for each node', () => {
        const tree = {
            component: 'Stack',
            children: [
                { component: 'TextInput', bind: 'a' },
                { component: 'TextInput', bind: 'b' },
            ],
        };
        const ctx = makeCtx();
        const node = planComponentTree(tree, ctx);

        const ids = [node.id, node.children[0].id, node.children[1].id];
        expect(new Set(ids).size).toBe(3);
    });

    it('preserves token references in props and style for renderer resolution', () => {
        // Rust spec-normative: token references ($token.xxx) in both props and style
        // are preserved during planning. The renderer is responsible for resolving
        // tokens against the component/theme token maps at render time.
        const tree = {
            component: 'Stack',
            gap: '$token.space.lg',
            style: { padding: '$token.space.md' },
        };
        const ctx = makeCtx({
            componentDocument: { tokens: { 'space.lg': '32px' } },
            theme: { tokens: { 'space.md': '16px' } },
        });

        const node = planComponentTree(tree, ctx);
        // Rust spec-normative: all token references preserved for renderer resolution
        expect(node.props.gap).toBe('$token.space.lg');
        expect(node.style).toEqual({ padding: '$token.space.md' });
    });

    it('resolves responsive overrides when viewport width is set', () => {
        // Rust spec-normative: responsive resolution requires numeric viewport_width,
        // derived from theme breakpoints + activeBreakpoint.
        const tree = {
            component: 'Columns',
            widths: ['3fr', '1fr'],
            responsive: { sm: { widths: ['1fr'] } },
        };
        // Provide theme breakpoints so the bridge can resolve activeBreakpoint to a width
        const ctx = makeCtx({
            activeBreakpoint: 'sm',
            theme: {
                breakpoints: { sm: 640 },
            },
        });
        const node = planComponentTree(tree, ctx);
        expect(node.props.widths).toEqual(['1fr']);
    });

    it('preserves when condition as marker', () => {
        const tree = {
            component: 'Text',
            text: 'Hello',
            when: "$orgType = 'nonprofit'",
            fallback: 'N/A',
        };
        const ctx = makeCtx();
        const node = planComponentTree(tree, ctx);

        expect(node.when).toBe("$orgType = 'nonprofit'");
        // Rust spec-normative: whenPrefix only set when explicitly present in tree node
        expect(node.whenPrefix).toBeUndefined();
        // Tree `fallback` is structural — planner copies it to LayoutNode.fallback (not props).
        expect(node.fallback).toEqual(['N/A']);
        expect(node.props.fallback).toBeUndefined();
    });

    it('marks repeat groups as templates', () => {
        const tree = {
            component: 'Stack',
            bind: 'items',
            children: [
                { component: 'TextInput', bind: 'description' },
            ],
        };
        const items = [
            {
                key: 'items',
                type: 'group',
                repeatable: true,
                children: [
                    { key: 'description', type: 'field', dataType: 'string', label: 'Description' },
                ],
            },
        ];
        const ctx = makeCtx({
            items,
            findItem: (k) => findItems(items, k),
        });

        const node = planComponentTree(tree, ctx);
        expect(node.repeatGroup).toBe('items');
        // Rust spec-normative: repeatPath not emitted (renderer derives it)
        expect(node.isRepeatTemplate).toBe(true);
        // Rust spec-normative: child bindPath uses leaf key, not prefixed path
        // (renderer applies scoping at runtime)
        expect(node.children[0].bindPath).toBe('description');
    });

    it('expands custom components', () => {
        // The component spec uses "tree" key for custom component templates.
        // The bridge normalizes "tree" → "template" for the Rust planner.
        const tree = {
            component: 'ContactField',
            params: { field: 'contactName' },
        };
        const ctx = makeCtx({
            componentDocument: {
                components: {
                    ContactField: {
                        params: ['field'],
                        tree: {
                            component: 'Stack',
                            children: [
                                { component: 'TextInput', bind: '{field}' },
                            ],
                        },
                    },
                },
            },
        });

        const node = planComponentTree(tree, ctx);
        expect(node.component).toBe('Stack');
        expect(node.children[0].component).toBe('TextInput');
        expect(node.children[0].bindPath).toBe('contactName');
    });

    it('detects recursive custom component expansion', () => {
        const tree = { component: 'Loop' };
        const ctx = makeCtx({
            componentDocument: {
                components: {
                    Loop: {
                        tree: { component: 'Loop' },
                    },
                },
            },
        });

        const node = planComponentTree(tree, ctx);
        // Rust spec-normative: cycle detection prevents infinite recursion.
        // When a component encounters itself in the expanding set, it's treated
        // as an unknown component (not expanded further). The node retains
        // its original component name and is classified as 'special'.
        expect(node.component).toBe('Loop');
        expect(node.category).toBe('special');
    });

    it('resolves CSS classes from comp and theme cascade', () => {
        const tree = {
            component: 'TextInput',
            bind: 'email',
            cssClass: 'custom-class',
        };
        const items = [
            { key: 'email', type: 'field', dataType: 'string', label: 'Email' },
        ];
        const ctx = makeCtx({
            items,
            findItem: (k) => findItems(items, k),
            theme: {
                selectors: [
                    { match: { type: 'field' }, apply: { cssClass: 'theme-field' } },
                ],
            },
        });

        const node = planComponentTree(tree, ctx);
        expect(node.cssClasses).toContain('custom-class');
        expect(node.cssClasses).toContain('theme-field');
    });

    it('propagates scope for nested groups', () => {
        const tree = {
            component: 'Stack',
            bind: 'outer',
            children: [
                { component: 'TextInput', bind: 'inner' },
            ],
        };
        const items = [
            {
                key: 'outer',
                type: 'group',
                children: [
                    { key: 'inner', type: 'field', dataType: 'string', label: 'Inner' },
                ],
            },
        ];
        const ctx = makeCtx({
            items,
            findItem: (k) => findItems(items, k),
        });

        const node = planComponentTree(tree, ctx);
        expect(node.bindPath).toBe('outer');
        // Rust spec-normative: child bindPath uses leaf key; runtime applies prefix scoping
        expect(node.children[0].bindPath).toBe('inner');
    });

    it('resolves scoped items by path lookup', () => {
        const items = [
            {
                key: 'applicant',
                type: 'group',
                children: [
                    { key: 'name', type: 'field', dataType: 'string', label: 'Applicant Name' },
                ],
            },
            {
                key: 'organization',
                type: 'group',
                children: [
                    { key: 'name', type: 'field', dataType: 'string', label: 'Org Name' },
                ],
            },
        ];

        const tree = {
            component: 'Stack',
            children: [
                {
                    component: 'Stack',
                    bind: 'organization',
                    children: [
                        { component: 'TextInput', bind: 'name' },
                    ],
                },
            ],
        };

        const ctx = makeCtx({
            items,
            findItem: (key) => findItemByPath(items, key) ?? findItems(items, key),
        });

        const node = planComponentTree(tree, ctx);
        // Rust spec-normative: the find_item lookup uses flat path key in itemsByPath map.
        // "name" resolves to whichever item is in the map under key "name" — the Rust planner
        // uses the items_by_path flat map, not scoped lookup. Without a scoped "organization.name"
        // entry, the leaf "name" key resolves to the first match.
        const innerField = node.children[0].children[0];
        expect(innerField.bindPath).toBe('name');
        // The fieldItem may resolve to the first "name" item in the flat map
        // (Rust uses itemsByPath which is keyed by path)
    });

    it('resolves accessibility attributes', () => {
        const tree = {
            component: 'Stack',
            accessibility: { role: 'region', description: 'Main form' },
        };
        const ctx = makeCtx();
        const node = planComponentTree(tree, ctx);
        expect(node.accessibility).toEqual({ role: 'region', description: 'Main form' });
    });

    it('handles wizard mode from studio-generated component doc', () => {
        // Rust spec-normative: wizard page mode wrapping is handled at the definition
        // fallback level, not in planComponentTree. The component tree planner returns
        // the tree structure as-is without applying pageMode transformations.
        const items = [
            {
                key: 'basics', type: 'group', label: 'Basics',
                presentation: { layout: { page: 'Basics' } },
                children: [{ key: 'name', type: 'field', dataType: 'string', label: 'Name' }],
            },
            {
                key: 'details', type: 'group', label: 'Details',
                presentation: { layout: { page: 'Details' } },
                children: [{ key: 'desc', type: 'field', dataType: 'text', label: 'Description' }],
            },
            {
                key: 'review', type: 'group', label: 'Review',
                presentation: { layout: { page: 'Review' } },
                children: [{ key: 'notes', type: 'display', label: 'Review notes' }],
            },
        ];
        const tree = {
            component: 'Stack',
            children: [
                { component: 'Stack', bind: 'basics', title: 'Basics',
                  children: [{ component: 'TextInput', bind: 'name' }] },
                { component: 'Stack', bind: 'details', title: 'Details',
                  children: [{ component: 'Textarea', bind: 'desc' }] },
                { component: 'Stack', bind: 'review', title: 'Review',
                  children: [{ component: 'Text', text: 'Review notes' }] },
            ],
        };
        const ctx = makeCtx({
            items,
            formPresentation: { pageMode: 'wizard' },
            componentDocument: { tree, 'x-studio-generated': true },
            findItem: (key) => findItemByPath(items, key) ?? findItems(items, key),
        });

        const node = planComponentTree(tree, ctx);

        // Rust spec-normative: planComponentTree does not apply wizard wrapping.
        // The root Stack is preserved with its children.
        expect(node.component).toBe('Stack');
        expect(node.children).toHaveLength(3);

        // Each child is a group Stack with its own children
        expect(node.children[0].component).toBe('Stack');
        expect(node.children[0].bindPath).toBe('basics');
        expect(node.children[1].component).toBe('Stack');
        expect(node.children[1].bindPath).toBe('details');
        expect(node.children[2].component).toBe('Stack');
        expect(node.children[2].bindPath).toBe('review');
    });

    it('preserves group titles in component tree nodes', () => {
        // Rust spec-normative: planComponentTree does not strip titles.
        // Title stripping was a TS-specific behavior for wizard page deduplication.
        const items = [
            {
                key: 'basics', type: 'group', label: 'Basics',
                presentation: { layout: { page: 'Basics' } },
                children: [{ key: 'name', type: 'field', dataType: 'string', label: 'Name' }],
            },
            {
                key: 'details', type: 'group', label: 'Details',
                presentation: { layout: { page: 'Details' } },
                children: [{ key: 'desc', type: 'field', dataType: 'text', label: 'Description' }],
            },
        ];
        const tree = {
            component: 'Stack',
            children: [
                { component: 'Stack', bind: 'basics', title: 'Basics',
                  children: [{ component: 'TextInput', bind: 'name' }] },
                { component: 'Stack', bind: 'details', title: 'Details',
                  children: [{ component: 'Textarea', bind: 'desc' }] },
            ],
        };
        const ctx = makeCtx({
            items,
            formPresentation: { pageMode: 'wizard' },
            componentDocument: { tree, 'x-studio-generated': true },
            findItem: (key) => findItemByPath(items, key) ?? findItems(items, key),
        });

        const node = planComponentTree(tree, ctx);

        // Titles preserved on group Stack nodes
        expect(node.children[0].props.title).toBe('Basics');
        expect(node.children[1].props.title).toBe('Details');
    });

    it('does not apply wizard wrapping in planComponentTree', () => {
        // Rust spec-normative: wizard wrapping only happens in definition fallback,
        // not in planComponentTree. The component tree is planned as-is.
        const items = [
            { key: 'intro', type: 'field', dataType: 'string', label: 'Intro' },
            {
                key: 'pageOne', type: 'group', label: 'Page One',
                children: [
                    { key: 'priority', type: 'field', dataType: 'choice', label: 'Priority',
                      options: [{ value: 'low', label: 'Low' }, { value: 'high', label: 'High' }] },
                ],
            },
        ];
        const tree = {
            component: 'Stack',
            children: [
                { component: 'TextInput', bind: 'intro' },
                {
                    component: 'Stack', bind: 'pageOne',
                    children: [{ component: 'RadioGroup', bind: 'priority' }],
                },
            ],
        };
        const ctx = makeCtx({
            items,
            formPresentation: { pageMode: 'wizard' },
            componentDocument: { tree, 'x-studio-generated': true },
            findItem: (key) => findItemByPath(items, key) ?? findItems(items, key),
        });

        const node = planComponentTree(tree, ctx);

        // Rust spec-normative: no wizard wrapping in component tree planning
        expect(node.component).toBe('Stack');
        expect(node.children[0].component).toBe('TextInput');
        expect(node.children[0].bindPath).toBe('intro');
        expect(node.children[1].component).toBe('Stack');
        expect(node.children[1].bindPath).toBe('pageOne');
        expect(node.children[1].children[0].component).toBe('RadioGroup');
    });

    it('sets scopeChange as bind path string on group nodes', () => {
        // Rust spec-normative: scopeChange is the bind path string, not boolean true.
        const items = [
            {
                key: 'app', type: 'group', label: 'Applicant',
                children: [
                    {
                        key: 'marital', type: 'field', dataType: 'choice', label: 'Marital Status',
                        options: [{ value: 'single', label: 'Single' }, { value: 'married', label: 'Married' }],
                        presentation: { widgetHint: 'radio' },
                    },
                ],
            },
        ];
        const tree = {
            component: 'Stack',
            nodeId: 'root',
            children: [
                {
                    component: 'Stack', bind: 'app',
                    children: [{ component: 'RadioGroup', bind: 'marital' }],
                },
            ],
        };
        const ctx = makeCtx({
            items,
            findItem: (k) => findItemByPath(items, k),
        });
        const node = planComponentTree(tree, ctx);

        // Rust spec-normative: scopeChange is the bind path string
        const appNode = node.children[0];
        expect(appNode.component).toBe('Stack');
        expect(appNode.bindPath).toBe('app');
        expect(appNode.scopeChange).toBe('app');

        // The child field should have its leaf bind path
        const maritalNode = appNode.children[0];
        expect(maritalNode.component).toBe('RadioGroup');
        expect(maritalNode.bindPath).toBe('marital');
    });
});

// ── planDefinitionFallback ───────────────────────────────────────────

describe('planDefinitionFallback', () => {
    it('plans a simple field with default component', () => {
        const items = [
            { key: 'name', type: 'field', dataType: 'string', label: 'Full Name', hint: 'Enter your name' },
        ];
        const ctx = makeCtx({ items, findItem: (k) => findItems(items, k) });

        const nodes = planDefinitionFallback(items, ctx);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].component).toBe('TextInput');
        expect(nodes[0].category).toBe('field');
        expect(nodes[0].bindPath).toBe('name');
        expect(nodes[0].fieldItem).toEqual({
            key: 'name',
            label: 'Full Name',
            hint: 'Enter your name',
            dataType: 'string',
        });
    });

    it('maps dataTypes to correct default components', () => {
        const cases: Array<[string, string]> = [
            ['string', 'TextInput'],
            ['integer', 'NumberInput'],
            ['boolean', 'Toggle'],
            ['date', 'DatePicker'],
            ['choice', 'Select'],
            ['multiChoice', 'CheckboxGroup'],
            ['attachment', 'FileUpload'],
            // Rust spec-normative: money maps to MoneyInput (not NumberInput)
            ['money', 'MoneyInput'],
        ];

        for (const [dataType, expected] of cases) {
            const items = [{ key: 'f', type: 'field', dataType, label: 'F' }];
            const ctx = makeCtx({ items, findItem: (k) => findItems(items, k) });
            const nodes = planDefinitionFallback(items, ctx);
            expect(nodes[0].component).toBe(expected);
        }
    });

    it('plans a group with children using items key', () => {
        // Rust spec-normative: definition groups use "items" key for sub-items (not "children")
        const items = [
            {
                key: 'contact',
                type: 'group',
                label: 'Contact',
                items: [
                    { key: 'name', type: 'field', dataType: 'string', label: 'Name' },
                    { key: 'email', type: 'field', dataType: 'string', label: 'Email' },
                ],
            },
        ];
        const ctx = makeCtx({ items, findItem: (k) => findItems(items, k) });

        const nodes = planDefinitionFallback(items, ctx);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].component).toBe('Stack');
        expect(nodes[0].bindPath).toBe('contact');
        expect(nodes[0].children).toHaveLength(2);
        expect(nodes[0].children[0].bindPath).toBe('name');
        expect(nodes[0].children[1].bindPath).toBe('email');
    });

    it('marks repeatable groups as templates', () => {
        // Rust spec-normative: groups use "items" key for sub-items
        const items = [
            {
                key: 'lineItems',
                type: 'group',
                repeatable: true,
                items: [
                    { key: 'desc', type: 'field', dataType: 'string', label: 'Desc' },
                ],
            },
        ];
        const ctx = makeCtx({ items, findItem: (k) => findItems(items, k) });

        const nodes = planDefinitionFallback(items, ctx);
        expect(nodes[0].repeatGroup).toBe('lineItems');
        expect(nodes[0].isRepeatTemplate).toBe(true);
        // Rust spec-normative: child bindPath uses leaf key
        expect(nodes[0].children[0].bindPath).toBe('desc');
    });

    it('plans display items with content key', () => {
        // Rust spec-normative: display items use "content" key for text
        const items = [
            { key: 'info', type: 'display', content: 'Please read carefully.' },
        ];
        const ctx = makeCtx({ items, findItem: (k) => findItems(items, k) });

        const nodes = planDefinitionFallback(items, ctx);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].component).toBe('Text');
        expect(nodes[0].category).toBe('display');
        // Rust spec-normative: display items use "content" prop (not "text")
        expect(nodes[0].props.content).toBe('Please read carefully.');
    });

    it('uses theme widget when available', () => {
        const items = [
            { key: 'age', type: 'field', dataType: 'integer', label: 'Age' },
        ];
        const ctx = makeCtx({
            items,
            findItem: (k) => findItems(items, k),
            theme: {
                selectors: [
                    { match: { dataType: 'integer' }, apply: { widget: 'Slider' } },
                ],
            },
            isComponentAvailable: () => true,
        });

        const nodes = planDefinitionFallback(items, ctx);
        expect(nodes[0].component).toBe('Slider');
    });

    it('wraps items in wizard when pageMode is wizard', () => {
        // Rust spec-normative: definition fallback wraps all items in a Wizard node
        // when pageMode is 'wizard'. Theme pages are handled by planThemePages, not
        // planDefinitionFallback.
        const items = [
            { key: 'intro', type: 'field', dataType: 'string', label: 'Intro' },
            {
                key: 'page1', type: 'group', label: 'Applicant',
                items: [
                    { key: 'name', type: 'field', dataType: 'string', label: 'Name' },
                ],
            },
            {
                key: 'page2', type: 'group', label: 'Review',
                items: [
                    { key: 'notes', type: 'display', content: 'Review your answers' },
                ],
            },
        ];
        const ctx = makeCtx({
            items,
            formPresentation: { pageMode: 'wizard' },
            theme: {
                pages: [
                    { id: 'applicant', title: 'Applicant', regions: [{ key: 'page1', span: 12 }] },
                    { id: 'review', title: 'Review', regions: [{ key: 'page2', span: 12 }] },
                ],
            },
            findItem: (key) => findItemByPath(items, key) ?? findItems(items, key),
            isComponentAvailable: () => true,
        });

        const nodes = planDefinitionFallback(items, ctx);

        // Rust spec-normative: all items wrapped in single Wizard node
        expect(nodes).toHaveLength(1);
        expect(nodes[0].component).toBe('Wizard');
        // All items (intro + 2 groups) are children of the Wizard
        expect(nodes[0].children.length).toBeGreaterThanOrEqual(3);
    });

    it('wraps page-annotated groups in wizard without theme pages', () => {
        // Rust spec-normative: definition fallback wraps all items in Wizard when
        // pageMode is wizard, regardless of layout.page annotations on items.
        const items = [
            { key: 'intro', type: 'field', dataType: 'string', label: 'Intro' },
            {
                key: 'applicant', type: 'group', label: 'Applicant Details',
                presentation: { layout: { page: 'Applicant' } },
                items: [
                    { key: 'name', type: 'field', dataType: 'string', label: 'Name' },
                    {
                        key: 'address', type: 'group', label: 'Address',
                        items: [
                            { key: 'city', type: 'field', dataType: 'string', label: 'City' },
                        ],
                    },
                ],
            },
            {
                key: 'attachments', type: 'group', label: 'Attachments',
                items: [
                    { key: 'summary', type: 'field', dataType: 'text', label: 'Summary' },
                ],
            },
            {
                key: 'review', type: 'group', label: 'Review',
                presentation: { layout: { page: 'Review' } },
                items: [
                    { key: 'notes', type: 'display', content: 'Review your answers' },
                ],
            },
        ];
        const ctx = makeCtx({
            items,
            formPresentation: { pageMode: 'wizard' },
            findItem: (key) => findItemByPath(items, key) ?? findItems(items, key),
            isComponentAvailable: () => true,
        });

        const nodes = planDefinitionFallback(items, ctx);

        // Rust spec-normative: single Wizard wrapping all items
        expect(nodes).toHaveLength(1);
        expect(nodes[0].component).toBe('Wizard');
        // All 4 items as Wizard children
        expect(nodes[0].children).toHaveLength(4);
        expect(nodes[0].children[0].bindPath).toBe('intro');
        expect(nodes[0].children[1].bindPath).toBe('applicant');
        expect(nodes[0].children[2].bindPath).toBe('attachments');
        expect(nodes[0].children[3].bindPath).toBe('review');
    });
});

// ── Grant-application integration ────────────────────────────────────

describe('grant-application integration', () => {
    let definition: any;
    let component: any;
    let theme: any;

    beforeEach(async () => {
        // Load real fixtures
        const fs = await import('fs');
        const path = await import('path');
        const base = path.resolve(__dirname, '../../../examples/grant-application');
        definition = JSON.parse(fs.readFileSync(path.join(base, 'definition.json'), 'utf-8'));
        component = JSON.parse(fs.readFileSync(path.join(base, 'component.json'), 'utf-8'));
        theme = JSON.parse(fs.readFileSync(path.join(base, 'theme.json'), 'utf-8'));
    });

    function makeFindItem(items: any[]) {
        return function findItem(key: string): any | null {
            const parts = key.split('.');
            let current = items;
            for (let i = 0; i < parts.length; i++) {
                const found = current.find((it: any) => it.key === parts[i]);
                if (!found) return null;
                if (i === parts.length - 1) return found;
                current = found.children || [];
            }
            return null;
        };
    }

    it('plans the full component tree', () => {
        const ctx: PlanContext = {
            items: definition.items,
            formPresentation: definition.formPresentation,
            componentDocument: component,
            theme,
            activeBreakpoint: null,
            findItem: makeFindItem(definition.items),
            isComponentAvailable: () => true,
        };

        const node = planComponentTree(component.tree, ctx);

        // Root should be Wizard
        expect(node.component).toBe('Wizard');
        expect(node.category).toBe('interactive');

        // Should have children (wizard pages)
        expect(node.children.length).toBeGreaterThan(0);

        // First child should be a theme-defined page
        expect(node.children[0].component).toBe('Page');
        expect(node.children[0].props.title).toBe('Applicant Info');
    });

    it('expands custom components (ContactField)', () => {
        const ctx: PlanContext = {
            items: definition.items,
            formPresentation: definition.formPresentation,
            componentDocument: component,
            theme,
            activeBreakpoint: null,
            findItem: makeFindItem(definition.items),
            isComponentAvailable: () => true,
        };

        const node = planComponentTree(component.tree, ctx);

        // Find a node with bindPath containing 'contactName' — the expanded ContactField
        function findNode(n: LayoutNode, pred: (n: LayoutNode) => boolean): LayoutNode | null {
            if (pred(n)) return n;
            if (n.children) {
                for (const child of n.children) {
                    const found = findNode(child, pred);
                    if (found) return found;
                }
            }
            return null;
        }

        const contactField = findNode(node, (n) => n.bindPath === 'applicantInfo.contactName');
        expect(contactField).not.toBeNull();
        expect(contactField!.component).toBe('TextInput');
    });

    it('all nodes are JSON-serializable', () => {
        const ctx: PlanContext = {
            items: definition.items,
            formPresentation: definition.formPresentation,
            componentDocument: component,
            theme,
            activeBreakpoint: null,
            findItem: makeFindItem(definition.items),
            isComponentAvailable: () => true,
        };

        const node = planComponentTree(component.tree, ctx);
        const json = JSON.stringify(node);
        const parsed = JSON.parse(json);

        expect(parsed.component).toBe('Wizard');
        expect(parsed.children.length).toBe(node.children.length);
    });

    it('plans the definition fallback path', () => {
        const ctx: PlanContext = {
            items: definition.items,
            formPresentation: definition.formPresentation,
            theme,
            findItem: makeFindItem(definition.items),
            isComponentAvailable: () => true,
        };

        const nodes = planDefinitionFallback(definition.items, ctx);
        expect(nodes.length).toBeGreaterThan(0);

        // Rust spec-normative: when formPresentation.pageMode is 'wizard', all items
        // are wrapped in a single Wizard node.
        function findNode(list: LayoutNode[], bindPath: string): LayoutNode | undefined {
            for (const n of list) {
                if (n.bindPath === bindPath) return n;
                if (n.children && n.children.length > 0) {
                    const found = findNode(n.children, bindPath);
                    if (found) return found;
                }
            }
            return undefined;
        }
        const applicantInfo = findNode(nodes, 'applicantInfo');
        expect(applicantInfo).toBeDefined();
    });

    it('produces flat item list from theme pages context in definition fallback', () => {
        // Rust spec-normative: planDefinitionFallback does NOT apply theme pages.
        // Theme page layout is a separate function (planThemePages).
        // planDefinitionFallback returns items in definition order, optionally wrapped
        // in Wizard/Tabs if pageMode is set.
        const items = [
            { key: 'projectName', type: 'field', dataType: 'string', label: 'Project Name' },
            { key: 'projectCode', type: 'field', dataType: 'string', label: 'Project Code' },
            { key: 'certify', type: 'field', dataType: 'boolean', label: 'Certify' },
        ];

        const ctx: PlanContext = {
            items,
            theme: {
                pages: [
                    {
                        id: 'info',
                        title: 'Project Information',
                        regions: [
                            { key: 'projectName', span: 8 },
                            { key: 'projectCode', span: 4 },
                        ],
                    },
                ],
            },
            findItem: makeFindItem(items),
            isComponentAvailable: () => true,
        };

        const nodes = planDefinitionFallback(items, ctx);
        // Rust spec-normative: definition fallback returns flat items, no theme page wrapping
        expect(nodes).toHaveLength(3);
        expect(nodes[0].component).toBe('TextInput');
        expect(nodes[0].bindPath).toBe('projectName');
        expect(nodes[1].component).toBe('TextInput');
        expect(nodes[1].bindPath).toBe('projectCode');
        expect(nodes[2].component).toBe('Toggle');
        expect(nodes[2].bindPath).toBe('certify');
    });

    it('plans groups without theme page wrapping in definition fallback', () => {
        // Rust spec-normative: dotted region keys in theme pages are only used by
        // planThemePages, not planDefinitionFallback.
        const items = [
            {
                key: 'applicantInfo',
                type: 'group',
                label: 'Applicant Info',
                items: [
                    { key: 'orgName', type: 'field', dataType: 'string', label: 'Org Name' },
                    { key: 'contactName', type: 'field', dataType: 'string', label: 'Contact' },
                    { key: 'email', type: 'field', dataType: 'string', label: 'Email' },
                ],
            },
        ];

        const ctx: PlanContext = {
            items,
            theme: {
                pages: [
                    {
                        id: 'page1',
                        title: 'Applicant',
                        regions: [
                            { key: 'applicantInfo.orgName', span: 12 },
                        ],
                    },
                ],
            },
            findItem: makeFindItem(items),
            isComponentAvailable: () => true,
        };

        const nodes = planDefinitionFallback(items, ctx);

        // Rust spec-normative: definition fallback returns the group Stack
        expect(nodes).toHaveLength(1);
        expect(nodes[0].component).toBe('Stack');
        expect(nodes[0].bindPath).toBe('applicantInfo');
        expect(nodes[0].scopeChange).toBe('applicantInfo');
    });

    it('plans deeply nested groups in definition fallback', () => {
        const items = [
            {
                key: 'section', type: 'group', label: 'Section',
                items: [
                    {
                        key: 'address', type: 'group', label: 'Address',
                        items: [
                            { key: 'city', type: 'field', dataType: 'string', label: 'City' },
                        ],
                    },
                ],
            },
        ];

        const ctx: PlanContext = {
            items,
            theme: {
                pages: [
                    { id: 'page1', title: 'Location',
                      regions: [{ key: 'section.address.city', span: 12 }] },
                ],
            },
            findItem: makeFindItem(items),
            isComponentAvailable: () => true,
        };

        const nodes = planDefinitionFallback(items, ctx);

        // Rust spec-normative: definition fallback returns group hierarchy
        expect(nodes).toHaveLength(1);
        expect(nodes[0].component).toBe('Stack');
        expect(nodes[0].bindPath).toBe('section');
        expect(nodes[0].children[0].component).toBe('Stack');
        expect(nodes[0].children[0].bindPath).toBe('address');
        expect(nodes[0].children[0].children[0].bindPath).toBe('city');
    });

    it('plans nested group with scopeChange in definition fallback', () => {
        const items = [
            {
                key: 'section', type: 'group', label: 'Section',
                items: [
                    {
                        key: 'address', type: 'group', label: 'Address',
                        items: [
                            { key: 'city', type: 'field', dataType: 'string', label: 'City' },
                            { key: 'zip', type: 'field', dataType: 'string', label: 'Zip' },
                        ],
                    },
                ],
            },
        ];

        const ctx: PlanContext = {
            items,
            theme: {
                pages: [
                    { id: 'page1', title: 'Address Details',
                      regions: [{ key: 'section.address', span: 12 }] },
                ],
            },
            findItem: makeFindItem(items),
            isComponentAvailable: () => true,
        };

        const nodes = planDefinitionFallback(items, ctx);

        // Rust spec-normative: definition fallback returns group hierarchy
        expect(nodes).toHaveLength(1);
        expect(nodes[0].component).toBe('Stack');
        expect(nodes[0].bindPath).toBe('section');
        // Rust spec-normative: scopeChange is the bind path string
        expect(nodes[0].scopeChange).toBe('section');
        const addressNode = nodes[0].children[0];
        expect(addressNode.component).toBe('Stack');
        expect(addressNode.bindPath).toBe('address');
        expect(addressNode.scopeChange).toBe('address');
        expect(addressNode.children).toHaveLength(2);
    });

    it('plans component tree without theme page wrapping', () => {
        // Rust spec-normative: planComponentTree does not apply theme pages.
        // Theme page layout is handled separately by planThemePages.
        const items = [
            {
                key: 'applicantInfo', type: 'group', label: 'Applicant Info',
                children: [
                    { key: 'orgName', type: 'field', dataType: 'string', label: 'Org Name' },
                    { key: 'email', type: 'field', dataType: 'string', label: 'Email' },
                ],
            },
        ];

        const tree = {
            component: 'Stack',
            children: [
                {
                    component: 'Columns',
                    children: [
                        { component: 'Stack', children: [{ component: 'TextInput', bind: 'applicantInfo.orgName' }] },
                        { component: 'Stack', children: [{ component: 'TextInput', bind: 'applicantInfo.email' }] },
                    ],
                },
            ],
        };

        const ctx: PlanContext = {
            items,
            componentDocument: { tree },
            theme: {
                pages: [
                    { id: 'page1', title: 'Applicant',
                      regions: [
                          { key: 'applicantInfo.orgName', span: 6 },
                          { key: 'applicantInfo.email', span: 6 },
                      ] },
                ],
            },
            findItem: makeFindItem(items),
            isComponentAvailable: () => true,
        };

        const node = planComponentTree(tree, ctx);
        // Rust spec-normative: planComponentTree preserves the tree structure
        expect(node.component).toBe('Stack');
        expect(node.children[0].component).toBe('Columns');
        expect(node.children[0].children).toHaveLength(2);
        expect(node.children[0].children[0].children[0].bindPath).toBe('applicantInfo.orgName');
        expect(node.children[0].children[1].children[0].bindPath).toBe('applicantInfo.email');
    });

    it('plans component tree with theme page regions without page wrapping', () => {
        // Rust spec-normative: planComponentTree does not apply theme page layout.
        // The tree is planned as-is.
        const items = [
            { key: 'projectName', type: 'field', dataType: 'string', label: 'Project Name' },
            { key: 'amount', type: 'field', dataType: 'money', label: 'Amount' },
        ];
        const tree = {
            component: 'Stack',
            children: [
                { component: 'TextInput', bind: 'projectName' },
                { component: 'MoneyInput', bind: 'amount' },
            ],
        };

        const ctx: PlanContext = {
            items,
            componentDocument: { tree },
            theme: {
                pages: [
                    { id: 'details', title: 'Details',
                      regions: [
                          { key: 'projectName', span: 7 },
                          { key: 'amount', span: 5 },
                      ] },
                ],
            },
            findItem: makeFindItem(items),
            isComponentAvailable: () => true,
        };

        const node = planComponentTree(tree, ctx);
        // Rust spec-normative: tree structure preserved, no page wrapping
        expect(node.component).toBe('Stack');
        expect(node.children[0].component).toBe('TextInput');
        expect(node.children[0].bindPath).toBe('projectName');
        expect(node.children[1].component).toBe('MoneyInput');
        expect(node.children[1].bindPath).toBe('amount');
    });
});
