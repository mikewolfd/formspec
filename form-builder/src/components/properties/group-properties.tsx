import type { ComponentChildren } from 'preact';
import { signal } from '@preact/signals';
import type { FormspecItem } from 'formspec-engine';
import { findItemByKey, updateDefinition } from '../../state/definition';
import { project, updateThemeSelector, updateFieldMapping } from '../../state/project';

export function GroupProperties({ item }: { item: FormspecItem }) {
  const activeTab = signal<'general' | 'behavior' | 'styles' | 'connections'>('general');

  function updateGroup(field: string, value: string) {
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
      draft[field] = value ? value : undefined;
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
        Group Properties
      </div>

      <div class="properties-sub-tabs" role="tablist">
        <button
          role="tab"
          class={`properties-sub-tab ${activeTab.value === 'general' ? 'active' : ''}`}
          onClick={() => { activeTab.value = 'general'; }}
        >
          General
        </button>
        <button
          role="tab"
          class={`properties-sub-tab ${activeTab.value === 'behavior' ? 'active' : ''}`}
          onClick={() => { activeTab.value = 'behavior'; }}
        >
          Behavior
        </button>
        <button
          role="tab"
          class={`properties-sub-tab ${activeTab.value === 'styles' ? 'active' : ''}`}
          onClick={() => { activeTab.value = 'styles'; }}
        >
          Styles
        </button>
        <button
          role="tab"
          class={`properties-sub-tab ${activeTab.value === 'connections' ? 'active' : ''}`}
          onClick={() => { activeTab.value = 'connections'; }}
        >
          Connections
        </button>
      </div>

      <div class="properties-tab-content">
        {activeTab.value === 'general' && (
          <div class="tab-pane">
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

            <div class="section-title">Repeat Settings</div>
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
          </div>
        )}

        {activeTab.value === 'behavior' && (
          <div class="tab-pane">
            <PropertyRow label="Relevant (Conditional)">
              <input
                class="studio-input studio-input-mono"
                value={item.relevant || ''}
                placeholder="FEL expression"
                onInput={(event) => updateGroup('relevant', (event.target as HTMLInputElement).value)}
              />
            </PropertyRow>
            <PropertyRow label="Read Only">
              <input
                class="studio-input studio-input-mono"
                value={typeof item.readonly === 'string' ? item.readonly : ''}
                placeholder="FEL expression"
                onInput={(event) => updateGroup('readonly', (event.target as HTMLInputElement).value)}
              />
            </PropertyRow>
          </div>
        )}

        {activeTab.value === 'styles' && (() => {
          const themeObj = project.value.theme as any;
          const selectorName = `#${item.key}`;
          const currentRule = themeObj?.selectors?.find((s: any) => s.selector === selectorName);
          const currentCss = currentRule?.css || '';

          return (
            <div class="tab-pane">
              <div class="section-title">Visual Overrides</div>
              <PropertyRow label="Custom CSS for this group">
                <textarea
                  class="studio-input studio-input-mono"
                  rows={4}
                  value={currentCss}
                  placeholder="e.g. border: 1px solid #ccc; padding: 10px;"
                  onInput={(event) => {
                    updateThemeSelector(selectorName, (event.target as HTMLTextAreaElement).value);
                  }}
                />
              </PropertyRow>
            </div>
          );
        })()}

        {activeTab.value === 'connections' && (() => {
          const mappingObj = project.value.mapping as any;
          const currentRule = mappingObj?.rules?.find((r: any) => r.source === item.key);
          const currentTarget = currentRule?.target || '';

          return (
            <div class="tab-pane">
              <div class="section-title">Data Binding</div>
              <PropertyRow label="Map to Target Object">
                <input
                  class="studio-input studio-input-mono"
                  value={currentTarget}
                  placeholder="e.g. user.address"
                  onInput={(event) => {
                    updateFieldMapping(item.key, { target: (event.target as HTMLInputElement).value });
                  }}
                />
              </PropertyRow>
              <div class="properties-empty" style={{ paddingTop: '12px' }}>
                Group mappings define the base path for nested field bindings.
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function PropertyRow({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <div class="property-row">
      <label class="property-label">{label}</label>
      {children}
    </div>
  );
}
