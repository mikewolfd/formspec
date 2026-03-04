import { type Signal, signal } from '@preact/signals';
import type { FormspecItem } from 'formspec-engine';
import { assembledDefinition, definition, definitionVersion, setDefinition } from '../../state/definition';
import { componentDoc, componentVersion, setComponentDoc } from '../../state/project';
import { selectedPath } from '../../state/selection';
import { classifyNode, getNodeLabel, parentPath, childIndex } from '../../logic/component-tree';
import { removeNode } from '../../logic/component-tree-ops';
import { removeBoundItem } from '../../logic/component-def-sync';
import { draggedPath, dropTarget, executeDrop } from './drag-drop';
import type { ComponentNode, NodeKind } from '../../types';

const NODE_KIND_COLORS: Record<NodeKind, string> = {
  layout: '#5A8FBB',
  'bound-input': '#D4A34A',
  'bound-display': '#706C68',
  group: '#5AAFBB',
  'structure-only': '#888',
};

const CONTAINER_KINDS = new Set<NodeKind>(['layout', 'group']);

const expandedByPath = new Map<string, Signal<boolean>>();

function expansionSignal(path: string): Signal<boolean> {
  const existing = expandedByPath.get(path);
  if (existing) return existing;
  const created = signal(true);
  expandedByPath.set(path, created);
  return created;
}

interface UnifiedTreeNodeProps {
  node: ComponentNode;
  path: string;
  depth: number;
}

