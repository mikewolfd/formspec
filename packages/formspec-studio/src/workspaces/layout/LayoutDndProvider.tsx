/** @filedesc DnD wrapper for the Layout canvas — reorders component tree nodes. */
import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { DragDropProvider, KeyboardSensor, PointerSensor } from '@dnd-kit/react';
import { LayoutDragContext } from './LayoutDragContext';
import { PointerActivationConstraints, type DragStartEvent as DndDragStartEvent, type DragEndEvent as DndDragEndEvent } from '@dnd-kit/dom';
import { useProject } from '../../state/useProject';
import { useSelection } from '../../state/useSelection';
import { isCircularComponentMove, type CompNode, type Project } from '@formspec-org/studio-core';

const LAYOUT_TAB = 'layout';

interface LayoutDndProviderProps {
  children: ReactNode;
  activePageId?: string | null;
}

type NodeRef = { bind?: string; nodeId?: string };

/** Parent of the node matching `ref`, or `null` if the match is the tree root, or `undefined` if not found. */
export function findParentOfNodeRef(
  tree: CompNode | undefined,
  ref: NodeRef,
): CompNode | null | undefined {
  if (!tree) return undefined;
  if (!ref.nodeId && !ref.bind) return undefined;

  const walk = (node: CompNode | undefined, parent: CompNode | null): CompNode | null | undefined => {
    if (!node) return undefined;
    const matches =
      (ref.nodeId != null && node.nodeId === ref.nodeId) || (ref.bind != null && node.bind === ref.bind);
    if (matches) return parent;
    for (const child of node.children ?? []) {
      const hit = walk(child, node);
      if (hit !== undefined) return hit;
    }
    return undefined;
  };

  return walk(tree, null);
}

function nodeMatchesRef(node: CompNode, ref: NodeRef): boolean {
  return (ref.nodeId != null && node.nodeId === ref.nodeId) || (ref.bind != null && node.bind === ref.bind);
}

/**
 * Indices of `sourceRef` and `targetRef` among their shared parent's `children`, or `null` if they are not siblings.
 * Used when sortable placement is absent — drag `data` does not carry list indices.
 */
export function siblingIndicesForTreeReorder(
  tree: CompNode | undefined,
  sourceRef: NodeRef,
  targetRef: NodeRef,
): { sourceIndex: number; targetIndex: number } | null {
  const parent = findParentOfNodeRef(tree, sourceRef);
  if (parent === undefined || parent === null) return null;
  if (findParentOfNodeRef(tree, targetRef) !== parent) return null;

  const children = parent.children ?? [];
  let sourceIndex = -1;
  let targetIndex = -1;
  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;
    if (nodeMatchesRef(child, sourceRef)) sourceIndex = i;
    if (nodeMatchesRef(child, targetRef)) targetIndex = i;
  }
  if (sourceIndex < 0 || targetIndex < 0) return null;
  return { sourceIndex, targetIndex };
}

/** Returns whether two node refs refer to siblings (same parent) in the component tree. */
export function areComponentNodeSiblings(tree: CompNode | undefined, a: NodeRef, b: NodeRef): boolean {
  if (!tree) return false;
  if ((!a.nodeId && !a.bind) || (!b.nodeId && !b.bind)) return false;

  const pa = findParentOfNodeRef(tree, a);
  const pb = findParentOfNodeRef(tree, b);
  if (pa === undefined || pb === undefined) return false;
  if (pa === null && pb === null) return false;
  if (pa == null || pb == null) return false;
  return pa === pb;
}
type UnassignedItemData = { key: string; label: string; itemType: 'field' | 'group' | 'display' };
type DragStartPayload = Parameters<DndDragStartEvent>[0];
type DragEndPayload = Parameters<DndDragEndEvent>[0];

function isUnassignedItemData(data: unknown): data is UnassignedItemData {
  return !!data && typeof data === 'object' && 'key' in data && 'label' in data && 'itemType' in data;
}

