import { useState, useEffect, useRef } from 'react';
import { useDefinition } from '../../state/useDefinition';
import { useSelection } from '../../state/useSelection';
import { useDispatch } from '../../state/useDispatch';
import { bindsFor } from '../../lib/field-helpers';
import { FieldBlock } from './FieldBlock';
import { GroupBlock } from './GroupBlock';
import { DisplayBlock } from './DisplayBlock';
import { PageTabs } from './PageTabs';
import { AddItemPalette, type FieldTypeOption } from '../../components/AddItemPalette';
import { EditorContextMenu } from './EditorContextMenu';

interface Item {
  key: string;
  type: string;
  dataType?: string;
  label?: string;
  hint?: string;
  repeatable?: boolean;
  minRepeat?: number;
  maxRepeat?: number;
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
          repeatable={item.repeatable}
          minRepeat={item.minRepeat}
          maxRepeat={item.maxRepeat}
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
          hint={item.hint}
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
  const [activePage, setActivePage] = useState(0);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const items: Item[] = (definition?.items as Item[]) || [];
  const allBinds = definition?.binds as Record<string, Record<string, string>> | undefined;

  const pageMode = (definition as any)?.formPresentation?.pageMode;
  const isPaged = pageMode === 'wizard' || pageMode === 'tabs';
  const topLevelGroups = items.filter((i) => i.type === 'group');
  const hasPaged = isPaged && topLevelGroups.length > 0;
  const safeActivePage = Math.min(activePage, Math.max(0, topLevelGroups.length - 1));
  const displayItems: Item[] = hasPaged
    ? [topLevelGroups[safeActivePage]]
    : items;

  const handleAddItem = (opt: FieldTypeOption) => {
    const key = `${opt.dataType ?? opt.itemType}${Date.now() % 10000}`;
    dispatch({
      type: 'definition.addItem',
      payload: {
        key,
        type: opt.itemType,
        dataType: opt.dataType,
        label: opt.label,
        ...opt.extra,
      },
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

  const formTitle = (definition as any)?.title;
  const formUrl = (definition as any)?.url;
  const formVersion = (definition as any)?.version;
  const formPresentation = (definition as any)?.formPresentation || {};
  const defaultCurrency = formPresentation.defaultCurrency;

  return (
    <div
      className="flex flex-col min-h-full max-w-[660px] mx-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) deselect();
      }}
      onContextMenu={handleContextMenu}
    >
      {/* Form metadata header */}
      {(formTitle || formUrl) && (
        <div className="px-7 pt-4 pb-3 border-b border-border bg-surface shrink-0">
          <div className="font-ui text-[15px] font-semibold tracking-tight text-ink leading-snug truncate">
            {formTitle || 'Untitled Form'}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10.5px] text-muted overflow-hidden">
            {formUrl && <span className="truncate min-w-0">{formUrl}</span>}
            {formVersion && <><span className="opacity-40 shrink-0">·</span><span className="shrink-0">v{formVersion}</span></>}
            {pageMode && <><span className="opacity-40 shrink-0">·</span><span className="shrink-0">{pageMode}</span></>}
            {defaultCurrency && <><span className="opacity-40 shrink-0">·</span><span className="shrink-0">{defaultCurrency}</span></>}
          </div>
        </div>
      )}

      {/* Page tabs — only when in paged mode */}
      {hasPaged && (
        <div className="px-7 border-b border-border bg-surface">
          <PageTabs activePage={safeActivePage} onPageChange={setActivePage} />
        </div>
      )}

      {/* Items list */}
      <div className="flex flex-col gap-1 px-7 pt-3 pb-20">
        <AddItemPalette
          open={showPicker}
          onClose={() => setShowPicker(false)}
          onAdd={handleAddItem}
        />
        {renderItems(displayItems, allBinds, selectedKey, select, 0, '')}
        <button
          data-testid="add-item"
          className="mt-3 w-full py-2.5 border border-dashed border-border rounded-[4px] font-mono text-[11.5px] text-muted hover:border-accent/50 hover:text-ink transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          onClick={() => setShowPicker(!showPicker)}
        >
          + Add Item
        </button>
      </div>

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
