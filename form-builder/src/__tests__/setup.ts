import { cleanup } from '@testing-library/preact';
import { setDefinition, createEmptyDefinition } from '../state/definition';
import { selectedPath, inlineAddState } from '../state/selection';
import { activeArtifact, editorMode, diagnostics, engine } from '../state/project';
import { toasts } from '../state/toast';

export function resetState() {
  // Clean up any rendered components from prior tests
  cleanup();
  setDefinition(createEmptyDefinition());
  selectedPath.value = null;
  inlineAddState.value = null;
  activeArtifact.value = 'definition';
  editorMode.value = 'guided';
  toasts.value = [];
}
