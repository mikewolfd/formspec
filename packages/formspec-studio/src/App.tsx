import { createProject } from 'formspec-studio-core';
import { ProjectProvider } from './state/ProjectContext';
import { SelectionProvider } from './state/useSelection';
import { ActivePageProvider } from './state/useActivePage';
import { Shell } from './components/Shell';
import { exampleDefinition } from './fixtures/example-definition';

const project = createProject({ seed: { definition: exampleDefinition as any } });

if (import.meta.env.DEV) {
  (window as any).__testProject__ = project;
}

export function App() {
  return (
    <ProjectProvider project={project}>
      <SelectionProvider>
        <ActivePageProvider>
          <Shell />
        </ActivePageProvider>
      </SelectionProvider>
    </ProjectProvider>
  );
}
