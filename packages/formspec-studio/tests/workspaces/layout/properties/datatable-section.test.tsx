/** @filedesc Tests for DataTable display mode toggle for repeatable groups in the layout properties panel. */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createProject, type Project } from '@formspec-org/studio-core';
import { ProjectProvider } from '../../../../src/state/ProjectContext';
import { SelectionProvider, useSelection } from '../../../../src/state/useSelection';
import { ActiveGroupProvider } from '../../../../src/state/useActiveGroup';
import { ComponentProperties } from '../../../../src/workspaces/layout/properties/ComponentProperties';

const REPEATABLE_DEF: any = {
  $formspec: '1.0', url: 'urn:datatable-test', version: '1.0.0', title: 'DataTable Test',
  items: [
    {
      key: 'expenses',
      type: 'group',
      label: 'Expenses',
      repeatable: true,
      children: [
        { key: 'amount', type: 'field', dataType: 'decimal', label: 'Amount' },
        { key: 'category', type: 'field', dataType: 'string', label: 'Category' },
      ],
    },
    {
      key: 'contacts',
      type: 'group',
      label: 'Contacts',
      // NOT repeatable
      children: [
        { key: 'name', type: 'field', dataType: 'string', label: 'Name' },
      ],
    },
  ],
};

function SelectAndShow({ selectKey, selectType }: { selectKey: string; selectType: string }) {
  const { select } = useSelection();
  return (
    <>
      <button onClick={() => select(selectKey, selectType, { tab: 'layout' })}>Select</button>
      <ComponentProperties />
    </>
  );
}

function renderProperties(selectKey: string, selectType: string, project?: Project) {
  const p = project ?? createProject({ seed: { definition: REPEATABLE_DEF } });
  const result = render(
    <ProjectProvider project={p}>
      <SelectionProvider>
        <ActiveGroupProvider>
          <SelectAndShow selectKey={selectKey} selectType={selectType} />
        </ActiveGroupProvider>
      </SelectionProvider>
    </ProjectProvider>,
  );
  return { project: p, ...result };
}

describe('DataTable — repeatable group display mode', () => {
  it('shows a Group Display Mode selector for repeatable groups', async () => {
    renderProperties('expenses', 'group');
    await act(async () => { screen.getByText('Select').click(); });
    expect(screen.getByLabelText('Group Display')).toBeInTheDocument();
  });

  it('does NOT show Group Display Mode for non-repeatable groups', async () => {
    renderProperties('contacts', 'group');
    await act(async () => { screen.getByText('Select').click(); });
    expect(screen.queryByLabelText('Group Display')).not.toBeInTheDocument();
  });

  it('shows stack and table options in the selector', async () => {
    renderProperties('expenses', 'group');
    await act(async () => { screen.getByText('Select').click(); });
    const select = screen.getByLabelText('Group Display') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain('stack');
    expect(options).toContain('table');
  });

  it('defaults to stack mode', async () => {
    renderProperties('expenses', 'group');
    await act(async () => { screen.getByText('Select').click(); });
    const select = screen.getByLabelText('Group Display') as HTMLSelectElement;
    expect(select.value).toBe('stack');
  });

  it('calls setGroupDisplayMode when table is selected', async () => {
    const { project } = renderProperties('expenses', 'group');
    await act(async () => { screen.getByText('Select').click(); });
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Group Display'), { target: { value: 'table' } });
    });
    // The component node for expenses should have displayMode 'table'
    const node = project.componentFor('expenses') as any;
    expect(node?.displayMode).toBe('table');
  });

  it('calls setGroupDisplayMode back to stack when switched', async () => {
    const project = createProject({ seed: { definition: REPEATABLE_DEF } });
    // Pre-set to table
    project.setGroupDisplayMode('expenses', 'table');
    renderProperties('expenses', 'group', project);
    await act(async () => { screen.getByText('Select').click(); });

    const select = screen.getByLabelText('Group Display') as HTMLSelectElement;
    expect(select.value).toBe('table');

    await act(async () => {
      fireEvent.change(select, { target: { value: 'stack' } });
    });
    const node = project.componentFor('expenses') as any;
    expect(node?.displayMode).toBe('stack');
  });
});
