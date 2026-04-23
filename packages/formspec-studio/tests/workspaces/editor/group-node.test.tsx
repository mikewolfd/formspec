/** @filedesc Targeted tests for GroupNode — expand toggle, add child, selection-driven auto-expand. */
import type { ReactElement } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useEffect } from 'react';
import { createProject } from '@formspec-org/studio-core';
import { ProjectProvider } from '../../../src/state/ProjectContext';
import { SelectionProvider, useSelection } from '../../../src/state/useSelection';
import { GroupNode } from '../../../src/workspaces/editor/GroupNode';

function renderWithSelection(ui: ReactElement) {
  const project = createProject();
  return render(
    <ProjectProvider project={project}>
      <SelectionProvider>{ui}</SelectionProvider>
    </ProjectProvider>,
  );
}

describe('GroupNode', () => {
  it('renders group key and toggle with collapsed aria-expanded', () => {
    renderWithSelection(
      <GroupNode
        itemKey="demographics"
        itemPath="items.demographics"
        label="Demographics"
        depth={0}
        summaries={[]}
      >
        <div data-testid="child-slot">child</div>
      </GroupNode>,
    );

    expect(screen.getByTestId('group-demographics')).toBeInTheDocument();
    const toggle = screen.getByTestId('toggle-demographics');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAccessibleName(/expand demographics/i);
  });

  it('toggles expand state when the chevron button is clicked', () => {
    renderWithSelection(
      <GroupNode itemKey="g1" itemPath="items.g1" depth={0} summaries={[]}>
        <span>inner</span>
      </GroupNode>,
    );

    const toggle = screen.getByTestId('toggle-g1');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAccessibleName(/collapse g1/i);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('calls onAddItem when the + control is clicked', () => {
    const onAddItem = vi.fn();
    renderWithSelection(
      <GroupNode
        itemKey="sec"
        itemPath="items.sec"
        depth={0}
        summaries={[]}
        onAddItem={onAddItem}
      >
        <span />
      </GroupNode>,
    );

    fireEvent.click(screen.getByTestId('add-to-sec'));
    expect(onAddItem).toHaveBeenCalledTimes(1);
    const ev = onAddItem.mock.calls[0][0];
    expect(ev).toBeDefined();
    expect(onAddItem.mock.calls[0][1]).toBe('items.sec');
  });

  it('auto-expands when selection moves to a descendant path', async () => {
    function SelectDescendant() {
      const { select } = useSelection();
      useEffect(() => {
        select('items.g1.leaf_field', 'field');
      }, [select]);
      return null;
    }

    renderWithSelection(
      <>
        <SelectDescendant />
        <GroupNode itemKey="g1" itemPath="items.g1" depth={0} summaries={[]}>
          <div data-testid="nested">nested</div>
        </GroupNode>
      </>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('toggle-g1')).toHaveAttribute('aria-expanded', 'true');
  });
});
