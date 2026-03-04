import { batch, signal } from '@preact/signals';
import { FormEngine } from 'formspec-engine';
import { diagnostics, engine, project, componentDoc, setComponentDoc } from './project';
import { createEmptyDefinition } from '../logic/seed-definition';
import { findItemByKey as findItemByKeyPure } from '../logic/find-item';
import { generateComponentTree } from '../logic/component-tree';
export { createEmptyDefinition };
export const definition = signal(createEmptyDefinition());
export const definitionVersion = signal(0);
export const assembledDefinition = signal(null);
project.value = { ...project.value, definition: definition.value };
export function updateDefinition(mutator) {
    const current = definition.value;
    mutator(current);
    batch(() => {
        definitionVersion.value += 1;
        project.value = { ...project.value, definition: current };
    });
    rebuildEngine(current);
}
export function setDefinition(next) {
    batch(() => {
        definition.value = next;
        definitionVersion.value += 1;
        project.value = { ...project.value, definition: next };
    });
    rebuildEngine(next);
    // Auto-generate component tree
    const tree = generateComponentTree(next);
    setComponentDoc({
        $formspecComponent: '1.0',
        version: '1.0.0',
        targetDefinition: { url: next.url },
        tree,
    });
}
export function findItemByKey(key, items = definition.value.items) {
    return findItemByKeyPure(key, items);
}
function rebuildEngine(current) {
    try {
        const nextEngine = new FormEngine(current);
        const report = nextEngine.getValidationReport();
        const mapped = report.results.map((result) => ({
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
    }
    catch (error) {
        batch(() => {
            assembledDefinition.value = current;
            engine.value = null;
            diagnostics.value = [
                {
                    severity: 'error',
                    artifact: 'definition',
                    path: '',
                    message: `Engine error: ${error.message}`,
                    source: 'engine',
                },
            ];
        });
    }
}
rebuildEngine(definition.value);
// Auto-generate initial component tree
if (!componentDoc.value) {
    const tree = generateComponentTree(definition.value);
    setComponentDoc({
        $formspecComponent: '1.0',
        version: '1.0.0',
        targetDefinition: { url: definition.value.url },
        tree,
    });
}
