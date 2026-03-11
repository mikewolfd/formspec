import { createProject } from 'formspec-studio-core';
import { ProjectProvider } from './state/ProjectContext';
import { SelectionProvider } from './state/useSelection';
import { Shell } from './components/Shell';

// Create a default project for the app
const project = createProject();

if (import.meta.env.DEV) {
  (window as any).__testProject__ = project;
}

export function App() {
  return (
    <ProjectProvider project={project}>
      <SelectionProvider>
        <Shell />
      </SelectionProvider>
    </ProjectProvider>
  );
}
