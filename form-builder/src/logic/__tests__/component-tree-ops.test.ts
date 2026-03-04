import { describe, it, expect } from 'vitest';
import {
  insertNode,
  removeNode,
  moveNode,
  updateNodeProps,
} from '../component-tree-ops';
import type { ComponentNode } from '../../types';

function makeTree(): ComponentNode {
  return {
    component: 'Stack',
    children: [
      { component: 'TextInput', bind: 'name' },
      {
        component: 'Grid',
        children: [
          { component: 'NumberInput', bind: 'age' },
          { component: 'Toggle', bind: 'active' },
        ],
      },
      { component: 'Divider' },
    ],
  };
}

describe('insertNode', () => {
  it('inserts at root level', () => {
    const tree = makeTree();
    const node: ComponentNode = { component: 'Spacer' };
    const result = insertNode(tree, '', 1, node);
    expect(result.children).toHaveLength(4);
    expect(result.children![1].component).toBe('Spacer');
    expect(result.children![2].component).toBe('Grid');
  });

  it('inserts into nested parent', () => {
    const tree = makeTree();
    const node: ComponentNode = { component: 'Select', bind: 'color' };
    const result = insertNode(tree, '1', 0, node);
    expect(result.children![1].children).toHaveLength(3);
    expect(result.children![1].children![0].bind).toBe('color');
  });

  it('inserts at end when index equals length', () => {
    const tree = makeTree();
    const node: ComponentNode = { component: 'Spacer' };
    const result = insertNode(tree, '', 3, node);
    expect(result.children).toHaveLength(4);
    expect(result.children![3].component).toBe('Spacer');
  });
});

describe('removeNode', () => {
  it('removes from root level', () => {
    const tree = makeTree();
    const result = removeNode(tree, '2');
    expect(result.children).toHaveLength(2);
    expect(result.children!.every((n) => n.component !== 'Divider')).toBe(true);
  });

  it('removes from nested parent', () => {
    const tree = makeTree();
    const result = removeNode(tree, '1.0');
    expect(result.children![1].children).toHaveLength(1);
    expect(result.children![1].children![0].bind).toBe('active');
  });

  it('returns tree unchanged for invalid path', () => {
    const tree = makeTree();
    const result = removeNode(tree, '99');
    expect(result.children).toHaveLength(3);
  });
});

describe('moveNode', () => {
  it('moves within same parent', () => {
    const tree = makeTree();
    // Move Divider (index 2) to position 0
    const result = moveNode(tree, '2', '', 0);
    expect(result.children![0].component).toBe('Divider');
    expect(result.children![1].component).toBe('TextInput');
  });

  it('moves between parents', () => {
    const tree = makeTree();
    // Move 'name' TextInput (root index 0) into Grid (root index 1) at position 0
    const result = moveNode(tree, '0', '1', 0);
    // Root should now have 2 children (Grid moved to index 0 since name was removed, Divider)
    expect(result.children).toHaveLength(2);
    // The Grid (now at index 0) should have 3 children
    expect(result.children![0].children).toHaveLength(3);
    expect(result.children![0].children![0].bind).toBe('name');
  });
});

describe('updateNodeProps', () => {
  it('updates properties on a node', () => {
    const tree = makeTree();
    const result = updateNodeProps(tree, '0', { placeholder: 'Enter name' });
    expect(result.children![0].placeholder).toBe('Enter name');
    expect(result.children![0].bind).toBe('name'); // preserved
  });

  it('updates nested node', () => {
    const tree = makeTree();
    const result = updateNodeProps(tree, '1', { columns: 3, gap: '16px' });
    expect(result.children![1].columns).toBe(3);
    expect(result.children![1].gap).toBe('16px');
  });
});
