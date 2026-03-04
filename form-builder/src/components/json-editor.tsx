import { effect, signal } from '@preact/signals';
import type { FormspecDefinition } from 'formspec-engine';
import { definition, definitionVersion, setDefinition } from '../state/definition';
import { componentDoc } from '../state/project';

const jsonText = signal('');
const status = signal<'ok' | 'error' | 'applied'>('ok');
const errorMessage = signal('');

effect(() => {
  definitionVersion.value;
  jsonText.value = JSON.stringify(definition.value, null, 2);
});

export function JsonEditor() {
  function handleApply() {
    try {
      const parsed = JSON.parse(jsonText.value) as FormspecDefinition;
      componentDoc.value = null; // Regenerate component tree from new definition
      setDefinition(parsed);
      status.value = 'applied';
      errorMessage.value = '';
      setTimeout(() => {
        if (status.value === 'applied') {
          status.value = 'ok';
        }
      }, 2000);
    } catch (error) {
      status.value = 'error';
      errorMessage.value = (error as Error).message;
    }
  }

  return (
    <div class="json-editor">
      <textarea
        class="json-editor-textarea"
        value={jsonText.value}
        onInput={(event) => {
          jsonText.value = (event.target as HTMLTextAreaElement).value;
          status.value = 'ok';
          errorMessage.value = '';
        }}
        spellcheck={false}
      />
      <div class="json-editor-actions">
        <button class="btn-primary" onClick={handleApply}>
          Apply Changes
        </button>
        <span class={`json-editor-status ${status.value}`}>
          {status.value === 'applied' && '✓ Applied'}
          {status.value === 'error' && `✗ ${errorMessage.value}`}
        </span>
      </div>
    </div>
  );
}
