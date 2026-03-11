import { describe, it, expect } from 'vitest';
import { createProject } from '../src/index.js';

// ── Post-dispatch normalization ─────────────────────────────────

describe('post-dispatch normalization', () => {
  it('syncs targetDefinition.url when definition.url changes', () => {
    const project = createProject();
    const originalUrl = project.definition.url;

    project.dispatch({
      type: 'definition.setDefinitionProperty',
      payload: { property: 'url', value: 'urn:formspec:new-url' },
    });

    expect(project.definition.url).toBe('urn:formspec:new-url');
    expect(project.component.targetDefinition?.url).toBe('urn:formspec:new-url');
    expect(project.theme.targetDefinition?.url).toBe('urn:formspec:new-url');
  });

  it('initializes versioning state if missing after import', () => {
    const project = createProject();
    project.dispatch({
      type: 'project.import',
      payload: {
        definition: { $formspec: '1.0', url: 'urn:test', version: '1.0.0', title: 'Test', items: [] },
      },
    });

    expect(project.state.versioning).toBeDefined();
    expect(project.state.versioning.baseline).toBeDefined();
    expect(project.state.versioning.releases).toBeDefined();
  });
});

describe('renameItem — cross-artifact rewriting', () => {
  it('rewrites shape targets and constraint references', () => {
    const project = createProject();
    project.batch([
      { type: 'definition.addItem', payload: { type: 'field', key: 'price' } },
      { type: 'definition.addShape', payload: { id: 's1', target: 'price', constraint: '$price > 0', message: 'M' } },
    ]);

    project.dispatch({ type: 'definition.renameItem', payload: { path: 'price', newKey: 'cost' } });

    const shapes = project.definition.shapes!;
    expect(shapes[0].target).toBe('cost');
    expect(shapes[0].constraint).toBe('$cost > 0');
  });

  it('rewrites variable expressions', () => {
    const project = createProject();
    project.batch([
      { type: 'definition.addItem', payload: { type: 'field', key: 'qty' } },
      { type: 'definition.addVariable', payload: { name: 'total', expression: '$qty * 10' } },
    ]);

    project.dispatch({ type: 'definition.renameItem', payload: { path: 'qty', newKey: 'quantity' } });

    const vars = project.definition.variables!;
    expect(vars[0].expression).toBe('$quantity * 10');
  });

  it('rewrites component tree bind references', () => {
    const project = createProject();
    project.batch([
      { type: 'definition.addItem', payload: { type: 'field', key: 'email' } },
      { type: 'component.addNode', payload: { parent: { nodeId: 'root' }, component: 'TextInput', bind: 'email' } },
    ]);

    project.dispatch({ type: 'definition.renameItem', payload: { path: 'email', newKey: 'contact_email' } });

    const node = project.componentFor('contact_email');
    expect(node).toBeDefined();
    expect(node!.bind).toBe('contact_email');
  });

  it('rewrites theme per-item override keys', () => {
    const project = createProject();
    project.batch([
      { type: 'definition.addItem', payload: { type: 'field', key: 'total' } },
      { type: 'theme.setItemOverride', payload: { itemKey: 'total', property: 'widget', value: 'Slider' } },
    ]);

    project.dispatch({ type: 'definition.renameItem', payload: { path: 'total', newKey: 'sum' } });

    const theme = project.theme as any;
    expect(theme.items?.total).toBeUndefined();
    expect(theme.items?.sum?.widget).toBe('Slider');
  });

  it('rewrites mapping rule source paths', () => {
    const project = createProject();
    project.batch([
      { type: 'definition.addItem', payload: { type: 'field', key: 'name' } },
      { type: 'mapping.addRule', payload: { sourcePath: 'name', targetPath: 'output.name' } },
    ]);

    project.dispatch({ type: 'definition.renameItem', payload: { path: 'name', newKey: 'full_name' } });

    const mapping = project.mapping as any;
    expect(mapping.rules[0].sourcePath).toBe('full_name');
  });
});

describe('deleteItem — cross-artifact cleanup', () => {
  it('removes shapes targeting the deleted item', () => {
    const project = createProject();
    project.batch([
      { type: 'definition.addItem', payload: { type: 'field', key: 'age' } },
      { type: 'definition.addShape', payload: { id: 's1', target: 'age', constraint: '$age > 0', message: 'M' } },
    ]);

    project.dispatch({ type: 'definition.deleteItem', payload: { path: 'age' } });
    expect(project.definition.shapes ?? []).toHaveLength(0);
  });

  it('removes theme per-item overrides for deleted item', () => {
    const project = createProject();
    project.batch([
      { type: 'definition.addItem', payload: { type: 'field', key: 'total' } },
      { type: 'theme.setItemOverride', payload: { itemKey: 'total', property: 'widget', value: 'Slider' } },
    ]);

    project.dispatch({ type: 'definition.deleteItem', payload: { path: 'total' } });

    const theme = project.theme as any;
    expect(theme.items?.total).toBeUndefined();
  });
});

describe('renameInstance — FEL rewriting', () => {
  it('rewrites @instance references in bind expressions', () => {
    const project = createProject();
    project.batch([
      { type: 'definition.addItem', payload: { type: 'field', key: 'f1' } },
      { type: 'definition.addInstance', payload: { name: 'lookup', source: 'https://api.example.com' } },
      { type: 'definition.setBind', payload: { path: 'f1', properties: { calculate: "@instance('lookup').value" } } },
    ]);

    project.dispatch({ type: 'definition.renameInstance', payload: { name: 'lookup', newName: 'data' } });

    const bind = project.definition.binds![0] as any;
    expect(bind.calculate).toBe("@instance('data').value");
  });
});
