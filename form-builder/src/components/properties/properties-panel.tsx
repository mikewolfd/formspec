import { signal } from '@preact/signals';
import { collectSidecarDiagnostics } from '../../logic/sidecar-diagnostics';
import { definitionVersion, findItemByKey } from '../../state/definition';
import { componentDoc, componentVersion, diagnostics, project } from '../../state/project';
import { selectedPath } from '../../state/selection';
import { resolveNode, classifyNode } from '../../logic/component-tree';
import { DisplayProperties } from './display-properties';
import { FieldProperties } from './field-properties';
import { GroupProperties } from './group-properties';
import { LayoutProperties } from './layout-properties';
import { RootProperties } from './root-properties';

type PropertiesTab = 'properties' | 'diagnostics';
const activeTab = signal<PropertiesTab>('properties');
const diagnosticsFilter = signal<'all' | 'definition' | 'presentation' | 'mapping' | 'history' | 'extension'>('all');

export function PropertiesPanel({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const combinedDiagnostics = [...diagnostics.value, ...collectSidecarDiagnostics(project.value)];
  const combinedCounts = {
    error: combinedDiagnostics.filter((d) => d.severity === 'error').length,
    warning: combinedDiagnostics.filter((d) => d.severity === 'warning').length,
    info: combinedDiagnostics.filter((d) => d.severity === 'info').length,
  };

  if (collapsed) {
    return (
      <button class="properties-toggle-btn" onClick={onToggle} title="Open properties panel">
        ◀
      </button>
    );
  }

  return (
    <div class="studio-properties">
      <div class="properties-header">
        <div class="properties-tabs" role="tablist">
          <button
            role="tab"
            class={`properties-tab ${activeTab.value === 'properties' ? 'active' : ''}`}
            onClick={() => {
              activeTab.value = 'properties';
            }}
            aria-selected={activeTab.value === 'properties'}
          >
            Properties
          </button>
          <button
            role="tab"
            class={`properties-tab ${activeTab.value === 'diagnostics' ? 'active' : ''}`}
            onClick={() => {
              activeTab.value = 'diagnostics';
            }}
            aria-selected={activeTab.value === 'diagnostics'}
          >
            Diagnostics
            {combinedCounts.error > 0 && (
              <span class="diagnostics-badge">{combinedCounts.error}</span>
            )}
          </button>
        </div>
        <button class="properties-close" onClick={onToggle} title="Close panel">
          ×
        </button>
      </div>

      <div class="properties-body" role="tabpanel">
        {activeTab.value === 'properties' ? (
          <PropertiesContent />
        ) : (
          <DiagnosticsContent diagnosticsList={combinedDiagnostics} counts={combinedCounts} />
        )}
      </div>
    </div>
  );
}

function PropertiesContent() {
  definitionVersion.value;
  componentVersion.value;
  const path = selectedPath.value;

  if (path === null) {
    return <div class="properties-empty">Select an item to edit its properties</div>;
  }

  if (path === '') {
    return <RootProperties />;
  }

  const doc = componentDoc.value;
  if (!doc) {
    return <div class="properties-empty">No component tree loaded</div>;
  }

  const node = resolveNode(doc.tree, path);
  if (!node) {
    return <div class="properties-empty">Node not found</div>;
  }

  const kind = classifyNode(node);

  if (kind === 'bound-input' && node.bind) {
    const found = findItemByKey(node.bind);
    if (found) return <FieldProperties item={found.item} />;
  }

  if (kind === 'group' && node.bind) {
    const found = findItemByKey(node.bind);
    if (found) return <GroupProperties item={found.item} />;
  }

  if (kind === 'bound-display' && node.bind) {
    const found = findItemByKey(node.bind);
    if (found) return <DisplayProperties item={found.item} />;
  }

  // Layout or structure-only
  return <LayoutProperties node={node} path={path} />;
}

function DiagnosticsContent({
  diagnosticsList,
  counts,
}: {
  diagnosticsList: typeof diagnostics.value;
  counts: { error: number; warning: number; info: number };
}) {
  const current = diagnosticsList;
  const filtered = diagnosticsFilter.value === 'all'
    ? current
    : current.filter((diag) => {
      if (diagnosticsFilter.value === 'presentation') {
        return diag.artifact === 'theme' || diag.artifact === 'component';
      }
      if (diagnosticsFilter.value === 'extension') {
        return diag.artifact === 'registry';
      }
      if (diagnosticsFilter.value === 'history') {
        return diag.artifact === 'changelog';
      }
      return diag.artifact === diagnosticsFilter.value;
    });

  if (current.length === 0) {
    return (
      <div class="diagnostics-empty">
        <span class="diagnostics-check">✓</span>
        <span>No issues found</span>
      </div>
    );
  }

  return (
    <div class="diagnostics-list">
      <div class="diagnostics-summary">
        {counts.error > 0 && <span class="diagnostics-pill error">{counts.error} errors</span>}
        {counts.warning > 0 && (
          <span class="diagnostics-pill warning">{counts.warning} warnings</span>
        )}
        {counts.info > 0 && <span class="diagnostics-pill info">{counts.info} info</span>}
      </div>
      <div class="diagnostics-filter-row">
        {[
          ['all', 'All'],
          ['definition', 'Definition'],
          ['presentation', 'Presentation'],
          ['mapping', 'Mapping'],
          ['history', 'History'],
          ['extension', 'Extensions'],
        ].map(([value, label]) => (
          <button
            key={value}
            class={`btn-ghost diagnostics-filter-btn ${diagnosticsFilter.value === value ? 'active' : ''}`}
            onClick={() => {
              diagnosticsFilter.value = value as typeof diagnosticsFilter.value;
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.map((diag, index) => (
        <div
          key={`${diag.path}-${index}`}
          class="diagnostics-row"
          onClick={() => {
            if (diag.path) {
              selectedPath.value = diag.path;
            }
          }}
        >
          <span class={`diagnostics-icon ${diag.severity}`}>
            {diag.severity === 'error' ? '●' : diag.severity === 'warning' ? '▲' : 'ℹ'}
          </span>
          <div>
            <div class="diagnostics-message">{diag.message}</div>
            {diag.path && <div class="diagnostics-path">{diag.path}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
