import { beforeEach, describe, expect, test } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/preact';
import type { FormspecItem } from 'formspec-engine';
import { PropertiesPanel } from '../components/properties/properties-panel';
import { createEmptyDefinition, setDefinition } from '../state/definition';
import { componentDoc, project, setComponentDoc } from '../state/project';
import { selectedPath } from '../state/selection';
import { resetState } from './setup';

describe('PropertiesPanel', () => {
  beforeEach(() => {
    resetState();
  });

  test('renders DisplayProperties for display items', () => {
    const def = createEmptyDefinition();
    const displayItem = {
      key: 'instructions',
      type: 'display',
      label: 'Instructions',
    } as FormspecItem;
    def.items = [displayItem];
    componentDoc.value = null; // Clear so setDefinition auto-generates tree
    setDefinition(def);
    // setDefinition auto-generates componentDoc; select first node (path '0')
    selectedPath.value = '0';

    render(<PropertiesPanel collapsed={false} onToggle={() => {}} />);
    expect(screen.getByText('Display')).toBeTruthy();
    expect(screen.getByText('Identity')).toBeTruthy();
    expect(screen.getByText('Advanced')).toBeTruthy();
  });

  test('diagnostics include mapping sidecar warnings', () => {
    project.value = {
      ...project.value,
      mappings: [
        {
          $formspecMapping: '1.0',
          version: '1.0.0',
          definitionRef: 'https://wrong.example/forms/x',
          definitionVersion: '>=1.0.0 <2.0.0',
          targetSchema: { format: 'json' },
          rules: [],
        },
      ],
    };

    render(<PropertiesPanel collapsed={false} onToggle={() => {}} />);
    const diagnosticsTab = screen.getByRole('tab', { name: /Diagnostics/ });
    fireEvent.click(diagnosticsTab);
    expect(screen.getByText(/definitionRef does not match active definition URL/)).toBeTruthy();
  });
});
