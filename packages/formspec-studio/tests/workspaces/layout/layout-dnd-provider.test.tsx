/** @filedesc Tests for LayoutDndProvider drop handler logic — asserts project API is used, not core.dispatch. */
import { describe, it, expect, vi } from 'vitest';
import {
  handleTrayDrop,
  handleTreeReorder,
  handleSpatialDrop,
  handleContainerDrop,
  handleDragEnd,
  layoutSortGroupToTargetParent,
  siblingIndicesForTreeReorder,
  findParentOfNodeRef,
  extractSortablePlacement,
} from '../../../src/workspaces/layout/LayoutDndProvider';
import { createProject, type Project } from '@formspec-org/studio-core';

function makeProject() {
  const project = createProject();
  project.addField('email', 'Email', 'string');
  project.addField('name', 'Name', 'string');
  return project;
}

describe('handleTrayDrop — tray-to-canvas', () => {
  it('calls placeOnPage when the tray key already exists in the definition (unassigned)', () => {
    const project = makeProject();
    const placeOnPage = vi.spyOn(project, 'placeOnPage').mockReturnValue({
      summary: 'ok',
      action: { helper: 'placeOnPage', params: {} },
      affectedPaths: [],
    });
    const addItemToLayout = vi.spyOn(project, 'addItemToLayout');

    handleTrayDrop(project, { key: 'email', label: 'Email', itemType: 'field' }, null);

    expect(placeOnPage).toHaveBeenCalledOnce();
    expect(placeOnPage).toHaveBeenCalledWith('email', 'root');
    expect(addItemToLayout).not.toHaveBeenCalled();
  });

  it('passes activePageId to placeOnPage when the item exists and a page is active', () => {
    const project = makeProject();
    const pageId = project.addPage('Step 1').createdId!;
    const placeOnPage = vi.spyOn(project, 'placeOnPage').mockReturnValue({
      summary: 'ok',
      action: { helper: 'placeOnPage', params: {} },
      affectedPaths: [],
    });

    handleTrayDrop(project, { key: 'email', label: 'Email', itemType: 'field' }, pageId);

    expect(placeOnPage).toHaveBeenCalledWith('email', pageId);
  });

  it('calls addItemToLayout for keys not yet in the definition', () => {
    const project = makeProject();
    const addItemToLayout = vi.spyOn(project, 'addItemToLayout').mockReturnValue({
      summary: 'ok',
      action: { helper: 'addItemToLayout', params: {} },
      affectedPaths: [],
      createdId: 'phone',
    });

    handleTrayDrop(project, { key: 'phone', label: 'Phone', itemType: 'field' }, null);

    expect(addItemToLayout).toHaveBeenCalledWith(
      expect.objectContaining({ itemType: 'field', key: 'phone' }),
      undefined,
    );
  });

  it('passes activePageId to addItemToLayout when adding a genuinely new field on a page', () => {
    const project = makeProject();
    const pageId = project.addPage('Step 1').createdId!;
    const addItemToLayout = vi.spyOn(project, 'addItemToLayout').mockReturnValue({
      summary: 'ok',
      action: { helper: 'addItemToLayout', params: {} },
      affectedPaths: [],
      createdId: 'phone',
    });

    handleTrayDrop(project, { key: 'phone', label: 'Phone', itemType: 'field' }, pageId);

    expect(addItemToLayout).toHaveBeenCalledWith(
      expect.objectContaining({ itemType: 'field', key: 'phone' }),
      pageId,
    );
  });
});

