import { useMemo } from 'react';
import {
  SIDEBAR_COMPONENTS,
  THEME_MODE_BLUEPRINT_SECTIONS,
  BLUEPRINT_SECTIONS_BY_TAB
} from './ShellConstants';

export function useBlueprintSectionResolution(activeTab: string, activeSection: string) {
  const visibleSections = useMemo(() => {
    if (activeTab === 'Design') {
      return THEME_MODE_BLUEPRINT_SECTIONS;
    }
    return BLUEPRINT_SECTIONS_BY_TAB[activeTab] ?? Object.keys(SIDEBAR_COMPONENTS);
  }, [activeTab]);

  const resolvedSection = useMemo(() => {
    return visibleSections.includes(activeSection)
      ? activeSection
      : (visibleSections[0] ?? 'Structure');
  }, [visibleSections, activeSection]);

  const SidebarComponent = SIDEBAR_COMPONENTS[resolvedSection];

  return {
    visibleSections,
    resolvedSection,
    SidebarComponent,
  };
}
