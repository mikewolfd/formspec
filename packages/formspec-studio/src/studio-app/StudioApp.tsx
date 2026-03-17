/** @filedesc Bootstraps a Studio project and wires context providers around the Shell. */
import { useState, type ReactElement } from 'react';
import { createProject, type Project } from 'formspec-studio-core';
import { ProjectProvider } from '../state/ProjectContext';
import { SelectionProvider } from '../state/useSelection';
import { ActivePageProvider } from '../state/useActivePage';
import { Shell } from '../components/Shell';
import { exampleDefinition } from '../fixtures/example-definition';

export function createStudioProject(seed?: Parameters<typeof createProject>[0]): Project {
  return createProject(seed ?? { seed: { definition: exampleDefinition as any } });
}

interface StudioAppProps {
  project?: Project;
}

export function StudioApp({ project }: StudioAppProps = {}): ReactElement {
  const [activeProject] = useState<Project>(() => project ?? createStudioProject());

  return (
    <ProjectProvider project={activeProject}>
      <SelectionProvider>
        <ActivePageProvider>
          <Shell />
        </ActivePageProvider>
      </SelectionProvider>
    </ProjectProvider>
  );
}