describe('handleSpatialDrop — spatial reorder into container at index', () => {
  it('calls project.moveComponentNodeToIndex with sourceRef, containerId, insertIndex', () => {
    const project = makeProject();
    const moveToIndex = vi.spyOn(project, 'moveComponentNodeToIndex').mockReturnValue({
      summary: 'ok',
      action: { helper: 'moveComponentNodeToIndex', params: {} },
      affectedPaths: [],
    });

    handleSpatialDrop(project, { bind: 'email' }, { nodeId: 'container-node-1' }, 2);

    expect(moveToIndex).toHaveBeenCalledOnce();
    expect(moveToIndex).toHaveBeenCalledWith({ bind: 'email' }, { nodeId: 'container-node-1' }, 2);
  });

  it('works with nodeId ref for layout nodes', () => {
    const project = makeProject();
    const moveToIndex = vi.spyOn(project, 'moveComponentNodeToIndex').mockReturnValue({
      summary: 'ok',
      action: { helper: 'moveComponentNodeToIndex', params: {} },
      affectedPaths: [],
    });

    handleSpatialDrop(project, { nodeId: 'node-abc' }, { nodeId: 'container-node-1' }, 0);

    expect(moveToIndex).toHaveBeenCalledWith({ nodeId: 'node-abc' }, { nodeId: 'container-node-1' }, 0);
  });

  it('accepts insertIndex 0 (insert before first child)', () => {
    const project = makeProject();
    const moveToIndex = vi.spyOn(project, 'moveComponentNodeToIndex').mockReturnValue({
      summary: 'ok',
      action: { helper: 'moveComponentNodeToIndex', params: {} },
      affectedPaths: [],
    });

    handleSpatialDrop(project, { bind: 'name' }, { nodeId: 'grid-1' }, 0);

    expect(moveToIndex).toHaveBeenCalledWith({ bind: 'name' }, { nodeId: 'grid-1' }, 0);
  });
});

describe('handleContainerDrop — drop onto container as last child', () => {
  it('calls project.moveComponentNodeToContainer with sourceRef and targetParent nodeId', () => {
    const project = makeProject();
    const moveToContainer = vi.spyOn(project, 'moveComponentNodeToContainer').mockReturnValue({
      summary: 'ok',
      action: { helper: 'moveComponentNodeToContainer', params: {} },
      affectedPaths: [],
    });

    handleContainerDrop(project, { bind: 'email' }, { nodeId: 'grid-container-1' });

    expect(moveToContainer).toHaveBeenCalledOnce();
    expect(moveToContainer).toHaveBeenCalledWith({ bind: 'email' }, { nodeId: 'grid-container-1' });
  });

  it('works with nodeId ref', () => {
    const project = makeProject();
    const moveToContainer = vi.spyOn(project, 'moveComponentNodeToContainer').mockReturnValue({
      summary: 'ok',
      action: { helper: 'moveComponentNodeToContainer', params: {} },
      affectedPaths: [],
    });

    handleContainerDrop(project, { nodeId: 'node-xyz' }, { nodeId: 'panel-1' });

    expect(moveToContainer).toHaveBeenCalledWith({ nodeId: 'node-xyz' }, { nodeId: 'panel-1' });
  });
});

describe('handleTreeReorder — component tree reorder', () => {
  it('calls project.reorderComponentNode (not a raw dispatch bypass) for bound node reorder', () => {
    const project = makeProject();
    // reorderComponentNode needs the node to exist in the component tree
    // Spy and replace with noop to test dispatch path without needing real nodes
    const reorderComponentNode = vi.spyOn(project, 'reorderComponentNode').mockReturnValue({
      summary: 'ok',
      action: { helper: 'reorderComponentNode', params: {} },
      affectedPaths: [],
    });

    handleTreeReorder(project, { bind: 'email' }, { bind: 'name' }, 'down');

    expect(reorderComponentNode).toHaveBeenCalledOnce();
    expect(reorderComponentNode).toHaveBeenCalledWith({ bind: 'email' }, 'down');
  });

  it('calls reorderComponentNode with direction up', () => {
    const project = makeProject();
    const reorderComponentNode = vi.spyOn(project, 'reorderComponentNode').mockReturnValue({
      summary: 'ok',
      action: { helper: 'reorderComponentNode', params: {} },
      affectedPaths: [],
    });

    handleTreeReorder(project, { bind: 'name' }, { bind: 'email' }, 'up');

    expect(reorderComponentNode).toHaveBeenCalledWith({ bind: 'name' }, 'up');
  });

  it('calls reorderComponentNode with nodeId ref for layout nodes', () => {
    const project = makeProject();
    const reorderComponentNode = vi.spyOn(project, 'reorderComponentNode').mockReturnValue({
      summary: 'ok',
      action: { helper: 'reorderComponentNode', params: {} },
      affectedPaths: [],
    });

    handleTreeReorder(project, { nodeId: 'node-abc' }, { nodeId: 'node-xyz' }, 'down');

    expect(reorderComponentNode).toHaveBeenCalledWith({ nodeId: 'node-abc' }, 'down');
  });
});

