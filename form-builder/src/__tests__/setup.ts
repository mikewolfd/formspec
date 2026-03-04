import { cleanup } from '@testing-library/preact';
import { setDefinition, createEmptyDefinition } from '../state/definition';
import { selectedPath, addPickerState } from '../state/selection';
import {
  componentDoc,
  componentVersion,
  diagnostics,
  editorMode,
  engine,
  project,
  selectedChangelogIndex,
  selectedMappingIndex,
} from '../state/project';
import { toasts } from '../state/toast';

export function resetState() {
  // Clean up any rendered components from prior tests
  cleanup();
  componentDoc.value = null;
  componentVersion.value = 0;
  setDefinition(createEmptyDefinition());
  project.value = {
    ...project.value,
    previousDefinitions: [],
    theme: null,
    component: null,
    mappings: [],
    registries: [],
    changelogs: [],
    library: [],
  };
  selectedPath.value = null;
  addPickerState.value = null;
  selectedMappingIndex.value = 0;
  selectedChangelogIndex.value = 0;
  editorMode.value = 'guided';
  diagnostics.value = [];
  engine.value = null;
  toasts.value = [];
}
