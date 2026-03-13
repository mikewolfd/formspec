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
    // "colors" is referenced by 1 field (the "color" item)
    expect(screen.getByText(/1 ref/i)).toBeInTheDocument();
  });

  it('data-testid present on cards', () => {
    renderOS();
    expect(screen.getByTestId('option-set-colors')).toBeInTheDocument();
  });

  it('add via prompt dispatches definition.setOptionSet', async () => {
    const { dispatchSpy } = renderOS();
    vi.spyOn(window, 'prompt').mockReturnValueOnce('sizes');

    await act(async () => {
      screen.getByRole('button', { name: /new table/i }).click();
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'definition.setOptionSet',
        payload: { name: 'sizes', options: [] },
      })
    );
  });

  it('edit option value dispatches definition.setOptionSetProperty', async () => {
    const { dispatchSpy } = renderOS();

    // Expand the colors card
    const card = screen.getByTestId('option-set-colors');
    await act(async () => {
      fireEvent.click(within(card).getByText('colors'));
    });

    // Find the value input for "red" and change it
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

    // Expand colors
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

    // Expand the countries card
    const card = screen.getByTestId('option-set-countries');
    await act(async () => {
      fireEvent.click(within(card).getByText('countries'));
    });

    // Click the source InlineExpression to edit
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
