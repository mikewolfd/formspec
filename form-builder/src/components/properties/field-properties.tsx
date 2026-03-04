import type { ComponentChildren } from 'preact';
import type { FormspecItem } from 'formspec-engine';
import { useState } from 'preact/hooks';
import { applyNumericConstraint } from '../../logic/semantic-constraints';
import {
  getEffectiveWidget,
  getThemeWidgetConfig,
  setComponentWidget,
  setThemeWidget,
  setThemeWidgetConfig,
} from '../../logic/presentation-docs';
import {
  addMappingRule,
  changelogChangesForField,
  createMappingDocument,
  mappingRulesForField,
  moveMappingRule,
  removeMappingRule,
  type MappingDocumentRecord,
  type MappingRuleTransform,
  updateMappingRule,
} from '../../logic/sidecars';
import { definition, findItemByKey, updateDefinition } from '../../state/definition';
import { componentDoc, componentVersion, project, selectedChangelogIndex, selectedMappingIndex, setComponentDoc } from '../../state/project';
import { selectedPath } from '../../state/selection';
import { resolveNode } from '../../logic/component-tree';
import { updateNodeProps } from '../../logic/component-tree-ops';
import { showToast } from '../../state/toast';
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
  const effectiveWidget = getEffectiveWidget(item, project.value);
  const fieldMappingRules = mappingRulesForField(project.value.mappings, item.key);
  const fieldHistory =
    project.value.changelogs.length === 0
      ? []
      : changelogChangesForField(
          project.value.changelogs[
            Math.min(selectedChangelogIndex.value, project.value.changelogs.length - 1)
          ],
          item.key,
        );
  const [newTargetPath, setNewTargetPath] = useState('');
  const [newTransform, setNewTransform] = useState<MappingRuleTransform>('preserve');
  const [editingRuleKey, setEditingRuleKey] = useState<string | null>(null);
  const [editingTargetPath, setEditingTargetPath] = useState('');
  const [editingTransform, setEditingTransform] = useState<MappingRuleTransform>('preserve');
  const [editingPriority, setEditingPriority] = useState(0);
  const [draggingRuleKey, setDraggingRuleKey] = useState<string | null>(null);
  const minConfig = getThemeWidgetConfig(project.value, item.key, 'min');
  const maxConfig = getThemeWidgetConfig(project.value, item.key, 'max');
  const stepConfig = getThemeWidgetConfig(project.value, item.key, 'step');

  function updateWidgetOverride(widget: string) {
    project.value = setThemeWidget(project.value, definition.value, item.key, widget);
  }

  function updateNumericConfig(key: 'min' | 'max' | 'step', raw: string) {
    const value = raw === '' ? undefined : Number(raw);
    project.value = setThemeWidgetConfig(project.value, definition.value, item.key, key, value);
    if (value !== undefined && !Number.isNaN(value)) {
      updateDefinition((draft) => {
        applyNumericConstraint(draft, item.key, key, value);
      });
    }
  }

  function createMappingForField() {
    const created = createMappingDocument(definition.value, {
      title: `Mapping ${project.value.mappings.length + 1}`,
    });
    const nextMappings = [...project.value.mappings, created];
    project.value = { ...project.value, mappings: nextMappings };
    selectedMappingIndex.value = nextMappings.length - 1;
    showToast('Mapping created for field', 'success');
  }

  function addFieldMappingRule() {
    if (!newTargetPath.trim()) {
      showToast('Destination path is required', 'error');
      return;
    }
    const mappings = [...project.value.mappings];
    if (mappings.length === 0) {
      mappings.push(
        createMappingDocument(definition.value, {
          title: 'Mapping 1',
        }),
      );
      selectedMappingIndex.value = 0;
    }
    const mappingIndex = Math.min(selectedMappingIndex.value, mappings.length - 1);
    const mapping = mappings[mappingIndex] as MappingDocumentRecord;
    const updated = addMappingRule(mapping, {
      sourcePath: item.key,
      targetPath: newTargetPath.trim(),
      transform: newTransform,
      priority: 0,
    });
    mappings[mappingIndex] = updated;
    project.value = { ...project.value, mappings };
    setNewTargetPath('');
    setNewTransform('preserve');
    showToast('Mapping rule added', 'success');
  }

  function startEditRule(entry: { mappingIndex: number; ruleIndex: number; rule: { targetPath?: string | null; transform: MappingRuleTransform } }) {
    setEditingRuleKey(`${entry.mappingIndex}-${entry.ruleIndex}`);
    setEditingTargetPath(String(entry.rule.targetPath ?? ''));
    setEditingTransform(entry.rule.transform);
    setEditingPriority(Number((entry.rule as { priority?: number }).priority ?? 0));
  }

  function saveEditRule(mappingIndex: number, ruleIndex: number) {
    const mappings = [...project.value.mappings];
    const mapping = mappings[mappingIndex] as MappingDocumentRecord;
    mappings[mappingIndex] = updateMappingRule(mapping, ruleIndex, {
      targetPath: editingTargetPath.trim(),
      transform: editingTransform,
      priority: editingPriority,
    });
    project.value = { ...project.value, mappings };
    setEditingRuleKey(null);
    showToast('Mapping rule updated', 'success');
  }

  function deleteRule(mappingIndex: number, ruleIndex: number) {
    const mappings = [...project.value.mappings];
    const mapping = mappings[mappingIndex] as MappingDocumentRecord;
    mappings[mappingIndex] = removeMappingRule(mapping, ruleIndex);
    project.value = { ...project.value, mappings };
    showToast('Mapping rule removed', 'success');
  }

  function shiftRule(mappingIndex: number, ruleIndex: number, delta: -1 | 1) {
    const mappings = [...project.value.mappings];
    const mapping = mappings[mappingIndex] as MappingDocumentRecord;
    const toIndex = ruleIndex + delta;
    if (toIndex < 0 || toIndex >= mapping.rules.length) {
      return;
    }
    mappings[mappingIndex] = moveMappingRule(mapping, ruleIndex, toIndex);
    project.value = { ...project.value, mappings };
    showToast(delta < 0 ? 'Rule moved up' : 'Rule moved down', 'success');
  }

  function reorderRule(mappingIndex: number, fromRuleIndex: number, toRuleIndex: number) {
    const mappings = [...project.value.mappings];
    const mapping = mappings[mappingIndex] as MappingDocumentRecord;
    mappings[mappingIndex] = moveMappingRule(mapping, fromRuleIndex, toRuleIndex);
    project.value = { ...project.value, mappings };
    showToast('Rule reordered', 'success');
  }

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
          onInput={(event) => {
            const newKey = (event.target as HTMLInputElement).value;
            const oldKey = item.key;
            updateField('key', newKey);
            // Sync component tree bind reference
            const doc = componentDoc.value;
            const path = selectedPath.value;
            if (doc && path) {
              const node = resolveNode(doc.tree, path);
              if (node?.bind === oldKey) {
                const newTree = updateNodeProps(doc.tree, path, { bind: newKey });
                setComponentDoc({ ...doc, tree: newTree });
              }
            }
          }}
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

      <div class="section-title">Presentation (Composite)</div>
      <PropertyRow label="Effective Widget">
        <div class="property-static-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{effectiveWidget.widget ?? 'renderer default'}</span>
          <span
            class="effective-widget-source"
            style={{
              fontSize: '10px',
              padding: '1px 5px',
              borderRadius: '3px',
              background: effectiveWidget.source === 'component' ? 'var(--accent)'
                : effectiveWidget.source === 'theme' ? 'var(--info, #3b82f6)'
                : effectiveWidget.source === 'definition' ? 'var(--muted, #6b7280)'
                : 'var(--border)',
              color: effectiveWidget.source === 'renderer-default' ? 'var(--fg)' : '#fff',
            }}
          >
            {effectiveWidget.source}
          </span>
        </div>
      </PropertyRow>
      <PropertyRow label="Theme Widget Override">
        <select
          class="studio-select"
          value={effectiveWidget.source === 'theme' ? effectiveWidget.widget ?? '' : ''}
          onChange={(event) => updateWidgetOverride((event.target as HTMLSelectElement).value)}
        >
          <option value="">(no override)</option>
          <option value="TextInput">TextInput</option>
          <option value="Textarea">Textarea</option>
          <option value="NumberInput">NumberInput</option>
          <option value="Select">Select</option>
          <option value="CheckboxGroup">CheckboxGroup</option>
          <option value="RadioGroup">RadioGroup</option>
          <option value="Toggle">Toggle</option>
          <option value="DatePicker">DatePicker</option>
          <option value="FileUpload">FileUpload</option>
          <option value="Slider">Slider</option>
          <option value="Signature">Signature</option>
        </select>
      </PropertyRow>
      {project.value.component && (
        <PropertyRow label="Component Widget">
          <select
            class="studio-select"
            value={effectiveWidget.source === 'component' ? effectiveWidget.widget ?? '' : ''}
            onChange={(event) => {
              project.value = setComponentWidget(project.value, definition.value, item.key, (event.target as HTMLSelectElement).value);
            }}
          >
            <option value="">(no override)</option>
            <option value="TextInput">TextInput</option>
            <option value="Textarea">Textarea</option>
            <option value="NumberInput">NumberInput</option>
            <option value="Select">Select</option>
            <option value="CheckboxGroup">CheckboxGroup</option>
            <option value="RadioGroup">RadioGroup</option>
            <option value="Toggle">Toggle</option>
            <option value="DatePicker">DatePicker</option>
            <option value="FileUpload">FileUpload</option>
            <option value="Slider">Slider</option>
            <option value="Signature">Signature</option>
          </select>
        </PropertyRow>
      )}
      {(item.dataType === 'integer' || item.dataType === 'decimal') && (
        <>
          <PropertyRow label="Min">
            <input
              class="studio-input"
              type="number"
              value={typeof minConfig === 'number' ? String(minConfig) : ''}
              onInput={(event) => updateNumericConfig('min', (event.target as HTMLInputElement).value)}
            />
          </PropertyRow>
          <PropertyRow label="Max">
            <input
              class="studio-input"
              type="number"
              value={typeof maxConfig === 'number' ? String(maxConfig) : ''}
              onInput={(event) => updateNumericConfig('max', (event.target as HTMLInputElement).value)}
            />
          </PropertyRow>
          <PropertyRow label="Step">
            <input
              class="studio-input"
              type="number"
              step="any"
              value={typeof stepConfig === 'number' ? String(stepConfig) : ''}
              onInput={(event) => updateNumericConfig('step', (event.target as HTMLInputElement).value)}
            />
          </PropertyRow>
        </>
      )}
      <PropertyRow label="Theme JSON (Advanced)">
        <JsonPropertyEditor
          label="Theme"
          value={project.value.theme}
          onChange={(value) => {
            project.value = { ...project.value, theme: value as Record<string, unknown> };
          }}
          placeholder="{}"
          rows={4}
        />
      </PropertyRow>
      <PropertyRow label="Component JSON (Advanced)">
        <JsonPropertyEditor
          label="Component"
          value={project.value.component}
          onChange={(value) => {
            project.value = { ...project.value, component: value as Record<string, unknown> };
          }}
          placeholder="{}"
          rows={4}
        />
      </PropertyRow>
      <PropertyRow label="Mappings (Sidecar)">
        <div class="properties-inline-list">
          {project.value.mappings.length === 0 ? (
            <button class="btn-ghost" onClick={createMappingForField}>Create Mapping</button>
          ) : (
            <>
              <select
                class="studio-select"
                value={String(Math.min(selectedMappingIndex.value, project.value.mappings.length - 1))}
                onChange={(event) => {
                  selectedMappingIndex.value = Number((event.target as HTMLSelectElement).value);
                }}
              >
                {project.value.mappings.map((entry, index) => {
                  const mapping = entry as MappingDocumentRecord;
                  return (
                    <option key={`${mapping.title ?? 'mapping'}-${index}`} value={String(index)}>
                      {mapping.title ?? `Mapping ${index + 1}`}
                    </option>
                  );
                })}
              </select>
              <input
                class="studio-input studio-input-mono"
                placeholder="target path (e.g. grant.applicant.name)"
                value={newTargetPath}
                onInput={(event) => setNewTargetPath((event.target as HTMLInputElement).value)}
              />
              <select
                class="studio-select"
                value={newTransform}
                onChange={(event) => setNewTransform((event.target as HTMLSelectElement).value as MappingRuleTransform)}
              >
                <option value="preserve">preserve</option>
                <option value="coerce">coerce</option>
                <option value="expression">expression</option>
                <option value="valueMap">valueMap</option>
                <option value="drop">drop</option>
              </select>
              <button class="btn-ghost" onClick={addFieldMappingRule}>Add Rule</button>
            </>
          )}
          {fieldMappingRules.length === 0 ? (
            <div class="property-static-value">No mapping rules for this field.</div>
          ) : (
            fieldMappingRules.map((entry) => (
              <div
                key={`${entry.mappingIndex}-${entry.ruleIndex}`}
                class="properties-inline-card"
                draggable
                onDragStart={(event) => {
                  const key = `${entry.mappingIndex}:${entry.ruleIndex}`;
                  setDraggingRuleKey(key);
                  event.dataTransfer?.setData('text/plain', key);
                }}
                onDragEnd={() => {
                  setDraggingRuleKey(null);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const raw = event.dataTransfer?.getData('text/plain') || draggingRuleKey;
                  if (!raw) return;
                  const [fromMappingRaw, fromRuleRaw] = raw.split(':');
                  const fromMapping = Number(fromMappingRaw);
                  const fromRule = Number(fromRuleRaw);
                  if (
                    Number.isNaN(fromMapping) ||
                    Number.isNaN(fromRule) ||
                    fromMapping !== entry.mappingIndex
                  ) {
                    return;
                  }
                  reorderRule(entry.mappingIndex, fromRule, entry.ruleIndex);
                }}
              >
                <div class="property-static-value">
                  Mapping {entry.mappingIndex + 1}: {entry.rule.sourcePath} →
                  {' '}
                  {entry.rule.targetPath}
                  {' '}
                  ({entry.rule.transform}, p={entry.rule.priority ?? 0})
                </div>
                {editingRuleKey === `${entry.mappingIndex}-${entry.ruleIndex}` ? (
                  <div class="properties-inline-list">
                    <input
                      class="studio-input studio-input-mono"
                      value={editingTargetPath}
                      onInput={(event) => setEditingTargetPath((event.target as HTMLInputElement).value)}
                    />
                    <select
                      class="studio-select"
                      value={editingTransform}
                      onChange={(event) =>
                        setEditingTransform((event.target as HTMLSelectElement).value as MappingRuleTransform)}
                    >
                      <option value="preserve">preserve</option>
                      <option value="coerce">coerce</option>
                      <option value="expression">expression</option>
                      <option value="valueMap">valueMap</option>
                      <option value="drop">drop</option>
                    </select>
                    <input
                      class="studio-input"
                      type="number"
                      value={String(editingPriority)}
                      onInput={(event) => {
                        const next = Number((event.target as HTMLInputElement).value);
                        setEditingPriority(Number.isNaN(next) ? 0 : next);
                      }}
                    />
                    <div class="drawer-actions">
                      <button
                        class="btn-ghost"
                        onClick={() => saveEditRule(entry.mappingIndex, entry.ruleIndex)}
                      >
                        Save
                      </button>
                      <button class="btn-ghost" onClick={() => setEditingRuleKey(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div class="drawer-actions">
                    <button
                      class="btn-ghost"
                      onClick={() => shiftRule(entry.mappingIndex, entry.ruleIndex, -1)}
                    >
                      ↑
                    </button>
                    <button
                      class="btn-ghost"
                      onClick={() => shiftRule(entry.mappingIndex, entry.ruleIndex, 1)}
                    >
                      ↓
                    </button>
                    <button class="btn-ghost" onClick={() => startEditRule(entry)}>
                      Edit
                    </button>
                    <button
                      class="btn-ghost"
                      onClick={() => deleteRule(entry.mappingIndex, entry.ruleIndex)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </PropertyRow>
      <PropertyRow label="History (Sidecar)">
        <div class="properties-inline-list">
          {project.value.changelogs.length === 0 ? (
            <div class="property-static-value">No changelog loaded.</div>
          ) : fieldHistory.length === 0 ? (
            <div class="property-static-value">No history entries for this field.</div>
          ) : (
            fieldHistory.map((entry, index) => (
              <div key={`${item.key}-history-${index}`} class="property-static-value">
                {String(entry.description ?? entry.type ?? 'Change')} ({String(entry.impact ?? 'n/a')})
              </div>
            ))
          )}
        </div>
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
