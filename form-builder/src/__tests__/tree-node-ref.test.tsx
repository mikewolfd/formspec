import { beforeEach, describe, expect, test } from 'vitest';
import { render } from '@testing-library/preact';
import { UnifiedTreeNode } from '../components/tree/tree-node';
import { setDefinition } from '../state/definition';
import { setComponentDoc } from '../state/project';
import { resetState } from './setup';
import type { FormspecDefinition } from 'formspec-engine';
import type { ComponentDocument } from '../types';

function makeDefinition(items: any[]): FormspecDefinition {
  return { $formspec: '1.0', url: 'https://example.gov/host', version: '1.0.0', title: 'Test', items } as FormspecDefinition;
}

describe('UnifiedTreeNode rendering', () => {
  beforeEach(() => {
    resetState();
  });

  test('renders node with bind, showing label from definition', () => {
    const def = makeDefinition([
      { key: 'name', type: 'field', label: 'Full Name', dataType: 'string' },
    ]);
    setDefinition(def);
    setComponentDoc({
      $formspecComponent: '1.0',
      version: '1.0.0',
      targetDefinition: { url: def.url },
      tree: { component: 'Stack', children: [{ component: 'TextInput', bind: 'name' }] },
    });

    const { container } = render(
      <UnifiedTreeNode node={{ component: 'TextInput', bind: 'name' }} path="0" depth={0} />,
    );
    expect(container.querySelector('.tree-node-label')?.textContent).toBe('Full Name');
  });

  test('renders unbound node with component name as label', () => {
    const def = makeDefinition([]);
    setDefinition(def);

    const { container } = render(
      <UnifiedTreeNode node={{ component: 'Divider' }} path="0" depth={0} />,
    );
    expect(container.querySelector('.tree-node-label')?.textContent).toBe('Divider');
  });

  test('renders nested children when expanded', () => {
    const def = makeDefinition([
      { key: 'grp', type: 'group', label: 'Group', children: [
        { key: 'x', type: 'field', label: 'X', dataType: 'string' },
      ]},
    ]);
    setDefinition(def);

    const node = {
      component: 'Stack',
      bind: 'grp',
      children: [{ component: 'TextInput', bind: 'x' }],
    };

    const { container } = render(
      <UnifiedTreeNode node={node} path="0" depth={0} />,
    );
    // Should render child node
    const labels = container.querySelectorAll('.tree-node-label');
    expect(labels.length).toBe(2); // parent + child
  });
});