/**
 * Pure handler: place a tray item onto the canvas.
 * Unassigned items already exist in the definition — re-bind with {@link Project.placeOnPage}
 * instead of {@link Project.addItemToLayout} (which would call `addField` and throw on duplicate keys).
 * Exported for unit testing.
 */
export function handleTrayDrop(
  project: Project,
  item: UnassignedItemData,
  activePageId: string | null,
): void {
  if (project.itemAt(item.key)) {
    project.placeOnPage(item.key, activePageId ?? 'root');
    return;
  }

  project.addItemToLayout(
    { itemType: item.itemType, label: item.label, key: item.key },
    activePageId ?? undefined,
  );
}

/**
 * Pure handler: reorder a component tree node via project.reorderComponentNode.
 * Direction is determined by the caller (source before/after target).
 * Exported for unit testing.
 */
export function handleTreeReorder(
  project: Project,
  sourceRef: NodeRef,
  _targetRef: NodeRef,
  direction: 'up' | 'down',
): void {
  project.reorderComponentNode(sourceRef, direction);
}

/**
 * Pure handler: spatial reorder — move sourceRef to a specific insert index within a container.
 * Used when the user drops into a Grid/Stack slot at a known position.
 * Exported for unit testing.
 */
export function handleSpatialDrop(
  project: Project,
  sourceRef: NodeRef,
  targetParent: { bind?: string; nodeId?: string },
  insertIndex: number,
): void {
  project.moveComponentNodeToIndex(sourceRef, targetParent, insertIndex);
}

/**
 * Pure handler: drop-into-container — move sourceRef to be the last child of targetContainerId.
 * Used when the user drops directly onto a container (not onto a sibling slot).
 * Exported for unit testing.
 */
export function handleContainerDrop(
  project: Project,
  sourceRef: NodeRef,
  targetParent: { bind?: string; nodeId?: string },
): void {
  project.moveComponentNodeToContainer(sourceRef, targetParent);
}

/** Final sibling list placement from @dnd-kit sortable (after drag). */
export interface SortablePlacementPayload {
  group: string | number;
  index: number;
  initialGroup?: string | number;
  initialIndex?: number;
}

/**
 * Maps a layout canvas sortable `group` id to a `component.moveNode` target parent ref.
 *
 * Encoding (must stay in sync with `render-tree.tsx`):
 * - `bind:<definitionKey>` — parent container has no `nodeId`; move targets `{ bind: definitionKey }`.
 * - Any other non-empty string — layout `nodeId` (`'root'`, page ids, stack/grid ids, etc.); move targets `{ nodeId }`.
 * Do not use a layout `nodeId` whose value starts with `bind:` unless it is intentionally the bind encoding above.
 */
export function layoutSortGroupToTargetParent(group: string | number): { nodeId?: string; bind?: string } | null {
  const g = String(group);
  if (!g) return null;
  if (g.startsWith('bind:')) return { bind: g.slice('bind:'.length) };
  return { nodeId: g };
}

/**
 * Parses @dnd-kit `operation.source` after a sortable drag — `index` / `group` may live on the source
 * or under `source.sortable`. Exported for contract tests; `LayoutDndProvider` uses this on drag end.
 */
export function extractSortablePlacement(raw: unknown): SortablePlacementPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const data = s.data as Record<string, unknown> | undefined;
  // Layout canvas registers sortable items with this marker; tray/editor drags must not hit this path.
  if (data?.type !== 'tree-node') return null;
  const nested = s.sortable as Record<string, unknown> | undefined;
  const index =
    typeof s.index === 'number'
      ? s.index
      : nested && typeof nested.index === 'number'
        ? nested.index
        : undefined;
  const group = s.group ?? nested?.group;
  if (index === undefined || group == null || group === '') return null;
  const initialIndex =
    typeof s.initialIndex === 'number'
      ? s.initialIndex
      : nested && typeof nested.initialIndex === 'number'
        ? nested.initialIndex
        : undefined;
  const initialGroup = (s.initialGroup ?? nested?.initialGroup) as string | number | undefined;
  return { group: group as string | number, index, initialGroup, initialIndex };
}

