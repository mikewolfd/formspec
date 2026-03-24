/** @filedesc Blueprint section rendering the interactive item tree with inline add-item palette support. */
import { useState, useCallback, useEffect } from 'react';
import { useDefinition } from '../../state/useDefinition';
import { useSelection } from '../../state/useSelection';
import { useActiveGroup } from '../../state/useActiveGroup';
import { useProject } from '../../state/useProject';
import { useCanvasTargets } from '../../state/useCanvasTargets';
import { FieldIcon } from '../ui/FieldIcon';
import { AddItemPalette, type FieldTypeOption } from '../AddItemPalette';

interface ItemNode {
  key: string;
  type: string;
  dataType?: string;
  label?: string;
  children?: ItemNode[];
  [k: string]: unknown;
}

let nextItemId = 1;
function uniqueKey(prefix: string): string {
  return `${prefix}${nextItemId++}`;
}

// ── Tree node (recursive item row) ──────────────────────────────────────

function TreeNode({
  item,
  depth,
  pathPrefix,
  onActivatePath,
}: {
  item: ItemNode;
  depth: number;
  pathPrefix: string;
  onActivatePath?: (path: string) => void;
}) {
  const { selectedKey, select } = useSelection();
  const { scrollToTarget } = useCanvasTargets();
  const fullPath = pathPrefix ? `${pathPrefix}.${item.key}` : item.key;
  const isSelected = selectedKey === fullPath;

  const icon = item.type === 'field' ? (
    <FieldIcon dataType={item.dataType || 'string'} className="text-[10px]" />
  ) : item.type === 'group' ? (
    <span className="text-[10px] opacity-50">▦</span>
  ) : (
    <span className="text-[10px] opacity-50 text-accent font-bold">ℹ</span>
  );

  const handleClick = () => {
    onActivatePath?.(fullPath);
    select(fullPath, item.type);
    requestAnimationFrame(() => {
      scrollToTarget(fullPath);
    });
  };

  return (
    <div className="flex flex-col">
      <button
        type="button"
        data-testid={`tree-item-${fullPath}`}
        className={`w-full flex items-center gap-1.5 px-2 py-1 text-[13px] text-left transition-all rounded-[3px] cursor-pointer ${
          isSelected
            ? 'bg-accent/10 text-accent font-medium border-l-2 border-accent'
            : 'text-ink hover:bg-subtle border-l-2 border-transparent'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        <span className="shrink-0 w-4 flex justify-center">{icon}</span>
        <span className="truncate flex-1">{item.label || item.key}</span>
        {item.type === 'group' && item.children && (
          <span className="text-[9px] text-muted ml-auto font-mono">
            {item.children.length}
          </span>
        )}
      </button>
      {item.children?.map((child) => (
        <TreeNode
          key={child.key}
          item={child}
          depth={depth + 1}
          pathPrefix={fullPath}
          onActivatePath={onActivatePath}
        />
      ))}
    </div>
  );
}

// ── Small inline "+" button ──────────────────────────────────────────

function AddButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="w-4 h-4 flex items-center justify-center rounded-[3px] text-muted hover:text-ink hover:bg-subtle transition-colors cursor-pointer text-[13px] leading-none"
    >
      +
    </button>
  );
}

// ── StructureTree ────────────────────────────────────────────────────

/**
 * Navigable structure sidebar.
 *
 * Two modes:
 * - **Paged form** (top-level groups exist): Wizard Pages nav selects the
 *   active page; Items shows only that page's children. One page is always
 *   active. Adding items goes inside the active page via `parentPath`.
 * - **Flat form** (no top-level groups): Items shows all root-level items.
 *   Adding items goes to the root.
 */
export function StructureTree() {
  const definition = useDefinition();
  const project = useProject();
  const { select } = useSelection();
  const { scrollToTarget } = useCanvasTargets();
  const { activeGroupKey, setActiveGroupKey } = useActiveGroup();
  const items = (definition.items ?? []) as ItemNode[];
  const [paletteOpen, setPaletteOpen] = useState(false);

  const presentation = definition.formPresentation ?? {};
  const isPaged = presentation.pageMode === 'wizard' || presentation.pageMode === 'tabs';

  // Pages = top-level groups (only if pageMode is enabled)
  const pages = isPaged ? items.filter((i) => i.type === 'group') : [];
  const hasPages = pages.length > 0;

  // Auto-select first page when pages appear / on first render
  useEffect(() => {
    if (hasPages) {
      // Keep current selection if it's still valid
      if (activeGroupKey && pages.some((p) => p.key === activeGroupKey)) return;
      setActiveGroupKey(pages[0].key);
    } else {
      setActiveGroupKey(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPages, pages.map((p) => p.key).join(',')]);

  const activeGroup = pages.find((p) => p.key === activeGroupKey) ?? null;
  const visibleItems = hasPages
    ? (activeGroup?.children ?? []) as ItemNode[]
    : items;

  // Selecting a wizard page: set local active page AND sync editor selection
  const handleSelectPage = useCallback(
    (key: string) => {
      setActiveGroupKey(key);
      select(key, 'group');
      requestAnimationFrame(() => {
        scrollToTarget(key);
      });
    },
    [scrollToTarget, select, setActiveGroupKey],
  );

  const handleActivatePath = useCallback((path: string) => {
    if (!hasPages) return;
    const [pageKey] = path.split('.');
    if (pageKey && pageKey !== activeGroupKey) {
      setActiveGroupKey(pageKey);
    }
  }, [activeGroupKey, hasPages, setActiveGroupKey]);

  // Adding a wizard page
  const handleAddPage = useCallback(() => {
    const result = project.addPage('New Page');
    const insertedPageKey = result.affectedPaths[0] ?? 'new_page';
    // Switch to the new page once it exists
    requestAnimationFrame(() => {
      setActiveGroupKey(insertedPageKey);
      select(insertedPageKey, 'group');
    });
  }, [project, select, setActiveGroupKey]);

  // Adding an item from the palette
  const handleAddFromPalette = useCallback(
    (opt: FieldTypeOption) => {
      const key = uniqueKey(opt.dataType ?? opt.itemType);
      const parentPath = hasPages && activeGroupKey ? activeGroupKey : undefined;
      const fullPath = parentPath ? `${parentPath}.${key}` : key;
      let insertedPath = fullPath;

      if (opt.itemType === 'field') {
        project.addField(key, opt.label, opt.dataType ?? 'string', {
          ...(parentPath ? { parentPath } : {}),
          ...(opt.extra as object | undefined),
        });
      } else if (opt.itemType === 'group') {
        project.addGroup(fullPath, opt.label);
      } else if (opt.itemType === 'display') {
        const widgetHint = (opt.extra?.presentation as Record<string, unknown> | undefined)?.widgetHint as string | undefined;
        const kindMap: Record<string, 'heading' | 'paragraph' | 'banner' | 'divider'> = {
          Heading: 'heading',
          Divider: 'divider',
          Banner: 'banner',
        };
        const kind = widgetHint ? kindMap[widgetHint] ?? 'paragraph' : 'paragraph';
        project.addContent(fullPath, opt.label, kind);
      } else {
        // layout items (Card, Columns, etc.) — add as component tree node
        project.addLayoutNode('root', opt.itemType);
      }

      select(insertedPath, opt.itemType);
    },
    [project, hasPages, activeGroupKey, select],
  );

  // Items section label
  const itemsSectionLabel = hasPages && activeGroup
    ? `${activeGroup.label || activeGroup.key}`
    : 'Items';

  return (
    <>
      <AddItemPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onAdd={handleAddFromPalette}
      />

      <div className="flex flex-col flex-1 overflow-y-auto space-y-4">
        {/* ── Pages ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-mono text-[10px] font-bold tracking-[0.15em] uppercase text-muted">
              Pages
            </h3>
            <AddButton onClick={handleAddPage} title="Add page" />
          </div>

          <div className="space-y-0.5">
            {pages.length === 0 ? (
              <div className="px-2 py-1 text-[12px] text-muted italic">No pages defined</div>
            ) : (
              pages.map((p, i) => {
                const isActive = activeGroupKey === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => handleSelectPage(p.key)}
                    className={`w-full flex items-center gap-2 px-2 py-1 text-[13px] rounded-[3px] cursor-pointer text-left transition-all ${
                      isActive
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-muted hover:text-ink hover:bg-subtle'
                    }`}
                  >
                    <span className={`font-mono text-[11px] w-4 text-center shrink-0 ${
                      isActive ? 'text-accent' : 'opacity-60'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="truncate">{p.label || p.key}</span>
                    {isActive && (
                      <span className="ml-auto text-[9px] text-accent/60 font-mono shrink-0">
                        active
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="h-px bg-border/50" />

        {/* ── Items (scoped to active page when paged) ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3
              className="font-mono text-[10px] font-bold tracking-[0.15em] uppercase text-muted truncate max-w-[75%]"
              title={itemsSectionLabel}
            >
              {itemsSectionLabel}
            </h3>
            <AddButton
              onClick={() => setPaletteOpen(true)}
              title={hasPages ? `Add item to ${activeGroup?.label || activeGroup?.key}` : 'Add item'}
            />
          </div>

          <div className="flex flex-col gap-px">
            {visibleItems.length === 0 ? (
              <div className="px-2 py-1 text-[12px] text-muted italic">
                {hasPages ? 'No items on this page' : 'No items defined'}
              </div>
            ) : (
              visibleItems.map((item) => (
                <TreeNode
                  key={item.key}
                  item={item}
                  depth={0}
                  pathPrefix={hasPages && activeGroupKey ? activeGroupKey : ''}
                  onActivatePath={handleActivatePath}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