export function UnifiedTreeNode({ node, path, depth }: UnifiedTreeNodeProps) {
  definitionVersion.value;
  componentVersion.value;

  const kind = classifyNode(node);
  const label = getNodeLabel(node, definition.value.items);
  const selected = selectedPath.value === path;
  const hasChildren = (node.children?.length ?? 0) > 0;
  const canContain = CONTAINER_KINDS.has(kind);
  const expanded = (hasChildren || canContain) ? expansionSignal(path) : null;
  const isDragging = draggedPath.value === path;

  // Resolve bound definition item for badge info
  const boundItem = node.bind ? findDefItem(node.bind) : null;

  // Compute drop indicator class
  const pPath = parentPath(path);
  const idx = childIndex(path);
  const dt = dropTarget.value;
  let dropClass = '';
  if (dt && draggedPath.value && draggedPath.value !== path) {
    if (dt.mode === 'above' && dt.parentPath === pPath && dt.insertIndex === idx) {
      dropClass = 'drop-above';
    } else if (dt.mode === 'below' && dt.parentPath === pPath && dt.insertIndex === idx + 1) {
      dropClass = 'drop-below';
    } else if (dt.mode === 'inside' && dt.parentPath === path) {
      dropClass = 'drop-inside';
    }
  }

  function handleDragOver(event: DragEvent) {
    const dragged = draggedPath.value;
    if (!dragged || dragged === path || path.startsWith(dragged + '.')) return;
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = event.clientY - rect.top;
    const upper = rect.height * 0.3;
    const lower = rect.height * 0.7;

    // Middle zone → drop inside (only if container)
    if (canContain && offsetY > upper && offsetY < lower) {
      dropTarget.value = { parentPath: path, insertIndex: node.children?.length ?? 0, mode: 'inside' };
      return;
    }

    // Upper half → above
    if (offsetY <= rect.height / 2) {
      dropTarget.value = { parentPath: pPath, insertIndex: idx, mode: 'above' };
      return;
    }

    // Lower half → below
    dropTarget.value = { parentPath: pPath, insertIndex: idx + 1, mode: 'below' };
  }

  return (
    <div
      class={`tree-node-wrapper ${dropClass}`}
      data-depth={depth}
      onDragOver={handleDragOver}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        executeDrop();
      }}
    >
      {depth > 0 && <div class="tree-depth-line" style={{ left: `${depth * 24 - 12}px` }} />}

      <div
        class={`tree-node ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => {
          selectedPath.value = path;
        }}
        role="treeitem"
        aria-selected={selected}
        aria-expanded={hasChildren ? expanded?.value : undefined}
        aria-level={depth + 2}
        tabIndex={0}
      >
        <span
          class="tree-node-grip"
          aria-hidden="true"
          draggable
          onDragStart={(event) => {
            event.dataTransfer?.setData('text/plain', path);
            event.dataTransfer!.effectAllowed = 'move';
            draggedPath.value = path;
          }}
          onDragEnd={() => {
            draggedPath.value = null;
            dropTarget.value = null;
          }}
        >
          ⠿
        </span>

        {hasChildren && (
          <button
            class="tree-node-toggle"
            onClick={(event) => {
              event.stopPropagation();
              if (expanded) expanded.value = !expanded.value;
            }}
            aria-label={expanded?.value ? 'Collapse' : 'Expand'}
          >
            <span
              style={{
                transform: expanded?.value ? 'rotate(90deg)' : 'none',
                display: 'inline-block',
                transition: 'transform var(--duration-normal) var(--ease-out)',
              }}
            >
              ▸
            </span>
          </button>
        )}

        <span
          class="tree-node-dot"
          style={{ background: NODE_KIND_COLORS[kind] }}
          aria-hidden="true"
        />

        <span class="tree-node-label">{label}</span>

        {boundItem && (
          <span class="tree-node-key">{boundItem.key}</span>
        )}

        <span class="tree-node-badge" style={{ color: NODE_KIND_COLORS[kind] }}>
          {boundItem?.dataType || node.component}
        </span>

        {boundItem?.required && (
          <span class="tree-node-bind" title="Required">R</span>
        )}
        {boundItem?.calculate && (
          <span class="tree-node-bind" title="Calculated">C</span>
        )}
        {boundItem?.constraint && (
          <span class="tree-node-bind" title="Constraint">V</span>
        )}
        {(boundItem?.relevant || node.when) && (
          <span class="tree-node-bind" title="Conditional">⚡</span>
        )}

        {boundItem?.$ref && (
          <span class="tree-ref-badge">linked</span>
        )}

        <span class="tree-node-actions">
          <button
            class="tree-action tree-action-danger"
            title="Delete"
            onClick={(event) => {
              event.stopPropagation();
              deleteNode(path, node);
            }}
          >
            ×
          </button>
        </span>
      </div>

      {hasChildren && expanded?.value && (
        <div role="group">
          {node.children!.map((child, index) => (
            <UnifiedTreeNode
              key={`${path}.${index}`}
              node={child}
              path={`${path}.${index}`}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {boundItem?.$ref && !hasChildren && expanded?.value !== false && (
        <RefChildren itemKey={node.bind!} depth={depth + 1} />
      )}
    </div>
  );
}

function deleteNode(path: string, node: ComponentNode) {
  const doc = componentDoc.value;
  if (!doc) return;

  // Remove from component tree
  const newTree = removeNode(doc.tree, path);
  setComponentDoc({ ...doc, tree: newTree });

  // Remove bound definition item if applicable
  if (node.bind) {
    const newDef = removeBoundItem(definition.value, node.bind);
    setDefinition(newDef);
  }

  // Clear selection if deleted node was selected
  if (selectedPath.value === path || selectedPath.value?.startsWith(path + '.')) {
    selectedPath.value = null;
  }
}

function findDefItem(key: string): FormspecItem | null {
  return findDeep(definition.value.items, key);
}

function findDeep(items: FormspecItem[], key: string): FormspecItem | null {
  for (const item of items) {
    if (item.key === key) return item;
    if (item.children) {
      const found = findDeep(item.children, key);
      if (found) return found;
    }
  }
  return null;
}

function RefChildren({ itemKey, depth }: { itemKey: string; depth: number }) {
  const assembled = assembledDefinition.value;
  if (!assembled) return null;
  const group = findDeep(assembled.items, itemKey);
  if (!group?.children) return null;
  return (
    <>
      {group.children.map((child) => (
        <div
          key={child.key}
          class="tree-ref-child"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          <span class="tree-node-dot" style={{ background: '#888', opacity: 0.5 }} />
          <span class="tree-node-label" style={{ opacity: 0.6 }}>{child.label || child.key}</span>
        </div>
      ))}
    </>
  );
}