// ── handleDragEnd routing — tests the onDragEnd dispatch logic in isolation ──
// These tests require a pure exported handleDragEnd(project, eventData, activePageId, selectFn).

describe('handleDragEnd routing — insert-slot drops', () => {
  it('routes insert-slot target to handleSpatialDrop (moveComponentNodeToIndex)', () => {
    const project = makeProject();
    const moveToIndex = vi.spyOn(project, 'moveComponentNodeToIndex').mockReturnValue({
      summary: 'ok', action: { helper: 'moveComponentNodeToIndex', params: {} }, affectedPaths: [],
    });

    // Simulate a dnd-kit event with insert-slot target type
    handleDragEnd(project, {
      canceled: false,
      source: { id: 'field:email', data: { nodeRef: { bind: 'email' }, type: 'tree-node', index: 0 } },
      target: { id: 'slot:grid-1:2', data: { type: 'insert-slot', containerId: 'grid-1', insertIndex: 2 } },
    }, null, vi.fn());

    expect(moveToIndex).toHaveBeenCalledWith({ bind: 'email' }, { nodeId: 'grid-1' }, 2);
  });

  it('routes container-drop target with nodeId to handleContainerDrop (moveComponentNodeToContainer)', () => {
    const project = makeProject();
    const moveToContainer = vi.spyOn(project, 'moveComponentNodeToContainer').mockReturnValue({
      summary: 'ok', action: { helper: 'moveComponentNodeToContainer', params: {} }, affectedPaths: [],
    });

    handleDragEnd(project, {
      canceled: false,
      source: { id: 'field:email', data: { nodeRef: { bind: 'email' }, type: 'tree-node', index: 0 } },
      target: { id: 'drop:node:card-1', data: { type: 'container-drop', nodeRef: { nodeId: 'card-1' } } },
    }, null, vi.fn());

    expect(moveToContainer).toHaveBeenCalledWith({ bind: 'email' }, { nodeId: 'card-1' });
  });

  it('routes container-drop target with bind (bound layout container) to handleContainerDrop', () => {
    const project = makeProject();
    const moveToContainer = vi.spyOn(project, 'moveComponentNodeToContainer').mockReturnValue({
      summary: 'ok', action: { helper: 'moveComponentNodeToContainer', params: {} }, affectedPaths: [],
    });

    handleDragEnd(project, {
      canceled: false,
      source: { id: 'field:email', data: { nodeRef: { bind: 'email' }, type: 'tree-node', index: 0 } },
      target: { id: 'drop:bind:participants', data: { type: 'container-drop', nodeRef: { bind: 'participants' } } },
    }, null, vi.fn());

    expect(moveToContainer).toHaveBeenCalledWith({ bind: 'email' }, { bind: 'participants' });
  });

  it('skips when event is canceled', () => {
    const project = makeProject();
    const moveToIndex = vi.spyOn(project, 'moveComponentNodeToIndex').mockReturnValue({
      summary: 'ok', action: { helper: 'moveComponentNodeToIndex', params: {} }, affectedPaths: [],
    });

    handleDragEnd(project, {
      canceled: true,
      source: { id: 'field:email', data: { nodeRef: { bind: 'email' }, type: 'tree-node', index: 0 } },
      target: { id: 'slot:grid-1:0', data: { type: 'insert-slot', containerId: 'grid-1', insertIndex: 0 } },
    }, null, vi.fn());

    expect(moveToIndex).not.toHaveBeenCalled();
  });

  it('falls back to sibling reorder from component tree when sortable placement and drag indices are absent', () => {
    const tree = {
      component: 'Stack',
      nodeId: 'root',
      _layout: true,
      children: [
        { component: 'TextInput', bind: 'name' },
        { component: 'TextInput', bind: 'email' },
      ],
    };
    const reorder = vi.fn();
    const project = {
      component: { tree },
      reorderComponentNode: reorder,
      moveComponentNodeToIndex: vi.fn(),
      moveComponentNodeToContainer: vi.fn(),
      addItemToLayout: vi.fn(),
    } as unknown as Project;

    handleDragEnd(project, {
      canceled: false,
      source: { id: 'field:email', data: { nodeRef: { bind: 'email' }, type: 'tree-node' } },
      target: { id: 'field:name', data: { nodeRef: { bind: 'name' }, type: 'tree-node' } },
    }, null, vi.fn());

    // email at 1, name at 0 → source moves up
    expect(reorder).toHaveBeenCalledWith({ bind: 'email' }, 'up');
  });

  it('falls back to down when source sibling is before target in tree order', () => {
    const tree = {
      component: 'Stack',
      nodeId: 'root',
      _layout: true,
      children: [
        { component: 'TextInput', bind: 'name' },
        { component: 'TextInput', bind: 'email' },
      ],
    };
    const reorder = vi.fn();
    const project = {
      component: { tree },
      reorderComponentNode: reorder,
      moveComponentNodeToIndex: vi.fn(),
      moveComponentNodeToContainer: vi.fn(),
      addItemToLayout: vi.fn(),
    } as unknown as Project;

    handleDragEnd(project, {
      canceled: false,
      source: { id: 'field:name', data: { nodeRef: { bind: 'name' }, type: 'tree-node' } },
      target: { id: 'field:email', data: { nodeRef: { bind: 'email' }, type: 'tree-node' } },
    }, null, vi.fn());

    expect(reorder).toHaveBeenCalledWith({ bind: 'name' }, 'down');
  });

  it('does not fall back to linear reorder when source and target are not siblings', () => {
    const tree = {
      component: 'Stack',
      nodeId: 'root',
      _layout: true,
      children: [
        {
          component: 'Stack',
          nodeId: 'inner',
          _layout: true,
          children: [{ component: 'TextInput', bind: 'email' }],
        },
        { component: 'TextInput', bind: 'name' },
      ],
    };
    const reorder = vi.fn();
    const project = {
      component: { tree },
      reorderComponentNode: reorder,
      moveComponentNodeToIndex: vi.fn(),
      moveComponentNodeToContainer: vi.fn(),
      addItemToLayout: vi.fn(),
    } as unknown as Project;

    handleDragEnd(project, {
      canceled: false,
      source: { id: 'field:email', data: { nodeRef: { bind: 'email' }, type: 'tree-node', index: 0 } },
      target: { id: 'field:name', data: { nodeRef: { bind: 'name' }, type: 'tree-node', index: 1 } },
    }, null, vi.fn());

    expect(reorder).not.toHaveBeenCalled();
  });

  it('places an existing tray item on the page then moves it into the hit insert slot', () => {
    const project = makeProject();
    const placeOnPage = vi.spyOn(project, 'placeOnPage').mockReturnValue({
      summary: 'ok',
      action: { helper: 'placeOnPage', params: {} },
      affectedPaths: [],
    });
    const moveToIndex = vi.spyOn(project, 'moveComponentNodeToIndex').mockReturnValue({
      summary: 'ok', action: { helper: 'moveComponentNodeToIndex', params: {} }, affectedPaths: [],
    });
    const selectFn = vi.fn();

    handleDragEnd(project, {
      canceled: false,
      source: {
        id: 'unassigned:email',
        data: { type: 'unassigned-item', key: 'email', label: 'Email', itemType: 'field' },
      },
      target: {
        id: 'slot:grid-main:1',
        data: { type: 'insert-slot', containerId: 'grid-main', insertIndex: 1 },
      },
    }, 'page-1', selectFn);

    expect(placeOnPage).toHaveBeenCalledWith('email', 'page-1');
    expect(moveToIndex).toHaveBeenCalledWith({ bind: 'email' }, { nodeId: 'grid-main' }, 1);
    expect(selectFn).toHaveBeenCalledWith('email', 'field', { tab: 'layout' });
  });

  it('does not call moveComponentNodeToIndex when source is the same container as the insert-slot target (avoids circular move)', () => {
    const stackId = 'stack_main';
    const tree = {
      component: 'Stack',
      nodeId: 'root',
      _layout: true,
      children: [
        {
          component: 'Stack',
          nodeId: stackId,
          _layout: true,
          children: [{ component: 'TextInput', bind: 'email' }],
        },
      ],
    };
    const moveToIndex = vi.fn();
    const project = {
      component: { tree },
      moveComponentNodeToIndex: moveToIndex,
      reorderComponentNode: vi.fn(),
      moveComponentNodeToContainer: vi.fn(),
      addItemToLayout: vi.fn(),
    } as unknown as Project;

    handleDragEnd(project, {
      canceled: false,
      source: { id: `node:${stackId}`, data: { nodeRef: { nodeId: stackId }, type: 'tree-node', index: 0 } },
      target: { id: `slot:${stackId}-0`, data: { type: 'insert-slot', containerId: stackId, insertIndex: 0 } },
    }, null, vi.fn());

    expect(moveToIndex).not.toHaveBeenCalled();
  });
});

