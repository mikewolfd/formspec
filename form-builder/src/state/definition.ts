import { batch, signal } from '@preact/signals';
import { FormEngine, type FormspecDefinition, type FormspecItem, type FormspecShape } from 'formspec-engine';
import type { BuilderDiagnostic } from '../types';
import { diagnostics, engine, project, componentDoc, setComponentDoc } from './project';
import { createEmptyDefinition } from '../logic/seed-definition';
import { findItemByKey as findItemByKeyPure } from '../logic/find-item';
import { generateComponentTree } from '../logic/component-tree';

export { createEmptyDefinition };

export const definition = signal<FormspecDefinition>(createEmptyDefinition());
export const definitionVersion = signal(0);
export const assembledDefinition = signal<FormspecDefinition | null>(null);

project.value = { ...project.value, definition: definition.value };

export function updateDefinition(mutator: (def: FormspecDefinition) => void) {
    const current = { ...definition.value };
    mutator(current);
    batch(() => {
        definition.value = current;
        definitionVersion.value += 1;
        project.value = { ...project.value, definition: current };
    });
    rebuildEngine(current);
    syncComponentTree(current);
}

export function findBindByPath(def: FormspecDefinition, path: string) {
    return (def.binds || []).find((b) => b.path === path);
}

export function updateBind(path: string, patch: Partial<Omit<any, 'path'>>) {
    updateDefinition((def) => {
        if (!def.binds) def.binds = [];
        let bind = def.binds.find((b) => b.path === path);
        if (!bind) {
            bind = { path } as any;
            def.binds.push(bind!);
        }

        Object.entries(patch).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') {
                delete (bind as any)[key];
            } else {
                (bind as any)[key] = value;
            }
        });

        // Clean up empty binds
        if (Object.keys(bind!).length === 1) { // only path remains
            def.binds = def.binds.filter(b => b.path !== path);
        }
    });
}

export function addShape(shape: FormspecShape) {
    updateDefinition((def) => {
        if (!def.shapes) def.shapes = [];
        def.shapes.push(shape);
    });
}

export function updateShape(id: string, patch: Partial<FormspecShape>) {
    updateDefinition((def) => {
        if (!def.shapes) return;
        const index = def.shapes.findIndex((s) => s.id === id);
        if (index !== -1) {
            def.shapes[index] = { ...def.shapes[index], ...patch };
        }
    });
}

export function removeShape(id: string) {
    updateDefinition((def) => {
        if (!def.shapes) return;
        def.shapes = def.shapes.filter((s) => s.id !== id);
    });
}

export function setDefinition(next: FormspecDefinition) {
    batch(() => {
        definition.value = next;
        definitionVersion.value += 1;
        project.value = { ...project.value, definition: next };
    });
    rebuildEngine(next);
    syncComponentTree(next);
}

export function findItemByKey(
    key: string,
    items: FormspecItem[] = definition.value.items,
): { item: FormspecItem; siblings: FormspecItem[]; index: number; path: string } | null {
    return findItemByKeyPure(key, items);
}

function rebuildEngine(current: FormspecDefinition) {
    try {
        const nextEngine = new FormEngine(current);
        const report = nextEngine.getValidationReport();
        const mapped: BuilderDiagnostic[] = report.results.map((result) => ({
            severity: result.severity,
            artifact: 'definition',
            path: result.path,
            message: result.message,
            source: result.source ?? 'engine',
        }));

        batch(() => {
            assembledDefinition.value = current;
            engine.value = nextEngine;
            diagnostics.value = mapped;
        });
    } catch (error) {
        batch(() => {
            assembledDefinition.value = current;
            engine.value = null;
            diagnostics.value = [
                {
                    severity: 'error',
                    artifact: 'definition',
                    path: '',
                    message: `Engine error: ${(error as Error).message}`,
                    source: 'engine',
                },
            ];
        });
    }
}

rebuildEngine(definition.value);

// Auto-generate initial component tree
if (!componentDoc.value) {
    syncComponentTree(definition.value);
}

function syncComponentTree(current: FormspecDefinition) {
    const previous = componentDoc.value;
    const tree = generateComponentTree(current);
    setComponentDoc({
        $formspecComponent: '1.0',
        version: previous?.version ?? '1.0.0',
        title: previous?.title,
        description: previous?.description,
        targetDefinition: { url: current.url },
        breakpoints: previous?.breakpoints,
        tokens: previous?.tokens,
        tree,
    });
}
