/** @filedesc Tests for core-owned Layout workspace context menu planning and actions. */
import { describe, expect, it, vi } from 'vitest';
import {
  buildLayoutContextMenuItems,
  executeLayoutAction,
  type LayoutContextMenuState,
} from '../src/layout-context-operations';

describe('buildLayoutContextMenuItems', () => {
  it('does not include definition-tier actions for field nodes', () => {
    const menu: LayoutContextMenuState = { x: 100, y: 100, kind: 'node', nodeType: 'field' };
    const items = buildLayoutContextMenuItems(menu);
    const labels = items.map((item) => item.label.toLowerCase());
    const actions = items.map((item) => item.action);

    expect(labels).not.toContain('wrap in group');
    expect(actions).not.toContain('delete');
    expect(actions).not.toContain('deleteItem');
    expect(actions).not.toContain('duplicate');
  });

  it('does not include AI actions', () => {
    const menu: LayoutContextMenuState = { x: 100, y: 100, kind: 'node', nodeType: 'field' };
    const items = buildLayoutContextMenuItems(menu);
    expect(items.filter((item) => item.action.startsWith('ai:'))).toHaveLength(0);
  });

  it('includes wrap, move, and remove actions for field nodes', () => {
    const menu: LayoutContextMenuState = { x: 100, y: 100, kind: 'node', nodeType: 'field' };
    const actions = buildLayoutContextMenuItems(menu).map((item) => item.action);

    expect(actions).toContain('wrapInCard');
    expect(actions).toContain('wrapInStack');
    expect(actions).toContain('wrapInGrid');
    expect(actions).toContain('wrapInPanel');
    expect(actions).toContain('wrapInConditionalGroup');
    expect(actions).toContain('moveUp');
    expect(actions).toContain('moveDown');
    expect(actions).toContain('removeFromTree');
  });

  it('includes unwrap and remove actions for layout nodes only', () => {
    const menu: LayoutContextMenuState = { x: 100, y: 100, kind: 'node', nodeType: 'layout' };
    const actions = buildLayoutContextMenuItems(menu).map((item) => item.action);

    expect(actions).toContain('unwrap');
    expect(actions).toContain('removeFromTree');
    expect(actions).not.toContain('wrapInCard');
    expect(actions).not.toContain('wrapInStack');
  });

  it('uses the same non-layout actions for group and display nodes', () => {
    const groupMenu: LayoutContextMenuState = { x: 100, y: 100, kind: 'node', nodeType: 'group' };
    const displayMenu: LayoutContextMenuState = { x: 100, y: 100, kind: 'node', nodeType: 'display' };

    expect(buildLayoutContextMenuItems(groupMenu).map((item) => item.action)).toEqual(
      buildLayoutContextMenuItems(displayMenu).map((item) => item.action),
    );
  });

  it('returns empty for canvas or missing context', () => {
    expect(buildLayoutContextMenuItems({ x: 100, y: 100, kind: 'canvas' })).toEqual([]);
    expect(buildLayoutContextMenuItems(null)).toEqual([]);
  });

  it('omits move actions when multiple layout targets are selected', () => {
    const menu: LayoutContextMenuState = {
      x: 100,
      y: 100,
      kind: 'node',
      nodeType: 'field',
      selectionCount: 2,
      layoutTargetKeys: ['a', 'b'],
    };
    const actions = buildLayoutContextMenuItems(menu).map((item) => item.action);
    expect(actions).not.toContain('moveUp');
    expect(actions).not.toContain('moveDown');
    expect(actions).toContain('removeFromTree');
  });

  it('marks remove-from-tree with a separator for non-layout nodes', () => {
    const menu: LayoutContextMenuState = { x: 100, y: 100, kind: 'node', nodeType: 'field' };
    const removeItem = buildLayoutContextMenuItems(menu).find((item) => item.action === 'removeFromTree');
    expect(removeItem?.separator).toBe(true);
  });
});

