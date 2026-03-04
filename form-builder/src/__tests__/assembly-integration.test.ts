import { beforeEach, describe, expect, test } from 'vitest';
import type { FormspecDefinition } from 'formspec-engine';
import { definition, setDefinition, assembledDefinition } from '../state/definition';
import { diagnostics, engine, project } from '../state/project';
import { resetState } from './setup';

function makeDefinition(url: string, version: string, items: any[]): FormspecDefinition {
  return { $formspec: '1.0', url, version, title: 'Test', items } as FormspecDefinition;
}

describe('assembly integration', () => {
  beforeEach(() => {
    resetState();
  });

  test('definition without $ref passes through unchanged', () => {
    const def = makeDefinition('https://example.gov/host', '1.0.0', [
      { key: 'name', type: 'field', label: 'Name', dataType: 'string' },
    ]);
    setDefinition(def);

    expect(engine.value).not.toBeNull();
    expect(assembledDefinition.value).not.toBeNull();
    expect(assembledDefinition.value!.items).toHaveLength(1);
    expect(assembledDefinition.value!.items[0].key).toBe('name');
  });

  test('$ref group is resolved when library has the definition', () => {
    const libraryDef = makeDefinition('https://example.gov/common', '1.0.0', [
      { key: 'email', type: 'field', label: 'Email', dataType: 'string' },
      { key: 'phone', type: 'field', label: 'Phone', dataType: 'string' },
    ]);

    project.value = {
      ...project.value,
      library: [{ url: 'https://example.gov/common', version: '1.0.0', definition: libraryDef }],
    };

    const hostDef = makeDefinition('https://example.gov/host', '1.0.0', [
      {
        key: 'contact',
        type: 'group',
        label: 'Contact Info',
        $ref: 'https://example.gov/common|1.0.0',
      },
    ]);
    setDefinition(hostDef);

    // Authored definition preserves $ref
    expect(definition.value.items[0].$ref).toBe('https://example.gov/common|1.0.0');

    // Assembled definition has resolved children
    expect(assembledDefinition.value).not.toBeNull();
    const assembled = assembledDefinition.value!;
    expect(assembled.items[0].children).toHaveLength(2);
    expect(assembled.items[0].children![0].key).toBe('email');
    expect(assembled.items[0].children![1].key).toBe('phone');

    // Engine was built with assembled definition
    expect(engine.value).not.toBeNull();
  });

  test('assembly error produces diagnostic instead of crash', () => {
    // No library entry for the $ref — assembly should fail gracefully
    const hostDef = makeDefinition('https://example.gov/host', '1.0.0', [
      {
        key: 'contact',
        type: 'group',
        label: 'Contact Info',
        $ref: 'https://example.gov/missing|1.0.0',
      },
    ]);
    setDefinition(hostDef);

    // Should produce a diagnostic, not throw
    const assemblyDiags = diagnostics.value.filter((d) => d.source === 'assembler');
    expect(assemblyDiags.length).toBeGreaterThan(0);
    expect(assemblyDiags[0].severity).toBe('error');
    expect(assemblyDiags[0].message).toMatch(/not found in library/);

    // Engine should still work with unassembled definition as fallback
    expect(engine.value).not.toBeNull();
  });

  test('$ref with keyPrefix resolves prefixed children', () => {
    const libraryDef = makeDefinition('https://example.gov/common', '1.0.0', [
      { key: 'name', type: 'field', label: 'Name', dataType: 'string' },
    ]);

    project.value = {
      ...project.value,
      library: [{ url: 'https://example.gov/common', version: '1.0.0', definition: libraryDef }],
    };

    const hostDef = makeDefinition('https://example.gov/host', '1.0.0', [
      {
        key: 'contact',
        type: 'group',
        label: 'Contact Info',
        $ref: 'https://example.gov/common|1.0.0',
        keyPrefix: 'ct_',
      },
    ]);
    setDefinition(hostDef);

    const assembled = assembledDefinition.value!;
    expect(assembled.items[0].children![0].key).toBe('ct_name');
  });
});
