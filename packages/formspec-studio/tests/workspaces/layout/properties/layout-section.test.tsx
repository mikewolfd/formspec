/** @filedesc Tests for editable LayoutSection property controls (column/row span). */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LayoutSection } from '../../../../src/workspaces/layout/properties/LayoutSection';

function renderLayout(nodeProps: Record<string, unknown>, onSetProp = vi.fn()) {
  return render(<LayoutSection nodeProps={nodeProps} onSetProp={onSetProp} />);
}

describe('LayoutSection', () => {
  it('renders a column span number input with current value', () => {
    renderLayout({ gridColumnSpan: 3 });
    const input = screen.getByLabelText('Column Span');
    expect((input as HTMLInputElement).value).toBe('3');
  });

  it('calls onSetProp with number when column span commits', () => {
    const onSetProp = vi.fn();
    renderLayout({ gridColumnSpan: 1 }, onSetProp);
    const input = screen.getByLabelText('Column Span');
    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.blur(input);
    expect(onSetProp).toHaveBeenCalledWith('gridColumnSpan', 4);
  });

  it('renders a row span number input with current value', () => {
    renderLayout({ gridRowSpan: 2 });
    const input = screen.getByLabelText('Row Span');
    expect((input as HTMLInputElement).value).toBe('2');
  });

  it('calls onSetProp with number when row span commits', () => {
    const onSetProp = vi.fn();
    renderLayout({}, onSetProp);
    const input = screen.getByLabelText('Row Span');
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.blur(input);
    expect(onSetProp).toHaveBeenCalledWith('gridRowSpan', 3);
  });

  it('renders empty inputs when props are not set', () => {
    renderLayout({});
    expect((screen.getByLabelText('Column Span') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Row Span') as HTMLInputElement).value).toBe('');
  });
});
