/** @filedesc Targeted tests for ItemRow — selection surface, choice Options modal wiring. */
import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createProject } from '@formspec-org/studio-core';
import { ProjectProvider } from '../../../src/state/ProjectContext';
import { SelectionProvider } from '../../../src/state/useSelection';
import { ItemRow } from '../../../src/workspaces/editor/ItemRow';
import type { FormItem } from '@formspec-org/types';

const stringField: FormItem = {
  type: 'field',
  key: 'email',
  dataType: 'string',
  label: 'Email',
};

const choiceField: FormItem = {
  type: 'field',
  key: 'color',
  dataType: 'choice',
  label: 'Color',
  options: [
    { value: 'red', label: 'Red' },
    { value: 'blue', label: 'Blue' },
  ],
};

function renderItemRow(ui: ReactElement) {
  const project = createProject();
  return render(
    <ProjectProvider project={project}>
      <SelectionProvider>{ui}</SelectionProvider>
    </ProjectProvider>,
  );
}

describe('ItemRow', () => {
  it('renders field identity and summary test ids', () => {
    renderItemRow(
      <div data-testid="definition-tree-surface">
        <ItemRow
          itemKey="email"
          itemPath="items.email"
          itemType="field"
          item={stringField}
          label="Email"
          depth={0}
          categorySummaries={{
            Visibility: '\u2014',
            Validation: '\u2014',
            Value: '\u2014',
            Format: 'string',
          }}
          onUpdateItem={vi.fn()}
          onRenameIdentity={vi.fn()}
        />
      </div>,
    );

    expect(screen.getByTestId('field-email')).toBeInTheDocument();
    expect(screen.getByTestId('field-email-select')).toHaveAttribute(
      'aria-label',
      'Select Email',
    );
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('invokes onClick when the select button is activated', () => {
    const onClick = vi.fn();
    renderItemRow(
      <div data-testid="definition-tree-surface">
        <ItemRow
          itemKey="email"
          itemPath="items.email"
          itemType="field"
          item={stringField}
          label="Email"
          depth={0}
          categorySummaries={{
            Visibility: '\u2014',
            Validation: '\u2014',
            Value: '\u2014',
            Format: 'string',
          }}
          onClick={onClick}
          onUpdateItem={vi.fn()}
          onRenameIdentity={vi.fn()}
        />
      </div>,
    );

    fireEvent.click(screen.getByTestId('field-email-select'));
    expect(onClick).toHaveBeenCalled();
  });

  it('opens OptionsModal when Options category is opened for a choice field', () => {
    renderItemRow(
      <div data-testid="definition-tree-surface">
        <ItemRow
          itemKey="color"
          itemPath="items.color"
          itemType="field"
          item={choiceField}
          label="Color"
          depth={0}
          selected
          categorySummaries={{
            Visibility: '\u2014',
            Validation: '\u2014',
            Value: '\u2014',
            Format: 'choice',
            Options: '2 options',
          }}
          onUpdateItem={vi.fn()}
          onRenameIdentity={vi.fn()}
        />
      </div>,
    );

    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByTestId('field-color-category-Options'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Option 1 value')).toHaveValue('red');
  });
});
