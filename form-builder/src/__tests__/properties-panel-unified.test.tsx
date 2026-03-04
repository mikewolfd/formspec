import { describe, it, expect, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/preact';
import { PropertiesPanel } from '../components/properties/properties-panel';
import { selectedPath } from '../state/selection';
import { componentDoc, setComponentDoc, componentVersion } from '../state/project';
import { setDefinition } from '../state/definition';
import type { FormspecDefinition } from 'formspec-engine';
import type { ComponentDocument } from '../types';

const testDef: FormspecDefinition = {
  $formspec: '1.0',
  url: 'https://example.com',
  version: '1.0.0',
  status: 'draft',
  title: 'Test',
  items: [
    { key: 'name', type: 'field', label: 'Full Name', dataType: 'string' },
    { key: 'info', type: 'group', label: 'Info', children: [] },
    { key: 'header', type: 'display', label: 'Header' },
  ],
} as FormspecDefinition;

const testDoc: ComponentDocument = {
  $formspecComponent: '1.0',
  version: '1.0.0',
  targetDefinition: { url: 'https://example.com' },
  tree: {
    component: 'Stack',
    children: [
      { component: 'TextInput', bind: 'name' },
      { component: 'Grid', children: [] },
      { component: 'Stack', bind: 'info', children: [] },
      { component: 'Text', bind: 'header' },
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
  setComponentDoc(testDoc);
});

describe('PropertiesPanel routing (unified)', () => {
  it('shows empty state when nothing selected', () => {
    render(<PropertiesPanel collapsed={false} onToggle={() => {}} />);
    expect(screen.getByText('Select an item to edit its properties')).toBeTruthy();
  });

  it('shows RootProperties when root selected', () => {
    selectedPath.value = '';
    render(<PropertiesPanel collapsed={false} onToggle={() => {}} />);
    expect(screen.getByText('Document')).toBeTruthy(); // section header from RootProperties
  });

  it('shows FieldProperties for bound input node', () => {
    selectedPath.value = '0'; // TextInput bound to 'name'
    render(<PropertiesPanel collapsed={false} onToggle={() => {}} />);
    expect(screen.getByText('Identity')).toBeTruthy();
    expect(screen.getByDisplayValue('Full Name')).toBeTruthy();
  });

  it('shows layout properties for unbound Grid', () => {
    selectedPath.value = '1'; // Grid (no bind)
    render(<PropertiesPanel collapsed={false} onToggle={() => {}} />);
    expect(screen.getByText('Grid')).toBeTruthy(); // component type header
  });

  it('shows GroupProperties for group-bound node', () => {
    selectedPath.value = '2'; // Stack bound to 'info' group
    render(<PropertiesPanel collapsed={false} onToggle={() => {}} />);
    expect(screen.getByText('Identity')).toBeTruthy();
  });

  it('shows DisplayProperties for bound display node', () => {
    selectedPath.value = '3'; // Text bound to 'header'
    render(<PropertiesPanel collapsed={false} onToggle={() => {}} />);
    expect(screen.getByText('Identity')).toBeTruthy();
  });
});
