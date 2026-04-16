/** @filedesc Pure helpers for editor definition-tree drag-and-drop (flatten paths, resolve parent index). */
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { ElementDragPayload } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { FormItem } from '@formspec-org/types';
import { finalIndexFromRowEdge, postRemovalIndexForFinalIndex } from '../shared/reorder-insert-index';
import { isRecord } from '../shared/runtime-guards';

export const EDITOR_PDND_KIND = 'definition-tree-editor';

export type EditorPdndSourceData = {
  kind: typeof EDITOR_PDND_KIND;
  id: string;
  sortGroup: string;
  sortIndex: number;
  initialSortGroup: string;
  initialSortIndex: number;
};

export type EditorPdndRowData = {
  kind: typeof EDITOR_PDND_KIND;
  id: string;
  sortGroup: string;
  sortIndex: number;
};

export type PragmaticMonitorDropPayload = {
  source: ElementDragPayload;
  location: {
    current: { dropTargets: { element: Element; data: Record<string, unknown> }[] };
  };
};

/** Flatten definition items into `{ path, parentPath }` entries (skips display-only rows). */
export function flattenEditorItemPaths(items: FormItem[], parentPath: string): { path: string; parentPath: string }[] {
  const result: { path: string; parentPath: string }[] = [];
  for (const item of items) {
    if (item.type === 'display') continue;
    const path = parentPath ? `${parentPath}.${item.key}` : item.key;
    result.push({ path, parentPath });
    if (item.type === 'group' && item.children) {
      result.push(...flattenEditorItemPaths(item.children, path));
    }
  }
  return result;
}

/** Resolve a path to its sibling index within its parent's children. */
export function indexInParent(
  items: FormItem[],
  path: string,
): { siblings: FormItem[]; index: number } | null {
  const segments = path.split('.');
  const key = segments[segments.length - 1];

  if (segments.length === 1) {
    const index = items.findIndex(i => i.key === key);
    return index >= 0 ? { siblings: items, index } : null;
  }

  let current = items;
  for (let i = 0; i < segments.length - 1; i++) {
    const parent = current.find(item => item.key === segments[i]);
    if (!parent || parent.type !== 'group' || !parent.children) return null;
    current = parent.children;
  }
  const index = current.findIndex(i => i.key === key);
  return index >= 0 ? { siblings: current, index } : null;
}

/**
 * Sibling list and index among **non-display** items only — matches `ItemListEditor` `sortIndex` / editor drag ordering.
 */
export function renderableSiblingInfo(
  items: FormItem[],
  path: string,
): { siblings: FormItem[]; index: number } | null {
  const full = indexInParent(items, path);
  if (!full) return null;
  const rend = full.siblings.filter(i => i.type !== 'display');
  const key = path.split('.').pop()!;
  const index = rend.findIndex(i => i.key === key);
  if (index < 0) return null;
  return { siblings: rend, index };
}

/**
 * Maps a Pragmatic drop to `moveItem` args, or `null` if the drop should be ignored.
 * Preserves the prior rule: only reorder within the same parent list.
 */
export function mapEditorPragmaticDrop(
  items: FormItem[],
  payload: PragmaticMonitorDropPayload,
): { sourcePath: string; parentPath: string | undefined; targetIndex: number } | null {
  const { source, location } = payload;
  const sourceData = source.data;
  if (!isRecord(sourceData) || sourceData.kind !== EDITOR_PDND_KIND) return null;

  const sourcePath = String(sourceData.id ?? '');
  if (!sourcePath) return null;

  const targets = location.current.dropTargets;
  if (!targets.length) return null;

  const inner = targets[0].data;
  if (!isRecord(inner) || inner.kind !== EDITOR_PDND_KIND) return null;

  const targetPath = String(inner.id ?? '');
  if (!targetPath || targetPath === sourcePath) return null;

  const flat = flattenEditorItemPaths(items, '');
  const sourceEntry = flat.find(e => e.path === sourcePath);
  const targetEntry = flat.find(e => e.path === targetPath);
  if (!sourceEntry || !targetEntry) return null;
  if (sourceEntry.parentPath !== targetEntry.parentPath) return null;

  const parentPath = targetEntry.parentPath || undefined;

  const srcInfo = renderableSiblingInfo(items, sourcePath);
  const tgtInfo = renderableSiblingInfo(items, targetPath);
  if (!srcInfo || !tgtInfo) return null;

  const n = tgtInfo.siblings.length;
  const s = srcInfo.index;
  const rowIndex = tgtInfo.index;

  const edge = extractClosestEdge(inner) ?? 'bottom';
  const finalIndex = finalIndexFromRowEdge(rowIndex, edge, n);
  const targetIndex = postRemovalIndexForFinalIndex(n, s, finalIndex);

  return { sourcePath, parentPath, targetIndex };
}
