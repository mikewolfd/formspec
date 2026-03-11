import { describe, it, expect } from 'vitest';
import { createProject } from '../src/index.js';

describe('definition.setDefinitionProperty', () => {
  it('sets a top-level definition property', () => {
    const project = createProject();

    project.dispatch({
      type: 'definition.setDefinitionProperty',
      payload: { property: 'name', value: 'Patient Intake' },
    });

    expect((project.definition as any).name).toBe('Patient Intake');
  });

  it('sets description', () => {
    const project = createProject();

    project.dispatch({
      type: 'definition.setDefinitionProperty',
      payload: { property: 'description', value: 'A clinical intake form' },
    });

    expect((project.definition as any).description).toBe('A clinical intake form');
  });

  it('sets version', () => {
    const project = createProject();

    project.dispatch({
      type: 'definition.setDefinitionProperty',
      payload: { property: 'version', value: '2.0.0' },
    });

    expect(project.definition.version).toBe('2.0.0');
  });

  it('sets status', () => {
    const project = createProject();

    project.dispatch({
      type: 'definition.setDefinitionProperty',
      payload: { property: 'status', value: 'draft' },
    });

    expect((project.definition as any).status).toBe('draft');
  });

  it('sets nonRelevantBehavior', () => {
    const project = createProject();

    project.dispatch({
      type: 'definition.setDefinitionProperty',
      payload: { property: 'nonRelevantBehavior', value: 'remove' },
    });

    expect(project.definition.nonRelevantBehavior).toBe('remove');
  });

  it('can set null to remove a property', () => {
    const project = createProject();

    project.dispatch({
      type: 'definition.setDefinitionProperty',
      payload: { property: 'name', value: 'Test' },
    });
    project.dispatch({
      type: 'definition.setDefinitionProperty',
      payload: { property: 'name', value: null },
    });

    expect((project.definition as any).name).toBeUndefined();
  });
});

describe('definition.setFormPresentation', () => {
  it('sets a formPresentation property', () => {
    const project = createProject();

    project.dispatch({
      type: 'definition.setFormPresentation',
      payload: { property: 'labelPosition', value: 'top' },
    });

    expect(project.definition.formPresentation?.labelPosition).toBe('top');
  });

  it('sets defaultCurrency', () => {
    const project = createProject();

    project.dispatch({
      type: 'definition.setFormPresentation',
      payload: { property: 'defaultCurrency', value: 'USD' },
    });

    expect(project.definition.formPresentation?.defaultCurrency).toBe('USD');
  });

  it('initializes formPresentation object if missing', () => {
    const project = createProject();

    expect(project.definition.formPresentation).toBeUndefined();

    project.dispatch({
      type: 'definition.setFormPresentation',
      payload: { property: 'density', value: 'compact' },
    });

    expect(project.definition.formPresentation).toBeDefined();
    expect(project.definition.formPresentation.density).toBe('compact');
  });

  it('sets null to remove a property', () => {
    const project = createProject();

    project.dispatch({
      type: 'definition.setFormPresentation',
      payload: { property: 'labelPosition', value: 'top' },
    });
    project.dispatch({
      type: 'definition.setFormPresentation',
      payload: { property: 'labelPosition', value: null },
    });

    expect(project.definition.formPresentation?.labelPosition).toBeUndefined();
  });
});

describe('definition.addPage', () => {
  it('adds a page with auto-generated key', () => {
    const project = createProject();
    // Enable pages first
    project.dispatch({
      type: 'definition.setFormPresentation',
      payload: { property: 'pages', value: true },
    });

    project.dispatch({
      type: 'definition.addPage',
      payload: { title: 'Personal Info' },
    });

    const pages = project.definition.formPresentation?.pages;
    expect(pages).toHaveLength(2); // initial + new
    expect(pages[1].title).toBe('Personal Info');
  });

  it('respects insertIndex', () => {
    const project = createProject();
    project.dispatch({
      type: 'definition.setFormPresentation',
      payload: { property: 'pages', value: true },
    });
    project.dispatch({
      type: 'definition.addPage',
      payload: { title: 'Second' },
    });

    project.dispatch({
      type: 'definition.addPage',
      payload: { title: 'Inserted', insertIndex: 1 },
    });

    const pages = project.definition.formPresentation.pages;
    expect(pages[1].title).toBe('Inserted');
    expect(pages[2].title).toBe('Second');
  });
});

