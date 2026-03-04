import { useState } from 'preact/hooks';
import type { FormspecDefinition } from 'formspec-engine';
import { definition } from '../state/definition';
import {
  activeDrawer,
  drawerOpen,
  project,
  selectedChangelogIndex,
  selectedMappingIndex,
} from '../state/project';
import { selectedPath } from '../state/selection';
import { showToast } from '../state/toast';
import { addLibraryDefinition, removeLibraryDefinition } from '../logic/definition-library';
import {
  createChangelog,
  createMappingDocument,
  groupChangelogByArea,
  pathToLikelyFieldKey,
  summarizeChangelog,
  type ChangelogRecord,
  type MappingDocumentRecord,
} from '../logic/sidecars';

function readJsonFile(onParsed: (parsed: unknown) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onParsed(JSON.parse(reader.result as string));
      } catch {
        showToast('Invalid JSON file', 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function createTheme() {
  const current = project.value;
  project.value = {
    ...current,
    theme: {
      $formspecTheme: '1.0',
      version: '1.0.0',
      targetDefinition: { url: definition.value.url },
      tokens: {},
      defaults: {},
      selectors: [],
      items: {},
    },
  };
  showToast('Theme created', 'success');
}

function createComponent() {
  const current = project.value;
  project.value = {
    ...current,
    component: {
      $formspecComponent: '1.0',
      version: '1.0.0',
      targetDefinition: { url: definition.value.url },
      tree: {
        component: 'Stack',
        children: [],
      },
    },
  };
  showToast('Component document created', 'success');
}

export function SidebarDrawerPanel() {
  const [mappingFilter, setMappingFilter] = useState('');
  const [draggingDrawerRule, setDraggingDrawerRule] = useState<string | null>(null);
  const [collapsedAreas, setCollapsedAreas] = useState<Record<string, boolean>>({});

  if (!drawerOpen.value) {
    return null;
  }

  const currentProject = project.value;
  const drawer = activeDrawer.value;

  return (
    <aside class="sidebar-drawer-panel">
      {drawer === 'project' && (
        <div class="drawer-content">
          <h3 class="drawer-title">Project</h3>
          <div class="drawer-row">
            <span class="drawer-label">Definition</span>
            <span class="drawer-value">{definition.value.version}</span>
          </div>
          <div class="drawer-row">
            <span class="drawer-label">Prior Versions</span>
            <span class="drawer-value">{currentProject.previousDefinitions.length}</span>
          </div>
          <div class="drawer-row">
            <span class="drawer-label">Theme</span>
            <span class="drawer-value">{currentProject.theme ? 'Enabled' : 'Not enabled'}</span>
          </div>
          <div class="drawer-row">
            <span class="drawer-label">Component</span>
            <span class="drawer-value">{currentProject.component ? 'Enabled' : 'Not enabled'}</span>
          </div>
          <div class="drawer-actions">
            <button class="btn-ghost" onClick={createTheme}>Create Theme</button>
            <button class="btn-ghost" onClick={createComponent}>Create Component</button>
          </div>

          <div class="section-title" style={{ marginTop: '16px' }}>Definition Library</div>
          <div class="drawer-actions">
            <button
              class="btn-ghost"
              onClick={() =>
                readJsonFile((parsed) => {
                  const def = parsed as FormspecDefinition;
                  if (!def.url || !def.version) {
                    showToast('Definition must have url and version', 'error');
                    return;
                  }
                  project.value = addLibraryDefinition(project.value, def);
                  showToast('Definition imported to library', 'success');
                })
              }
            >
              Import Definition
            </button>
          </div>
          {currentProject.library.length === 0 ? (
            <div class="drawer-note">No definitions imported.</div>
          ) : (
            <div class="drawer-list">
              {currentProject.library.map((entry) => {
                const refsUsingThis = definition.value.items.filter(
                  (item) => item.type === 'group' && typeof item.$ref === 'string' && item.$ref.startsWith(entry.url),
                );
                return (
                  <div key={entry.url} class="drawer-list-row">
                    <div>
                      <span>{entry.url}</span>
                      <span class="drawer-rule-meta" style={{ marginLeft: '6px' }}>v{entry.version}</span>
                      {refsUsingThis.length > 0 && (
                        <span class="drawer-rule-meta" style={{ marginLeft: '6px' }}>
                          ({refsUsingThis.length} group{refsUsingThis.length > 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                    <button
                      class="btn-ghost"
                      onClick={() => {
                        project.value = removeLibraryDefinition(project.value, entry.url);
                        showToast('Definition removed from library', 'success');
                      }}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {(() => {
            const unresolvedRefs = definition.value.items.filter((item) => {
              if (item.type !== 'group' || !item.$ref) return false;
              const refUrl = String(item.$ref).split('|')[0].split('#')[0];
              return !currentProject.library.some((entry) => entry.url === refUrl);
            });
            if (unresolvedRefs.length === 0) return null;
            return (
              <div class="drawer-note" style={{ color: 'var(--warning)' }}>
                {unresolvedRefs.length} unresolved $ref{unresolvedRefs.length > 1 ? 's' : ''}: {unresolvedRefs.map((r) => r.key).join(', ')}
              </div>
            );
          })()}
        </div>
      )}

      {drawer === 'extensions' && (
        <div class="drawer-content">
          <h3 class="drawer-title">Extensions</h3>
          <div class="drawer-note">Imported registries act as extension catalogs.</div>
          <div class="drawer-actions">
            <button
              class="btn-primary"
              onClick={() =>
                readJsonFile((parsed) => {
                  project.value = { ...project.value, registries: [...project.value.registries, parsed] };
                  showToast('Registry imported', 'success');
                })
              }
            >
              Import Registry JSON
            </button>
          </div>
          {currentProject.registries.length === 0 ? (
            <div class="drawer-note">No registries imported.</div>
          ) : (
            <div class="drawer-list">
              {currentProject.registries.map((entry, index) => {
                const record = entry as Record<string, unknown>;
                const title = String(record.title ?? record.name ?? `Registry ${index + 1}`);
                return (
                  <div key={`${title}-${index}`} class="drawer-list-row">
                    <span>{title}</span>
                    <button
                      class="btn-ghost"
                      onClick={() => {
                        const next = [...project.value.registries];
                        next.splice(index, 1);
                        project.value = { ...project.value, registries: next };
                      }}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {drawer === 'mappings' && (
        <div class="drawer-content">
          <h3 class="drawer-title">Mappings</h3>
          <div class="drawer-actions">
            <button
              class="btn-primary"
              onClick={() => {
                const mapping = createMappingDocument(definition.value, {
                  title: `Mapping ${currentProject.mappings.length + 1}`,
                });
                project.value = {
                  ...project.value,
                  mappings: [...project.value.mappings, mapping],
                };
                selectedMappingIndex.value = project.value.mappings.length - 1;
                showToast('Mapping created', 'success');
              }}
            >
              Create Mapping
            </button>
            <button
              class="btn-ghost"
              onClick={() =>
                readJsonFile((parsed) => {
                  project.value = { ...project.value, mappings: [...project.value.mappings, parsed] };
                  selectedMappingIndex.value = project.value.mappings.length - 1;
                  showToast('Mapping imported', 'success');
                })
              }
            >
              Import Mapping JSON
            </button>
          </div>
          {currentProject.mappings.length === 0 ? (
            <div class="drawer-note">No mappings loaded.</div>
          ) : (
            <>
              <select
                class="studio-select"
                value={String(Math.min(selectedMappingIndex.value, currentProject.mappings.length - 1))}
                onChange={(event) => {
                  selectedMappingIndex.value = Number((event.target as HTMLSelectElement).value);
                }}
              >
                {currentProject.mappings.map((entry, index) => {
                  const mapping = entry as MappingDocumentRecord;
                  const label = mapping.title || mapping.targetSchema?.name || `Mapping ${index + 1}`;
                  return (
                    <option key={`${label}-${index}`} value={String(index)}>
                      {label}
                    </option>
                  );
                })}
              </select>
              <div class="drawer-row">
                <span class="drawer-label">Loaded mapping docs</span>
                <span class="drawer-value">{currentProject.mappings.length}</span>
              </div>
              <input
                class="studio-input studio-input-mono"
                placeholder="filter rules by source/target/transform"
                value={mappingFilter}
                onInput={(event) => {
                  setMappingFilter((event.target as HTMLInputElement).value);
                }}
              />
              <div class="drawer-list">
                {(currentProject.mappings[
                  Math.min(selectedMappingIndex.value, currentProject.mappings.length - 1)
                ] as MappingDocumentRecord)?.rules
                  ?.map((rule, index) => ({ rule, index }))
                  .sort((a, b) => {
                    const pa = a.rule.priority ?? 0;
                    const pb = b.rule.priority ?? 0;
                    if (pa !== pb) return pb - pa;
                    return a.index - b.index;
                  })
                  .filter(({ rule }) => {
                    if (!mappingFilter.trim()) return true;
                    const haystack = `${rule.sourcePath ?? ''} ${rule.targetPath ?? ''} ${rule.transform} ${rule.priority ?? 0}`.toLowerCase();
                    return haystack.includes(mappingFilter.toLowerCase());
                  })
                  .map(({ rule, index }) => (
                  <button
                    key={`${rule.sourcePath ?? 'rule'}-${index}`}
                    class="drawer-list-row drawer-rule-row"
                    draggable
                    onDragStart={(event) => {
                      const key = `${Math.min(selectedMappingIndex.value, currentProject.mappings.length - 1)}:${index}`;
                      setDraggingDrawerRule(key);
                      event.dataTransfer?.setData('text/plain', key);
                    }}
                    onDragEnd={() => {
                      setDraggingDrawerRule(null);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const raw = event.dataTransfer?.getData('text/plain') || draggingDrawerRule;
                      if (!raw) return;
                      const [mappingRaw, fromRaw] = raw.split(':');
                      const mappingIndex = Number(mappingRaw);
                      const fromIndex = Number(fromRaw);
                      const currentMappingIndex = Math.min(selectedMappingIndex.value, currentProject.mappings.length - 1);
                      if (
                        Number.isNaN(mappingIndex) ||
                        Number.isNaN(fromIndex) ||
                        mappingIndex !== currentMappingIndex
                      ) {
                        return;
                      }
                      const mappings = [...project.value.mappings];
                      const mapping = mappings[currentMappingIndex] as MappingDocumentRecord;
                      mappings[currentMappingIndex] = {
                        ...mapping,
                        rules: moveRules(mapping.rules, fromIndex, index),
                      };
                      project.value = { ...project.value, mappings };
                      showToast('Rule reordered', 'success');
                    }}
                    onClick={() => {
                      if (typeof rule.sourcePath === 'string' && rule.sourcePath) {
                        selectedPath.value = rule.sourcePath;
                      }
                    }}
                  >
                    <span class="drawer-rule-main">
                      {rule.sourcePath ?? '(constant)'} → {rule.targetPath ?? '∅'}
                    </span>
                    <span class="drawer-rule-meta">{rule.transform} · p={rule.priority ?? 0}</span>
                  </button>
                  )) ?? <div class="drawer-note">No rules in selected mapping.</div>}
              </div>
            </>
          )}
        </div>
      )}

      {drawer === 'history' && (
        <div class="drawer-content">
          <h3 class="drawer-title">History</h3>
          <div class="drawer-actions">
            <button
              class="btn-primary"
              onClick={() => {
                const previous = project.value.previousDefinitions.at(-1);
                const changelog = createChangelog(definition.value, previous?.version);
                project.value = {
                  ...project.value,
                  changelogs: [...project.value.changelogs, changelog],
                };
                selectedChangelogIndex.value = project.value.changelogs.length - 1;
                showToast('Changelog created', 'success');
              }}
            >
              Create Changelog
            </button>
            <button
              class="btn-ghost"
              onClick={() =>
                readJsonFile((parsed) => {
                  project.value = { ...project.value, changelogs: [...project.value.changelogs, parsed] };
                  selectedChangelogIndex.value = project.value.changelogs.length - 1;
                  showToast('Changelog imported', 'success');
                })
              }
            >
              Import Changelog JSON
            </button>
          </div>
          <div class="drawer-row">
            <span class="drawer-label">Definition snapshots</span>
            <span class="drawer-value">{currentProject.previousDefinitions.length}</span>
          </div>
          <div class="drawer-row">
            <span class="drawer-label">Changelogs</span>
            <span class="drawer-value">{currentProject.changelogs.length}</span>
          </div>
          {currentProject.changelogs.length > 0 && (
            <>
              {(() => {
                const selected = currentProject.changelogs[
                  Math.min(selectedChangelogIndex.value, currentProject.changelogs.length - 1)
                ] as ChangelogRecord;
                const summary = summarizeChangelog(selected);
                return (
                  <div class="drawer-row">
                    <span class="drawer-label">Change Summary</span>
                    <span class="drawer-value">{summary.total} changes</span>
                  </div>
                );
              })()}
              <select
                class="studio-select"
                value={String(Math.min(selectedChangelogIndex.value, currentProject.changelogs.length - 1))}
                onChange={(event) => {
                  selectedChangelogIndex.value = Number((event.target as HTMLSelectElement).value);
                }}
              >
                {currentProject.changelogs.map((entry, index) => {
                  const changelog = entry as ChangelogRecord;
                  const label = `${changelog.fromVersion} → ${changelog.toVersion}`;
                  return (
                    <option key={`${label}-${index}`} value={String(index)}>
                      {label}
                    </option>
                  );
                })}
              </select>
              {(() => {
                const selected = currentProject.changelogs[
                  Math.min(selectedChangelogIndex.value, currentProject.changelogs.length - 1)
                ] as ChangelogRecord;
                const summary = summarizeChangelog(selected);
                return (
                  <div class="drawer-impact-list">
                    {Object.entries(summary.byImpact).map(([impact, count]) => (
                      <span key={impact} class="diagnostics-pill info">{impact}: {count}</span>
                    ))}
                  </div>
                );
              })()}
              <div class="drawer-list">
                {(() => {
                  const selected = currentProject.changelogs[
                    Math.min(selectedChangelogIndex.value, currentProject.changelogs.length - 1)
                  ] as ChangelogRecord;
                  const grouped = groupChangelogByArea(selected);
                  return Object.entries(grouped).map(([area, changes]) => (
                    <div key={area} class="drawer-area-group">
                      <button
                        class="drawer-area-heading"
                        onClick={() => {
                          setCollapsedAreas((current) => ({
                            ...current,
                            [area]: !current[area],
                          }));
                        }}
                      >
                        {collapsedAreas[area] ? '▸' : '▾'} Area: {area} ({changes.length})
                      </button>
                      {!collapsedAreas[area] && changes.map((change, index) => {
                        const path = String(change.path ?? '');
                        return (
                          <button
                            key={`${path}-${index}`}
                            class="drawer-list-row drawer-rule-row"
                            onClick={() => {
                              if (!path) return;
                              selectedPath.value = pathToLikelyFieldKey(path);
                            }}
                          >
                            <span class="drawer-rule-main">{String(change.description ?? change.type ?? 'Change')}</span>
                            <span class="drawer-rule-meta">{path || String(change.key ?? '')}</span>
                          </button>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </>
          )}
          <div class="drawer-actions">
            <button
              class="btn-ghost"
              onClick={() => {
                project.value = {
                  ...project.value,
                  previousDefinitions: [
                    ...project.value.previousDefinitions,
                    structuredClone(definition.value),
                  ],
                };
                showToast('Current definition saved as snapshot', 'success');
              }}
            >
              Save Snapshot
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function moveRules<T>(rules: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return rules;
  if (fromIndex < 0 || fromIndex >= rules.length || toIndex < 0 || toIndex >= rules.length) {
    return rules;
  }
  const next = [...rules];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
