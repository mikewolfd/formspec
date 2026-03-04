import { setDefinition } from '../state/definition';
import { componentDoc, project, setComponentDoc } from '../state/project';
import { showToast } from '../state/toast';
import { exportCoreBundle, exportDefinitionJSON, parseImportedProject, pickAndReadJSONFile } from './import-export';
import type { ComponentDocument, ExportProfile } from '../types';

export async function handleImport(): Promise<void> {
  try {
    const jsonText = await pickAndReadJSONFile();
    const imported = parseImportedProject(jsonText);
    if (!imported.definition) {
      showToast('Invalid import: missing definition', 'error');
      return;
    }
    // If bundle includes a component document, load it before setDefinition
    // so setDefinition won't auto-generate a new one
    if (imported.component && (imported.component as Record<string, unknown>).$formspecComponent) {
      setComponentDoc(imported.component as ComponentDocument);
    } else {
      // Clear so setDefinition auto-generates
      componentDoc.value = null;
    }
    setDefinition(imported.definition);
    project.value = {
      ...project.value,
      previousDefinitions: imported.previousDefinitions,
      theme: imported.theme,
      component: imported.component,
      mappings: imported.mappings,
      registries: imported.registries,
      changelogs: imported.changelogs,
    };
    showToast('Definition imported successfully', 'success');
  } catch (e) {
    if ((e as Error).message === 'No file selected') return;
    showToast(`Import failed: ${(e as Error).message}`, 'error');
  }
}

export function handleExport(profile: ExportProfile = 'definition-only'): void {
  const current = project.value;
  if (!current.definition) {
    showToast('Nothing to export', 'error');
    return;
  }
  try {
    if (profile === 'definition-only') {
      exportDefinitionJSON(current.definition);
      showToast('Definition exported', 'success');
      return;
    }
    exportCoreBundle(current);
    showToast('Core bundle exported', 'success');
  } catch (e) {
    showToast(`Export failed: ${(e as Error).message}`, 'error');
  }
}
