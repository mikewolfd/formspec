import { activeDrawer, drawerOpen } from '../state/project';
import type { DrawerKind } from '../types';

const DRAWERS: Array<{ kind: DrawerKind; icon: string; label: string }> = [
  { kind: 'project', icon: '◆', label: 'Project' },
  { kind: 'extensions', icon: '▢', label: 'Extensions' },
  { kind: 'mappings', icon: '⬡', label: 'Mappings' },
  { kind: 'history', icon: '▤', label: 'History' },
];

export function Sidebar() {
  return (
    <nav class="studio-sidebar expanded" role="tablist" aria-label="Workspace drawers" aria-orientation="vertical">
      {DRAWERS.map((tab) => {
        const active = activeDrawer.value === tab.kind;
        return (
          <button
            key={tab.kind}
            role="tab"
            aria-selected={active && drawerOpen.value}
            class="sidebar-tab"
            data-active={active && drawerOpen.value ? '' : undefined}
            onClick={() => {
              if (active) {
                drawerOpen.value = !drawerOpen.value;
                return;
              }
              activeDrawer.value = tab.kind;
              drawerOpen.value = true;
            }}
            title={tab.label}
          >
            <span class="sidebar-tab-icon">{tab.icon}</span>
            <span class="sidebar-tab-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
