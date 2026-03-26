import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createProject } from '@formspec-org/studio-core';
import { ProjectProvider } from '../../../src/state/ProjectContext';
import { RuleEditor } from '../../../src/workspaces/mapping/RuleEditor';

const mappingDoc = {
  direction: 'outbound',
  rules: [
    { source: 'name', target: 'fullName', transform: 'preserve' },
    { source: 'age', target: 'age', transform: 'coerce:integer' },
    { source: 'address.street', target: 'addr.line1', transform: 'expression', expression: 'concat($street, " ", $city)' },
  ],
};

function renderRuleEditor() {
  const project = createProject({ seed: {
    definition: { $formspec: '1.0', url: 'urn:test', version: '1.0.0', items: [] } as any,
    mappings: { default: mappingDoc as any },
  }});
  return { ...render(<ProjectProvider project={project}><RuleEditor /></ProjectProvider>), project };
}

describe('RuleEditor', () => {
  it('renders rules as cards', () => {
    renderRuleEditor();
    expect(screen.getByTestId('rule-source-0')).toHaveValue('name');
    expect(screen.getByTestId('rule-target-0')).toHaveValue('fullName');
  });

  it('shows transform type', () => {
    renderRuleEditor();
    expect(screen.getByRole('button', { name: /preserve/i })).toBeInTheDocument();
  });

  it('shows source → target mapping', () => {
    renderRuleEditor();
    expect(screen.getByTestId('rule-source-1')).toHaveValue('age');
    expect(screen.getByTestId('rule-target-1')).toHaveValue('age');
  });

  it('shows all rules', () => {
    renderRuleEditor();
    expect(screen.getByTestId('rule-source-2')).toHaveValue('address.street');
    expect(screen.getByTestId('rule-target-2')).toHaveValue('addr.line1');
  });
});
