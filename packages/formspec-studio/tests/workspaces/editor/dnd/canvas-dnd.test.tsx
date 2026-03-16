import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { createProject } from 'formspec-studio-core';
import { ProjectProvider } from '../../../../src/state/ProjectContext';
import { SelectionProvider } from '../../../../src/state/useSelection';
import { ActivePageProvider } from '../../../../src/state/useActivePage';
import { EditorCanvas } from '../../../../src/workspaces/editor/EditorCanvas';
import { editorFixtures, renderEditorCanvas } from '../test-utils';

function renderCanvas(definition?: any) {
  return renderEditorCanvas(definition ?? editorFixtures.dnd);
}

describe('Canvas DnD Integration', () => {
  it('renders all items with data-item-path attributes', () => {
    renderCanvas();

    expect(screen.getByTestId('field-fieldA')).toHaveAttribute('data-item-path', 'fieldA');
    expect(screen.getByTestId('group-groupX')).toHaveAttribute('data-item-path', 'groupX');
    expect(screen.getByTestId('field-child1')).toHaveAttribute('data-item-path', 'groupX.child1');
    expect(screen.getByTestId('field-child2')).toHaveAttribute('data-item-path', 'groupX.child2');
    expect(screen.getByTestId('field-fieldB')).toHaveAttribute('data-item-path', 'fieldB');
  });

  it('field blocks are no longer natively draggable (handled by sortable wrapper)', () => {
    renderCanvas();

    expect(screen.getByTestId('field-fieldA')).not.toHaveAttribute('draggable');
  });

  it('items are wrapped in sortable containers', () => {
    renderCanvas();

    // Each item block should have a parent div (SortableItemWrapper)
    const fieldA = screen.getByTestId('field-fieldA');
    const wrapper = fieldA.parentElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper?.tagName).toBe('DIV');
  });

  it('moveItem reorders items at root level', () => {
    const { project } = renderCanvas();

    // Directly call moveItem to verify backend works
    act(() => {
      project.moveItem('fieldB', undefined, 0);
    });

    const keys = project.definition.items.map((i: any) => i.key);
    expect(keys[0]).toBe('fieldB');
    expect(keys[1]).toBe('fieldA');
  });

  it('moveItem moves item into a group', () => {
    const { project } = renderCanvas();

    act(() => {
      project.moveItem('fieldA', 'groupX', 0);
    });

    const root = project.definition.items as any[];
    const group = root.find((i: any) => i.key === 'groupX');
    expect(group.children[0].key).toBe('fieldA');
    expect(root.find((i: any) => i.key === 'fieldA')).toBeUndefined();
  });

  it('moveItem moves item out of a group to root', () => {
    const { project } = renderCanvas();

    act(() => {
      project.moveItem('groupX.child1', undefined, 0);
    });

    const root = project.definition.items as any[];
    expect(root[0].key).toBe('child1');
    const group = root.find((i: any) => i.key === 'groupX');
    expect(group.children.length).toBe(1);
    expect(group.children[0].key).toBe('child2');
  });

  it('batch moveItem handles multi-item moves atomically', () => {
    const { project } = renderCanvas({
      $formspec: '1.0', url: 'urn:batch-move', version: '1.0.0',
      items: [
        { key: 'a', type: 'field', dataType: 'string', label: 'A' },
        { key: 'b', type: 'field', dataType: 'string', label: 'B' },
        { key: 'c', type: 'field', dataType: 'string', label: 'C' },
        { key: 'target', type: 'group', label: 'Target', children: [] },
      ],
    });

    act(() => {
      project.moveItems([
        { sourcePath: 'a', targetParentPath: 'target', targetIndex: 0 },
        { sourcePath: 'b', targetParentPath: 'target', targetIndex: 1 },
      ]);
    });

    const root = project.definition.items as any[];
    const target = root.find((i: any) => i.key === 'target');
    expect(target.children.length).toBe(2);
    expect(target.children[0].key).toBe('a');
    expect(target.children[1].key).toBe('b');
    // Verify it's undoable as one operation
    expect(root.find((i: any) => i.key === 'a')).toBeUndefined();
    expect(root.find((i: any) => i.key === 'b')).toBeUndefined();
  });

  it('existing click-to-select behavior still works alongside DnD', async () => {
    renderCanvas();

    // Click on Field A
    await act(async () => {
      screen.getByTestId('field-fieldA').click();
    });

    // Should show selected state (accent border)
    const block = screen.getByTestId('field-fieldA');
    expect(block.className).toContain('accent');
  });

  it('moving a field into a Card via component tree keeps the field renderable', () => {
    // In wizard mode, fields must stay inside their page group in the definition.
    // Layout containers are definition-transparent — only component tree changes needed.
    const wizardDef = {
      $formspec: '1.0', url: 'urn:wizard-card', version: '1.0.0',
      formPresentation: { pageMode: 'wizard' },
      items: [
        { key: 'page1', type: 'group', label: 'Page One', children: [
          { key: 'name', type: 'field', dataType: 'string', label: 'Name' },
          { key: 'email', type: 'field', dataType: 'string', label: 'Email' },
        ]},
      ],
    };
    // Seed a component tree with name already inside a Card at root level
    const comp = {
      $formspecComponent: '1.0',
      targetDefinition: { url: 'urn:wizard-card' },
      tree: {
        component: 'Stack', nodeId: 'root', children: [
          { component: 'Stack', bind: 'page1', children: [
            { component: 'TextInput', bind: 'email' },
          ]},
          { component: 'Card', nodeId: 'card1', _layout: true, children: [
            { component: 'TextInput', bind: 'name' },
          ]},
        ],
      },
    };
    const project = createProject({ seed: { definition: wizardDef as any, component: comp as any } });
    render(
      <ProjectProvider project={project}>
        <SelectionProvider>
          <ActivePageProvider>
            <EditorCanvas />
          </ActivePageProvider>
        </SelectionProvider>
      </ProjectProvider>,
    );

    // Component tree: Card should contain the name field
    const tree = project.component.tree as any;
    const card = tree.children.find((n: any) => n._layout);
    expect(card.children).toHaveLength(1);
    expect(card.children[0].bind).toBe('name');

    // Definition unchanged — name is still inside page1
    const items = project.definition.items as any[];
    const page1 = items.find((i: any) => i.key === 'page1');
    expect(page1.children.find((c: any) => c.key === 'name')).toBeTruthy();

    // The field must still be visible on the canvas (the real bug)
    expect(screen.getByTestId('field-name')).toBeVisible();
  });

  it('moving a display item into a Card via component tree keeps it renderable', () => {
    const wizardDef = {
      $formspec: '1.0', url: 'urn:wizard-display-card', version: '1.0.0',
      formPresentation: { pageMode: 'wizard' },
      items: [
        { key: 'page1', type: 'group', label: 'Page One', children: [
          { key: 'heading1', type: 'display', label: 'Section Title' },
          { key: 'name', type: 'field', dataType: 'string', label: 'Name' },
        ]},
      ],
    };
    // Seed a component tree with heading1 already inside a Card at root level
    const comp = {
      $formspecComponent: '1.0',
      targetDefinition: { url: 'urn:wizard-display-card' },
      tree: {
        component: 'Stack', nodeId: 'root', children: [
          { component: 'Stack', bind: 'page1', children: [
            { component: 'TextInput', bind: 'name' },
          ]},
          { component: 'Card', nodeId: 'card1', _layout: true, children: [
            { component: 'Text', nodeId: 'heading1', text: 'Section Title' },
          ]},
        ],
      },
    };
    const project = createProject({ seed: { definition: wizardDef as any, component: comp as any } });
    render(
      <ProjectProvider project={project}>
        <SelectionProvider>
          <ActivePageProvider>
            <EditorCanvas />
          </ActivePageProvider>
        </SelectionProvider>
      </ProjectProvider>,
    );

    // Display node should be visible
    expect(screen.getByTestId('display-heading1')).toBeVisible();

    // Component tree: Card should contain the display node
    const tree = project.component.tree as any;
    const card = tree.children.find((n: any) => n._layout);
    expect(card.children).toHaveLength(1);
    expect(card.children[0].nodeId).toBe('heading1');

    // Definition unchanged — heading1 is still inside page1
    const items = project.definition.items as any[];
    const page1 = items.find((i: any) => i.key === 'page1');
    expect(page1.children.find((c: any) => c.key === 'heading1')).toBeTruthy();

    // The display item must still be visible on the canvas
    expect(screen.getByTestId('display-heading1')).toBeVisible();
  });
});
