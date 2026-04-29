import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createProject } from '@formspec-org/studio-core';
import { ProjectProvider } from '../../src/state/ProjectContext';
import { SelectionProvider } from '../../src/state/useSelection';
import { LogicTab } from '../../src/workspaces/logic/LogicTab';

function renderLogic(def: any) {
  const project = createProject({ seed: { definition: def } });
  return { ...render(
    <ProjectProvider project={project}>
      <SelectionProvider>
        <LogicTab />
      </SelectionProvider>
    </ProjectProvider>
  ), project };
}

describe('Logic Workflow', () => {
  it('renders variables with expressions', () => {
    renderLogic({
      $formspec: '1.0', url: 'urn:test', version: '1.0.0', title: 'Test',
      items: [{ key: 'age', type: 'field', dataType: 'integer' }],
      variables: [{ name: 'isAdult', expression: '$age >= 18' }],
    });
    expect(screen.getByText('@isAdult')).toBeInTheDocument();
  });

  it('renders binds across multiple fields', () => {
    renderLogic({
      $formspec: '1.0', url: 'urn:test', version: '1.0.0', title: 'Test',
      items: [
        { key: 'name', type: 'field', dataType: 'string' },
        { key: 'email', type: 'field', dataType: 'string' },
      ],
      binds: {
        name: { required: 'true' },
        email: { required: 'true', relevant: '$name != ""' },
      },
    });
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('email')).toBeInTheDocument();
  });

  it('renders shapes with severity', () => {
    renderLogic({
      $formspec: '1.0', url: 'urn:test', version: '1.0.0', title: 'Test',
      items: [{ key: 'age', type: 'field', label: 'Age', dataType: 'integer' }],
      shapes: [
        { id: 'ageValid', target: 'age', severity: 'error', constraint: '$age >= 0', message: 'Age must be valid' },
      ],
    });
    expect(screen.getByText('ageValid')).toBeInTheDocument();
  });
});
