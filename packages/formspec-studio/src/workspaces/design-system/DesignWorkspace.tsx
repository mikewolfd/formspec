/** @filedesc Design mode workspace — visual brand & style controls (replaces legacy Theme/Layout tabs). */
import { useState } from 'react';
import { BrandColorsSection } from './BrandColorsSection';
import { TextSizesSection } from './TextSizesSection';
import { SpacingSection } from './SpacingSection';
import { ButtonStylesSection } from './ButtonStylesSection';
import { InputStylesSection } from './InputStylesSection';
import { PageRegionsSection } from './PageRegionsSection';
import { useProject } from '../../state/useProject';
import { useProjectState } from '../../state/useProjectState';
import { AuthoringOverlay } from '../../components/AuthoringOverlay';
import { FormspecPreviewHost } from '../preview/FormspecPreviewHost';
import { uiCopy } from './copy';
import { telemetry } from '../../services/telemetry-adapter';

export function DesignWorkspace() {
  const project = useProject();
  const state = useProjectState();
  const [activeSection, setActiveSection] = useState<'colors' | 'text' | 'spacing' | 'structure' | 'components'>('colors');

  const presentation = (state.theme.extensions as any)?.['x-studio-presentation'] || {};
  const colorMode = presentation.colorMode || 'light';

  const handleSectionChange = (section: typeof activeSection) => {
    telemetry.emit('studio_mode_changed', { from: activeSection, to: section, submode: 'design' });
    setActiveSection(section);
  };

  const setColorMode = (mode: 'light' | 'dark') => {
    project.setThemeExtension('x-studio-presentation', { ...presentation, colorMode: mode });
    telemetry.emit('studio_design_change', { property: 'colorMode', value: mode });
  };

  return (
    <div data-testid="design-canvas-shell" className="flex h-full bg-subtle/30 overflow-hidden">
      {/* Design Sidebar / Navigation */}
      <aside className="w-80 border-r border-border bg-surface flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink tracking-tight">{uiCopy('designSystem')}</h2>
          
          {/* Color Mode Toggle */}
          <div className="flex bg-subtle rounded-lg p-0.5 border border-border/50">
            <button 
              onClick={() => setColorMode('light')}
              className={`p-1 rounded-md transition-all ${colorMode === 'light' ? 'bg-surface shadow-sm text-accent' : 'text-muted hover:text-ink'}`}
              title="Light Mode"
            >
              ☀️
            </button>
            <button 
              onClick={() => setColorMode('dark')}
              className={`p-1 rounded-md transition-all ${colorMode === 'dark' ? 'bg-surface shadow-sm text-accent' : 'text-muted hover:text-ink'}`}
              title="Dark Mode"
            >
              🌙
            </button>
          </div>
        </div>
        
        <nav className="p-2 space-y-1 border-b border-border">
          <NavItem
            active={activeSection === 'colors'}
            onClick={() => handleSectionChange('colors')}
            label="Brand Colors"
            icon="🎨"
          />
          <NavItem
            active={activeSection === 'text'}
            onClick={() => handleSectionChange('text')}
            label="Typography"
            icon="Aa"
          />
          <NavItem
            active={activeSection === 'spacing'}
            onClick={() => handleSectionChange('spacing')}
            label="Spacing"
            icon="↔"
          />
          <NavItem
            active={activeSection === 'structure'}
            onClick={() => handleSectionChange('structure')}
            label="Structure & Regions"
            icon="📄"
          />
          <NavItem
            active={activeSection === 'components'}
            onClick={() => handleSectionChange('components')}
            label="Buttons & Inputs"
            icon="🔘"
          />
        </nav>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="space-y-12">
            {activeSection === 'colors' && <BrandColorsSection />}
            {activeSection === 'text' && <TextSizesSection />}
            {activeSection === 'spacing' && <SpacingSection />}
            {activeSection === 'structure' && <PageRegionsSection />}
            {activeSection === 'components' && (
              <div className="space-y-12">
                <ButtonStylesSection />
                <div className="h-px bg-border/60" />
                <InputStylesSection />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Live Canvas Area */}
      <main className="flex-1 relative overflow-hidden bg-bg-default">
        <AuthoringOverlay mode="design">
          <div className="h-full overflow-y-auto px-4 py-8 md:px-12 xl:px-20">
            <div className="max-w-3xl mx-auto shadow-2xl rounded-xl overflow-hidden bg-surface ring-1 ring-border/50">
              <FormspecPreviewHost 
                width="100%" 
                appearance={colorMode as 'light' | 'dark'}
              />
            </div>
          </div>
        </AuthoringOverlay>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
        active
          ? 'bg-accent/10 text-accent'
          : 'text-muted hover:bg-subtle hover:text-ink'
      }`}
    >
      <span className="w-5 text-center grayscale group-hover:grayscale-0">{icon}</span>
      {label}
    </button>
  );
}
