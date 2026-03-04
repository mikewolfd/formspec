import type { ComponentChildren } from 'preact';
import type { FormspecItem } from 'formspec-engine';
import { assembledDefinition, definition, findItemByKey, setDefinition, updateDefinition } from '../../state/definition';
import { componentDoc } from '../../state/project';
import { forkRefGroup } from '../../logic/definition-library';
import { FelExpressionInput } from './fel-expression-input';
import { FelHelper } from './fel-helper';
import { JsonPropertyEditor } from './json-property-editor';

export function GroupProperties({ item }: { item: FormspecItem }) {
  function updateGroup(field: string, value: unknown) {
    updateDefinition((def) => {
      const found = findItemByKey(item.key, def.items);
      if (!found) {
        return;
      }
      const draft = found.item as Record<string, unknown>;
      if (field === 'repeatable') {
        draft.repeatable = value === 'true';
        return;
      }
      if (field === 'minRepeat' || field === 'maxRepeat') {
        draft[field] = value ? Number(value) : undefined;
        return;
      }
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
            background: '#5A8FBB',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            display: 'inline-block',
          }}
        />
        Group
      </div>

      <div class="section-title">Identity</div>
      <PropertyRow label="Key">
        <input
          class="studio-input studio-input-mono"
          value={item.key}
          onInput={(event) => updateGroup('key', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Label">
        <input
          class="studio-input"
          value={item.label || ''}
          onInput={(event) => updateGroup('label', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Description">
        <input
          class="studio-input"
          value={item.description || ''}
          onInput={(event) => updateGroup('description', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Hint">
        <input
          class="studio-input"
          value={item.hint || ''}
          onInput={(event) => updateGroup('hint', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Reference URI">
        <input
          class="studio-input studio-input-mono"
          value={String((item as Record<string, unknown>).$ref ?? '')}
          placeholder="https://example.gov/forms/common|1.0.0"
          onInput={(event) => updateGroup('$ref', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Key Prefix">
        <input
          class="studio-input studio-input-mono"
          value={String((item as Record<string, unknown>).keyPrefix ?? '')}
          placeholder="demo_"
          onInput={(event) => updateGroup('keyPrefix', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      {!!(item as Record<string, unknown>).$ref && (
        <div class="drawer-actions" style={{ padding: '4px 0' }}>
          <button
            class="btn-ghost"
            onClick={() => {
              const assembled = assembledDefinition.value;
              if (!assembled) return;
              const result = forkRefGroup(definition.value, assembled, item.key);
              componentDoc.value = null; // Regenerate component tree with forked children
              setDefinition(result);
            }}
          >
            Fork (make editable)
          </button>
        </div>
      )}

      <PropertyRow label="Labels (JSON)">
        <JsonPropertyEditor
          label="Labels"
          value={(item as Record<string, unknown>).labels}
          onChange={(value) => updateGroup('labels', value)}
          placeholder='{"short":"Address"}'
          rows={3}
        />
      </PropertyRow>
      <PropertyRow label="Presentation (JSON)">
        <JsonPropertyEditor
          label="Presentation"
          value={(item as Record<string, unknown>).presentation}
          onChange={(value) => updateGroup('presentation', value)}
          placeholder="{}"
          rows={3}
        />
      </PropertyRow>
      <PropertyRow label="Extensions (JSON)">
        <JsonPropertyEditor
          label="Extensions"
          value={(item as Record<string, unknown>).extensions}
          onChange={(value) => updateGroup('extensions', value)}
          placeholder='{"x-namespace":{}}'
          rows={3}
        />
      </PropertyRow>

      <div class="section-title">Behavior</div>
      <PropertyRow label={<span class="label-with-helper">Relevant <FelHelper /></span>}>
        <FelExpressionInput
          value={item.relevant || ''}
          placeholder="FEL expression"
          onValueChange={(value) => updateGroup('relevant', value)}
        />
      </PropertyRow>
      <PropertyRow label={<span class="label-with-helper">Read Only <FelHelper /></span>}>
        <FelExpressionInput
          value={typeof item.readonly === 'string' ? item.readonly : ''}
          placeholder="FEL expression"
          onValueChange={(value) => updateGroup('readonly', value)}
        />
      </PropertyRow>

      <div class="section-title">Repeat</div>
      <PropertyRow label="Repeatable">
        <select
          class="studio-select"
          value={item.repeatable ? 'true' : 'false'}
          onChange={(event) => updateGroup('repeatable', (event.target as HTMLSelectElement).value)}
        >
          <option value="false">false</option>
          <option value="true">true</option>
        </select>
      </PropertyRow>
      <PropertyRow label="Min Repeat">
        <input
          class="studio-input"
          type="number"
          min="0"
          value={typeof item.minRepeat === 'number' ? String(item.minRepeat) : ''}
          onInput={(event) => updateGroup('minRepeat', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Max Repeat">
        <input
          class="studio-input"
          type="number"
          min="0"
          value={typeof item.maxRepeat === 'number' ? String(item.maxRepeat) : ''}
          onInput={(event) => updateGroup('maxRepeat', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Children (JSON)">
        <JsonPropertyEditor
          label="Children"
          value={(item as Record<string, unknown>).children}
          onChange={(value) => updateGroup('children', value)}
          placeholder="[]"
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
