import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('../../src/workspaces/preview/FormspecPreviewHost', () => ({
  FormspecPreviewHost: ({ onFieldClick, layoutHighlightFieldPath }: any) => (
    <div
      data-testid="formspec-preview-host"
      data-highlight={layoutHighlightFieldPath ?? ''}
    >
      <div data-name="items.firstName" data-testid="clickable-field">
        First Name
      </div>
      <div data-name="items.lastName" data-testid="clickable-field-2">
        Last Name
      </div>
      {onFieldClick && (
        <button data-testid="trigger-click" onClick={() => onFieldClick('items.firstName')} />
      )}
    </div>
  ),
}));

import { PreviewCompanionPanel } from '../../src/components/PreviewCompanionPanel';

describe('PreviewCompanionPanel', () => {
  it('renders the panel with preview host', () => {
    render(<PreviewCompanionPanel width={400} onClose={vi.fn()} />);

    expect(screen.getByTestId('preview-companion-panel')).toBeInTheDocument();
    expect(screen.getByTestId('formspec-preview-host')).toBeInTheDocument();
  });

  it('renders the close button', () => {
    const onClose = vi.fn();
    render(<PreviewCompanionPanel width={400} onClose={onClose} />);

    const closeBtn = screen.getByLabelText('Hide preview companion');
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('passes highlightFieldPath to FormspecPreviewHost', () => {
    render(
      <PreviewCompanionPanel
        width={400}
        onClose={vi.fn()}
        highlightFieldPath="items.firstName"
      />,
    );

    const host = screen.getByTestId('formspec-preview-host');
    expect(host).toHaveAttribute('data-highlight', 'items.firstName');
  });

  it('passes null highlightFieldPath as empty string', () => {
    render(
      <PreviewCompanionPanel
        width={400}
        onClose={vi.fn()}
        highlightFieldPath={null}
      />,
    );

    const host = screen.getByTestId('formspec-preview-host');
    expect(host).toHaveAttribute('data-highlight', '');
  });

  it('wires onFieldClick through to FormspecPreviewHost', () => {
    const onFieldClick = vi.fn();
    render(
      <PreviewCompanionPanel
        width={400}
        onClose={vi.fn()}
        onFieldClick={onFieldClick}
      />,
    );

    fireEvent.click(screen.getByTestId('trigger-click'));
    expect(onFieldClick).toHaveBeenCalledWith('items.firstName');
  });

  it('does not render click trigger when onFieldClick not provided', () => {
    render(<PreviewCompanionPanel width={400} onClose={vi.fn()} />);

    expect(screen.queryByTestId('trigger-click')).not.toBeInTheDocument();
  });
});
