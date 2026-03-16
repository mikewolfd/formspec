import { describe, it, expect } from 'vitest';
import { FormScaffolder } from '../src/form-scaffolder.js';
import type { ScaffoldResult } from '../src/types.js';
import type { FormDefinition } from 'formspec-types';

describe('FormScaffolder', () => {
  const scaffolder = new FormScaffolder();

  const baseDef: FormDefinition = {
    $formspec: '1.0',
    url: 'urn:test:form',
    version: '0.1.0',
    status: 'draft',
    title: 'Test Form',
    items: [
      { key: 'name', type: 'field', label: 'Name', dataType: 'string' },
      { key: 'email', type: 'field', label: 'Email', dataType: 'string' },
    ],
    binds: [
      { path: 'name', required: 'true()' },
    ],
  } as FormDefinition;

  describe('apply', () => {
    it('applies a scaffold result as the full definition', () => {
      const result: ScaffoldResult = {
        definition: baseDef,
        traces: [],
        issues: [],
      };

      const applied = scaffolder.apply(result);
      expect(applied.definition).toEqual(baseDef);
    });

    it('passes through traces and issues unchanged', () => {
      const result: ScaffoldResult = {
        definition: baseDef,
        traces: [
          { elementPath: 'name', sourceType: 'message', sourceId: 'msg-1', description: 'test', timestamp: 1 },
        ],
        issues: [
          { severity: 'warning', category: 'low-confidence', title: 'Test', description: 'Test', sourceIds: [] },
        ],
      };

      const applied = scaffolder.apply(result);
      expect(applied.traces).toEqual(result.traces);
      expect(applied.issues).toEqual(result.issues);
    });
  });

  describe('diff', () => {
    it('detects added items', () => {
      const newDef: FormDefinition = {
        ...baseDef,
        items: [
          ...baseDef.items,
          { key: 'phone', type: 'field', label: 'Phone', dataType: 'string' } as any,
        ],
      };

      const changes = scaffolder.diff(baseDef, newDef);
      expect(changes.added).toContain('phone');
      expect(changes.removed).toEqual([]);
    });

    it('detects removed items', () => {
      const newDef: FormDefinition = {
        ...baseDef,
        items: [baseDef.items[0]],
      };

      const changes = scaffolder.diff(baseDef, newDef);
      expect(changes.removed).toContain('email');
      expect(changes.added).toEqual([]);
    });

    it('detects modified items (label changed)', () => {
      const newDef: FormDefinition = {
        ...baseDef,
        items: [
          { key: 'name', type: 'field', label: 'Full Name', dataType: 'string' } as any,
          baseDef.items[1],
        ],
      };

      const changes = scaffolder.diff(baseDef, newDef);
      expect(changes.modified).toContain('name');
    });

    it('returns empty diff for identical definitions', () => {
      const changes = scaffolder.diff(baseDef, baseDef);
      expect(changes.added).toEqual([]);
      expect(changes.removed).toEqual([]);
      expect(changes.modified).toEqual([]);
    });

    it('handles nested group children', () => {
      const oldDef: FormDefinition = {
        ...baseDef,
        items: [
          {
            key: 'addr', type: 'group', label: 'Address',
            children: [
              { key: 'street', type: 'field', label: 'Street', dataType: 'string' },
            ],
          } as any,
        ],
      };
      const newDef: FormDefinition = {
        ...baseDef,
        items: [
          {
            key: 'addr', type: 'group', label: 'Address',
            children: [
              { key: 'street', type: 'field', label: 'Street', dataType: 'string' },
              { key: 'city', type: 'field', label: 'City', dataType: 'string' },
            ],
          } as any,
        ],
      };

      const changes = scaffolder.diff(oldDef, newDef);
      expect(changes.added).toContain('city');
    });

    it('handles empty items arrays', () => {
      const emptyDef: FormDefinition = { ...baseDef, items: [] };
      const changes = scaffolder.diff(emptyDef, baseDef);
      expect(changes.added).toContain('name');
      expect(changes.added).toContain('email');
    });

    it('detects dataType changes as modifications', () => {
      const newDef: FormDefinition = {
        ...baseDef,
        items: [
          { key: 'name', type: 'field', label: 'Name', dataType: 'text' } as any,
          baseDef.items[1],
        ],
      };
      const changes = scaffolder.diff(baseDef, newDef);
      expect(changes.modified).toContain('name');
    });
  });
});
