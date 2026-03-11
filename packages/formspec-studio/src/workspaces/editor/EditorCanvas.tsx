import { useState, useEffect, useRef } from 'react';
import { useDefinition } from '../../state/useDefinition';
import { useSelection } from '../../state/useSelection';
import { useDispatch } from '../../state/useDispatch';
import { bindsFor } from '../../lib/field-helpers';
import { FieldBlock } from './FieldBlock';
import { GroupBlock } from './GroupBlock';
import { DisplayBlock } from './DisplayBlock';
import { AddItemPicker } from './AddItemPicker';
import { EditorContextMenu } from './EditorContextMenu';

interface Item {
  key: string;
  type: string;
  dataType?: string;
  label?: string;
  children?: Item[];
}

function renderItems(
  items: Item[],
  allBinds: Record<string, Record<string, string>> | undefined,
  selectedKey: string | null,
  select: (key: string, type: string) => void,
  depth: number,
  prefix: string,
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  for (const item of items) {
    const path = prefix ? `${prefix}.${item.key}` : item.key;
    const isSelected = selectedKey === path;

    if (item.type === 'group') {
      nodes.push(
        <GroupBlock
          key={path}
          itemKey={item.key}
          label={item.label}
          depth={depth}
          selected={isSelected}
          onSelect={() => select(path, 'group')}
        >
          {item.children
            ? renderItems(item.children, allBinds, selectedKey, select, depth + 1, path)
            : null}
        </GroupBlock>
      );
    } else if (item.type === 'display') {
      nodes.push(
        <DisplayBlock
          key={path}
          itemKey={item.key}
          label={item.label}
          depth={depth}
          selected={isSelected}
          onSelect={() => select(path, 'display')}
        />
      );
    } else {
      nodes.push(
        <FieldBlock
          key={path}
          itemKey={item.key}
          label={item.label}
          dataType={item.dataType}
          binds={bindsFor(allBinds, path)}
          depth={depth}
          selected={isSelected}
          onSelect={() => select(path, item.type)}
        />
      );
    }
  }
  return nodes;
}

interface ContextMenuState {
  x: number;
  y: number;
  path: string;
  type: string;
}

export function EditorCanvas() {
  const definition = useDefinition();
  const { selectedKey, select, deselect } = useSelection();
  const dispatch = useDispatch();
  const [showPicker, setShowPicker] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const items: Item[] = (definition?.items as Item[]) || [];
  const allBinds = definition?.binds as Record<string, Record<string, string>> | undefined;

  const handleAddItem = (type: string, dataType?: string) => {
    const key = `${type}${Date.now() % 10000}`;
    dispatch({
      type: 'definition.addItem',
      payload: { key, type, dataType, label: key },
    });
    setShowPicker(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as Element;
    const block = target.closest('[data-testid^="field-"], [data-testid^="group-"], [data-testid^="display-"]');
    if (!block) return;
    e.preventDefault();
    const testId = block.getAttribute('data-testid') ?? '';
    let itemType = 'field';
    let itemPath = testId;
    if (testId.startsWith('field-')) { itemType = 'field'; itemPath = testId.slice('field-'.length); }
    else if (testId.startsWith('group-')) { itemType = 'group'; itemPath = testId.slice('group-'.length); }
    else if (testId.startsWith('display-')) { itemType = 'display'; itemPath = testId.slice('display-'.length); }
    setContextMenu({ x: e.clientX, y: e.clientY, path: itemPath, type: itemType });
  };

  // Close context menu on outside click or Escape
  useEffect(() => {
    if (!contextMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [contextMenu]);

  const handleContextAction = (action: string) => {
    if (!contextMenu) return;
    switch (action) {
      case 'duplicate':
        dispatch({ type: 'definition.duplicateItem', payload: { path: contextMenu.path } });
        break;
      case 'delete':
        dispatch({ type: 'definition.deleteItem', payload: { path: contextMenu.path } });
        break;
      // moveUp, moveDown, wrapInGroup: no-op for now
    }
    setContextMenu(null);
  };

  return (
    <div
      className="flex flex-col gap-1 p-4"
      onClick={(e) => {
        // Deselect when clicking the canvas background, not a field/group block
        if (e.target === e.currentTarget) deselect();
      }}
      onContextMenu={handleContextMenu}
    >
      <div className="flex justify-end mb-2">
        <button
          data-testid="add-item"
          className="px-3 py-1.5 text-sm rounded bg-accent text-on-accent hover:opacity-90"
          onClick={() => setShowPicker(!showPicker)}
        >
          + Add
        </button>
      </div>
      {showPicker && (
        <AddItemPicker
          onAdd={handleAddItem}
          onClose={() => setShowPicker(false)}
        />
      )}
      {renderItems(items, allBinds, selectedKey, select, 0, '')}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 50 }}
        >
          <EditorContextMenu
            itemPath={contextMenu.path}
            itemType={contextMenu.type}
            onAction={handleContextAction}
            onClose={() => setContextMenu(null)}
          />
        </div>
      )}
    </div>
  );
}
