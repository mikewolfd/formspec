import { describe, it, expect } from 'vitest';
import {
  addBoundItem,
  removeBoundItem,
  findGroupForNode,
  generateUniqueKey,
} from '../component-def-sync';
import type { FormspecDefinition } from 'formspec-engine';
import type { ComponentNode, AddPickerEntry } from '../../types';

const baseDef: FormspecDefinition = {
  $formspec: '1.0',
  url: 'https://example.com/test',
  version: '1.0.0',
  status: 'draft',
  title: 'Test',
  items: [
    {
      key: 'info',
      type: 'group',
      label: 'Info',
      children: [
        { key: 'name', type: 'field', label: 'Name', dataType: 'string' },
      ],
    },
    { key: 'notes', type: 'field', label: 'Notes', dataType: 'text' },
  ],
} as FormspecDefinition;

describe('generateUniqueKey', () => {
  it('generates camelCase key from label', () => {
    expect(generateUniqueKey('Full Name', baseDef)).toBe('fullName');
  });

  it('deduplicates existing keys', () => {
    expect(generateUniqueKey('Name', baseDef)).toBe('name2');
  });

  it('handles empty label', () => {
    const key = generateUniqueKey('', baseDef);
    expect(key).toBe('item');
  });
});

describe('addBoundItem', () => {
  it('adds a field to root items', () => {
    const tree: ComponentNode = {
      component: 'Stack',
      children: [
        { component: 'Stack', bind: 'info', children: [{ component: 'TextInput', bind: 'name' }] },
        { component: 'TextInput', bind: 'notes' },
      ],
    };
    const entry: AddPickerEntry = {
      component: 'TextInput',
      label: 'Text Input',
      category: 'input',
      defaultDataType: 'string',
      createsDefinitionItem: true,
      definitionType: 'field',
      promptForLabel: true,
    };
    const result = addBoundItem(baseDef, tree, '', 'email', 'Email Address', entry);
    expect(result.items).toHaveLength(3);
    expect(result.items[2].key).toBe('email');
    expect(result.items[2].label).toBe('Email Address');
    expect(result.items[2].dataType).toBe('string');
  });

  it('adds a field inside a group when parent is bound to a group', () => {
    const tree: ComponentNode = {
      component: 'Stack',
      children: [
        { component: 'Stack', bind: 'info', children: [{ component: 'TextInput', bind: 'name' }] },
      ],
    };
    const entry: AddPickerEntry = {
      component: 'NumberInput',
      label: 'Number Input',
      category: 'input',
      defaultDataType: 'integer',
      createsDefinitionItem: true,
      definitionType: 'field',
      promptForLabel: true,
    };
    const result = addBoundItem(baseDef, tree, '0', 'age', 'Age', entry);
    const infoGroup = result.items.find((i) => i.key === 'info')!;
    expect(infoGroup.children).toHaveLength(2);
    expect(infoGroup.children![1].key).toBe('age');
  });

  it('adds a display item', () => {
    const tree: ComponentNode = { component: 'Stack', children: [] };
    const entry: AddPickerEntry = {
      component: 'Heading',
      label: 'Heading',
      category: 'display',
      createsDefinitionItem: true,
      definitionType: 'display',
      promptForLabel: true,
    };
    const result = addBoundItem(baseDef, tree, '', 'welcome', 'Welcome', entry);
    const added = result.items.find((i) => i.key === 'welcome')!;
    expect(added.type).toBe('display');
    expect(added.label).toBe('Welcome');
  });

  it('adds a group item', () => {
    const tree: ComponentNode = { component: 'Stack', children: [] };
    const entry: AddPickerEntry = {
      component: 'Group',
      label: 'Group',
      category: 'structure',
      createsDefinitionItem: true,
      definitionType: 'group',
      promptForLabel: true,
    };
    const result = addBoundItem(baseDef, tree, '', 'contact', 'Contact', entry);
    const added = result.items.find((i) => i.key === 'contact')!;
    expect(added.type).toBe('group');
    expect(added.children).toEqual([]);
  });
});

describe('removeBoundItem', () => {
  it('removes a field from root', () => {
    const result = removeBoundItem(baseDef, 'notes');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].key).toBe('info');
  });

  it('removes a field from inside a group', () => {
    const result = removeBoundItem(baseDef, 'name');
    const info = result.items.find((i) => i.key === 'info')!;
    expect(info.children).toHaveLength(0);
  });

  it('returns unchanged if key not found', () => {
    const result = removeBoundItem(baseDef, 'nonexistent');
    expect(result.items).toHaveLength(2);
  });
});

describe('findGroupForNode', () => {
  it('returns null for root-level parent', () => {
    const tree: ComponentNode = {
      component: 'Stack',
      children: [{ component: 'TextInput', bind: 'x' }],
    };
    expect(findGroupForNode(tree, '', baseDef)).toBeNull();
  });

  it('returns group key when parent node is bound to a group', () => {
    const tree: ComponentNode = {
      component: 'Stack',
      children: [
        { component: 'Stack', bind: 'info', children: [{ component: 'TextInput', bind: 'name' }] },
      ],
    };
    expect(findGroupForNode(tree, '0', baseDef)).toBe('info');
  });
});
