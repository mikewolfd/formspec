import { beforeEach, describe, expect, test } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/preact';
import { RootProperties } from '../components/properties/root-properties';
import { definition } from '../state/definition';
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
});
