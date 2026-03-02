import type { ComponentChildren } from 'preact';
import { signal } from '@preact/signals';
import { definition, updateDefinition } from '../../state/definition';
import { project, updateThemeToken, updateThemeSelector, updateFieldMapping } from '../../state/project';

export function RootProperties() {
  const activeTab = signal<'general' | 'styles' | 'connections'>('general');
  const def = definition.value;

  function updateRoot(field: string, value: string) {
    updateDefinition((draft) => {
      (draft as Record<string, unknown>)[field] = value ? value : undefined;
    });
  }

  return (
    <div class="properties-content">
      <div class="property-type-header">
        <span
          class="tree-node-dot"
          style={{
            background: 'var(--accent)',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            display: 'inline-block',
          }}
        />
        Form Properties
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
            <div class="section-title">Document Metadata</div>
            <PropertyRow label="URL">
              <input
                class="studio-input studio-input-mono"
                value={def.url}
                onInput={(event) => updateRoot('url', (event.target as HTMLInputElement).value)}
              />
            </PropertyRow>
            <PropertyRow label="Title">
              <input
                class="studio-input"
                value={def.title}
                onInput={(event) => updateRoot('title', (event.target as HTMLInputElement).value)}
              />
            </PropertyRow>
            <PropertyRow label="Version">
              <input
                class="studio-input studio-input-mono"
                value={def.version}
                onInput={(event) => updateRoot('version', (event.target as HTMLInputElement).value)}
              />
            </PropertyRow>
            <PropertyRow label="Description">
              <input
                class="studio-input"
                value={String((def as Record<string, unknown>).description ?? '')}
                onInput={(event) => updateRoot('description', (event.target as HTMLInputElement).value)}
              />
            </PropertyRow>
            <PropertyRow label="Status">
              <select
                class="studio-select"
                value={String((def as Record<string, unknown>).status ?? 'draft')}
                onChange={(event) => updateRoot('status', (event.target as HTMLSelectElement).value)}
              >
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="deprecated">deprecated</option>
              </select>
            </PropertyRow>
          </div>
        )}

        {activeTab.value === 'styles' && (() => {
          const themeObj = project.value.theme as any;
          const tokens = themeObj?.tokens || {};

          return (
            <div class="tab-pane">
              <div class="section-title">Global Theme Tokens</div>
              <PropertyRow label="Primary Color">
                <input
                  class="studio-input"
                  type="color"
                  value={tokens.primaryColor || '#d4a34a'}
                  onInput={(event) => {
                    updateThemeToken('primaryColor', (event.target as HTMLInputElement).value);
                  }}
                />
              </PropertyRow>
              <PropertyRow label="Font Family">
                <select
                  class="studio-select"
                  value={tokens.fontFamily || 'system-ui'}
                  onChange={(event) => {
                    updateThemeToken('fontFamily', (event.target as HTMLSelectElement).value);
                  }}
                >
                  <option value="system-ui">System UI</option>
                  <option value="serif">Serif</option>
                  <option value="monospace">Monospace</option>
                </select>
              </PropertyRow>
              <PropertyRow label="Border Radius">
                <input
                  class="studio-input"
                  type="number"
                  value={parseInt(tokens.borderRadius || '4')}
                  onInput={(event) => {
                    updateThemeToken('borderRadius', `${(event.target as HTMLInputElement).value}px`);
                  }}
                />
              </PropertyRow>
            </div>
          );
        })()}

        {activeTab.value === 'connections' && (() => {
          const mappingObj = project.value.mapping as any;

          return (
            <div class="tab-pane">
              <div class="section-title">Data Destination</div>
              <PropertyRow label="Adapter">
                <select
                  class="studio-select"
                  value={mappingObj?.adapter || 'json'}
                  onChange={(event) => {
                    const val = (event.target as HTMLSelectElement).value;
                    const next = { ...mappingObj, adapter: val };
                    if (!next.$formspecMapping) {
                      next.$formspecMapping = '1.0';
                      next.version = '1.0.0';
                      next.rules = [];
                    }
                    project.value = { ...project.value, mapping: next };
                  }}
                >
                  <option value="json">JSON Object (Default)</option>
                  <option value="formData">FormData API</option>
                  <option value="fhir">FHIR QuestionnaireResponse</option>
                </select>
              </PropertyRow>
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
