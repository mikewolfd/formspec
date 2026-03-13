import { nodeRefFor, type FlatEntry } from '../../../lib/tree-helpers';

export interface DropAction {
  type: 'component.moveNode' | 'definition.moveItem';
  payload: Record<string, unknown>;
}

export interface DropTarget {
  kind: 'component' | 'definition';
  parentPath: string | null;
  index: number;
  rawIndex: number;
  actions: DropAction[];
}

export type DropPosition = 'above' | 'below' | 'inside';

/** True if childPath is a dot-separated descendant of parentPath. */
export function isDescendantOf(childPath: string, parentPath: string, flatList?: FlatEntry[]): boolean {
  if (flatList) {
    let currentParent = parentIdOf(childPath, flatList);
    while (currentParent) {
      if (currentParent === parentPath) return true;
      currentParent = parentIdOf(currentParent, flatList);
    }
    return false;
  }

  return childPath.startsWith(parentPath + '.');
}

function parentOfDefPath(path: string | null): string | null {
  if (!path) return null;
  const lastDot = path.lastIndexOf('.');
  return lastDot === -1 ? null : path.substring(0, lastDot);
}

function entryIndex(id: string, flatList: FlatEntry[]): number {
  return flatList.findIndex((entry) => entry.id === id);
}

function entryById(id: string, flatList: FlatEntry[]): FlatEntry | undefined {
  return flatList.find((entry) => entry.id === id);
}

function parentIndex(childIndex: number, flatList: FlatEntry[]): number {
  const childDepth = flatList[childIndex]?.depth;
  if (childDepth == null || childDepth === 0) return -1;

  for (let index = childIndex - 1; index >= 0; index -= 1) {
    if (flatList[index].depth === childDepth - 1) return index;
  }

  return -1;
}

function parentEntryOf(id: string, flatList: FlatEntry[]): FlatEntry | null {
  const childIndex = entryIndex(id, flatList);
  if (childIndex === -1) return null;
  const index = parentIndex(childIndex, flatList);
  return index === -1 ? null : flatList[index];
}

function parentIdOf(id: string, flatList: FlatEntry[]): string | null {
  return parentEntryOf(id, flatList)?.id ?? null;
}

function directChildren(parentId: string | null, flatList: FlatEntry[]): FlatEntry[] {
  if (parentId === null) {
    return flatList.filter((entry) => entry.depth === 0);
  }

  const parentFlatIndex = entryIndex(parentId, flatList);
  if (parentFlatIndex === -1) return [];

  const parentDepth = flatList[parentFlatIndex].depth;
  const children: FlatEntry[] = [];

  for (let index = parentFlatIndex + 1; index < flatList.length; index += 1) {
    const entry = flatList[index];
    if (entry.depth <= parentDepth) break;
    if (entry.depth === parentDepth + 1) {
      children.push(entry);
    }
  }

  return children;
}

function siblingIndex(id: string, parentId: string | null, flatList: FlatEntry[]): number {
  return directChildren(parentId, flatList).findIndex((entry) => entry.id === id);
}

function definitionSiblings(parentPath: string | null, flatList: FlatEntry[]): FlatEntry[] {
  return flatList.filter((entry) => entry.defPath && parentOfDefPath(entry.defPath) === parentPath);
}

function definitionSiblingIndex(defPath: string, parentPath: string | null, flatList: FlatEntry[]): number {
  return definitionSiblings(parentPath, flatList).findIndex((entry) => entry.defPath === defPath);
}

function definitionChildCount(parentPath: string | null, flatList: FlatEntry[]): number {
  return definitionSiblings(parentPath, flatList).length;
}

function resolveComponentTarget(
  overEntry: FlatEntry,
  position: DropPosition,
  flatList: FlatEntry[],
): { parentId: string | null; rawIndex: number } | null {
  if (position === 'inside') {
    if (overEntry.category !== 'group' && overEntry.category !== 'layout') return null;
    return {
      parentId: overEntry.id,
      rawIndex: directChildren(overEntry.id, flatList).length,
    };
  }

  const parentId = parentIdOf(overEntry.id, flatList);
  const overIndex = siblingIndex(overEntry.id, parentId, flatList);
  if (overIndex === -1) return null;

  return {
    parentId,
    rawIndex: position === 'above' ? overIndex : overIndex + 1,
  };
}

function resolveDefinitionTarget(
  overEntry: FlatEntry,
  position: DropPosition,
  flatList: FlatEntry[],
): { parentPath: string | null; rawIndex: number } | null {
  if (position === 'inside') {
    if (overEntry.category !== 'group' || !overEntry.defPath) return null;
    return {
      parentPath: overEntry.defPath,
      rawIndex: definitionChildCount(overEntry.defPath, flatList),
    };
  }

  if (!overEntry.defPath) return null;

  const parentPath = parentOfDefPath(overEntry.defPath);
  const overIndex = definitionSiblingIndex(overEntry.defPath, parentPath, flatList);
  if (overIndex === -1) return null;

  return {
    parentPath,
    rawIndex: position === 'above' ? overIndex : overIndex + 1,
  };
}