describe('siblingIndicesForTreeReorder', () => {
  const tree = {
    component: 'Stack',
    nodeId: 'root',
    _layout: true,
    children: [
      { component: 'TextInput', bind: 'a' },
      { component: 'TextInput', bind: 'b' },
    ],
  };

  it('returns indices for two bind siblings', () => {
    expect(
      siblingIndicesForTreeReorder(tree, { bind: 'b' }, { bind: 'a' }),
    ).toEqual({ sourceIndex: 1, targetIndex: 0 });
  });

  it('returns null when nodes are not siblings', () => {
    const nested = {
      component: 'Stack',
      nodeId: 'root',
      _layout: true,
      children: [
        {
          component: 'Stack',
          nodeId: 'inner',
          _layout: true,
          children: [{ component: 'TextInput', bind: 'email' }],
        },
        { component: 'TextInput', bind: 'name' },
      ],
    };
    expect(siblingIndicesForTreeReorder(nested, { bind: 'email' }, { bind: 'name' })).toBeNull();
  });
});

describe('findParentOfNodeRef', () => {
  it('returns the stack parent of a bound field', () => {
    const parent = {
      component: 'Stack',
      nodeId: 'root',
      children: [{ component: 'TextInput', bind: 'x' }],
    };
    const tree = parent as any;
    expect(findParentOfNodeRef(tree, { bind: 'x' })).toBe(parent);
  });
});

