/** @filedesc Mapping workspace tab composing Blueprint, Rules, Adapter, and Preview sections with a FilterBar. */
import { useState } from 'react';
import { MappingConfig } from './MappingConfig';
import { RuleEditor } from './RuleEditor';
import { AdapterConfig } from './AdapterConfig';
import { MappingPreview } from './MappingPreview';
import { WorkspacePage, WorkspacePageSection } from '../../components/ui/WorkspacePage';
import { HelpTip } from '../../components/ui/HelpTip';

/**
 * Visual wrapper for a Mapping Pillar (Blueprint, Rules, Adapter, Preview).
 */
function MappingPillar({
  title,
  subtitle,
  helpText,
  children,
  accentColor = "bg-accent"
}: {
  title: string;
  subtitle: string;
  helpText: string;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <div className="mb-12 last:mb-0 group animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className={`w-1 h-5 rounded-full ${accentColor}`} />
          <h3 className="font-mono text-[13px] font-bold tracking-[0.2em] uppercase text-ink">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-2 pl-4">
          <HelpTip text={helpText}>
            <span className="text-[12px] text-muted italic tracking-tight">{subtitle}</span>
          </HelpTip>
        </div>
      </header>
      <div className="pl-6 border-l border-border/60 ml-0.5 mt-4">
        {children}
      </div>
    </div>
  );
}

const sectionTabs = [
  { id: 'all', label: 'All' },
  { id: 'config', label: 'Blueprint' },
  { id: 'rules', label: 'Rules' },
  { id: 'adapter', label: 'Adapter' },
  { id: 'preview', label: 'Preview' },
] as const;

export type MappingTabId = typeof sectionTabs[number]['id'];

interface MappingTabProps {
  activeTab?: MappingTabId;
  onActiveTabChange?: (tab: MappingTabId) => void;
  configOpen?: boolean;
  onConfigOpenChange?: (open: boolean) => void;
}

export function MappingTab({
  activeTab: controlledTab,
  onActiveTabChange,
  configOpen,
  onConfigOpenChange,
}: MappingTabProps = {}) {
  const [internalTab, setInternalTab] = useState<MappingTabId>('all');
  const activeTab = controlledTab ?? internalTab;

  const setActiveTab = (tab: MappingTabId) => {
    setInternalTab(tab);
    onActiveTabChange?.(tab);
  };

  const showBlueprint = activeTab === 'all' || activeTab === 'config';
  const showRules = activeTab === 'all' || activeTab === 'rules';
  const showAdapter = activeTab === 'all' || activeTab === 'adapter';
  const showPreview = activeTab === 'all' || activeTab === 'preview';

  return (
    <WorkspacePage className="overflow-y-auto">
      <WorkspacePageSection padding="px-7" className="sticky top-0 bg-bg-default/80 backdrop-blur-md z-20 pt-6 pb-2 border-b border-border/40">
        <div className="flex items-center gap-1.5 p-1 bg-subtle/50 rounded-[8px] border border-border/50 w-fit">
          {sectionTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-testid={`filter-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider rounded-[6px] transition-all duration-200 ${activeTab === tab.id
                ? 'bg-ink text-white shadow-sm'
                : 'text-muted hover:text-ink hover:bg-subtle'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </WorkspacePageSection>

      <WorkspacePageSection className="flex-1 py-10">
        {showBlueprint && (
          <MappingPillar
            title="Mapping Blueprint"
            subtitle="Target schema and base configuration"
            helpText="Define the output structure and how it transforms data from the form."
            accentColor="bg-accent"
          >
            <MappingConfig open={configOpen} onOpenChange={onConfigOpenChange} />
          </MappingPillar>
        )}

        {showRules && (
          <MappingPillar
            title="Transformation Rules"
            subtitle="Individual field and path mappings"
            helpText="Specific logic for how form paths map to target schema paths."
            accentColor="bg-logic"
          >
            <RuleEditor />
          </MappingPillar>
        )}

        {showAdapter && (
          <MappingPillar
            title="Adapter Settings"
            subtitle="Format specific output options"
            helpText="Configure how the mapped data is serialized (XML, CSV, JSON)."
            accentColor="bg-green"
          >
            <AdapterConfig />
          </MappingPillar>
        )}

        {showPreview && (
          <MappingPillar
            title="Output Preview"
            subtitle="Real-time transformation result"
            helpText="See how the current form data would be transformed using the defined mapping."
            accentColor="bg-amber"
          >
            <MappingPreview />
          </MappingPillar>
        )}
      </WorkspacePageSection>
    </WorkspacePage>
  );
}