/** Normalized event shape used by handleDragEnd (pure, testable). */
export interface DragEndEvent {
  canceled: boolean;
  source: { id: string; data: Record<string, unknown> };
  target: { id: string; data: Record<string, unknown> } | null | undefined;
  sortablePlacement?: SortablePlacementPayload | null;
}

/**
 * Pure handler: routes a drag-end event to the appropriate project method.
 * Exported for unit testing — the LayoutDndProvider wires dnd-kit events to this.
 */
export function handleDragEnd(
  project: Project,
  event: DragEndEvent,
  activePageId: string | null,
  selectFn: (key: string, itemType: string, opts: { tab: string }) => void,
): void {
  if (event.canceled) return;

  const sourceId = String(event.source?.id ?? '');
  if (!sourceId) return;

  const sourceData = event.source?.data ?? {};
  const targetData = event.target?.data ?? {};
  const targetId = String(event.target?.id ?? '');
  const componentTree = project.component.tree as CompNode | undefined;

  // Tray-to-canvas: unassigned item dragged onto the tree
  if (sourceData.type === 'unassigned-item' && isUnassignedItemData(sourceData)) {
    handleTrayDrop(project, sourceData, activePageId);

    const traySourceRef: NodeRef = { bind: sourceData.key };

    // If the tray item was dropped on a container or spatial slot, place it there.
    if (targetData.type === 'insert-slot' && targetData.containerId) {
      const targetParent = { nodeId: String(targetData.containerId) };
      if (!isCircularComponentMove(componentTree, traySourceRef, targetParent)) {
        handleSpatialDrop(project, traySourceRef, targetParent, Number(targetData.insertIndex ?? 0));
      }
    } else if (targetData.type === 'container-drop' && targetData.nodeRef) {
      const containerRef = targetData.nodeRef as { nodeId?: string; bind?: string };
      if (containerRef.nodeId || containerRef.bind) {
        if (!isCircularComponentMove(componentTree, traySourceRef, containerRef)) {
          handleContainerDrop(project, traySourceRef, containerRef);
        }
      }
    }

    selectFn(sourceData.key, sourceData.itemType, { tab: LAYOUT_TAB });
    return;
  }

  // Component-tree node drop
  const sourceRef: NodeRef | undefined = sourceData.nodeRef as NodeRef | undefined;
  if (!sourceRef) return;

  // Spatial insert-slot drop: target carries { type: 'insert-slot', containerId, insertIndex }
  if (targetData.type === 'insert-slot' && targetData.containerId) {
    const targetParent = { nodeId: String(targetData.containerId) };
    if (!isCircularComponentMove(componentTree, sourceRef, targetParent)) {
      handleSpatialDrop(project, sourceRef, targetParent, Number(targetData.insertIndex ?? 0));
    }
    return;
  }

  // Container drop: target carries { type: 'container-drop', nodeRef } — places as last child
  if (targetData.type === 'container-drop' && targetData.nodeRef) {
    const containerRef = targetData.nodeRef as { nodeId?: string; bind?: string };
    if (containerRef.nodeId || containerRef.bind) {
      if (!isCircularComponentMove(componentTree, sourceRef, containerRef)) {
        handleContainerDrop(project, sourceRef, containerRef);
      }
      return;
    }
  }

  // Sortable list placement (layout canvas — same mechanism as @dnd-kit helpers `move()` for grouped lists).
  const placement = event.sortablePlacement;
  if (placement) {
    const targetParent = layoutSortGroupToTargetParent(placement.group);
    if (targetParent) {
      const ig = placement.initialGroup;
      const ii = placement.initialIndex;
      const unchanged =
        ig !== undefined && ii !== undefined && String(ig) === String(placement.group) && ii === placement.index;
      if (!unchanged && !isCircularComponentMove(componentTree, sourceRef, targetParent)) {
        handleSpatialDrop(project, sourceRef, targetParent, placement.index);
      }
    }
    return;
  }

  // Fallback: sibling reorder when sortable placement is missing — derive order from the component tree, not drag `data`
  // (sortable items omit `index` in `data`; see FieldBlock / LayoutContainer).
  if (!targetId || sourceId === targetId) return;

  const targetRef: NodeRef | undefined = targetData.nodeRef as NodeRef | undefined;
  if (!targetRef || !areComponentNodeSiblings(componentTree, sourceRef, targetRef)) return;

  const indices = siblingIndicesForTreeReorder(componentTree, sourceRef, targetRef);
  if (!indices) return;

  const { sourceIndex, targetIndex } = indices;
  const direction: 'up' | 'down' = sourceIndex > targetIndex ? 'up' : 'down';
  handleTreeReorder(project, sourceRef, targetRef, direction);
}

