import { describe, it, expect } from 'vitest';
import { generateComponentTree, resolveNode, classifyNode, getNodeLabel } from '../component-tree';
import type { FormspecDefinition } from 'formspec-engine';
import type { ComponentNode } from '../../types';

const minimalDef: FormspecDefinition = {
  $formspec: '1.0',
  url: 'https://example.com/test',
  version: '1.0.0',
  status: 'draft',
  title: 'Test',
  items: [
    { key: 'name', type: 'field', label: 'Name', dataType: 'string' },
    { key: 'age', type: 'field', label: 'Age', dataType: 'integer' },
  ],
} as FormspecDefinition;

const wizardDef: FormspecDefinition = {
  $formspec: '1.0',
  url: 'https://example.com/wizard',
  version: '1.0.0',
  status: 'draft',
  title: 'Wizard Form',
  formPresentation: { pageMode: 'wizard' },
  items: [
    {
      key: 'info',
      type: 'group',
      label: 'Info',
      children: [
        { key: 'email', type: 'field', label: 'Email', dataType: 'string' },
      ],
    },
    {
      key: 'notes',
      type: 'group',
      label: 'Notes',
      children: [
        { key: 'body', type: 'field', label: 'Body', dataType: 'text' },
      ],
    },
  ],
} as FormspecDefinition;

describe('generateComponentTree', () => {
  it('wraps flat items in a Stack', () => {
    const tree = generateComponentTree(minimalDef);
    expect(tree.component).toBe('Stack');
    expect(tree.children).toHaveLength(2);
    expect(tree.children![0].component).toBe('TextInput');
    expect(tree.children![0].bind).toBe('name');
    expect(tree.children![1].component).toBe('NumberInput');
    expect(tree.children![1].bind).toBe('age');
  });

  it('generates Wizard with Pages for wizard pageMode', () => {
    const tree = generateComponentTree(wizardDef);
    expect(tree.component).toBe('Wizard');
    expect(tree.children).toHaveLength(2);
    expect(tree.children![0].component).toBe('Page');
    expect(tree.children![0].title).toBe('Info');
    expect(tree.children![0].children![0].component).toBe('TextInput');
    expect(tree.children![0].children![0].bind).toBe('email');
  });

  it('maps dataTypes to correct components', () => {
    const def: FormspecDefinition = {
      ...minimalDef,
      items: [
        { key: 'a', type: 'field', label: 'A', dataType: 'boolean' },
        { key: 'b', type: 'field', label: 'B', dataType: 'date' },
        { key: 'c', type: 'field', label: 'C', dataType: 'choice' },
        { key: 'd', type: 'field', label: 'D', dataType: 'multiChoice' },
        { key: 'e', type: 'field', label: 'E', dataType: 'attachment' },
        { key: 'f', type: 'field', label: 'F', dataType: 'money' },
      ],
    } as FormspecDefinition;
    const tree = generateComponentTree(def);
    expect(tree.children!.map((n) => n.component)).toEqual([
      'Toggle', 'DatePicker', 'Select', 'CheckboxGroup', 'FileUpload', 'MoneyInput',
    ]);
  });

  it('handles display items', () => {
    const def: FormspecDefinition = {
      ...minimalDef,
      items: [{ key: 'header', type: 'display', label: 'Welcome' }],
    } as FormspecDefinition;
    const tree = generateComponentTree(def);
    expect(tree.children![0].component).toBe('Text');
    expect(tree.children![0].bind).toBe('header');
  });

  it('nests group children in a Stack', () => {
    const def: FormspecDefinition = {
      ...minimalDef,
      items: [
        {
          key: 'grp',
          type: 'group',
          label: 'Group',
          children: [
            { key: 'x', type: 'field', label: 'X', dataType: 'string' },
          ],
        },
      ],
    } as FormspecDefinition;
    const tree = generateComponentTree(def);
    expect(tree.children![0].component).toBe('Card');
    expect(tree.children![0].bind).toBe('grp');
    expect(tree.children![0].title).toBe('Group');
    expect(tree.children![0].children![0].bind).toBe('x');
  });
});

describe('resolveNode', () => {
  const tree: ComponentNode = {
    component: 'Stack',
    children: [
      { component: 'TextInput', bind: 'a' },
      {
        component: 'Grid',
        children: [
          { component: 'NumberInput', bind: 'b' },
          { component: 'Toggle', bind: 'c' },
        ],
      },
    ],
  };

  it('resolves empty path to root', () => {
    expect(resolveNode(tree, '')).toBe(tree);
  });

  it('resolves single index', () => {
    expect(resolveNode(tree, '0')?.component).toBe('TextInput');
  });

  it('resolves nested path', () => {
    expect(resolveNode(tree, '1.1')?.bind).toBe('c');
  });

  it('returns null for out-of-bounds', () => {
    expect(resolveNode(tree, '5')).toBeNull();
  });
});

describe('classifyNode', () => {
  it('classifies layout nodes', () => {
    expect(classifyNode({ component: 'Stack' })).toBe('layout');
    expect(classifyNode({ component: 'Grid' })).toBe('layout');
    expect(classifyNode({ component: 'Page' })).toBe('layout');
    expect(classifyNode({ component: 'Wizard' })).toBe('layout');
    expect(classifyNode({ component: 'Columns' })).toBe('layout');
    expect(classifyNode({ component: 'Tabs' })).toBe('layout');
  });

  it('classifies bound input nodes', () => {
    expect(classifyNode({ component: 'TextInput', bind: 'x' })).toBe('bound-input');
    expect(classifyNode({ component: 'Select', bind: 'y' })).toBe('bound-input');
  });

  it('classifies bound display nodes', () => {
    expect(classifyNode({ component: 'Heading', bind: 'h' })).toBe('bound-display');
    expect(classifyNode({ component: 'Text', bind: 't' })).toBe('bound-display');
  });

  it('classifies structure-only nodes', () => {
    expect(classifyNode({ component: 'Spacer' })).toBe('structure-only');
    expect(classifyNode({ component: 'Divider' })).toBe('structure-only');
    expect(classifyNode({ component: 'SubmitButton' })).toBe('structure-only');
    expect(classifyNode({ component: 'Alert' })).toBe('structure-only');
  });

  it('classifies group wrappers', () => {
    expect(classifyNode({ component: 'Stack', bind: 'grp' })).toBe('group');
    expect(classifyNode({ component: 'Card', bind: 'grp' })).toBe('group');
  });
});

describe('getNodeLabel', () => {
  it('returns label from bound definition item', () => {
    const items = [{ key: 'email', type: 'field' as const, label: 'Email Address', dataType: 'string' as const }];
    expect(getNodeLabel({ component: 'TextInput', bind: 'email' }, items)).toBe('Email Address');
  });

  it('returns component name for unbound layout', () => {
    expect(getNodeLabel({ component: 'Grid' }, [])).toBe('Grid');
  });

  it('uses title prop for Page/Card', () => {
    expect(getNodeLabel({ component: 'Page', title: 'Step 1' }, [])).toBe('Step 1');
  });
});
