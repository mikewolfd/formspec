/** @filedesc Tests for editable ContainerSection property controls (Stack, Grid, Card, Panel, Collapsible). */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ContainerSection } from '../../../../src/workspaces/layout/properties/ContainerSection';

function renderContainer(componentType: string, nodeProps: Record<string, unknown>, onSetProp = vi.fn()) {
  return render(
    <ContainerSection componentType={componentType} nodeProps={nodeProps} onSetProp={onSetProp} />,
  );
}

describe('ContainerSection — Stack', () => {
  it('renders a direction select with the current value', () => {
    renderContainer('Stack', { direction: 'row' });
    const select = screen.getByLabelText('Direction');
    expect((select as HTMLSelectElement).value).toBe('row');
  });

  it('calls onSetProp when direction changes', () => {
    const onSetProp = vi.fn();
    renderContainer('Stack', { direction: 'column' }, onSetProp);
    fireEvent.change(screen.getByLabelText('Direction'), { target: { value: 'row' } });
    expect(onSetProp).toHaveBeenCalledWith('direction', 'row');
  });

  it('renders a gap input with the current value', () => {
    renderContainer('Stack', { gap: 'md' });
    const input = screen.getByLabelText('Gap');
    expect((input as HTMLInputElement).value).toBe('md');
  });

  it('calls onSetProp when gap commits', () => {
    const onSetProp = vi.fn();
    renderContainer('Stack', { gap: 'sm' }, onSetProp);
    const input = screen.getByLabelText('Gap');
    fireEvent.change(input, { target: { value: 'lg' } });
    fireEvent.blur(input);
    expect(onSetProp).toHaveBeenCalledWith('gap', 'lg');
  });

  it('renders align and wrap selects', () => {
    renderContainer('Stack', {});
    expect(screen.getByLabelText('Align')).toBeInTheDocument();
    expect(screen.getByLabelText('Wrap')).toBeInTheDocument();
  });

  it('calls onSetProp when align changes', () => {
    const onSetProp = vi.fn();
    renderContainer('Stack', { align: 'start' }, onSetProp);
    fireEvent.change(screen.getByLabelText('Align'), { target: { value: 'center' } });
    expect(onSetProp).toHaveBeenCalledWith('align', 'center');
  });
});

describe('ContainerSection — Grid', () => {
  it('renders a columns number input with the current value', () => {
    renderContainer('Grid', { columns: 3 });
    const input = screen.getByLabelText('Columns');
    expect((input as HTMLInputElement).value).toBe('3');
  });

  it('calls onSetProp with a number when columns input commits', () => {
    const onSetProp = vi.fn();
    renderContainer('Grid', { columns: 2 }, onSetProp);
    const input = screen.getByLabelText('Columns');
    fireEvent.change(input, { target: { value: '4' } });
    fireEvent.blur(input);
    expect(onSetProp).toHaveBeenCalledWith('columns', 4);
  });

  it('does not render a direction select for Grid', () => {
    renderContainer('Grid', {});
    expect(screen.queryByLabelText('Direction')).not.toBeInTheDocument();
  });
});

describe('ContainerSection — Card', () => {
  it('renders a padding input', () => {
    renderContainer('Card', { padding: 'lg' });
    const input = screen.getByLabelText('Padding');
    expect((input as HTMLInputElement).value).toBe('lg');
  });

  it('renders an elevation select', () => {
    renderContainer('Card', { elevation: 'raised' });
    const select = screen.getByLabelText('Elevation');
    expect((select as HTMLSelectElement).value).toBe('raised');
  });

  it('calls onSetProp when elevation changes', () => {
    const onSetProp = vi.fn();
    renderContainer('Card', {}, onSetProp);
    fireEvent.change(screen.getByLabelText('Elevation'), { target: { value: 'floating' } });
    expect(onSetProp).toHaveBeenCalledWith('elevation', 'floating');
  });
});

describe('ContainerSection — Panel', () => {
  it('renders a position select', () => {
    renderContainer('Panel', { position: 'left' });
    const select = screen.getByLabelText('Position');
    expect((select as HTMLSelectElement).value).toBe('left');
  });

  it('calls onSetProp when position changes', () => {
    const onSetProp = vi.fn();
    renderContainer('Panel', {}, onSetProp);
    fireEvent.change(screen.getByLabelText('Position'), { target: { value: 'right' } });
    expect(onSetProp).toHaveBeenCalledWith('position', 'right');
  });

  it('renders a width input', () => {
    renderContainer('Panel', { width: '300px' });
    expect((screen.getByLabelText('Width') as HTMLInputElement).value).toBe('300px');
  });
});

describe('ContainerSection — Collapsible / Accordion', () => {
  it('renders a title input', () => {
    renderContainer('Collapsible', { label: 'Section A' });
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Section A');
  });

  it('calls onSetProp with label when title commits', () => {
    const onSetProp = vi.fn();
    renderContainer('Collapsible', {}, onSetProp);
    const input = screen.getByLabelText('Title');
    fireEvent.change(input, { target: { value: 'New Title' } });
    fireEvent.blur(input);
    expect(onSetProp).toHaveBeenCalledWith('label', 'New Title');
  });

  it('renders a defaultOpen checkbox', () => {
    renderContainer('Accordion', { defaultOpen: true });
    const checkbox = screen.getByLabelText('Default Open');
    expect((checkbox as HTMLInputElement).checked).toBe(true);
  });

  it('calls onSetProp with boolean when defaultOpen changes', () => {
    const onSetProp = vi.fn();
    renderContainer('Collapsible', { defaultOpen: false }, onSetProp);
    fireEvent.click(screen.getByLabelText('Default Open'));
    expect(onSetProp).toHaveBeenCalledWith('defaultOpen', true);
  });
});
