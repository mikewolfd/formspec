/** @filedesc Tests for the ScreenerItemEditor — screener-specific thin wrapper over ItemListEditor. */
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createProject } from '@formspec-org/studio-core';
import { ProjectProvider } from '../../../src/state/ProjectContext';
import { SelectionProvider } from '../../../src/state/useSelection';
import { ScreenerItemEditor } from '../../../src/workspaces/editor/ScreenerItemEditor';

function renderWithScreener(screenerItems: any[] = [], screenerBinds: any[] = []) {
  const project = createProject();
  // Set up a screener document with the given items
  project.createScreenerDocument();
  for (const item of screenerItems) {
    project.addScreenField(item.key, item.label ?? item.key, item.dataType ?? 'string');
  }
  // Set up binds if any (e.g. required)
  for (const bind of screenerBinds) {
    if (bind.required === 'true') {
      project.updateScreenField(bind.path, { required: true });
    }
  }
  return {
    project,
    ...render(
      <ProjectProvider project={project}>
        <SelectionProvider>
          <ScreenerItemEditor />
        </SelectionProvider>
      </ProjectProvider>,
    ),
  };
}

describe('ScreenerItemEditor', () => {
  it('renders empty state when no screener items exist', () => {
    renderWithScreener();
    expect(screen.getByText('No screening questions')).toBeInTheDocument();
    expect(screen.getByText('Add questions to collect eligibility data before the respondent starts the full form.')).toBeInTheDocument();
  });

  it('renders screener field items with label and dataType', () => {
    renderWithScreener([
      { key: 'q1', dataType: 'boolean', label: 'Are you over 18?' },
      { key: 'q2', dataType: 'choice', label: 'Employment status' },
    ]);
    expect(screen.getByTestId('field-q1')).toBeInTheDocument();
    expect(screen.getByTestId('field-q2')).toBeInTheDocument();
    expect(screen.getByText('Are you over 18?')).toBeInTheDocument();
    expect(screen.getByText('Employment status')).toBeInTheDocument();
  });

  it('uses screener-specific surface test ID', () => {
    renderWithScreener();
    expect(screen.getByTestId('screener-item-surface')).toBeInTheDocument();
  });

  it('does not include "Wrap in Group" in context menu', () => {
    renderWithScreener([
      { key: 'q1', dataType: 'boolean', label: 'Question 1' },
    ]);
    const row = screen.getByTestId('field-q1');
    fireEvent.contextMenu(row);
    expect(screen.queryByText('Wrap in Group')).toBeNull();
  });

  it('does not include "Duplicate" in context menu (screener has no copy)', () => {
    renderWithScreener([
      { key: 'q1', dataType: 'boolean', label: 'Question 1' },
    ]);
    const row = screen.getByTestId('field-q1');
    fireEvent.contextMenu(row);
    expect(screen.queryByText('Duplicate')).toBeNull();
  });

  it('shows add button with screener label', () => {
    renderWithScreener();
    expect(screen.getByTestId('add-item')).toHaveTextContent('+ Add Question');
  });

  it('calls project.removeScreenField when delete is confirmed', () => {
    const { project } = renderWithScreener([
      { key: 'q1', dataType: 'boolean', label: 'Question 1' },
    ]);
    const spy = vi.spyOn(project, 'removeScreenField');

    const row = screen.getByTestId('field-q1');
    fireEvent.contextMenu(row);
    fireEvent.click(screen.getByText('Delete'));

    // Confirm dialog should appear
    expect(screen.getByText('Delete Question 1?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Confirm Delete'));
    expect(spy).toHaveBeenCalledWith('q1');
  });

  it('calls project.reorderScreenField via context menu', () => {
    const { project } = renderWithScreener([
      { key: 'q1', dataType: 'boolean', label: 'Q1' },
      { key: 'q2', dataType: 'string', label: 'Q2' },
    ]);
    const spy = vi.spyOn(project, 'reorderScreenField');

    const row = screen.getByTestId('field-q1');
    fireEvent.contextMenu(row);
    fireEvent.click(screen.getByText('Move Down'));

    expect(spy).toHaveBeenCalledWith('q1', 'down');
  });
});
