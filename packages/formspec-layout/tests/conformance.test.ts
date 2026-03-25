/** @filedesc Cross-planner conformance tests — loads JSON fixtures shared with Rust. */
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    planComponentTree,
    planDefinitionFallback,
    planThemePages,
    planUnboundRequired,
    resetNodeIdCounter,
    type PlanContext,
    type LayoutNode,
} from '../src/index';

// ── Fixture loading ──────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(__dirname, '../../../tests/conformance/layout');

interface Fixture {
    id: string;
    kind: string;
    description: string;
    input: {
        items: any[];
        formPresentation?: any;
        componentDocument?: any;
        theme?: any;
        viewportWidth?: number | null;
    };
    expected: any;
}

function loadFixture(name: string): Fixture {
    const filePath = path.join(FIXTURE_DIR, name);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function loadAllFixtures(): { name: string; fixture: Fixture }[] {
    const files = fs.readdirSync(FIXTURE_DIR).filter(f => f.endsWith('.json')).sort();
    return files.map(name => ({ name, fixture: loadFixture(name) }));
}

// ── Context builder ──────────────────────────────────────────────────

function findItemByPath(items: any[], pathStr: string): any | null {
    const segments = pathStr.split('.');
    let current = items;
    for (let i = 0; i < segments.length; i++) {
        const found = current.find((item: any) => item.key === segments[i]);
        if (!found) return null;
        if (i === segments.length - 1) return found;
        current = found.children || found.items || [];
    }
    return null;
}

function ctxFromFixture(fixture: Fixture): PlanContext {
    const { items, formPresentation, componentDocument, theme, viewportWidth } = fixture.input;
    const ctx: PlanContext = {
        items,
        formPresentation: formPresentation ?? undefined,
        componentDocument: componentDocument ?? undefined,
        theme: theme ?? undefined,
        findItem: (key: string) => findItemByPath(items, key),
    };

    // Set activeBreakpoint from viewportWidth + theme breakpoints
    if (viewportWidth != null && theme?.breakpoints) {
        const bps = Object.entries(theme.breakpoints as Record<string, number>)
            .sort(([, a], [, b]) => a - b);
        let active: string | null = null;
        for (const [name, value] of bps) {
            if (viewportWidth >= value) active = name;
        }
        ctx.activeBreakpoint = active;
    }

    return ctx;
}

// ── Node assertion (mirrors Rust assert_node_matches) ────────────────

function assertNodeMatches(actual: LayoutNode, expected: any, nodePath: string): void {
    if (expected.component !== undefined) {
        expect(actual.component, `${nodePath}: component`).toBe(expected.component);
    }
    if (expected.category !== undefined) {
        expect(actual.category, `${nodePath}: category`).toBe(expected.category);
    }
    if (expected.bindPath !== undefined) {
        expect(actual.bindPath, `${nodePath}: bindPath`).toBe(expected.bindPath);
    }
    if (expected.childCount !== undefined) {
        expect(actual.children?.length ?? 0, `${nodePath}: childCount`).toBe(expected.childCount);
    }
    if (expected.props !== undefined) {
        for (const [k, v] of Object.entries(expected.props)) {
            expect(actual.props?.[k], `${nodePath}: props.${k}`).toEqual(v);
        }
    }
    if (expected.fieldItem !== undefined) {
        expect(actual.fieldItem, `${nodePath}: fieldItem should exist`).toBeTruthy();
        const fi = actual.fieldItem!;
        if (expected.fieldItem.key !== undefined) {
            expect(fi.key, `${nodePath}: fieldItem.key`).toBe(expected.fieldItem.key);
        }
        if (expected.fieldItem.label !== undefined) {
            expect(fi.label, `${nodePath}: fieldItem.label`).toBe(expected.fieldItem.label);
        }
        if (expected.fieldItem.dataType !== undefined) {
            expect(fi.dataType, `${nodePath}: fieldItem.dataType`).toBe(expected.fieldItem.dataType);
        }
    }
    if (expected.children !== undefined) {
        const children = actual.children ?? [];
        for (let i = 0; i < expected.children.length; i++) {
            expect(children.length, `${nodePath}: expected child [${i}]`).toBeGreaterThan(i);
            assertNodeMatches(children[i], expected.children[i], `${nodePath}.children[${i}]`);
        }
    }
}

// ── Fixture dispatch ─────────────────────────────────────────────────

function runFixture(fixture: Fixture): void {
    const id = fixture.id;
    const ctx = ctxFromFixture(fixture);

    if (id.startsWith('layout.component_tree')) {
        // Component tree planner: expects a root node
        const tree = fixture.input.componentDocument!.tree;
        const result = planComponentTree(tree, ctx);
        assertNodeMatches(result, fixture.expected.root, 'root');
    } else if (id.startsWith('layout.definition_fallback')) {
        // Definition fallback planner: expects nodeCount + nodes array
        const result = planDefinitionFallback(fixture.input.items, ctx);
        expect(result.length, 'nodeCount').toBe(fixture.expected.nodeCount);
        for (let i = 0; i < fixture.expected.nodes.length; i++) {
            assertNodeMatches(result[i], fixture.expected.nodes[i], `nodes[${i}]`);
        }
    } else if (id.startsWith('layout.theme_pages')) {
        // Theme page planner: expects nodeCount + nodes array
        const result = planThemePages(fixture.input.items, ctx);
        expect(result.length, 'nodeCount').toBe(fixture.expected.nodeCount);
        for (let i = 0; i < fixture.expected.nodes.length; i++) {
            assertNodeMatches(result[i], fixture.expected.nodes[i], `nodes[${i}]`);
        }
    } else if (id.startsWith('layout.unbound_required')) {
        // Unbound required: plan the tree first, then find unbound required items
        const tree = fixture.input.componentDocument!.tree;
        const treeNode = planComponentTree(tree, ctx);
        const unbound = planUnboundRequired(treeNode, fixture.input.items, ctx);
        const expectedUnbound = fixture.expected.unboundRequired;
        expect(unbound.length, 'unboundRequired count').toBe(expectedUnbound.length);
        for (let i = 0; i < expectedUnbound.length; i++) {
            assertNodeMatches(unbound[i], expectedUnbound[i], `unboundRequired[${i}]`);
        }
    } else {
        throw new Error(`Unknown fixture type: ${id}`);
    }
}

// ── Test suite ───────────────────────────────────────────────────────

describe('Cross-planner conformance fixtures', () => {
    beforeEach(() => {
        resetNodeIdCounter();
    });

    const fixtures = loadAllFixtures();

    for (const { name, fixture } of fixtures) {
        it(`${fixture.id}: ${fixture.description}`, () => {
            runFixture(fixture);
        });
    }

    it('loads all 7 expected fixtures', () => {
        expect(fixtures.length).toBe(7);
    });
});
