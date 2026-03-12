import { useState, useEffect } from 'react';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { Blueprint } from './Blueprint';
import { StructureTree } from './blueprint/StructureTree';
import { EditorCanvas } from '../workspaces/editor/EditorCanvas';
import { ItemProperties } from '../workspaces/editor/ItemProperties';
import { LogicTab } from '../workspaces/logic/LogicTab';
import { DataTab } from '../workspaces/data/DataTab';
import { ThemeTab } from '../workspaces/theme/ThemeTab';
import { MappingTab } from '../workspaces/mapping/MappingTab';
import { PreviewTab } from '../workspaces/preview/PreviewTab';
import { CommandPalette } from './CommandPalette';
import { ImportDialog } from './ImportDialog';
import { handleKeyboardShortcut } from '../lib/keyboard';
import { useProject } from '../state/useProject';
import { useSelection } from '../state/useSelection';

import { ComponentTree } from './blueprint/ComponentTree';
import { ScreenerSection } from './blueprint/ScreenerSection';
import { VariablesList } from './blueprint/VariablesList';
import { DataSourcesList } from './blueprint/DataSourcesList';
import { OptionSetsList } from './blueprint/OptionSetsList';
import { MappingsList } from './blueprint/MappingsList';
import { MigrationsSection } from './blueprint/MigrationsSection';

import { SettingsSection } from './blueprint/SettingsSection';
import { ThemeOverview } from './blueprint/ThemeOverview';

const WORKSPACES: Record<string, React.FC> = {
  Editor: EditorCanvas,
  Logic: LogicTab,
  Data: DataTab,
  Theme: ThemeTab,
  Mapping: MappingTab,
  Preview: PreviewTab,
};

const SIDEBAR_COMPONENTS: Record<string, React.FC> = {
  'Structure': StructureTree,
  'Component Tree': ComponentTree,
  'Screener': ScreenerSection,
  'Variables': VariablesList,
  'Data Sources': DataSourcesList,
  'Option Sets': OptionSetsList,
  'Mappings': MappingsList,
  'Migrations': MigrationsSection,
  'Settings': SettingsSection,
  'Theme': ThemeOverview,
};

export function Shell() {
  const [activeTab, setActiveTab] = useState<string>('Editor');
  const [activeSection, setActiveSection] = useState<string>('Structure');
  const [showPalette, setShowPalette] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const WorkspaceComponent = WORKSPACES[activeTab];
  const SidebarComponent = SIDEBAR_COMPONENTS[activeSection];
  const project = useProject();
  const { selectedKey, deselect } = useSelection();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      handleKeyboardShortcut(event, {
        undo: () => project.undo(),
        redo: () => project.redo(),
        delete: () => {
          if (selectedKey) {
            project.dispatch({ type: 'definition.deleteItem', payload: { path: selectedKey } });
            deselect();
          }
        },
        escape: () => { setShowPalette(false); deselect(); },
        search: () => setShowPalette(true),
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [project, selectedKey, deselect]);

  return (
    <div data-testid="shell" className="h-screen flex flex-col bg-bg-default text-ink font-ui">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onImport={() => setShowImport(true)}
        onSearch={() => setShowPalette(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[230px] border-r border-border bg-surface overflow-y-auto flex flex-col shrink-0">
          <Blueprint activeSection={activeSection} onSectionChange={setActiveSection} />
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {SidebarComponent && <SidebarComponent />}
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto bg-bg-default">
          <div
            data-testid={`workspace-${activeTab}`}
            data-workspace={activeTab}
            className="h-full"
            onClick={(e) => {
              if (e.target === e.currentTarget) deselect();
            }}
          >
            {WorkspaceComponent ? <WorkspaceComponent /> : activeTab}
          </div>
        </main>
        <aside className="w-[270px] border-l border-border bg-surface overflow-y-auto shrink-0" data-testid="properties">
          <ItemProperties />
        </aside>
      </div>
      <StatusBar />
      <CommandPalette open={showPalette} onClose={() => setShowPalette(false)} />
      <ImportDialog open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}
