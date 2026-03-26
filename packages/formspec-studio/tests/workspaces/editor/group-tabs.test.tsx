import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createProject } from '@formspec-org/studio-core';
import { ProjectProvider } from '../../../src/state/ProjectContext';
import { GroupTabs } from '../../../src/workspaces/editor/GroupTabs';

const multiGroupDef = {
  $formspec: '1.0',
  url: 'urn:test',
  version: '1.0.0',
  title: 'Test',
  items: [
    { key: 'page1', type: 'group', label: 'Personal Info', children: [
      { key: 'name', type: 'field', dataType: 'string' },
    ]},
    { key: 'page2', type: 'group', label: 'Address', children: [
      { key: 'street', type: 'field', dataType: 'string' },
    ]},
    { key: 'page3', type: 'group', label: 'Review', children: [] },
  ],
  presentation: { pageMode: 'wizard' },
};

function renderGroupTabs(def?: any, activeKey: string | null = 'page1') {
  const project = createProject({ seed: { definition: def || multiGroupDef } });
  const onGroupChange = vi.fn();
  return {
    ...render(
      <ProjectProvider project={project}>
        <GroupTabs activeGroupKey={activeKey} onGroupChange={onGroupChange} />
      </ProjectProvider>
    ),
    onGroupChange,
    project,
  };
}

describe('GroupTabs', () => {
  it('renders group labels from definition', () => {
    renderGroupTabs();
    expect(screen.getByText('Personal Info')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('highlights active group', () => {
    renderGroupTabs();
    const tab = screen.getByText('Personal Info').closest('button');
    expect(tab?.getAttribute('aria-selected')).toBe('true');
  });

  it('clicking a tab calls onGroupChange with key', async () => {
    const { onGroupChange } = renderGroupTabs();
    await act(async () => {
      screen.getByText('Address').click();
    });
    expect(onGroupChange).toHaveBeenCalledWith('page2');
  });

  it('opens an inline rename control when a group tab is double-clicked', async () => {
    renderGroupTabs();
    await act(async () => {
      screen.getByText('Address').closest('button')?.dispatchEvent(
        new MouseEvent('dblclick', { bubbles: true })
      );
    });
    expect(screen.getByDisplayValue('Address')).toBeInTheDocument();
  });

  it('shows group numbers', () => {
    renderGroupTabs();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('handles single-field forms gracefully', () => {
    const noGroups = {
      $formspec: '1.0', url: 'urn:test', version: '1.0.0',
      items: [{ key: 'name', type: 'field', dataType: 'string' }],
    };
    renderGroupTabs(noGroups, null);
    // No groups -> renders nothing
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});
