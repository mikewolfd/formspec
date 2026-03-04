import { batch, signal } from '@preact/signals';
import { FormEngine, assembleDefinitionSync, type FormspecDefinition, type FormspecItem } from 'formspec-engine';
import type { BuilderDiagnostic } from '../types';
import { diagnostics, engine, project, componentDoc, setComponentDoc } from './project';
import { createEmptyDefinition } from '../logic/seed-definition';
import { findItemByKey as findItemByKeyPure } from '../logic/find-item';
import { createResolver } from '../logic/definition-library';
import { generateComponentTree } from '../logic/component-tree';

export { createEmptyDefinition };

export const definition = signal<FormspecDefinition>(createEmptyDefinition());
export const definitionVersion = signal(0);
export const assembledDefinition = signal<FormspecDefinition | null>(null);

project.value = { ...project.value, definition: definition.value };

export function updateDefinition(mutator: (def: FormspecDefinition) => void) {
  const current = definition.value;
  mutator(current);
  batch(() => {
    definitionVersion.value += 1;
    project.value = { ...project.value, definition: current };
  });
  rebuildEngine(current);
}

export function setDefinition(next: FormspecDefinition) {
  batch(() => {
    definition.value = next;
    definitionVersion.value += 1;
    project.value = { ...project.value, definition: next };
  });
  rebuildEngine(next);

  // Auto-generate component tree if none exists
  if (!componentDoc.value) {
    const tree = generateComponentTree(next);
    setComponentDoc({
      $formspecComponent: '1.0',
      version: '1.0.0',
      targetDefinition: { url: next.url },
      tree,
    });
  }
}

export function findItemByKey(
  key: string,
  items: FormspecItem[] = definition.value.items,
): { item: FormspecItem; siblings: FormspecItem[]; index: number } | null {
  return findItemByKeyPure(key, items);
}

function rebuildEngine(current: FormspecDefinition) {
  const assemblyDiags: BuilderDiagnostic[] = [];
  let defForEngine = current;

  // Attempt assembly if any group has $ref
  const hasRefs = current.items?.some((item) => item.type === 'group' && item.$ref);
  if (hasRefs) {
    try {
      const resolver = createResolver(project.value.library);
      const result = assembleDefinitionSync(current, resolver);
      defForEngine = result.definition;
    } catch (error) {
      assemblyDiags.push({
        severity: 'error',
        artifact: 'definition',
        path: '',
        message: (error as Error).message,
        source: 'assembler',
      });
      // Fall through to build engine with unassembled definition
    }
  }

  try {
    const nextEngine = new FormEngine(defForEngine);
    const report = nextEngine.getValidationReport();
    const mapped: BuilderDiagnostic[] = report.results.map((result) => ({
      severity: result.severity,
      artifact: 'definition',
      path: result.path,
      message: result.message,
      source: result.source ?? 'engine',
    }));

    batch(() => {
      assembledDefinition.value = defForEngine;
      engine.value = nextEngine;
      diagnostics.value = [...assemblyDiags, ...mapped];
    });
  } catch (error) {
    batch(() => {
      assembledDefinition.value = defForEngine;
      engine.value = null;
      diagnostics.value = [
        ...assemblyDiags,
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
  const tree = generateComponentTree(definition.value);
  setComponentDoc({
    $formspecComponent: '1.0',
    version: '1.0.0',
    targetDefinition: { url: definition.value.url },
    tree,
  });
}
