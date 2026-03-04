import { beforeEach, describe, expect, test } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/preact';
import { RootProperties } from '../components/properties/root-properties';
import { definition } from '../state/definition';
import { project } from '../state/project';
import { resetState } from './setup';

describe('RootProperties', () => {
  beforeEach(() => {
    resetState();
  });

  test('uses schema-aligned status values', () => {
    render(<RootProperties />);
    const statusLabel = screen.getByText('Status');
    const row = statusLabel.closest('.property-row') as HTMLElement;
    const select = row.querySelector('select') as HTMLSelectElement;
    const values = Array.from(select.options).map((option) => option.value);
    expect(values).toEqual(['draft', 'active', 'retired']);
    expect(values).not.toContain('deprecated');
  });

  test('updates status on change', () => {
    render(<RootProperties />);
    const statusLabel = screen.getByText('Status');
    const row = statusLabel.closest('.property-row') as HTMLElement;
    const select = row.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'retired' } });
    expect(definition.value.status).toBe('retired');
  });

  test('enables theme from presentation section', () => {
    render(<RootProperties />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable Theme' }));
    expect(project.value.theme).toBeTruthy();
  });

  test('enables component from presentation section', () => {
    render(<RootProperties />);
    fireEvent.click(screen.getByRole('button', { name: 'Enable Component' }));
    expect(project.value.component).toBeTruthy();
  });

  test('shows token and selector editors when theme is enabled', () => {
    render(<RootProperties />);
    expect(screen.queryByText('Theme Tokens')).toBeNull();
    expect(screen.queryByText('Theme Selectors')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Enable Theme' }));
    expect(screen.getByText('Theme Tokens')).toBeTruthy();
    expect(screen.getByText('Theme Selectors')).toBeTruthy();
  });
});
