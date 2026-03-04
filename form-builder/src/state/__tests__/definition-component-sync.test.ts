import { describe, it, expect, beforeEach } from 'vitest';
import { setDefinition, definition } from '../definition';
import { componentDoc, componentVersion } from '../project';
import type { FormspecDefinition } from 'formspec-engine';

const testDef: FormspecDefinition = {
  $formspec: '1.0',
  url: 'https://example.com/test',
  version: '1.0.0',
  status: 'draft',
  title: 'Test',
  items: [
    { key: 'name', type: 'field', label: 'Name', dataType: 'string' },
  ],
} as FormspecDefinition;

beforeEach(() => {
  componentDoc.value = null;
  componentVersion.value = 0;
});

describe('setDefinition component tree generation', () => {
  it('auto-generates component tree when componentDoc is null', () => {
    setDefinition(testDef);
    expect(componentDoc.value).not.toBeNull();
    expect(componentDoc.value!.tree.component).toBe('Stack');
    expect(componentDoc.value!.tree.children).toHaveLength(1);
    expect(componentDoc.value!.tree.children![0].component).toBe('TextInput');
    expect(componentDoc.value!.tree.children![0].bind).toBe('name');
  });

  it('sets targetDefinition from definition URL', () => {
    setDefinition(testDef);
    expect(componentDoc.value!.targetDefinition.url).toBe('https://example.com/test');
  });

  it('preserves existing componentDoc when already set', () => {
    const existing = {
      $formspecComponent: '1.0' as const,
      version: '2.0.0',
      targetDefinition: { url: 'https://other.com' },
      tree: { component: 'Grid', children: [] },
    };
    componentDoc.value = existing;
    setDefinition(testDef);
    // Should NOT overwrite — the user may have customized the component tree
    expect(componentDoc.value!.tree.component).toBe('Grid');
  });
});
