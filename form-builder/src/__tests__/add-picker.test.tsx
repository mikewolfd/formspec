import { describe, it, expect, beforeEach } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/preact';
import { AddPicker, activeCategory, selectedEntry } from '../components/tree/add-picker';
import { componentDoc, setComponentDoc } from '../state/project';
import { setDefinition } from '../state/definition';
import type { FormspecDefinition } from 'formspec-engine';

const testDef: FormspecDefinition = {
  $formspec: '1.0',
  url: 'https://example.com',
  version: '1.0.0',
  status: 'draft',
  title: 'Test',
  items: [],
} as FormspecDefinition;

beforeEach(() => {
  cleanup();
  componentDoc.value = null;
  activeCategory.value = 'input';
  selectedEntry.value = null;
  setDefinition(testDef);
});

describe('AddPicker', () => {
  it('renders category tabs', () => {
    render(<AddPicker parentPath="" insertIndex={0} onAdd={() => {}} onCancel={() => {}} />);
    expect(screen.getByText('Layout')).toBeTruthy();
    expect(screen.getByText('Input')).toBeTruthy();
    expect(screen.getByText('Display')).toBeTruthy();
    expect(screen.getByText('Structure')).toBeTruthy();
  });

  it('shows component options for selected category', () => {
    render(<AddPicker parentPath="" insertIndex={0} onAdd={() => {}} onCancel={() => {}} />);
    // Default category is 'input'
    expect(screen.getByText('Text Input')).toBeTruthy();
    expect(screen.getByText('Number Input')).toBeTruthy();
    expect(screen.getByText('Toggle')).toBeTruthy();
  });

  it('switches categories on tab click', async () => {
    render(<AddPicker parentPath="" insertIndex={0} onAdd={() => {}} onCancel={() => {}} />);
    fireEvent.click(screen.getByText('Layout'));
    expect(screen.getByText('Stack')).toBeTruthy();
    expect(screen.getByText('Grid')).toBeTruthy();
  });

  it('prompts for label when input component selected', async () => {
    render(<AddPicker parentPath="" insertIndex={0} onAdd={() => {}} onCancel={() => {}} />);
    fireEvent.click(screen.getByText('Input')); // ensure input category is active
    fireEvent.click(screen.getByText('Text Input'));
    expect(screen.getByPlaceholderText('Enter label')).toBeTruthy();
  });

  it('calls onAdd with component node when confirmed', async () => {
    let addedNode: unknown = null;
    const onAdd = (node: unknown) => { addedNode = node; };
    render(<AddPicker parentPath="" insertIndex={0} onAdd={onAdd} onCancel={() => {}} />);

    // Click Display > Divider (no label prompt)
    fireEvent.click(screen.getByText('Display'));
    fireEvent.click(screen.getByText('Divider'));
    expect(addedNode).toEqual({ component: 'Divider' });
  });
});
