import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createProject } from 'formspec-studio-core';
import { ProjectProvider } from '../../../src/state/ProjectContext';
import { SelectionProvider } from '../../../src/state/useSelection';
import { OptionSets } from '../../../src/workspaces/data/OptionSets';

const dataDef = {
  $formspec: '1.0', url: 'urn:test', version: '1.0.0',
  items: [
    { key: 'color', type: 'field', dataType: 'select1', optionSet: 'colors' },
  ],
  optionSets: {
    colors: { options: [
      { value: 'red', label: 'Red' },
      { value: 'blue', label: 'Blue' },
    ]},
  },
};

function renderOS(def?: any) {
  const project = createProject({ seed: { definition: def || dataDef } });
  const dispatchSpy = vi.spyOn(project, 'dispatch');
  return {
    ...render(
      <ProjectProvider project={project}>
        <SelectionProvider>
          <OptionSets />
        </SelectionProvider>
      </ProjectProvider>
    ),
    dispatchSpy,
  };
}

describe('OptionSets', () => {
  it('renders option set names', () => {
    renderOS();
    expect(screen.getByText('colors')).toBeInTheDocument();
  });

  it('shows option count in collapsed view', () => {
    renderOS();
    expect(screen.getByText(/2 options/i)).toBeInTheDocument();
  });

  it('shows usage count', () => {
    renderOS();
    expect(screen.getByText(/1 ref/i)).toBeInTheDocument();
  });

  it('data-testid present on cards', () => {
    renderOS();
    expect(screen.getByTestId('option-set-colors')).toBeInTheDocument();
  });

  // --- Inline add flow ---

  it('clicking + New Table reveals an inline form with name input', () => {
    renderOS();
    fireEvent.click(screen.getByRole('button', { name: /new table/i }));
    expect(screen.getByPlaceholderText(/state_codes/)).toBeInTheDocument();
  });

  it('inline add form shows example names', () => {
    renderOS();
    fireEvent.click(screen.getByRole('button', { name: /new table/i }));
    expect(screen.getByText(/e\.g\./i)).toBeInTheDocument();
  });

  it('pressing Enter dispatches setOptionSet and auto-expands', () => {
    const { dispatchSpy } = renderOS();
    fireEvent.click(screen.getByRole('button', { name: /new table/i }));
    const input = screen.getByPlaceholderText(/state_codes/);
    fireEvent.change(input, { target: { value: 'sizes' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'definition.setOptionSet',
        payload: { name: 'sizes', options: [] },
      })
    );
  });

  it('Escape cancels the add flow', () => {
    renderOS();
    fireEvent.click(screen.getByRole('button', { name: /new table/i }));
    fireEvent.keyDown(screen.getByPlaceholderText(/state_codes/), { key: 'Escape' });
    expect(screen.queryByPlaceholderText(/state_codes/)).not.toBeInTheDocument();
  });

  it('name input strips non-alphanumeric characters', () => {
    renderOS();
    fireEvent.click(screen.getByRole('button', { name: /new table/i }));
    const input = screen.getByPlaceholderText(/state_codes/);
    fireEvent.change(input, { target: { value: 'my set!' } });
    expect(input).toHaveValue('my_set');
  });

  // --- Empty state ---

  it('empty state explains what option sets are', () => {
    renderOS({ $formspec: '1.0', url: 'urn:test', version: '1.0.0', items: [] });
    expect(screen.getByText(/no lookup tables/i)).toBeInTheDocument();
    expect(screen.getByText(/optionSet/)).toBeInTheDocument();
  });

  // --- Expanded editor ---

  it('expanded card shows how fields reference this option set', async () => {
    renderOS();
    const card = screen.getByTestId('option-set-colors');
    await act(async () => {
      fireEvent.click(within(card).getByText('colors'));
    });
    // Should show the optionSet reference syntax
    expect(screen.getByText(/"optionSet": "colors"/)).toBeInTheDocument();
  });

  it('edit option value dispatches definition.setOptionSetProperty', async () => {
    const { dispatchSpy } = renderOS();
    const card = screen.getByTestId('option-set-colors');
    await act(async () => {
      fireEvent.click(within(card).getByText('colors'));
    });

    const valueInputs = screen.getAllByDisplayValue('red');
    fireEvent.change(valueInputs[0], { target: { value: 'crimson' } });
    fireEvent.blur(valueInputs[0]);

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'definition.setOptionSetProperty',
        payload: expect.objectContaining({
          name: 'colors',
          property: 'options',
        }),
      })
    );
  });

  it('delete dispatches definition.deleteOptionSet', async () => {
    const { dispatchSpy } = renderOS();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    const card = screen.getByTestId('option-set-colors');
    await act(async () => {
      fireEvent.click(within(card).getByText('colors'));
    });

    await act(async () => {
      screen.getByRole('button', { name: /delete/i }).click();
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'definition.deleteOptionSet',
        payload: { name: 'colors' },
      })
    );
  });

  it('remote source editing via InlineExpression', async () => {
    const remoteDef = {
      $formspec: '1.0', url: 'urn:test', version: '1.0.0',
      items: [],
      optionSets: {
        countries: { source: 'https://api.example.com/countries' },
      },
    };
    const { dispatchSpy } = renderOS(remoteDef);
    const card = screen.getByTestId('option-set-countries');
    await act(async () => {
      fireEvent.click(within(card).getByText('countries'));
    });

    fireEvent.click(screen.getByText('https://api.example.com/countries'));
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'https://new-api.com/countries' } });
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'definition.setOptionSetProperty',
        payload: { name: 'countries', property: 'source', value: 'https://new-api.com/countries' },
      })
    );
  });
});
