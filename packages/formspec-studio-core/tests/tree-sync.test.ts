import { describe, it, expect } from 'vitest';
import { createProject } from '../src/index.js';

describe('component tree sync', () => {
  it('auto-creates a default node for a new field', () => {
    const project = createProject();
    project.dispatch({
      type: 'definition.addItem',
      payload: { type: 'field', key: 'name', dataType: 'string' },
    });

    const node = project.componentFor('name');
    expect(node).toBeDefined();
    expect(node!.bind).toBe('name');
    expect(node!.component).toBe('TextInput');
  });

  it('removes component node when item is deleted', () => {
    const project = createProject();
    project.dispatch({
      type: 'definition.addItem',
      payload: { type: 'field', key: 'age' },
    });
    expect(project.componentFor('age')).toBeDefined();

    project.dispatch({
      type: 'definition.deleteItem',
      payload: { path: 'age' },
    });
    expect(project.componentFor('age')).toBeUndefined();
  });

  it('preserves existing bound node properties through rebuild', () => {
    const project = createProject();
    project.dispatch({
      type: 'definition.addItem',
      payload: { type: 'field', key: 'email' },
    });
    // Customize the component node
    project.dispatch({
      type: 'component.setFieldWidget',
      payload: { fieldKey: 'email', widget: 'EmailInput' },
    });

    // Add another item — triggers rebuild
    project.dispatch({
      type: 'definition.addItem',
      payload: { type: 'field', key: 'phone' },
    });

    // email's custom widget should survive the rebuild
    const emailNode = project.componentFor('email');
    expect(emailNode!.component).toBe('EmailInput');
    // phone should get a default node
    expect(project.componentFor('phone')).toBeDefined();
  });

  it('creates nested structure for groups with children', () => {
    const project = createProject();
    project.batch([
      { type: 'definition.addItem', payload: { type: 'group', key: 'contact' } },
      { type: 'definition.addItem', payload: { type: 'field', key: 'name', parentPath: 'contact' } },
      { type: 'definition.addItem', payload: { type: 'field', key: 'email', parentPath: 'contact' } },
    ]);

    const tree = project.component.tree as any;
    const groupNode = tree.children.find((c: any) => c.bind === 'contact');
    expect(groupNode).toBeDefined();
    expect(groupNode.component).toBe('Stack');
    expect(groupNode.children).toHaveLength(2);
    expect(groupNode.children[0].bind).toBe('name');
    expect(groupNode.children[1].bind).toBe('email');
  });

  it('preserves unbound layout nodes after rebuild', () => {
    const project = createProject();
    project.dispatch({
      type: 'definition.addItem',
      payload: { type: 'field', key: 'f1' },
    });
    // Manually add an unbound layout node
    project.dispatch({
      type: 'component.addNode',
      payload: { parent: { nodeId: 'root' }, component: 'Divider' },
    });

    // Trigger rebuild by adding another field
    project.dispatch({
      type: 'definition.addItem',
      payload: { type: 'field', key: 'f2' },
    });

    const tree = project.component.tree as any;
    const hasDivider = tree.children.some((c: any) => c.component === 'Divider');
    expect(hasDivider).toBe(true);
  });

  it('creates Text nodes for display items', () => {
    const project = createProject();
    project.dispatch({
      type: 'definition.addItem',
      payload: { type: 'display', key: 'header', label: 'Welcome' },
    });

    const node = project.componentFor('header');
    expect(node).toBeDefined();
    expect(node!.component).toBe('Text');
  });

  it('handles batch with multiple structural changes', () => {
    const project = createProject();
    project.batch([
      { type: 'definition.addItem', payload: { type: 'field', key: 'a' } },
      { type: 'definition.addItem', payload: { type: 'field', key: 'b' } },
      { type: 'definition.addItem', payload: { type: 'field', key: 'c' } },
    ]);

    expect(project.componentFor('a')).toBeDefined();
    expect(project.componentFor('b')).toBeDefined();
    expect(project.componentFor('c')).toBeDefined();
  });
});