describe('definition.deletePage', () => {
  it('removes a page by key', () => {
    const project = createProject();
    project.dispatch({
      type: 'definition.setFormPresentation',
      payload: { property: 'pages', value: true },
    });
    project.dispatch({
      type: 'definition.addPage',
      payload: { title: 'Page 2' },
    });

    const pages = project.definition.formPresentation.pages;
    const page2Key = pages[1].key;

    project.dispatch({
      type: 'definition.deletePage',
      payload: { pageKey: page2Key },
    });

    expect(project.definition.formPresentation.pages).toHaveLength(1);
  });

  it('throws when deleting the last page', () => {
    const project = createProject();
    project.dispatch({
      type: 'definition.setFormPresentation',
      payload: { property: 'pages', value: true },
    });

    const lastKey = project.definition.formPresentation.pages[0].key;

    expect(() => {
      project.dispatch({
        type: 'definition.deletePage',
        payload: { pageKey: lastKey },
      });
    }).toThrow();
  });
});

describe('definition.reorderPage', () => {
  it('moves a page down', () => {
    const project = createProject();
    project.dispatch({
      type: 'definition.setFormPresentation',
      payload: { property: 'pages', value: true },
    });
    project.dispatch({ type: 'definition.addPage', payload: { title: 'Page 2' } });
    project.dispatch({ type: 'definition.addPage', payload: { title: 'Page 3' } });

    const firstKey = project.definition.formPresentation.pages[0].key;

    project.dispatch({
      type: 'definition.reorderPage',
      payload: { pageKey: firstKey, direction: 'down' },
    });

    expect(project.definition.formPresentation.pages[1].key).toBe(firstKey);
  });

  it('moves a page up', () => {
    const project = createProject();
    project.dispatch({
      type: 'definition.setFormPresentation',
      payload: { property: 'pages', value: true },
    });
    project.dispatch({ type: 'definition.addPage', payload: { title: 'Page 2' } });

    const secondKey = project.definition.formPresentation.pages[1].key;

    project.dispatch({
      type: 'definition.reorderPage',
      payload: { pageKey: secondKey, direction: 'up' },
    });

    expect(project.definition.formPresentation.pages[0].key).toBe(secondKey);
  });
});

describe('definition.setGroupRef', () => {
  it('sets $ref on a group item', () => {
    const project = createProject();
    project.dispatch({ type: 'definition.addItem', payload: { type: 'group', key: 'address' } });

    project.dispatch({
      type: 'definition.setGroupRef',
      payload: { path: 'address', ref: 'urn:formspec:shared-address', keyPrefix: 'addr_' },
    });

    const group = project.itemAt('address')!;
    expect((group as any).$ref).toBe('urn:formspec:shared-address');
    expect((group as any).keyPrefix).toBe('addr_');
  });

  it('clears $ref with null', () => {
    const project = createProject();
    project.dispatch({ type: 'definition.addItem', payload: { type: 'group', key: 'g' } });
    project.dispatch({
      type: 'definition.setGroupRef',
      payload: { path: 'g', ref: 'urn:formspec:shared' },
    });

    project.dispatch({
      type: 'definition.setGroupRef',
      payload: { path: 'g', ref: null },
    });

    const group = project.itemAt('g')!;
    expect((group as any).$ref).toBeUndefined();
    expect((group as any).keyPrefix).toBeUndefined();
  });
});
