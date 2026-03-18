import { describe, it, expect } from 'vitest';
import { createProject } from '../src/project.js';

describe('mapField with mappingId', () => {
  it('passes mappingId in the dispatch payload when provided', () => {
    const project = createProject();
    project.addField('name', 'Name', 'text');
    const result = project.mapField('name', '/out/name', 'export-csv');
    expect(result.action.params).toEqual({
      sourcePath: 'name',
      targetPath: '/out/name',
      mappingId: 'export-csv',
    });
    // Rule is added to the named mapping ('export-csv'), not the default mapping
    expect((project as any).core.state.mappings['export-csv']?.rules).toHaveLength(1);
    expect((project.mapping as any).rules).toHaveLength(0);
  });

  it('omits mappingId from payload when not provided', () => {
    const project = createProject();
    project.addField('age', 'Age', 'integer');
    const result = project.mapField('age', '/out/age');
    expect(result.action.params).toEqual({
      sourcePath: 'age',
      targetPath: '/out/age',
      mappingId: undefined,
    });
    // Without mappingId, rule goes to the default/selected mapping
    expect((project.mapping as any).rules).toHaveLength(1);
  });
});

describe('unmapField with mappingId', () => {
  it('passes mappingId in the dispatch payload when provided', () => {
    const project = createProject();
    project.addField('email', 'Email', 'text');
    // Create 'export-csv' mapping and add a rule to it
    project.createMapping('export-csv');
    project.selectMapping('export-csv');
    project.mapField('email', '/out/email');
    // Re-read state after each dispatch (state is replaced, not mutated)
    expect((project as any).core.state.mappings['export-csv']?.rules).toHaveLength(1);

    const result = project.unmapField('email', 'export-csv');
    expect(result.action.params).toEqual({
      sourcePath: 'email',
      mappingId: 'export-csv',
    });
    // Rule removed from the named mapping — re-read fresh state
    expect((project as any).core.state.mappings['export-csv']?.rules).toHaveLength(0);
  });

  it('omits mappingId from params when not provided', () => {
    const project = createProject();
    project.addField('phone', 'Phone', 'text');
    project.mapField('phone', '/out/phone');
    const result = project.unmapField('phone');
    expect(result.action.params).toEqual({
      sourcePath: 'phone',
      mappingId: undefined,
    });
    // Rule removed from default mapping
    expect((project.mapping as any).rules).toHaveLength(0);
  });
});
