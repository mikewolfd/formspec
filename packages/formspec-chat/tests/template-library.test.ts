import { describe, it, expect } from 'vitest';
import { TemplateLibrary } from '../src/template-library.js';

describe('TemplateLibrary', () => {
  const library = new TemplateLibrary();

  describe('getAll', () => {
    it('returns exactly 5 template archetypes', () => {
      const templates = library.getAll();
      expect(templates).toHaveLength(5);
    });

    it('includes all required archetypes', () => {
      const names = library.getAll().map(t => t.id);
      expect(names).toContain('housing-intake');
      expect(names).toContain('grant-application');
      expect(names).toContain('patient-intake');
      expect(names).toContain('compliance-checklist');
      expect(names).toContain('employee-onboarding');
    });

    it('each template has required fields', () => {
      for (const t of library.getAll()) {
        expect(t.id).toBeTruthy();
        expect(t.name).toBeTruthy();
        expect(t.description).toBeTruthy();
        expect(t.category).toBeTruthy();
        expect(t.definition).toBeTruthy();
      }
    });
  });

  describe('getById', () => {
    it('returns a template by ID', () => {
      const t = library.getById('housing-intake');
      expect(t).toBeDefined();
      expect(t!.name).toMatch(/housing/i);
    });

    it('returns undefined for unknown ID', () => {
      expect(library.getById('nonexistent')).toBeUndefined();
    });
  });

  describe('template definitions are valid Formspec', () => {
    it('housing-intake has fields for applicant info and income', () => {
      const t = library.getById('housing-intake')!;
      const keys = flattenItemKeys(t.definition.items);
      expect(keys).toContain('applicant_name');
      expect(keys).toContain('income');
    });

    it('grant-application has budget section with calculated total', () => {
      const t = library.getById('grant-application')!;
      const keys = flattenItemKeys(t.definition.items);
      expect(keys).toContain('budget');
      expect(keys).toContain('budget_total');
      // Should have a bind with calculate on budget_total
      const calcBind = t.definition.binds?.find(
        b => b.path === 'budget_total' && b.calculate,
      );
      expect(calcBind).toBeDefined();
    });

    it('patient-intake has medical history fields', () => {
      const t = library.getById('patient-intake')!;
      const keys = flattenItemKeys(t.definition.items);
      expect(keys).toContain('medical_history');
    });

    it('compliance-checklist has conditional sign-off logic', () => {
      const t = library.getById('compliance-checklist')!;
      // Should have a relevant bind for supervisor approval
      const relevantBind = t.definition.binds?.find(b => b.relevant);
      expect(relevantBind).toBeDefined();
    });

    it('employee-onboarding adapts based on employment type', () => {
      const t = library.getById('employee-onboarding')!;
      const keys = flattenItemKeys(t.definition.items);
      expect(keys).toContain('employment_type');
      // Should have conditional visibility based on employment_type
      const relevantBind = t.definition.binds?.find(
        b => b.relevant && b.relevant.includes('employment_type'),
      );
      expect(relevantBind).toBeDefined();
    });

    it('all definitions have $formspec version and required metadata', () => {
      for (const t of library.getAll()) {
        expect(t.definition.$formspec).toBe('1.0');
        expect(t.definition.url).toBeTruthy();
        expect(t.definition.version).toBeTruthy();
        expect(t.definition.status).toBe('draft');
        expect(t.definition.title).toBeTruthy();
        expect(t.definition.items.length).toBeGreaterThan(0);
      }
    });
  });
});

/** Recursively collect all item keys from a definition tree. */
function flattenItemKeys(items: any[]): string[] {
  const keys: string[] = [];
  for (const item of items) {
    keys.push(item.key);
    if (item.children) {
      keys.push(...flattenItemKeys(item.children));
    }
  }
  return keys;
}
