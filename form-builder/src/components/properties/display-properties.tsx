import type { ComponentChildren } from 'preact';
import type { FormspecItem } from 'formspec-engine';
import { findItemByKey, updateDefinition } from '../../state/definition';
import { JsonPropertyEditor } from './json-property-editor';

export function DisplayProperties({ item }: { item: FormspecItem }) {
  function updateDisplay(field: string, value: unknown) {
    updateDefinition((def) => {
      const found = findItemByKey(item.key, def.items);
      if (!found) return;
      const draft = found.item as Record<string, unknown>;
      if (value === '' || value === null || value === undefined) {
        draft[field] = undefined;
        return;
      }
      draft[field] = value;
    });
  }

  return (
    <div class="properties-content">
      <div class="property-type-header">
        <span
          class="tree-node-dot"
          style={{
            background: '#8F6FD8',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            display: 'inline-block',
          }}
        />
        Display
      </div>

      <div class="section-title">Identity</div>
      <PropertyRow label="Key">
        <input
          class="studio-input studio-input-mono"
          value={item.key}
          onInput={(event) => updateDisplay('key', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Label">
        <input
          class="studio-input"
          value={item.label || ''}
          onInput={(event) => updateDisplay('label', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Description">
        <input
          class="studio-input"
          value={item.description || ''}
          onInput={(event) => updateDisplay('description', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Hint">
        <input
          class="studio-input"
          value={item.hint || ''}
          onInput={(event) => updateDisplay('hint', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>

      <div class="section-title">Advanced</div>
      <PropertyRow label="Labels (JSON)">
        <JsonPropertyEditor
          label="Labels"
          value={(item as Record<string, unknown>).labels}
          onChange={(value) => updateDisplay('labels', value)}
          placeholder='{"short":"Instructions"}'
          rows={3}
        />
      </PropertyRow>
      <PropertyRow label="Presentation (JSON)">
        <JsonPropertyEditor
          label="Presentation"
          value={(item as Record<string, unknown>).presentation}
          onChange={(value) => updateDisplay('presentation', value)}
          placeholder="{}"
          rows={3}
        />
      </PropertyRow>
      <PropertyRow label="Extensions (JSON)">
        <JsonPropertyEditor
          label="Extensions"
          value={(item as Record<string, unknown>).extensions}
          onChange={(value) => updateDisplay('extensions', value)}
          placeholder='{"x-namespace":{}}'
          rows={3}
        />
      </PropertyRow>
    </div>
  );
}

function PropertyRow({ label, children }: { label: string | ComponentChildren; children: ComponentChildren }) {
  return (
    <div class="property-row">
      <label class="property-label">{label}</label>
      {children}
    </div>
  );
}
