import { describe, it, expect, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/preact';
import { TreeEditor } from '../components/tree/tree-editor';
import { componentDoc, componentVersion, setComponentDoc } from '../state/project';
import { selectedPath } from '../state/selection';
import { definition, definitionVersion, setDefinition } from '../state/definition';
import type { ComponentDocument } from '../types';
import type { FormspecDefinition } from 'formspec-engine';

const testDef: FormspecDefinition = {
  $formspec: '1.0',
  url: 'https://example.com',
  version: '1.0.0',
  status: 'draft',
  title: 'Test Form',
  items: [
    { key: 'name', type: 'field', label: 'Full Name', dataType: 'string' },
    {
      key: 'info',
      type: 'group',
      label: 'Info Section',
      children: [
        { key: 'email', type: 'field', label: 'Email', dataType: 'string' },
      ],
    },
  ],
} as FormspecDefinition;

const testComponentDoc: ComponentDocument = {
  $formspecComponent: '1.0',
  version: '1.0.0',
  targetDefinition: { url: 'https://example.com' },
  tree: {
    component: 'Stack',
    children: [
      { component: 'TextInput', bind: 'name' },
      {
        component: 'Card',
        title: 'Info Section',
        bind: 'info',
        children: [
          { component: 'TextInput', bind: 'email' },
        ],
      },
      { component: 'Divider' },
    ],
  },
};

beforeEach(() => {
  cleanup();
  selectedPath.value = null;
  componentDoc.value = null;
  componentVersion.value = 0;
  setDefinition(testDef);
  setComponentDoc(testComponentDoc);
});

describe('TreeEditor (unified)', () => {
  it('renders tree from componentDoc.tree', () => {
    render(<TreeEditor />);
    // Should show component nodes, not just definition items
    expect(screen.getByText('Full Name')).toBeTruthy(); // resolved from def via bind
    expect(screen.getByText('Info Section')).toBeTruthy(); // from Card title
    // Divider appears as both label and badge (component-only node)
    expect(screen.getAllByText('Divider').length).toBeGreaterThanOrEqual(1);
  });

  it('shows badges — dataType for bound items, component for layout', () => {
    render(<TreeEditor />);
    // Bound items show dataType badge (string for name and email)
    expect(screen.getAllByText('string').length).toBeGreaterThanOrEqual(2);
    // Card is a bound container (group kind) — no dataType, shows component name
    expect(screen.getByText('Card')).toBeTruthy();
  });

  it('shows the form title in the tree header', () => {
    render(<TreeEditor />);
    expect(screen.getByText('Test Form')).toBeTruthy();
  });

  it('selects root when header clicked', async () => {
    render(<TreeEditor />);
    const header = screen.getByText('Test Form').closest('[role="treeitem"]')!;
    (header as HTMLElement).click();
    expect(selectedPath.value).toBe('');
  });
});