/**
 * DnD provider for the Layout workspace.
 *
 * Handles two drag types:
 * 1. Component-tree node reordering (drag a node to reorder among siblings)
 * 2. Tray-to-canvas (drag an unassigned item onto the canvas to bind it)
 *
 * We do not mount DragOverlay from @dnd-kit/react: it registers with the Feedback plugin and
 * steals the default drag preview; an empty or mistimed overlay then looks like “no feedback”.
 * In-canvas items use `isDragSource` styling from `useSortable`; insert slots show drop targets while dragging.
 */
export function LayoutDndProvider({ children, activePageId = null }: LayoutDndProviderProps) {
  const project = useProject();
  const { select } = useSelection();
  const [layoutDragActive, setLayoutDragActive] = useState(false);
  /** Pending setTimeout(0) ids from drag-end — all cleared on unmount (avoids setState after unmount). */
  const pendingDragEndTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const t of pendingDragEndTimeoutsRef.current) {
        clearTimeout(t);
      }
      pendingDragEndTimeoutsRef.current = [];
    };
  }, []);

  const onDragStart = useCallback((_event: DragStartPayload) => {
    // Always activate layout drop UI for any drag in this provider. Tray `useDraggable` sources may not
    // expose `operation.source.id` the same frame/shape as `useSortable`, but insert slots still must render.
    setLayoutDragActive(true);
  }, []);

  const onDragEnd = useCallback((event: DragEndPayload) => {
    const source = event.operation?.source;
    const target = event.operation?.target;
    const sortablePlacement = extractSortablePlacement(source);
    const dragEndPayload: DragEndEvent = {
      canceled: !!event.canceled,
      source: source ? { id: String(source.id ?? ''), data: source.data ?? {} } : { id: '', data: {} },
      target: target ? { id: String(target.id ?? ''), data: target.data ?? {} } : null,
      sortablePlacement,
    };
    // Defer past the current task, then two animation frames: @dnd-kit + browser paint can still touch
    // the DOM after setTimeout(0); React commits that reorder the tree in the same frame cause
    // removeChild NotFoundError. Double rAF runs the project update after layout/paint boundaries.
    // Do not cancel a prior pending task here — two drag ends in quick succession must both apply.
    const timeoutId = setTimeout(() => {
      pendingDragEndTimeoutsRef.current = pendingDragEndTimeoutsRef.current.filter((x) => x !== timeoutId);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!mountedRef.current) return;
          setLayoutDragActive(false);
          handleDragEnd(project, dragEndPayload, activePageId, (key, itemType, opts) =>
            select(key, itemType, opts),
          );
        });
      });
    }, 0);
    pendingDragEndTimeoutsRef.current.push(timeoutId);
  }, [project, select, activePageId]);

  return (
    <DragDropProvider
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      sensors={() => [
        PointerSensor.configure({
          activationConstraints: [
            new PointerActivationConstraints.Distance({ value: 5 }),
          ],
        }),
        KeyboardSensor.configure({}),
      ]}
    >
      <LayoutDragContext.Provider value={{ isDragActive: layoutDragActive }}>
        {children}
      </LayoutDragContext.Provider>
    </DragDropProvider>
  );
}
