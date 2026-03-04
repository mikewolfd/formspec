import { describe, it, expect, beforeEach } from 'vitest';
import { componentDoc, componentVersion, setComponentDoc } from '../project';
import { selectedPath } from '../selection';
import type { ComponentDocument } from '../../types';

beforeEach(() => {
  componentDoc.value = null;
  componentVersion.value = 0;
  selectedPath.value = null;
});

describe('componentDoc signal', () => {
  it('starts null', () => {
    expect(componentDoc.value).toBeNull();
  });

  it('setComponentDoc updates signal and bumps version', () => {
    const doc: ComponentDocument = {
      $formspecComponent: '1.0',
      version: '1.0.0',
      targetDefinition: { url: 'https://example.com' },
      tree: { component: 'Stack', children: [] },
    };
    setComponentDoc(doc);
    expect(componentDoc.value).toEqual(doc);
    expect(componentVersion.value).toBe(1);
  });
});

describe('selectedPath', () => {
  it('stores component tree path strings', () => {
    selectedPath.value = '0.1';
    expect(selectedPath.value).toBe('0.1');
  });

  it('empty string means root node selected', () => {
    selectedPath.value = '';
    expect(selectedPath.value).toBe('');
  });
});
