import { batch, signal } from '@preact/signals';
import { FormEngine, type FormspecDefinition, type FormspecItem } from 'formspec-engine';
import type { BuilderDiagnostic } from '../types';
import { diagnostics, engine, project } from './project';
import { createEmptyDefinition } from '../logic/seed-definition';
import { findItemByKey as findItemByKeyPure } from '../logic/find-item';

export { createEmptyDefinition };

export const definition = signal<FormspecDefinition>(createEmptyDefinition());
export const definitionVersion = signal(0);

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
}

export function findItemByKey(
  key: string,
  items: FormspecItem[] = definition.value.items,
): { item: FormspecItem; siblings: FormspecItem[]; index: number } | null {
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
      engine.value = nextEngine;
      diagnostics.value = mapped;
    });
  } catch (error) {
    batch(() => {
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
