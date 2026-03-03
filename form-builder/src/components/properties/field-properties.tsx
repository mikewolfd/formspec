import type { ComponentChildren } from 'preact';
import type { FormspecItem } from 'formspec-engine';
import { findItemByKey, updateDefinition } from '../../state/definition';
import { FelExpressionInput } from './fel-expression-input';
import { FelHelper } from './fel-helper';
import { JsonPropertyEditor } from './json-property-editor';

export function FieldProperties({ item }: { item: FormspecItem }) {
  function updateField(field: string, value: unknown) {
    updateDefinition((def) => {
      const found = findItemByKey(item.key, def.items);
      if (!found) {
        return;
      }
      const draft = found.item as Record<string, unknown>;
      if (value === '' || value === null || value === undefined) {
        draft[field] = undefined;
        return;
      }
      draft[field] = value;
    });
  }

  const isChoice = item.dataType === 'choice' || item.dataType === 'multiChoice';
  const rawOptions = (item as Record<string, unknown>).options;
  const optionsSource = typeof rawOptions === 'string' ? rawOptions : '';
  const options = rawOptions as
    | { value: string; label?: string }[]
    | undefined;

  function addOption() {
    updateDefinition((def) => {
      const found = findItemByKey(item.key, def.items);
      if (!found) return;
      const draft = found.item as Record<string, unknown>;
      const current = (draft.options as { value: string; label?: string }[] | undefined) ?? [];
      draft.options = [...current, { value: '', label: '' }];
    });
  }

  function updateOption(index: number, field: 'value' | 'label', val: string) {
    updateDefinition((def) => {
      const found = findItemByKey(item.key, def.items);
      if (!found) return;
      const draft = found.item as Record<string, unknown>;
      const current = (draft.options as { value: string; label?: string }[]) ?? [];
      const updated = current.map((opt, i) =>
        i === index ? { ...opt, [field]: val } : opt,
      );
      draft.options = updated;
    });
  }

  function removeOption(index: number) {
    updateDefinition((def) => {
      const found = findItemByKey(item.key, def.items);
      if (!found) return;
      const draft = found.item as Record<string, unknown>;
      const current = (draft.options as { value: string; label?: string }[]) ?? [];
      draft.options = current.filter((_, i) => i !== index);
    });
  }

  return (
    <div class="properties-content">
      <div class="property-type-header">
        <span
          class="tree-node-dot"
          style={{
            background: '#D4A34A',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            display: 'inline-block',
          }}
        />
        Field
      </div>

      <div class="section-title">Identity</div>
      <PropertyRow label="Key">
        <input
          class="studio-input studio-input-mono"
          value={item.key}
          onInput={(event) => updateField('key', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Label">
        <input
          class="studio-input"
          value={item.label || ''}
          onInput={(event) => updateField('label', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>

      <div class="section-title">Data</div>
      <PropertyRow label="Data Type">
        <select
          class="studio-select"
          value={item.dataType || 'string'}
          onChange={(event) => updateField('dataType', (event.target as HTMLSelectElement).value)}
        >
          <option value="string">string</option>
          <option value="text">text</option>
          <option value="integer">integer</option>
          <option value="decimal">decimal</option>
          <option value="boolean">boolean</option>
          <option value="date">date</option>
          <option value="dateTime">dateTime</option>
          <option value="time">time</option>
          <option value="choice">choice</option>
          <option value="multiChoice">multiChoice</option>
          <option value="money">money</option>
          <option value="uri">uri</option>
          <option value="attachment">attachment</option>
        </select>
      </PropertyRow>
      <PropertyRow label="Placeholder">
        <input
          class="studio-input"
          value={String((item as Record<string, unknown>).placeholder ?? '')}
          onInput={(event) => updateField('placeholder', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Description">
        <input
          class="studio-input"
          value={item.description || ''}
          onInput={(event) => updateField('description', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Hint">
        <input
          class="studio-input"
          value={item.hint || ''}
          onInput={(event) => updateField('hint', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Semantic Type">
        <input
          class="studio-input studio-input-mono"
          value={String((item as Record<string, unknown>).semanticType ?? '')}
          onInput={(event) => updateField('semanticType', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Currency">
        <input
          class="studio-input studio-input-mono"
          value={String((item as Record<string, unknown>).currency ?? '')}
          placeholder="USD"
          onInput={(event) => updateField('currency', (event.target as HTMLInputElement).value.toUpperCase())}
        />
      </PropertyRow>
      <PropertyRow label="Precision">
        <input
          class="studio-input"
          type="number"
          min="0"
          value={typeof (item as Record<string, unknown>).precision === 'number'
            ? String((item as Record<string, unknown>).precision)
            : ''}
          onInput={(event) => {
            const value = (event.target as HTMLInputElement).value;
            updateField('precision', value ? Number(value) : undefined);
          }}
        />
      </PropertyRow>
      <PropertyRow label="Prefix">
        <input
          class="studio-input"
          value={String((item as Record<string, unknown>).prefix ?? '')}
          onInput={(event) => updateField('prefix', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Suffix">
        <input
          class="studio-input"
          value={String((item as Record<string, unknown>).suffix ?? '')}
          onInput={(event) => updateField('suffix', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Option Set">
        <input
          class="studio-input studio-input-mono"
          value={String((item as Record<string, unknown>).optionSet ?? '')}
          placeholder="yesNoNa"
          onInput={(event) => updateField('optionSet', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Options Source URI">
        <input
          class="studio-input studio-input-mono"
          value={optionsSource}
          placeholder="https://example.gov/options"
          onInput={(event) => updateField('options', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Initial Value (JSON)">
        <JsonPropertyEditor
          label="Initial Value"
          value={(item as Record<string, unknown>).initialValue}
          onChange={(value) => updateField('initialValue', value)}
          placeholder="0"
          rows={2}
        />
      </PropertyRow>
      <PropertyRow label="Pre-Populate (JSON)">
        <JsonPropertyEditor
          label="Pre-Populate"
          value={(item as Record<string, unknown>).prePopulate}
          onChange={(value) => updateField('prePopulate', value)}
          placeholder='{"instance":"priorYear","path":"totalExpenditure"}'
          rows={3}
        />
      </PropertyRow>
      <PropertyRow label="Labels (JSON)">
        <JsonPropertyEditor
          label="Labels"
          value={(item as Record<string, unknown>).labels}
          onChange={(value) => updateField('labels', value)}
          placeholder='{"short":"Budget"}'
          rows={3}
        />
      </PropertyRow>
      <PropertyRow label="Presentation (JSON)">
        <JsonPropertyEditor
          label="Presentation"
          value={(item as Record<string, unknown>).presentation}
          onChange={(value) => updateField('presentation', value)}
          placeholder="{}"
          rows={3}
        />
      </PropertyRow>
      <PropertyRow label="Extensions (JSON)">
        <JsonPropertyEditor
          label="Extensions"
          value={(item as Record<string, unknown>).extensions}
          onChange={(value) => updateField('extensions', value)}
          placeholder='{"x-namespace":{}}'
          rows={3}
        />
      </PropertyRow>
      <PropertyRow label="Children (JSON)">
        <JsonPropertyEditor
          label="Children"
          value={(item as Record<string, unknown>).children}
          onChange={(value) => updateField('children', value)}
          placeholder="[]"
          rows={3}
        />
      </PropertyRow>

      {isChoice && !optionsSource && (
        <div class="options-editor">
          <div class="section-title">Options</div>
          {(options ?? []).map((opt, i) => (
            <div class="option-row" key={i}>
              <input
                class="studio-input studio-input-mono option-value-input"
                value={opt.value}
                placeholder="value"
                aria-label={`Option ${i + 1} value`}
                onInput={(event) =>
                  updateOption(i, 'value', (event.target as HTMLInputElement).value)
                }
              />
              <input
                class="studio-input option-label-input"
                value={opt.label ?? ''}
                placeholder="label (optional)"
                aria-label={`Option ${i + 1} label`}
                onInput={(event) =>
                  updateOption(i, 'label', (event.target as HTMLInputElement).value)
                }
              />
              <button
                class="btn-ghost option-remove-btn"
                aria-label={`Remove option ${i + 1}`}
                onClick={() => removeOption(i)}
              >
                ×
              </button>
            </div>
          ))}
          <button class="btn-ghost add-option-btn" onClick={addOption}>
            + Add Option
          </button>
        </div>
      )}

      <div class="section-title">Behavior</div>
      <PropertyRow label={<span class="label-with-helper">Relevant <FelHelper /></span>}>
        <FelExpressionInput
          value={item.relevant || ''}
          placeholder="FEL expression"
          onValueChange={(value) => updateField('relevant', value)}
        />
      </PropertyRow>
      <PropertyRow label={<span class="label-with-helper">Required <FelHelper /></span>}>
        <FelExpressionInput
          value={typeof item.required === 'string' ? item.required : ''}
          placeholder="FEL expression or true()"
          onValueChange={(value) => updateField('required', value)}
        />
      </PropertyRow>
      <PropertyRow label={<span class="label-with-helper">Read Only <FelHelper /></span>}>
        <FelExpressionInput
          value={typeof item.readonly === 'string' ? item.readonly : ''}
          placeholder="FEL expression"
          onValueChange={(value) => updateField('readonly', value)}
        />
      </PropertyRow>
      <PropertyRow label={<span class="label-with-helper">Calculate <FelHelper /></span>}>
        <FelExpressionInput
          value={item.calculate || ''}
          placeholder="FEL expression"
          onValueChange={(value) => updateField('calculate', value)}
        />
      </PropertyRow>

      <div class="section-title">Validation</div>
      <PropertyRow label={<span class="label-with-helper">Constraint <FelHelper /></span>}>
        <FelExpressionInput
          value={item.constraint || ''}
          placeholder="FEL expression"
          onValueChange={(value) => updateField('constraint', value)}
        />
      </PropertyRow>
      <PropertyRow label="Message">
        <input
          class="studio-input"
          value={item.message || ''}
          placeholder="Validation error message"
          onInput={(event) => updateField('message', (event.target as HTMLInputElement).value)}
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
