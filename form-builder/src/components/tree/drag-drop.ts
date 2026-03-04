import { signal } from '@preact/signals';
import { moveNode } from '../../logic/component-tree-ops';
import { componentDoc, setComponentDoc } from '../../state/project';

export const draggedPath = signal<string | null>(null);

export interface DropTarget {
  parentPath: string;
  insertIndex: number;
  mode: 'above' | 'below' | 'inside';
}

export const dropTarget = signal<DropTarget | null>(null);

export function executeDrop() {
  const src = draggedPath.value;
  const target = dropTarget.value;
  const doc = componentDoc.value;

  if (!src || !target || !doc) {
    draggedPath.value = null;
    dropTarget.value = null;
    return;
  }

  const newTree = moveNode(doc.tree, src, target.parentPath, target.insertIndex);
  setComponentDoc({ ...doc, tree: newTree });

  draggedPath.value = null;
  dropTarget.value = null;
}
