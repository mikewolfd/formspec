/** @filedesc Unit tests for DisplayBlock identity + glyph (LayoutLeafBlock stubbed). */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DisplayBlock } from '../../../src/workspaces/layout/DisplayBlock';

vi.mock('../../../src/workspaces/layout/LayoutLeafBlock', () => ({
  LayoutLeafBlock: (props: Record<string, unknown>) => (
    <div data-testid="layout-leaf-stub" data-selection-key={String(props.selectionKey)}>
      <div data-testid="leaf-icon-slot">{props.icon as React.ReactNode}</div>
      <div data-testid="leaf-identity-slot">{props.identity as React.ReactNode}</div>
    </div>
  ),
}));

const baseProps = {
  itemKey: 'notice',
  selectionKey: 'layout.root.notice',
  selected: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DisplayBlock', () => {
  it('renders Heading glyph as H when widgetHint suggests heading', () => {
    render(
      <DisplayBlock
        {...baseProps}
        widgetHint="Heading"
        label="Welcome"
      />,
    );
    expect(screen.getByTestId('leaf-icon-slot')).toHaveTextContent('H');
  });

  it('renders em dash glyph for divider widget hints', () => {
    render(
      <DisplayBlock
        {...baseProps}
        widgetHint="Divider"
        label=""
      />,
    );
    expect(screen.getByTestId('leaf-icon-slot')).toHaveTextContent('\u2014');
  });

  it('renders default information glyph for other widget hints', () => {
    render(
      <DisplayBlock
        {...baseProps}
        widgetHint="Callout"
        label="Note"
      />,
    );
    expect(screen.getByTestId('leaf-icon-slot')).toHaveTextContent('\u2139');
  });

  it('shows placeholder copy when label is empty', () => {
    render(<DisplayBlock {...baseProps} label="" />);
    expect(screen.getByText('No content')).toBeInTheDocument();
  });

  it('opens label editor and commits via onRenameDefinitionItem on blur', () => {
    const onRename = vi.fn();
    render(
      <DisplayBlock
        {...baseProps}
        selected
        label="Hello"
        onRenameDefinitionItem={onRename}
      />,
    );

    fireEvent.click(screen.getByTestId('layout-display-notice-label-edit'));
    const editor = screen.getByTestId('layout-display-body-editor');
    fireEvent.change(editor, { target: { value: 'Updated' } });
    fireEvent.blur(editor);

    expect(onRename).toHaveBeenCalledWith('notice', 'Updated');
  });

  it('auto-opens body editor when selected with onCommitDisplayLabel by default', () => {
    const onCommit = vi.fn();
    render(
      <DisplayBlock
        {...baseProps}
        selected
        label="Note body"
        onCommitDisplayLabel={onCommit}
      />,
    );
    expect(screen.getByTestId('layout-display-body-editor')).toBeInTheDocument();
  });

  it('does not auto-open body editor when autoOpenDisplayBodyOnSelect is false', () => {
    const onCommit = vi.fn();
    render(
      <DisplayBlock
        {...baseProps}
        selected
        label="Note body"
        onCommitDisplayLabel={onCommit}
        autoOpenDisplayBodyOnSelect={false}
      />,
    );
    expect(screen.queryByTestId('layout-display-body-editor')).not.toBeInTheDocument();
  });
});
