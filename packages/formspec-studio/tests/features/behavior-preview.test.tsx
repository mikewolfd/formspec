import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormspecRender } from 'formspec-webcomponent';
import { createProject } from 'formspec-studio-core';
import { ProjectProvider } from '../../src/state/ProjectContext';
import { BehaviorPreview } from '../../src/features/behavior-preview/BehaviorPreview';

if (!customElements.get('formspec-render')) {
  customElements.define('formspec-render', FormspecRender);
}

const relevantDefinition = {
  $formspec: '1.0',
  url: 'urn:test:behavior-preview',
  version: '0.1.0',
  items: [
    {
      type: 'group',
      key: 'income',
      label: 'Income',
      children: [
        { type: 'field', key: 'hasIncome', label: 'Has Income', dataType: 'boolean' },
        { type: 'field', key: 'monthlyIncome', label: 'Monthly Income', dataType: 'money' },
      ],
    },
  ],
  binds: {
    'income.monthlyIncome': { relevant: '$income.hasIncome = true' },
  },
};

describe('BehaviorPreview', () => {
  it('shows live relevance changes from scenario input', async () => {
    const project = createProject({ seed: { definition: relevantDefinition as any } });

    render(
      <ProjectProvider project={project}>
        <BehaviorPreview />
      </ProjectProvider>,
    );

    const scenarioInput = screen.getByTestId('behavior-scenario-input');
    fireEvent.change(scenarioInput, { target: { value: '{"income":{"hasIncome":true}}' } });

    const row = screen.getByText('income.monthlyIncome').closest('div');
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText('Yes')).toBeInTheDocument();
  });
});
