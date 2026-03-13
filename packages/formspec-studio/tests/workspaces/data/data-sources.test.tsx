import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createProject } from 'formspec-studio-core';
import { ProjectProvider } from '../../../src/state/ProjectContext';
import { SelectionProvider } from '../../../src/state/useSelection';
import { DataSources } from '../../../src/workspaces/data/DataSources';

const dataDef = {
  $formspec: '1.0', url: 'urn:test', version: '1.0.0',
  items: [],
  instances: {
    counties: { source: 'https://api.example.com/counties' },
    states: { source: 'https://api.example.com/states', static: true },
  },
};

function renderDS(def?: any) {
  const project = createProject({ seed: { definition: def || dataDef } });
  const dispatchSpy = vi.spyOn(project, 'dispatch');
  return {
    ...render(
      <ProjectProvider project={project}>
        <SelectionProvider>
          <DataSources />
        </SelectionProvider>
      </ProjectProvider>
    ),
    dispatchSpy,
  };
}

describe('DataSources', () => {
  it('renders instance names from definition', () => {
    renderDS();
    expect(screen.getByTestId('instance-counties')).toBeInTheDocument();
    expect(screen.getByTestId('instance-states')).toBeInTheDocument();
    expect(screen.getByText('counties')).toBeInTheDocument();
    expect(screen.getByText('states')).toBeInTheDocument();
  });

  it('shows source URL in collapsed view', () => {
    renderDS();
    expect(screen.getByText('https://api.example.com/counties')).toBeInTheDocument();
  });

  it('shows empty state when no instances', () => {
    renderDS({ $formspec: '1.0', url: 'urn:test', version: '1.0.0', items: [] });
    expect(screen.getByText(/no external sources/i)).toBeInTheDocument();
  });

  it('add via prompt dispatches definition.addInstance with { name }', async () => {
    const { dispatchSpy } = renderDS({ $formspec: '1.0', url: 'urn:test', version: '1.0.0', items: [] });
    vi.spyOn(window, 'prompt').mockReturnValueOnce('mySource');

    await act(async () => {
      screen.getByRole('button', { name: /add document/i }).click();
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'definition.addInstance',
        payload: { name: 'mySource' },
      })
    );
  });

  it('edit source dispatches definition.setInstance with { name, property, value }', async () => {
    const { dispatchSpy } = renderDS();

    // Expand the counties card by clicking its header
    const countiesCard = screen.getByTestId('instance-counties');
    await act(async () => {
      fireEvent.click(within(countiesCard).getByText('counties'));
    });

    // Click the InlineExpression to enter edit mode
    fireEvent.click(screen.getByText('https://api.example.com/counties'));
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'https://new-api.com/counties' } });
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'definition.setInstance',
        payload: { name: 'counties', property: 'source', value: 'https://new-api.com/counties' },
      })
    );
  });

  it('delete dispatches definition.deleteInstance with { name }', async () => {
    const { dispatchSpy } = renderDS();
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

    // Expand counties
    const countiesCard = screen.getByTestId('instance-counties');
    await act(async () => {
      fireEvent.click(within(countiesCard).getByText('counties'));
    });

    await act(async () => {
      screen.getByRole('button', { name: /delete/i }).click();
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'definition.deleteInstance',
        payload: { name: 'counties' },
      })
    );
  });

  it('static checkbox dispatches definition.setInstance with { name, property: "static", value }', async () => {
    const { dispatchSpy } = renderDS();

    // Expand counties card
    const countiesCard = screen.getByTestId('instance-counties');
    await act(async () => {
      fireEvent.click(within(countiesCard).getByText('counties'));
    });

    const checkbox = screen.getByRole('checkbox', { name: /static/i });
    fireEvent.click(checkbox);

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'definition.setInstance',
        payload: { name: 'counties', property: 'static', value: true },
      })
    );
  });
});
