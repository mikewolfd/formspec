import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { definition, updateDefinition } from '../../state/definition';
import {
  addThemeSelector,
  ensureComponentDocument,
  ensureThemeDocument,
  getThemeSelectors,
  getThemeTokens,
  removeThemeSelector,
  removeThemeToken,
  setThemeToken,
} from '../../logic/presentation-docs';
import { project } from '../../state/project';
import { JsonPropertyEditor } from './json-property-editor';

export function RootProperties() {
  const def = definition.value;

  function updateRoot(field: string, value: unknown) {
    updateDefinition((draft) => {
      const record = draft as Record<string, unknown>;
      if (value === '' || value === null || value === undefined) {
        record[field] = undefined;
        return;
      }
      record[field] = value;
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
        Form Metadata
      </div>

      <div class="section-title">Document</div>
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
      <PropertyRow label="Version Algorithm">
        <select
          class="studio-select"
          value={String((def as Record<string, unknown>).versionAlgorithm ?? 'semver')}
          onChange={(event) => updateRoot('versionAlgorithm', (event.target as HTMLSelectElement).value)}
        >
          <option value="semver">semver</option>
          <option value="date">date</option>
          <option value="integer">integer</option>
          <option value="natural">natural</option>
        </select>
      </PropertyRow>
      <PropertyRow label="Name">
        <input
          class="studio-input studio-input-mono"
          value={String((def as Record<string, unknown>).name ?? '')}
          onInput={(event) => updateRoot('name', (event.target as HTMLInputElement).value)}
        />
      </PropertyRow>
      <PropertyRow label="Date">
        <input
          class="studio-input studio-input-mono"
          type="date"
          value={String((def as Record<string, unknown>).date ?? '')}
          onInput={(event) => updateRoot('date', (event.target as HTMLInputElement).value)}
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
          <option value="retired">retired</option>
        </select>
      </PropertyRow>

      <div class="section-title">Presentation</div>
      <PropertyRow label="Theme">
        <button
          class="btn-ghost"
          onClick={() => {
            const next = project.value.theme
              ? null
              : ensureThemeDocument(project.value, definition.value);
            project.value = { ...project.value, theme: next };
          }}
        >
          {project.value.theme ? 'Disable Theme' : 'Enable Theme'}
        </button>
      </PropertyRow>
      <PropertyRow label="Component">
        <button
          class="btn-ghost"
          onClick={() => {
            const next = project.value.component
              ? null
              : ensureComponentDocument(project.value, definition.value);
            project.value = { ...project.value, component: next };
          }}
        >
          {project.value.component ? 'Disable Component' : 'Enable Component'}
        </button>
      </PropertyRow>
      {project.value.theme && (
        <ThemeTokenEditor />
      )}
      {project.value.theme && (
        <ThemeSelectorEditor />
      )}
      {project.value.theme && (
        <PropertyRow label="Theme JSON (Advanced)">
          <JsonPropertyEditor
            label="Theme JSON"
            value={project.value.theme}
            onChange={(value) => {
              project.value = { ...project.value, theme: value as Record<string, unknown> };
            }}
            placeholder="{}"
            rows={6}
          />
        </PropertyRow>
      )}
      {project.value.component && (
        <PropertyRow label="Component JSON (Advanced)">
          <JsonPropertyEditor
            label="Component JSON"
            value={project.value.component}
            onChange={(value) => {
              project.value = { ...project.value, component: value as Record<string, unknown> };
            }}
            placeholder="{}"
            rows={6}
          />
        </PropertyRow>
      )}
      <PropertyRow label="Mappings (Sidecar)">
        <div class="property-static-value">{project.value.mappings.length} mapping docs loaded</div>
      </PropertyRow>
      <PropertyRow label="History (Sidecar)">
        <div class="property-static-value">
          {project.value.previousDefinitions.length} prior versions · {project.value.changelogs.length} changelogs
        </div>
      </PropertyRow>

      <div class="section-title">Behavior</div>
      <PropertyRow label="Non-Relevant Behavior">
        <select
          class="studio-select"
          value={String((def as Record<string, unknown>).nonRelevantBehavior ?? 'remove')}
          onChange={(event) => updateRoot('nonRelevantBehavior', (event.target as HTMLSelectElement).value)}
        >
          <option value="remove">remove</option>
          <option value="empty">empty</option>
          <option value="keep">keep</option>
        </select>
      </PropertyRow>

      <div class="section-title">Advanced</div>
      <PropertyRow label="Derived From (JSON)">
        <JsonPropertyEditor
          label="Derived From"
          value={(def as Record<string, unknown>).derivedFrom}
          onChange={(value) => updateRoot('derivedFrom', value)}
          placeholder='{"url":"https://...","version":"1.0.0"}'
          rows={3}
        />
      </PropertyRow>
      <PropertyRow label="Binds (JSON)">
        <JsonPropertyEditor
          label="Binds"
          value={(def as Record<string, unknown>).binds}
          onChange={(value) => updateRoot('binds', value)}
          placeholder="[]"
          rows={5}
        />
      </PropertyRow>
      <PropertyRow label="Shapes (JSON)">
        <JsonPropertyEditor
          label="Shapes"
          value={(def as Record<string, unknown>).shapes}
          onChange={(value) => updateRoot('shapes', value)}
          placeholder="[]"
          rows={5}
        />
      </PropertyRow>
      <PropertyRow label="Instances (JSON)">
        <JsonPropertyEditor
          label="Instances"
          value={(def as Record<string, unknown>).instances}
          onChange={(value) => updateRoot('instances', value)}
          placeholder="{}"
          rows={5}
        />
      </PropertyRow>
      <PropertyRow label="Variables (JSON)">
        <JsonPropertyEditor
          label="Variables"
          value={(def as Record<string, unknown>).variables}
          onChange={(value) => updateRoot('variables', value)}
          placeholder="[]"
          rows={4}
        />
      </PropertyRow>
      <PropertyRow label="Option Sets (JSON)">
        <JsonPropertyEditor
          label="Option Sets"
          value={(def as Record<string, unknown>).optionSets}
          onChange={(value) => updateRoot('optionSets', value)}
          placeholder="{}"
          rows={4}
        />
      </PropertyRow>
      <PropertyRow label="Screener (JSON)">
        <JsonPropertyEditor
          label="Screener"
          value={(def as Record<string, unknown>).screener}
          onChange={(value) => updateRoot('screener', value)}
          placeholder='{"items":[],"routes":[]}'
          rows={4}
        />
      </PropertyRow>
      <PropertyRow label="Migrations (JSON)">
        <JsonPropertyEditor
          label="Migrations"
          value={(def as Record<string, unknown>).migrations}
          onChange={(value) => updateRoot('migrations', value)}
          placeholder="{}"
          rows={4}
        />
      </PropertyRow>
      <PropertyRow label="Form Presentation (JSON)">
        <JsonPropertyEditor
          label="Form Presentation"
          value={(def as Record<string, unknown>).formPresentation}
          onChange={(value) => updateRoot('formPresentation', value)}
          placeholder="{}"
          rows={4}
        />
      </PropertyRow>
      <PropertyRow label="Extensions (JSON)">
        <JsonPropertyEditor
          label="Extensions"
          value={(def as Record<string, unknown>).extensions}
          onChange={(value) => updateRoot('extensions', value)}
          placeholder='{"x-namespace":{}}'
          rows={4}
        />
      </PropertyRow>
    </div>
  );
}

function ThemeTokenEditor() {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const tokens = getThemeTokens(project.value);
  const entries = Object.entries(tokens);
  const def = definition.value;

  return (
    <>
      <div class="section-title" style={{ fontSize: '11px', marginTop: '8px' }}>Theme Tokens</div>
      {entries.map(([key, value]) => (
        <div class="property-row" key={key}>
          <span class="property-label studio-input-mono" style={{ fontSize: '11px' }}>{key}</span>
          <input
            class="studio-input studio-input-mono"
            style={{ flex: 1 }}
            value={value}
            onInput={(e) => {
              project.value = setThemeToken(project.value, def, key, (e.target as HTMLInputElement).value);
            }}
          />
          <button
            class="btn-ghost"
            style={{ padding: '2px 6px', fontSize: '11px' }}
            onClick={() => {
              project.value = removeThemeToken(project.value, def, key);
            }}
          >
            ×
          </button>
        </div>
      ))}
      <div class="property-row">
        <input
          class="studio-input studio-input-mono"
          style={{ flex: 1 }}
          placeholder="token.key"
          value={newKey}
          onInput={(e) => setNewKey((e.target as HTMLInputElement).value)}
        />
        <input
          class="studio-input studio-input-mono"
          style={{ flex: 1 }}
          placeholder="value"
          value={newValue}
          onInput={(e) => setNewValue((e.target as HTMLInputElement).value)}
        />
        <button
          class="btn-ghost"
          style={{ padding: '2px 6px', fontSize: '11px' }}
          onClick={() => {
            if (!newKey.trim()) return;
            project.value = setThemeToken(project.value, def, newKey.trim(), newValue);
            setNewKey('');
            setNewValue('');
          }}
        >
          +
        </button>
      </div>
    </>
  );
}

function ThemeSelectorEditor() {
  const [matchType, setMatchType] = useState('dataType');
  const [matchValue, setMatchValue] = useState('');
  const [widget, setWidget] = useState('');
  const selectors = getThemeSelectors(project.value);
  const def = definition.value;

  return (
    <>
      <div class="section-title" style={{ fontSize: '11px', marginTop: '8px' }}>Theme Selectors</div>
      {selectors.map((sel, i) => (
        <div class="property-row" key={i}>
          <span class="property-label" style={{ fontSize: '11px' }}>
            {sel.match.dataType ? `dataType: ${sel.match.dataType}` : sel.match.type ? `type: ${sel.match.type}` : JSON.stringify(sel.match)}
          </span>
          <span style={{ fontSize: '11px', opacity: 0.7 }}>→ {(sel.apply as Record<string, unknown>).widget ?? '...'}</span>
          <button
            class="btn-ghost"
            style={{ padding: '2px 6px', fontSize: '11px' }}
            onClick={() => {
              project.value = removeThemeSelector(project.value, def, i);
            }}
          >
            ×
          </button>
        </div>
      ))}
      <div class="property-row">
        <select
          class="studio-select"
          style={{ flex: 1, fontSize: '11px' }}
          value={matchType}
          onChange={(e) => setMatchType((e.target as HTMLSelectElement).value)}
        >
          <option value="dataType">dataType</option>
          <option value="type">type</option>
        </select>
        <input
          class="studio-input studio-input-mono"
          style={{ flex: 1 }}
          placeholder="match value"
          value={matchValue}
          onInput={(e) => setMatchValue((e.target as HTMLInputElement).value)}
        />
        <input
          class="studio-input studio-input-mono"
          style={{ flex: 1 }}
          placeholder="widget"
          value={widget}
          onInput={(e) => setWidget((e.target as HTMLInputElement).value)}
        />
        <button
          class="btn-ghost"
          style={{ padding: '2px 6px', fontSize: '11px' }}
          onClick={() => {
            if (!matchValue.trim() || !widget.trim()) return;
            project.value = addThemeSelector(project.value, def, { [matchType]: matchValue.trim() }, { widget: widget.trim() });
            setMatchValue('');
            setWidget('');
          }}
        >
          +
        </button>
      </div>
    </>
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
