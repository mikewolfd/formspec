import React, { useEffect } from 'react';
import { Blueprint } from '../Blueprint';
import { useOptionalLayoutMode } from '../../workspaces/layout/LayoutModeContext';
import { useBlueprintSectionResolution } from './useBlueprintSectionResolution';
import { THEME_MODE_BLUEPRINT_SECTIONS } from './ShellConstants';
import type { EditorView } from '../../workspaces/editor/BuildManageToggle';

interface BlueprintSidebarProps {
  activeTab: string;
  activeSection: string;
  onSectionChange: (section: string) => void;
  activeEditorView: EditorView | undefined;
  compactLayout: boolean;
  leftWidth: number;
}

export function BlueprintSidebar({
  activeTab,
  activeSection,
  onSectionChange,
  activeEditorView,
  compactLayout,
  leftWidth,
}: BlueprintSidebarProps) {
  const layoutModeCtx = useOptionalLayoutMode();
  const { visibleSections, resolvedSection, SidebarComponent } = useBlueprintSectionResolution(activeTab, activeSection);

  useEffect(() => {
    if (activeTab !== 'Layout' || !layoutModeCtx) return;
    const first = THEME_MODE_BLUEPRINT_SECTIONS[0] ?? 'Colors';
    if (!THEME_MODE_BLUEPRINT_SECTIONS.includes(activeSection)) {
      onSectionChange(first);
      return;
    }
    layoutModeCtx.setThemeModeSection(activeSection);
  }, [activeTab, activeSection, layoutModeCtx, onSectionChange]);

  if (compactLayout) return null;

  return (
    <aside
      data-testid="blueprint-sidebar"
      className="overflow-y-auto flex flex-col shrink-0 border-r border-border/70 bg-[linear-gradient(180deg,rgba(255,252,247,0.94),rgba(248,241,231,0.88))] dark:bg-[linear-gradient(180deg,rgba(26,35,47,0.94),rgba(32,44,59,0.92))] backdrop-blur-sm"
      style={{ width: `clamp(140px, ${leftWidth}px, calc(50vw - 340px))` }}
      aria-label="Blueprint sidebar"
    >
      <Blueprint activeSection={resolvedSection} onSectionChange={onSectionChange} sections={visibleSections} activeEditorView={activeEditorView} activeTab={activeTab} />
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {SidebarComponent && <SidebarComponent />}
      </div>
    </aside>
  );
}