describe('extractSortablePlacement — @dnd-kit operation.source contract', () => {
  const treeNodeData = { type: 'tree-node', nodeRef: { bind: 'email' } };

  it('reads index and group from top-level source fields', () => {
    expect(
      extractSortablePlacement({
        id: 'field:email',
        data: treeNodeData,
        index: 0,
        group: 'stack-secondary',
        initialIndex: 2,
        initialGroup: 'root',
      }),
    ).toEqual({
      group: 'stack-secondary',
      index: 0,
      initialIndex: 2,
      initialGroup: 'root',
    });
  });

  it('reads index and group from nested sortable object when top-level omitted', () => {
    expect(
      extractSortablePlacement({
        id: 'field:email',
        data: treeNodeData,
        sortable: { index: 1, group: 'bind:section', initialIndex: 0, initialGroup: 'root' },
      }),
    ).toEqual({
      group: 'bind:section',
      index: 1,
      initialIndex: 0,
      initialGroup: 'root',
    });
  });

  it('returns null when data is not a layout tree-node', () => {
    expect(
      extractSortablePlacement({
        id: 'x',
        data: { type: 'unassigned-item' },
        index: 0,
        group: 'root',
      }),
    ).toBeNull();
  });

  it('returns null when tree-node but index is missing', () => {
    expect(extractSortablePlacement({ id: 'x', data: treeNodeData, group: 'root' })).toBeNull();
  });
});

