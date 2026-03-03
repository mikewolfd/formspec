import type { ComponentChildren } from 'preact';
import { definition, updateDefinition } from '../../state/definition';
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

function PropertyRow({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <div class="property-row">
      <label class="property-label">{label}</label>
      {children}
    </div>
  );
}
