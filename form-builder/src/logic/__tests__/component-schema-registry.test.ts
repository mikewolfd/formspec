import { describe, it, expect } from 'vitest';
import { getComponentSchema, getComponentPropertyDefs } from '../component-schema-registry';

describe('getComponentSchema', () => {
  it('returns schema for Stack', () => {
    const schema = getComponentSchema('Stack');
    expect(schema).toBeTruthy();
    expect(schema!.properties.direction).toBeTruthy();
    expect(schema!.properties.gap).toBeTruthy();
  });

  it('returns schema for TextInput', () => {
    const schema = getComponentSchema('TextInput');
    expect(schema).toBeTruthy();
    expect(schema!.properties.placeholder).toBeTruthy();
  });

  it('returns null for unknown component', () => {
    expect(getComponentSchema('Nonexistent')).toBeNull();
  });
});

describe('getComponentPropertyDefs', () => {
  it('returns property definitions for Grid', () => {
    const props = getComponentPropertyDefs('Grid');
    expect(props.length).toBeGreaterThan(0);
    const columns = props.find((p) => p.name === 'columns');
    expect(columns).toBeTruthy();
  });

  it('excludes base props (component, children, bind, when, etc.)', () => {
    const props = getComponentPropertyDefs('Stack');
    const names = props.map((p) => p.name);
    expect(names).not.toContain('component');
    expect(names).not.toContain('children');
    expect(names).not.toContain('bind');
    expect(names).not.toContain('when');
  });
});