describe('layoutSortGroupToTargetParent', () => {
  it('maps bind: prefix to component tree bind ref', () => {
    expect(layoutSortGroupToTargetParent('bind:participants')).toEqual({ bind: 'participants' });
  });

  it('maps plain ids to nodeId (root, pages, layout containers)', () => {
    expect(layoutSortGroupToTargetParent('root')).toEqual({ nodeId: 'root' });
    expect(layoutSortGroupToTargetParent('page-uuid-1')).toEqual({ nodeId: 'page-uuid-1' });
  });
});

describe('handleDragEnd routing — sortable placement', () => {
  it('routes sortable placement to moveComponentNodeToIndex with nodeId parent', () => {
    const project = makeProject();
    const moveToIndex = vi.spyOn(project, 'moveComponentNodeToIndex').mockReturnValue({
      summary: 'ok', action: { helper: 'moveComponentNodeToIndex', params: {} }, affectedPaths: [],
    });

    handleDragEnd(project, {
      canceled: false,
      source: { id: 'field:email', data: { nodeRef: { bind: 'email' }, type: 'tree-node' } },
      target: { id: 'field:name', data: { nodeRef: { bind: 'name' }, type: 'tree-node' } },
      sortablePlacement: { group: 'root', index: 0, initialGroup: 'root', initialIndex: 2 },
    }, null, vi.fn());

    expect(moveToIndex).toHaveBeenCalledWith({ bind: 'email' }, { nodeId: 'root' }, 0);
  });

  it('routes sortable placement with bind: group to moveComponentNodeToIndex', () => {
    const project = makeProject();
    const moveToIndex = vi.spyOn(project, 'moveComponentNodeToIndex').mockReturnValue({
      summary: 'ok', action: { helper: 'moveComponentNodeToIndex', params: {} }, affectedPaths: [],
    });

    handleDragEnd(project, {
      canceled: false,
      source: { id: 'field:email', data: { nodeRef: { bind: 'email' }, type: 'tree-node' } },
      target: { id: 'field:name', data: { nodeRef: { bind: 'name' }, type: 'tree-node' } },
      sortablePlacement: { group: 'bind:section', index: 1, initialGroup: 'root', initialIndex: 0 },
    }, null, vi.fn());

    expect(moveToIndex).toHaveBeenCalledWith({ bind: 'email' }, { bind: 'section' }, 1);
  });

  it('does not call move when sortable placement is unchanged', () => {
    const project = makeProject();
    const moveToIndex = vi.spyOn(project, 'moveComponentNodeToIndex').mockReturnValue({
      summary: 'ok', action: { helper: 'moveComponentNodeToIndex', params: {} }, affectedPaths: [],
    });

    handleDragEnd(project, {
      canceled: false,
      source: { id: 'field:email', data: { nodeRef: { bind: 'email' }, type: 'tree-node' } },
      target: { id: 'field:name', data: { nodeRef: { bind: 'name' }, type: 'tree-node' } },
      sortablePlacement: { group: 'root', index: 1, initialGroup: 'root', initialIndex: 1 },
    }, null, vi.fn());

    expect(moveToIndex).not.toHaveBeenCalled();
  });

  it('prefers insert-slot over sortable placement when both are present', () => {
    const project = makeProject();
    const moveToIndex = vi.spyOn(project, 'moveComponentNodeToIndex').mockReturnValue({
      summary: 'ok', action: { helper: 'moveComponentNodeToIndex', params: {} }, affectedPaths: [],
    });

    handleDragEnd(project, {
      canceled: false,
      source: { id: 'field:email', data: { nodeRef: { bind: 'email' }, type: 'tree-node' } },
      target: { id: 'slot:grid-1:2', data: { type: 'insert-slot', containerId: 'grid-1', insertIndex: 2 } },
      sortablePlacement: { group: 'root', index: 0, initialGroup: 'root', initialIndex: 1 },
    }, null, vi.fn());

    expect(moveToIndex).toHaveBeenCalledOnce();
    expect(moveToIndex).toHaveBeenCalledWith({ bind: 'email' }, { nodeId: 'grid-1' }, 2);
  });
});
