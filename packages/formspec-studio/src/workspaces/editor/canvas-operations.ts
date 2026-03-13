import { isLayoutId, nodeIdFromLayoutId } from '../../lib/tree-helpers';
import { pruneDescendants, sortForBatchDelete } from '../../lib/selection-helpers';

interface Item {
  key: string;
  type: string;
  children?: Item[];
  [key: string]: unknown;
}

export interface ContextMenuState {
  x: number;
  y: number;
  kind: 'item' | 'canvas';
  path?: string;
  type?: string;
}

export interface ContextMenuItem {
  label: string;
  action: string;
}

interface ItemLocation {
  path: string;
  parentPath: string | null;
  index: number;
  item: Item;
}

interface ExecuteContextActionOptions {
  action: string;
  contextMenu: ContextMenuState | null;
  items: Item[];
  selectionCount: number;
  selectedKeys: Set<string>;
  dispatch: (command: any) => any;
  batch: (commands: any[]) => void;
  deselect: () => void;
  selectAndFocusInspector: (path: string, type: string) => void;
  showPicker: () => void;
  closeMenu: () => void;
  createKey: (prefix: string) => string;
}

function findItemLocation(items: Item[], targetPath: string, prefix = ''): ItemLocation | null {
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const path = prefix ? `${prefix}.${item.key}` : item.key;
    if (path === targetPath) {
      return { path, parentPath: prefix || null, index, item };
    }
    if (item.children?.length) {
      const nested = findItemLocation(item.children, targetPath, path);
      if (nested) return nested;
    }
  }

  return null;
}

export function clampContextMenuPosition(x: number, y: number) {
  const MENU_WIDTH = 160;
  // Conservative upper bound for the tallest possible menu (8 items × ~40px + padding).
  const MENU_HEIGHT = 360;
  const maxX = Math.max(0, window.innerWidth - MENU_WIDTH);
  const maxY = Math.max(0, window.innerHeight - MENU_HEIGHT);

  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(0, y), maxY),
  };
}

export function buildContextMenuItems(
  contextMenu: ContextMenuState | null,
  selectionCount: number,
): ContextMenuItem[] {
  if (!contextMenu || contextMenu.kind === 'canvas') {
    return [{ label: 'Add Item', action: 'addItem' }];
  }

  if (selectionCount > 1) {
    return [
      { label: `Delete ${selectionCount} items`, action: 'batchDelete' },
      { label: `Duplicate ${selectionCount} items`, action: 'batchDuplicate' },
      { label: 'Wrap in Group', action: 'wrapInGroup' },
    ];
  }

  if (contextMenu.type === 'layout') {
    return [
      { label: 'Unwrap', action: 'unwrap' },
      { label: 'Delete', action: 'deleteLayout' },
    ];
  }

  return [
    { label: 'Duplicate', action: 'duplicate' },
    { label: 'Delete', action: 'delete' },
    { label: 'Move Up', action: 'moveUp' },
    { label: 'Move Down', action: 'moveDown' },
    { label: 'Wrap in Group', action: 'wrapInGroup' },
    { label: 'Wrap in Card', action: 'wrapInCard' },
    { label: 'Wrap in Stack', action: 'wrapInStack' },
    { label: 'Wrap in Collapsible', action: 'wrapInCollapsible' },
  ];
}

