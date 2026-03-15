import { describe, it, expect } from 'vitest';
import { createRawProject } from '../src/index.js';

describe('definition.setDefinitionProperty', () => {
  it('sets a top-level definition property', () => {
    const project = createRawProject();

    project.dispatch({
      type: 'definition.setDefinitionProperty',
      payload: { property: 'name', value: 'Patient Intake' },
    });

    expect((project.definition as any).name).toBe('Patient Intake');
  });

  it('sets description', () => {
    const project = createRawProject();

    project.dispatch({
      type: 'definition.setDefinitionProperty',
      payload: { property: 'description', value: 'A clinical intake form' },
    });

    expect((project.definition as any).description).toBe('A clinical intake form');
  });

  it('sets version', () => {
    const project = createRawProject();

    project.dispatch({
      type: 'definition.setDefinitionProperty',
      payload: { property: 'version', value: '2.0.0' },
    });

    expect(project.definition.version).toBe('2.0.0');
  });

  it('sets status', () => {
    const project = createRawProject();

    project.dispatch({
      type: 'definition.setDefinitionProperty',
      payload: { property: 'status', value: 'draft' },
    });

    expect((project.definition as any).status).toBe('draft');
  });

  it('sets nonRelevantBehavior', () => {
    const project = createRawProject();

    project.dispatch({
      type: 'definition.setDefinitionProperty',
      payload: { property: 'nonRelevantBehavior', value: 'remove' },
    });

    expect(project.definition.nonRelevantBehavior).toBe('remove');
  });

  it('can set null to remove a property', () => {
    const project = createRawProject();

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
    const project = createRawProject();

    project.dispatch({
      type: 'definition.setFormPresentation',
      payload: { property: 'labelPosition', value: 'top' },
    });

    expect(project.definition.formPresentation?.labelPosition).toBe('top');
  });

  it('sets defaultCurrency', () => {
    const project = createRawProject();

    project.dispatch({
      type: 'definition.setFormPresentation',
      payload: { property: 'defaultCurrency', value: 'USD' },
    });

    expect(project.definition.formPresentation?.defaultCurrency).toBe('USD');
  });

  it('initializes formPresentation object if missing', () => {
    const project = createRawProject();

    expect(project.definition.formPresentation).toBeUndefined();

    project.dispatch({
      type: 'definition.setFormPresentation',
      payload: { property: 'density', value: 'compact' },
    });

    expect(project.definition.formPresentation).toBeDefined();
    expect(project.definition.formPresentation.density).toBe('compact');
  });

  it('sets null to remove a property', () => {
    const project = createRawProject();

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

describe('definition.setGroupRef', () => {
  it('sets $ref on a group item', () => {
    const project = createRawProject();
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
    const project = createRawProject();
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
