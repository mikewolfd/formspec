import { project } from '../state/project';
import { showToast } from '../state/toast';
import { ARTIFACT_TEMPLATES } from './artifact-editor';
import type { ArtifactKind } from '../types';

const TAB_INFO: Record<string, { icon: string; description: string }> = {
  component: {
    icon: '◇',
    description: 'Component documents define how your form renders.',
  },
  theme: {
    icon: '◈',
    description: 'Theme documents control colors, typography, and layout.',
  },
  mapping: {
    icon: '⬡',
    description: 'Mapping documents transform form data to external formats.',
  },
  registry: {
    icon: '▢',
    description: 'Registry documents declare extensions and dependencies.',
  },
  changelog: {
    icon: '▤',
    description: 'Changelog documents track version history.',
  },
};

function handleCreateFromScratch(kind: ArtifactKind) {
  const template = ARTIFACT_TEMPLATES[kind];
  if (!template) return;
  project.value = { ...project.value, [kind]: structuredClone(template) };
  showToast(`${kind} created`, 'success');
}

function handleImportJSON(kind: ArtifactKind) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        project.value = { ...project.value, [kind]: parsed };
        showToast(`${kind} imported`, 'success');
      } catch {
        showToast('Invalid JSON file', 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

export function EmptyTab({ kind }: { kind: ArtifactKind }) {
  const info = TAB_INFO[kind];
  if (!info) {
    return null;
  }

  const title = `${kind.slice(0, 1).toUpperCase()}${kind.slice(1)}`;

  return (
    <div class="empty-tab">
      <span class="empty-tab-icon">{info.icon}</span>
      <h2 class="empty-tab-title">{title} not configured</h2>
      <p class="empty-tab-desc">{info.description}</p>
      <div class="empty-tab-actions">
        <button class="btn-primary" onClick={() => handleCreateFromScratch(kind)}>
          Create from Scratch
        </button>
        <button class="btn-ghost" onClick={() => handleImportJSON(kind)}>
          Import JSON
        </button>
      </div>
    </div>
  );
}