export function executeContextAction({
  action,
  contextMenu,
  items,
  selectionCount,
  selectedKeys,
  dispatch,
  batch,
  deselect,
  selectAndFocusInspector,
  showPicker,
  closeMenu,
  createKey,
}: ExecuteContextActionOptions): void {
  if (!contextMenu) return;

  if (contextMenu.kind === 'canvas') {
    if (action === 'addItem') {
      showPicker();
    }
    closeMenu();
    return;
  }

  const path = contextMenu.path;
  if (!path) return;

  if (selectionCount > 1) {
    switch (action) {
      case 'batchDelete': {
        const pruned = pruneDescendants(selectedKeys);
        const sorted = sortForBatchDelete(pruned);
        batch(sorted.map((selectedPath) => ({
          type: 'definition.deleteItem',
          payload: { path: selectedPath },
        })));
        deselect();
        break;
      }
      case 'batchDuplicate': {
        const pruned = pruneDescendants(selectedKeys);
        const sorted = sortForBatchDelete(pruned);
        batch(sorted.map((selectedPath) => ({
          type: 'definition.duplicateItem',
          payload: { path: selectedPath },
        })));
        break;
      }
      case 'wrapInGroup': {
        const pruned = pruneDescendants(selectedKeys);
        if (pruned.length === 0) break;

        const firstLocation = findItemLocation(items, pruned[0]);
        if (!firstLocation) break;

        const wrapperKey = createKey('group');
        const addResult = dispatch({
          type: 'definition.addItem',
          payload: {
            key: wrapperKey,
            type: 'group',
            label: 'Group',
            ...(firstLocation.parentPath ? { parentPath: firstLocation.parentPath } : {}),
            insertIndex: firstLocation.index,
          },
        });
        const targetParentPath = addResult.insertedPath
          ?? (firstLocation.parentPath ? `${firstLocation.parentPath}.${wrapperKey}` : wrapperKey);

        batch(pruned.map((selectedPath, index) => ({
          type: 'definition.moveItem',
          payload: { sourcePath: selectedPath, targetParentPath, targetIndex: index },
        })));
        deselect();
        break;
      }
    }

    closeMenu();
    return;
  }

  if (isLayoutId(path)) {
    const nodeId = nodeIdFromLayoutId(path);
    if (action === 'unwrap') {
      dispatch({ type: 'component.unwrapNode', payload: { node: { nodeId } } });
      deselect();
    }
    if (action === 'deleteLayout') {
      dispatch({ type: 'component.deleteNode', payload: { node: { nodeId } } });
      deselect();
    }
    closeMenu();
    return;
  }

  switch (action) {
    case 'duplicate':
      dispatch({ type: 'definition.duplicateItem', payload: { path } });
      break;
    case 'delete':
      dispatch({ type: 'definition.deleteItem', payload: { path } });
      break;
    case 'moveUp':
      dispatch({ type: 'definition.reorderItem', payload: { path, direction: 'up' } });
      break;
    case 'moveDown':
      dispatch({ type: 'definition.reorderItem', payload: { path, direction: 'down' } });
      break;
    case 'wrapInGroup': {
      const location = findItemLocation(items, path);
      if (!location) break;

      const wrapperKey = createKey('group');
      const addResult = dispatch({
        type: 'definition.addItem',
        payload: {
          key: wrapperKey,
          type: 'group',
          label: 'Group',
          ...(location.parentPath ? { parentPath: location.parentPath } : {}),
          insertIndex: location.index,
        },
      });
      const targetParentPath = addResult.insertedPath
        ?? (location.parentPath ? `${location.parentPath}.${wrapperKey}` : wrapperKey);

      dispatch({
        type: 'definition.moveItem',
        payload: { sourcePath: path, targetParentPath, targetIndex: 0 },
      });
      break;
    }
    case 'wrapInCard':
    case 'wrapInStack':
    case 'wrapInCollapsible': {
      const componentMap: Record<string, string> = {
        wrapInCard: 'Card',
        wrapInStack: 'Stack',
        wrapInCollapsible: 'Collapsible',
      };
      const result = dispatch({
        type: 'component.wrapNode',
        payload: {
          node: { bind: path.split('.').pop()! },
          wrapper: { component: componentMap[action] },
        },
      });
      const wrapperNodeId = (result as any).nodeRef?.nodeId;
      if (wrapperNodeId) {
        selectAndFocusInspector(`__node:${wrapperNodeId}`, 'layout');
      }
      break;
    }
  }

  closeMenu();
}