function adjustedIndex(sourceIndex: number, rawIndex: number): number {
  return sourceIndex !== -1 && sourceIndex < rawIndex ? rawIndex - 1 : rawIndex;
}

export function computeDropTarget(
  activePath: string,
  overPath: string,
  position: DropPosition,
  flatList: FlatEntry[],
  selectedPaths?: Set<string>,
): DropTarget | null {
  // Self-drop
  if (activePath === overPath) return null;

  // Circular guard: can't drop into own descendant
  if (isDescendantOf(overPath, activePath, flatList)) return null;

  // Multi-select circular guard
  if (selectedPaths) {
    for (const sp of selectedPaths) {
      if (isDescendantOf(overPath, sp, flatList)) return null;
    }
  }

  const sourceEntry = entryById(activePath, flatList);
  const overEntry = entryById(overPath, flatList);
  if (!sourceEntry || !overEntry) return null;

  const componentTarget = resolveComponentTarget(overEntry, position, flatList);
  if (!componentTarget) return null;

  const sourceComponentParent = parentIdOf(activePath, flatList);
  const sourceComponentIndex = siblingIndex(activePath, sourceComponentParent, flatList);
  const componentIndex = sourceComponentParent === componentTarget.parentId
    ? adjustedIndex(sourceComponentIndex, componentTarget.rawIndex)
    : componentTarget.rawIndex;

  const componentParentEntry = componentTarget.parentId ? entryById(componentTarget.parentId, flatList) : null;
  const requiresComponentMove = sourceEntry.category === 'layout'
    || overEntry.category === 'layout'
    || componentParentEntry?.category === 'layout';

  if (!requiresComponentMove && sourceEntry.defPath) {
    const definitionTarget = resolveDefinitionTarget(overEntry, position, flatList);
    if (!definitionTarget) return null;

    const sourceParentPath = parentOfDefPath(sourceEntry.defPath);
    const sourceDefinitionIndex = definitionSiblingIndex(sourceEntry.defPath, sourceParentPath, flatList);
    const definitionIndex = sourceParentPath === definitionTarget.parentPath
      ? adjustedIndex(sourceDefinitionIndex, definitionTarget.rawIndex)
      : definitionTarget.rawIndex;

    if (sourceDefinitionIndex === definitionIndex && sourceParentPath === definitionTarget.parentPath) {
      return null;
    }

    return {
      kind: 'definition',
      parentPath: definitionTarget.parentPath,
      index: definitionIndex,
      rawIndex: definitionTarget.rawIndex,
      actions: [{
        type: 'definition.moveItem',
        payload: {
          sourcePath: sourceEntry.defPath,
          ...(definitionTarget.parentPath != null ? { targetParentPath: definitionTarget.parentPath } : {}),
          targetIndex: definitionIndex,
        },
      }],
    };
  }

  if (sourceComponentIndex === componentIndex && sourceComponentParent === componentTarget.parentId) {
    return null;
  }

  return {
    kind: 'component',
    parentPath: componentTarget.parentId,
    index: componentIndex,
    rawIndex: componentTarget.rawIndex,
    actions: [{
      type: 'component.moveNode',
      payload: {
        source: nodeRefFor(sourceEntry),
        targetParent: componentParentEntry ? nodeRefFor(componentParentEntry) : { nodeId: 'root' },
        targetIndex: componentIndex,
      },
    }],
  };
}

export function buildSequentialMoveCommands(
  sortedPaths: string[],
  targetParentPath: string | null,
  rawTargetIndex: number,
  flatList: FlatEntry[],
): { type: string; payload: Record<string, any> }[] {
  // Get sibling paths in the target parent for simulation
  const siblings = definitionSiblings(targetParentPath, flatList)
    .map((entry) => entry.defPath!)
    .filter(Boolean);

  // Simulate moves sequentially
  const sim = [...siblings];
  let currentTarget = rawTargetIndex;
  const commands: { type: string; payload: Record<string, any> }[] = [];

  for (const sourcePath of sortedPaths) {
    const sourceIdx = sim.indexOf(sourcePath);
    const sameParent = sourceIdx !== -1;

    let effectiveTarget = currentTarget;
    if (sameParent && sourceIdx < currentTarget) {
      effectiveTarget = currentTarget - 1;
    }

    const payload: Record<string, any> = { sourcePath, targetIndex: effectiveTarget };
    if (targetParentPath != null) {
      payload.targetParentPath = targetParentPath;
    }
    commands.push({ type: 'definition.moveItem', payload });

    // Simulate: remove from old position (if same parent), insert at effective target
    if (sameParent) {
      sim.splice(sourceIdx, 1);
    }
    sim.splice(effectiveTarget, 0, sourcePath);

    // Next item goes after this one
    currentTarget = effectiveTarget + 1;
  }

  return commands;
}
