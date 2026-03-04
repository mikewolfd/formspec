import { signal } from '@preact/signals';
import { project } from '../state/project';
import { showToast } from '../state/toast';
import type { ArtifactKind } from '../types';

export const ARTIFACT_TEMPLATES: Record<string, object> = {
  component: {
    $formspecComponent: '1.0',
    version: '1.0.0',
    targetDefinition: { url: '' },
    tree: [],
  },
  theme: {
    $formspecTheme: '1.0',
    version: '1.0.0',
    targetDefinition: { url: '' },
    tokens: {},
    defaults: {},
    selectors: [],
  },
  mapping: {
    $formspecMapping: '1.0',
    version: '1.0.0',
    targetDefinition: { url: '' },
    adapter: 'json',
    rules: [],
  },
  registry: {
    $formspecRegistry: '1.0',
    version: '1.0.0',
    extensions: [],
  },
  changelog: {
    $formspecChangelog: '1.0',
    version: '1.0.0',
    changes: [],
  },
};

// Module-level state keyed by artifact kind so signals persist across re-renders
const editorState: Partial<
  Record<
    ArtifactKind,
    {
      jsonText: ReturnType<typeof signal<string>>;
      status: ReturnType<typeof signal<'idle' | 'applied' | 'error'>>;
      errorMsg: ReturnType<typeof signal<string>>;
    }
  >
> = {};

function getArtifactData(kind: ArtifactKind): unknown | null {
  const current = project.value;
  if (kind === 'mapping') return current.mappings[0] ?? null;
  if (kind === 'registry') return current.registries[0] ?? null;
  if (kind === 'changelog') return current.changelogs[0] ?? null;
  if (kind === 'definition') return current.definition;
  return current[kind];
}

function setArtifactData(kind: ArtifactKind, data: unknown | null) {
  if (kind === 'mapping') {
    project.value = { ...project.value, mappings: data ? [data] : [] };
    return;
  }
  if (kind === 'registry') {
    project.value = { ...project.value, registries: data ? [data] : [] };
    return;
  }
  if (kind === 'changelog') {
    project.value = { ...project.value, changelogs: data ? [data] : [] };
    return;
  }
  if (kind === 'definition') {
    project.value = { ...project.value, definition: data as any };
    return;
  }
  project.value = { ...project.value, [kind]: data };
}

function getState(kind: ArtifactKind) {
  if (!editorState[kind]) {
    const data = getArtifactData(kind);
    editorState[kind] = {
      jsonText: signal(data ? JSON.stringify(data, null, 2) : ''),
      status: signal('idle'),
      errorMsg: signal(''),
    };
  }
  return editorState[kind]!;
}

export function resetArtifactEditorState(kind?: ArtifactKind) {
  if (kind) {
    delete editorState[kind];
  } else {
    for (const k of Object.keys(editorState) as ArtifactKind[]) {
      delete editorState[k];
    }
  }
}

export function ArtifactEditor({ kind }: { kind: ArtifactKind }) {
  const { jsonText, status, errorMsg } = getState(kind);

  // Sync textarea with current project data (e.g. when artifact is first loaded)
  const currentData = getArtifactData(kind);
  if (!jsonText.value && currentData) {
    jsonText.value = JSON.stringify(currentData, null, 2);
  }

  function applyChanges() {
    try {
      const parsed = JSON.parse(jsonText.value ?? '');
      setArtifactData(kind, parsed);
      // Update the editor text to the canonical re-serialized form
      jsonText.value = JSON.stringify(parsed, null, 2);
      status.value = 'applied';
      errorMsg.value = '';
      showToast(`${kind} updated`, 'success');
    } catch (e) {
      status.value = 'error';
      errorMsg.value = (e as Error).message;
    }
  }

  function revert() {
    const current = getArtifactData(kind);
    jsonText.value = current ? JSON.stringify(current, null, 2) : '';
    status.value = 'idle';
    errorMsg.value = '';
  }

  function removeArtifact() {
    setArtifactData(kind, null);
    resetArtifactEditorState(kind);
    showToast(`${kind} removed`, 'info');
  }

  return (
    <div class="json-editor">
      <textarea
        class="json-editor-textarea"
        value={jsonText.value ?? ''}
        onInput={(e) => {
          jsonText.value = (e.target as HTMLTextAreaElement).value;
          status.value = 'idle';
          errorMsg.value = '';
        }}
        spellcheck={false}
      />
      <div class="json-editor-actions">
        <button class="btn-primary" onClick={applyChanges}>
          Apply Changes
        </button>
        <button class="btn-ghost" onClick={revert}>
          Revert
        </button>
        <button class="btn-ghost btn-danger" onClick={removeArtifact}>
          Remove
        </button>
        {status.value !== 'idle' && (
          <span class={`json-editor-status ${status.value}`}>
            {status.value === 'applied' && '✓ Applied'}
            {status.value === 'error' && `✗ ${errorMsg.value}`}
          </span>
        )}
      </div>
    </div>
  );
}