describe('executeLayoutAction', () => {
  it('closes immediately for canvas context', () => {
    let closed = false;
    executeLayoutAction({
      action: 'anything',
      menu: { x: 0, y: 0, kind: 'canvas' },
      project: {} as any,
      tree: undefined,
      layoutFlatOrder: [],
      deselect: () => {},
      select: () => {},
      closeMenu: () => { closed = true; },
    });
    expect(closed).toBe(true);
  });

  it('calls deleteComponentNode on removeFromTree (not core.dispatch)', () => {
    const deleteComponentNode = vi.fn();
    const fakeProject = { deleteComponentNode };

    let deselected = false;
    executeLayoutAction({
      action: 'removeFromTree',
      menu: { x: 0, y: 0, kind: 'node', nodeType: 'field', nodeRef: { bind: 'test' } },
      project: fakeProject as any,
      tree: undefined,
      layoutFlatOrder: ['test'],
      deselect: () => { deselected = true; },
      select: () => {},
      closeMenu: () => {},
    });

    expect(deleteComponentNode).toHaveBeenCalledWith({ bind: 'test' });
    expect(deselected).toBe(true);
  });

  it('calls deleteComponentNode for every layoutTargetKey (multi-select)', () => {
    const deleteComponentNode = vi.fn();
    const fakeProject = { deleteComponentNode };

    executeLayoutAction({
      action: 'removeFromTree',
      menu: {
        x: 0,
        y: 0,
        kind: 'node',
        nodeType: 'field',
        layoutTargetKeys: ['x', 'y'],
        selectionCount: 2,
      },
      project: fakeProject as any,
      tree: undefined,
      layoutFlatOrder: ['x', 'y'],
      deselect: () => {},
      select: () => {},
      closeMenu: () => {},
    });

    expect(deleteComponentNode).toHaveBeenCalledTimes(2);
    expect(deleteComponentNode).toHaveBeenNthCalledWith(1, { bind: 'y' });
    expect(deleteComponentNode).toHaveBeenNthCalledWith(2, { bind: 'x' });
  });

  it('calls reorderComponentNode on moveUp/moveDown (not core.dispatch)', () => {
    const reorderComponentNode = vi.fn();
    const fakeProject = { reorderComponentNode };

    executeLayoutAction({
      action: 'moveUp',
      menu: { x: 0, y: 0, kind: 'node', nodeType: 'field', nodeRef: { bind: 'name' } },
      project: fakeProject as any,
      tree: undefined,
      layoutFlatOrder: ['name'],
      deselect: () => {},
      select: () => {},
      closeMenu: () => {},
    });

    expect(reorderComponentNode).toHaveBeenCalledWith({ bind: 'name' }, 'up');

    executeLayoutAction({
      action: 'moveDown',
      menu: { x: 0, y: 0, kind: 'node', nodeType: 'group', nodeRef: { nodeId: 'grp_1' } },
      project: fakeProject as any,
      tree: undefined,
      layoutFlatOrder: ['__node:grp_1'],
      deselect: () => {},
      select: () => {},
      closeMenu: () => {},
    });

    expect(reorderComponentNode).toHaveBeenCalledWith({ nodeId: 'grp_1' }, 'down');
  });

  it('calls wrapComponentNode for Grid and Panel (not core.dispatch)', () => {
    const wrapComponentNode = vi.fn(() => ({ createdId: 'node-abc' }));
    const wrapSiblingComponentNodes = vi.fn(() => ({ createdId: 'node-batch' }));
    const fakeProject = { wrapComponentNode, wrapSiblingComponentNodes };

    let selected: { key: string; type: string } | null = null;
    executeLayoutAction({
      action: 'wrapInGrid',
      menu: { x: 0, y: 0, kind: 'node', nodeType: 'field', nodeRef: { bind: 'amount' } },
      project: fakeProject as any,
      tree: undefined,
      layoutFlatOrder: ['amount'],
      deselect: () => {},
      select: (key, type) => { selected = { key, type }; },
      closeMenu: () => {},
    });

    expect(wrapSiblingComponentNodes).not.toHaveBeenCalled();
    expect(wrapComponentNode).toHaveBeenCalledWith({ bind: 'amount' }, 'Grid');
    expect(selected).toEqual({ key: '__node:node-abc', type: 'layout' });
  });

  it('calls wrapSiblingComponentNodes once when multiple layout keys are selected', () => {
    const wrapComponentNode = vi.fn(() => ({ createdId: 'node-single' }));
    const wrapSiblingComponentNodes = vi.fn(() => ({ createdId: 'node-one-grid' }));
    const fakeProject = { wrapComponentNode, wrapSiblingComponentNodes };

    let selected: { key: string; type: string } | null = null;
    executeLayoutAction({
      action: 'wrapInGrid',
      menu: {
        x: 0,
        y: 0,
        kind: 'node',
        nodeType: 'field',
        nodeRef: { bind: 'a' },
        layoutTargetKeys: ['a', 'b'],
        selectionCount: 2,
      },
      project: fakeProject as any,
      tree: undefined,
      layoutFlatOrder: ['a', 'b'],
      deselect: () => {},
      select: (key, type) => { selected = { key, type }; },
      closeMenu: () => {},
    });

    expect(wrapSiblingComponentNodes).toHaveBeenCalledTimes(1);
    expect(wrapSiblingComponentNodes).toHaveBeenCalledWith(
      [{ bind: 'a' }, { bind: 'b' }],
      'Grid',
    );
    expect(wrapComponentNode).not.toHaveBeenCalled();
    expect(selected).toEqual({ key: '__node:node-one-grid', type: 'layout' });
  });

  it('falls back to per-node wrap when wrapSiblingComponentNodes throws', () => {
    const wrapComponentNode = vi.fn(() => ({ createdId: 'node-fallback' }));
    const wrapSiblingComponentNodes = vi.fn(() => {
      throw new Error('Nodes are not siblings');
    });
    const fakeProject = { wrapComponentNode, wrapSiblingComponentNodes };

    executeLayoutAction({
      action: 'wrapInStack',
      menu: {
        x: 0,
        y: 0,
        kind: 'node',
        nodeType: 'field',
        nodeRef: { bind: 'a' },
        layoutTargetKeys: ['a', 'b'],
        selectionCount: 2,
      },
      project: fakeProject as any,
      tree: undefined,
      layoutFlatOrder: ['a', 'b'],
      deselect: () => {},
      select: () => {},
      closeMenu: () => {},
    });

    expect(wrapSiblingComponentNodes).toHaveBeenCalledTimes(1);
    expect(wrapComponentNode).toHaveBeenCalledTimes(2);
    expect(wrapComponentNode).toHaveBeenNthCalledWith(1, { bind: 'a' }, 'Stack');
    expect(wrapComponentNode).toHaveBeenNthCalledWith(2, { bind: 'b' }, 'Stack');
  });

  it('calls wrapComponentNode for ConditionalGroup', () => {
    const wrapComponentNode = vi.fn(() => ({ createdId: 'node-cg1' }));
    const fakeProject = { wrapComponentNode };

    executeLayoutAction({
      action: 'wrapInConditionalGroup',
      menu: { x: 0, y: 0, kind: 'node', nodeType: 'field', nodeRef: { bind: 'name' } },
      project: fakeProject as any,
      tree: undefined,
      layoutFlatOrder: ['name'],
      deselect: () => {},
      select: () => {},
      closeMenu: () => {},
    });

    expect(wrapComponentNode).toHaveBeenCalledWith({ bind: 'name' }, 'ConditionalGroup');
  });

  it('calls wrapComponentNode for Card and Stack too (unified path)', () => {
    const wrapComponentNode = vi.fn(() => ({ createdId: 'node-xyz' }));
    const fakeProject = { wrapComponentNode };

    executeLayoutAction({
      action: 'wrapInCard',
      menu: { x: 0, y: 0, kind: 'node', nodeType: 'field', nodeRef: { bind: 'page1.name' } },
      project: fakeProject as any,
      tree: undefined,
      layoutFlatOrder: ['page1.name'],
      deselect: () => {},
      select: () => {},
      closeMenu: () => {},
    });

    expect(wrapComponentNode).toHaveBeenCalledWith({ bind: 'name' }, 'Card');
  });

  it('selects the created layout wrapper after wrapping a node', () => {
    let selected: { key: string; type: string } | null = null;
    const fakeProject = {
      wrapComponentNode: () => ({ createdId: 'node-123' }),
    };

    executeLayoutAction({
      action: 'wrapInCard',
      menu: { x: 0, y: 0, kind: 'node', nodeType: 'field', nodeRef: { bind: 'page1.name' } },
      project: fakeProject as any,
      tree: undefined,
      layoutFlatOrder: ['page1.name'],
      deselect: () => {},
      select: (key, type) => { selected = { key, type }; },
      closeMenu: () => {},
    });

    expect(selected).toEqual({ key: '__node:node-123', type: 'layout' });
  });
});
