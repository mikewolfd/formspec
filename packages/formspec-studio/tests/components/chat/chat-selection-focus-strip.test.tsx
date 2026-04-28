/** @filedesc ChatSelectionFocusStrip — editor selection surfaced under the composer. */
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { createProject } from '@formspec-org/studio-core';
import { SelectionProvider, useSelection } from '../../../src/state/useSelection';
import { ChatSelectionFocusStrip } from '../../../src/components/chat/ChatSelectionFocusStrip';

const treeDef = {
  $formspec: '1.0',
  url: 'urn:test',
  version: '1.0.0',
  items: [{ key: 'name', type: 'field', dataType: 'string', label: 'Full Name' }],
};

function SelectNameButton() {
  const { select } = useSelection();
  return (
    <button type="button" data-testid="select-name" onClick={() => select('name', 'field', { tab: 'editor' })}>
      Select name
    </button>
  );
}

describe('ChatSelectionFocusStrip', () => {
  it('shows ItemRow when editor tab selects a field', async () => {
    const project = createProject({ seed: { definition: treeDef as any } });
    render(
      <SelectionProvider>
        <SelectNameButton />
        <ChatSelectionFocusStrip project={project} />
      </SelectionProvider>,
    );

    expect(screen.getByTestId('chat-selection-focus-empty')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Form field' })).toBeInTheDocument();

    await act(async () => {
      screen.getByTestId('select-name').click();
    });

    expect(screen.queryByTestId('chat-selection-focus-empty')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Form field' })).not.toBeInTheDocument();
    expect(screen.getByTestId('field-name')).toBeInTheDocument();

    const collapse = screen.getByTitle('Collapse editor');
    await act(async () => {
      collapse.click();
    });
    expect(screen.queryByTestId('field-name')).not.toBeInTheDocument();

    await act(async () => {
      screen.getByTitle('Expand editor').click();
    });
    expect(screen.getByTestId('field-name')).toBeInTheDocument();
  });
});
