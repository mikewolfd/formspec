import { describe, it, expect } from 'vitest';
import { createRawProject } from '../src/index.js';

describe('definition.addInstance', () => {
  it('adds a named instance', () => {
    const project = createRawProject();

    project.dispatch({
      type: 'definition.addInstance',
      payload: {
        name: 'patient',
        source: 'https://api.example.com/patient/123',
        description: 'Patient demographics',
      },
    });

    expect(project.definition.instances?.patient).toBeDefined();
    expect(project.definition.instances!.patient.source).toBe('https://api.example.com/patient/123');
    expect(project.definition.instances!.patient.description).toBe('Patient demographics');
  });

  it('auto-generates name if omitted', () => {
    const project = createRawProject();

    project.dispatch({
      type: 'definition.addInstance',
      payload: { source: 'https://api.example.com/data' },
    });

    const keys = Object.keys(project.definition.instances ?? {});
    expect(keys).toHaveLength(1);
    expect(keys[0]).toBeTypeOf('string');
  });

  it('sets inline data and static/readonly flags', () => {
    const project = createRawProject();

    project.dispatch({
      type: 'definition.addInstance',
      payload: {
        name: 'config',
        data: { threshold: 100 },
        static: true,
        readonly: true,
      },
    });

    const inst = project.definition.instances!.config;
    expect(inst.data).toEqual({ threshold: 100 });
    expect(inst.static).toBe(true);
    expect(inst.readonly).toBe(true);
  });
});

describe('definition.setInstance', () => {
  it('updates an instance property', () => {
    const project = createRawProject();
    project.dispatch({
      type: 'definition.addInstance',
      payload: { name: 'data', source: 'https://old.api/data' },
    });

    project.dispatch({
      type: 'definition.setInstance',
      payload: { name: 'data', property: 'source', value: 'https://new.api/data' },
    });

    expect(project.definition.instances!.data.source).toBe('https://new.api/data');
  });

  it('removes a property when set to null', () => {
    const project = createRawProject();
    project.dispatch({
      type: 'definition.addInstance',
      payload: { name: 'data', description: 'Old desc' },
    });

    project.dispatch({
      type: 'definition.setInstance',
      payload: { name: 'data', property: 'description', value: null },
    });

    expect(project.definition.instances!.data.description).toBeUndefined();
  });
});

describe('definition.renameInstance', () => {
  it('renames the instance key', () => {
    const project = createRawProject();
    project.dispatch({
      type: 'definition.addInstance',
      payload: { name: 'old', source: 'https://api.example.com' },
    });

    project.dispatch({
      type: 'definition.renameInstance',
      payload: { name: 'old', newName: 'renamed' },
    });

    expect(project.definition.instances?.old).toBeUndefined();
    expect(project.definition.instances?.renamed).toBeDefined();
    expect(project.definition.instances!.renamed.source).toBe('https://api.example.com');
  });

  it('rewrites only parsed @instance references, not literals', () => {
    const project = createRawProject();
    project.batch([
      { type: 'definition.addInstance', payload: { name: 'old', source: 'https://api.example.com' } },
      { type: 'definition.addVariable', payload: { name: 'v', expression: "@instance('old').name + \"@instance('old')\"" } },
    ]);

    project.dispatch({
      type: 'definition.renameInstance',
      payload: { name: 'old', newName: 'renamed' },
    });

    expect(project.definition.variables?.[0].expression).toBe("@instance('renamed').name + \"@instance('old')\"");
  });
});

describe('definition.deleteInstance', () => {
  it('removes an instance by name', () => {
    const project = createRawProject();
    project.dispatch({
      type: 'definition.addInstance',
      payload: { name: 'temp', data: {} },
    });
    project.dispatch({
      type: 'definition.addInstance',
      payload: { name: 'keep', data: {} },
    });

    project.dispatch({
      type: 'definition.deleteInstance',
      payload: { name: 'temp' },
    });

    expect(project.definition.instances?.temp).toBeUndefined();
    expect(project.definition.instances?.keep).toBeDefined();
  });
});
