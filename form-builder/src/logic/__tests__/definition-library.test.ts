import { describe, expect, it } from 'vitest';
import type { FormspecDefinition } from 'formspec-engine';
import type { BuilderProject } from '../../types';
import {
  addLibraryDefinition,
  removeLibraryDefinition,
  createResolver,
  forkRefGroup,
} from '../definition-library';

function makeProject(overrides: Partial<BuilderProject> = {}): BuilderProject {
  return {
    definition: null,
    previousDefinitions: [],
    component: null,
    theme: null,
    mappings: [],
    registries: [],
    changelogs: [],
    library: [],
    ...overrides,
  };
}

function makeDefinition(url: string, version: string, items: any[] = []): FormspecDefinition {
  return {
    $formspec: '1.0',
    url,
    version,
    title: 'Test',
    items,
  } as FormspecDefinition;
}

describe('definition library', () => {
  describe('addLibraryDefinition', () => {
    it('adds a definition to the library', () => {
      const proj = makeProject();
      const def = makeDefinition('https://example.gov/common', '1.0.0', [
        { key: 'name', type: 'field', label: 'Name' },
      ]);
      const result = addLibraryDefinition(proj, def);
      expect(result.library).toHaveLength(1);
      expect(result.library[0].url).toBe('https://example.gov/common');
      expect(result.library[0].version).toBe('1.0.0');
      expect(result.library[0].definition).toBe(def);
    });

    it('replaces existing entry with same url', () => {
      const def1 = makeDefinition('https://example.gov/common', '1.0.0');
      const def2 = makeDefinition('https://example.gov/common', '2.0.0');
      const proj = makeProject({
        library: [{ url: 'https://example.gov/common', version: '1.0.0', definition: def1 }],
      });
      const result = addLibraryDefinition(proj, def2);
      expect(result.library).toHaveLength(1);
      expect(result.library[0].version).toBe('2.0.0');
    });
  });

  describe('removeLibraryDefinition', () => {
    it('removes by URL', () => {
      const def = makeDefinition('https://example.gov/common', '1.0.0');
      const proj = makeProject({
        library: [{ url: 'https://example.gov/common', version: '1.0.0', definition: def }],
      });
      const result = removeLibraryDefinition(proj, 'https://example.gov/common');
      expect(result.library).toHaveLength(0);
    });

    it('leaves other entries intact', () => {
      const def1 = makeDefinition('https://example.gov/common', '1.0.0');
      const def2 = makeDefinition('https://example.gov/budget', '1.0.0');
      const proj = makeProject({
        library: [
          { url: 'https://example.gov/common', version: '1.0.0', definition: def1 },
          { url: 'https://example.gov/budget', version: '1.0.0', definition: def2 },
        ],
      });
      const result = removeLibraryDefinition(proj, 'https://example.gov/common');
      expect(result.library).toHaveLength(1);
      expect(result.library[0].url).toBe('https://example.gov/budget');
    });
  });

  describe('createResolver', () => {
    it('resolves by url', () => {
      const def = makeDefinition('https://example.gov/common', '1.0.0');
      const resolver = createResolver([
        { url: 'https://example.gov/common', version: '1.0.0', definition: def },
      ]);
      expect(resolver('https://example.gov/common')).toBe(def);
    });

    it('resolves by url + version', () => {
      const def = makeDefinition('https://example.gov/common', '1.0.0');
      const resolver = createResolver([
        { url: 'https://example.gov/common', version: '1.0.0', definition: def },
      ]);
      expect(resolver('https://example.gov/common', '1.0.0')).toBe(def);
    });

    it('throws on missing definition', () => {
      const resolver = createResolver([]);
      expect(() => resolver('https://example.gov/missing')).toThrow(/not found in library/);
    });
  });

  describe('forkRefGroup', () => {
    it('copies assembled children and removes $ref', () => {
      const authored: FormspecDefinition = makeDefinition(
        'https://example.gov/host',
        '1.0.0',
        [
          {
            key: 'imported',
            type: 'group',
            label: 'Imported',
            $ref: 'https://example.gov/common|1.0.0',
            keyPrefix: 'imp_',
          },
        ],
      );
      const assembled: FormspecDefinition = makeDefinition(
        'https://example.gov/host',
        '1.0.0',
        [
          {
            key: 'imported',
            type: 'group',
            label: 'Imported',
            children: [
              { key: 'imp_name', type: 'field', label: 'Name', dataType: 'string' },
              { key: 'imp_email', type: 'field', label: 'Email', dataType: 'string' },
            ],
          },
        ],
      );

      const result = forkRefGroup(authored, assembled, 'imported');
      const group = result.items[0];
      expect(group.$ref).toBeUndefined();
      expect((group as any).keyPrefix).toBeUndefined();
      expect(group.children).toHaveLength(2);
      expect(group.children![0].key).toBe('imp_name');
      expect(group.children![1].key).toBe('imp_email');
    });

    it('throws if group not found', () => {
      const authored = makeDefinition('https://example.gov/host', '1.0.0', []);
      const assembled = makeDefinition('https://example.gov/host', '1.0.0', []);
      expect(() => forkRefGroup(authored, assembled, 'missing')).toThrow(/not found/);
    });
  });
});
