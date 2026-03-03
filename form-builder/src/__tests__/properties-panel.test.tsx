import { beforeEach, describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/preact';
import type { FormspecItem } from 'formspec-engine';
import { PropertiesPanel } from '../components/properties/properties-panel';
import { createEmptyDefinition, setDefinition } from '../state/definition';
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
    setDefinition(def);
    selectedPath.value = 'instructions';

    render(<PropertiesPanel collapsed={false} onToggle={() => {}} />);
    expect(screen.getByText('Display')).toBeTruthy();
    expect(screen.getByText('Identity')).toBeTruthy();
    expect(screen.getByText('Advanced')).toBeTruthy();
  });
});
