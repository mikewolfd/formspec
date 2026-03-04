import { beforeEach, describe, expect, test } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import type { FormspecDefinition } from 'formspec-engine';
import { GroupProperties } from '../components/properties/group-properties';
import { definition, setDefinition } from '../state/definition';
import { project } from '../state/project';
import { resetState } from './setup';

function makeDefinition(items: any[]): FormspecDefinition {
  return { $formspec: '1.0', url: 'https://example.gov/host', version: '1.0.0', title: 'Test', items } as FormspecDefinition;
}

describe('GroupProperties Fork action', () => {
  beforeEach(() => {
    resetState();
  });

  test('shows Fork button when group has $ref', () => {
    const item = {
      key: 'contact',
      type: 'group' as const,
      label: 'Contact',
      $ref: 'https://example.gov/common|1.0.0',
    };
    setDefinition(makeDefinition([item]));

    render(<GroupProperties item={item} />);
    expect(screen.getByRole('button', { name: /Fork/i })).toBeTruthy();
  });

  test('does NOT show Fork button when group has no $ref', () => {
    const item = {
      key: 'info',
      type: 'group' as const,
      label: 'Info',
      children: [{ key: 'name', type: 'field' as const, label: 'Name' }],
    };
    setDefinition(makeDefinition([item]));

    render(<GroupProperties item={item} />);
    expect(screen.queryByRole('button', { name: /Fork/i })).toBeNull();
  });

  test('clicking Fork copies assembled children and removes $ref', () => {
    const libraryDef = makeDefinition([
      { key: 'email', type: 'field', label: 'Email', dataType: 'string' },
      { key: 'phone', type: 'field', label: 'Phone', dataType: 'string' },
    ]);
    project.value = {
      ...project.value,
      library: [{ url: 'https://example.gov/common', version: '1.0.0', definition: libraryDef }],
    };

    const item = {
      key: 'contact',
      type: 'group' as const,
      label: 'Contact',
      $ref: 'https://example.gov/common|1.0.0',
    };
    setDefinition(makeDefinition([item]));

    render(<GroupProperties item={item} />);
    fireEvent.click(screen.getByRole('button', { name: /Fork/i }));

    // After fork, authored definition should have children and no $ref
    const forked = definition.value.items[0];
    expect(forked.$ref).toBeUndefined();
    expect((forked as any).keyPrefix).toBeUndefined();
    expect(forked.children).toHaveLength(2);
    expect(forked.children![0].key).toBe('email');
  });
});
