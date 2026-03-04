import { describe, it, expect } from 'vitest';
import { ADD_CATALOG, getCatalogByCategory } from '../add-picker-catalog';

describe('ADD_CATALOG', () => {
  it('contains entries for all four categories', () => {
    const categories = new Set(ADD_CATALOG.map((e) => e.category));
    expect(categories).toEqual(new Set(['layout', 'input', 'display', 'structure']));
  });

  it('input entries all set createsDefinitionItem and defaultDataType', () => {
    const inputs = ADD_CATALOG.filter((e) => e.category === 'input');
    for (const entry of inputs) {
      expect(entry.createsDefinitionItem).toBe(true);
      expect(entry.defaultDataType).toBeTruthy();
      expect(entry.definitionType).toBe('field');
    }
  });

  it('layout entries do not create definition items', () => {
    const layouts = ADD_CATALOG.filter((e) => e.category === 'layout');
    for (const entry of layouts) {
      expect(entry.createsDefinitionItem).toBeFalsy();
    }
  });
});

describe('getCatalogByCategory', () => {
  it('returns grouped entries', () => {
    const grouped = getCatalogByCategory();
    expect(grouped.layout.length).toBeGreaterThan(0);
    expect(grouped.input.length).toBeGreaterThan(0);
    expect(grouped.display.length).toBeGreaterThan(0);
    expect(grouped.structure.length).toBeGreaterThan(0);
  });
});
