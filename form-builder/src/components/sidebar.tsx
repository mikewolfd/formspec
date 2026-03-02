import { signal } from '@preact/signals';
import { activeArtifact, project } from '../state/project';
import type { ArtifactKind } from '../types';

const expanded = signal(false);

const TABS: Array<{ kind: 'build' | 'library' | 'design'; icon: string; label: string }> = [
  { kind: 'build', icon: '◆', label: 'Build' },
  { kind: 'library', icon: '◇', label: 'Component Library' },
  { kind: 'design', icon: '◈', label: 'Global Design' },
];

export const activeTool = signal<'build' | 'library' | 'design'>('build');

export function Sidebar() {
  return (
    <nav
      class={`studio-sidebar ${expanded.value ? 'expanded' : ''}`}
      onMouseEnter={() => {
        expanded.value = true;
      }}
      onMouseLeave={() => {
        expanded.value = false;
      }}
      role="tablist"
      aria-label="Artifact tabs"
      aria-orientation="vertical"
    >
      {TABS.map((tab) => {
        const active = activeTool.value === tab.kind;
        return (
          <button
            key={tab.kind}
            role="tab"
            aria-selected={active}
            class="sidebar-tab"
            data-active={active || undefined}
            onClick={() => {
              activeTool.value = tab.kind;
            }}
            title={tab.label}
          >
            <span
              class="sidebar-tab-icon"
              style={{ color: active ? 'var(--accent)' : 'var(--text-1)' }}
            >
              {tab.icon}
            </span>
            {expanded.value && <span class="sidebar-tab-label">{tab.label}</span>}
          </button>
        );
      })}
    </nav>
  );
}
