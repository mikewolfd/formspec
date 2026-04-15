import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormspecRender } from '@formspec-org/webcomponent';
import { createProject } from '@formspec-org/studio-core';
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
  it('pre-fills scenario from the definition then reflects live relevance edits', async () => {
    const project = createProject({ seed: { definition: relevantDefinition as any } });

    render(
      <ProjectProvider project={project}>
        <BehaviorPreview />
      </ProjectProvider>,
    );

    const scenarioInput = screen.getByTestId('behavior-scenario-input');
    await waitFor(
      () => {
        expect(scenarioInput.value).toContain('hasIncome');
        expect(scenarioInput.value).toContain('monthlyIncome');
      },
      { timeout: 4000 },
    );

    const host = screen.getByTestId('formspec-preview-host');
    await waitFor(() => {
      const field = host.querySelector('.formspec-field[data-name="income.monthlyIncome"]');
      expect(field).toBeTruthy();
      // Sample data sets booleans to true, so the conditional field starts relevant.
      expect(field).not.toHaveClass('formspec-hidden');
    });

    fireEvent.change(scenarioInput, { target: { value: '{"income":{"hasIncome":false}}' } });

    await waitFor(() => {
      const field = host.querySelector('.formspec-field[data-name="income.monthlyIncome"]');
      expect(field).toBeTruthy();
      expect(field).toHaveClass('formspec-hidden');
    });

    fireEvent.change(scenarioInput, { target: { value: '{"income":{"hasIncome":true}}' } });

    await waitFor(() => {
      const field = host.querySelector('.formspec-field[data-name="income.monthlyIncome"]');
      expect(field).toBeTruthy();
      expect(field).not.toHaveClass('formspec-hidden');
    });

    const row = screen.getByText('income.monthlyIncome').closest('div');
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText('Yes')).toBeInTheDocument();
  });

  it('Fill sample from definition restores valid JSON after invalid edits', async () => {
    const project = createProject({
      seed: {
        definition: {
          $formspec: '1.0',
          url: 'urn:fill-sample',
          version: '1.0.0',
          items: [{ key: 'title', type: 'field', dataType: 'string', label: 'Title' }],
        } as any,
      },
    });

    render(
      <ProjectProvider project={project}>
        <BehaviorPreview />
      </ProjectProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('behavior-scenario-input').value).toContain('title'));

    fireEvent.change(screen.getByTestId('behavior-scenario-input'), { target: { value: 'not json' } });
    fireEvent.click(screen.getByTestId('behavior-fill-sample'));

    await waitFor(() => {
      const raw = screen.getByTestId('behavior-scenario-input').value;
      expect(() => JSON.parse(raw)).not.toThrow();
      expect(raw).toContain('title');
    });
  });
});
