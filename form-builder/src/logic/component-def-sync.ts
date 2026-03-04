import type { FormspecDefinition, FormspecItem } from 'formspec-engine';
import type { AddPickerEntry, ComponentNode } from '../types';
import { resolveNode } from './component-tree';

/** Generate a unique camelCase key from a label. */
export function generateUniqueKey(label: string, definition: FormspecDefinition): string {
  const base = label
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => (i === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase()))
    .join('');

  const keyBase = base || 'item';
  const allKeys = collectAllKeys(definition.items);
  if (!allKeys.has(keyBase)) return keyBase;

  let counter = 2;
  while (allKeys.has(`${keyBase}${counter}`)) counter++;
  return `${keyBase}${counter}`;
}

function collectAllKeys(items: FormspecItem[]): Set<string> {
  const keys = new Set<string>();
  for (const item of items) {
    keys.add(item.key);
    if (item.children) {
      for (const k of collectAllKeys(item.children)) keys.add(k);
    }
  }
  return keys;
}

/** Find which definition group a component tree parent corresponds to. */
export function findGroupForNode(
  tree: ComponentNode,
  parentPath: string,
  definition: FormspecDefinition,
): string | null {
  const parentNode = resolveNode(tree, parentPath);
  if (!parentNode?.bind) return null;

  // Check if the bind points to a group in the definition
  const item = findItemDeep(definition.items, parentNode.bind);
  if (item?.type === 'group') return parentNode.bind;

  return null;
}

/** Add a definition item when a bound component is added. */
export function addBoundItem(
  definition: FormspecDefinition,
  tree: ComponentNode,
  parentPath: string,
  key: string,
  label: string,
  entry: AddPickerEntry,
): FormspecDefinition {
  const result = structuredClone(definition);

  const newItem: FormspecItem = {
    key,
    label,
    type: entry.definitionType ?? 'field',
    ...(entry.defaultDataType ? { dataType: entry.defaultDataType } : {}),
    ...(entry.definitionType === 'group' ? { children: [] } : {}),
  } as FormspecItem;

  // Find which group to insert into
  const groupKey = findGroupForNode(tree, parentPath, definition);

  if (groupKey) {
    const group = findItemDeep(result.items, groupKey);
    if (group && group.children) {
      group.children.push(newItem);
    }
  } else {
    result.items.push(newItem);
  }

  return result;
}

/** Remove a definition item when a bound component is deleted. */
export function removeBoundItem(
  definition: FormspecDefinition,
  bindKey: string,
): FormspecDefinition {
  const result = structuredClone(definition);
  removeItemDeep(result.items, bindKey);
  return result;
}

function findItemDeep(items: FormspecItem[], key: string): FormspecItem | null {
  for (const item of items) {
    if (item.key === key) return item;
    if (item.children) {
      const found = findItemDeep(item.children, key);
      if (found) return found;
    }
  }
  return null;
}

function removeItemDeep(items: FormspecItem[], key: string): boolean {
  for (let i = 0; i < items.length; i++) {
    if (items[i].key === key) {
      items.splice(i, 1);
      return true;
    }
    if (items[i].children && removeItemDeep(items[i].children!, key)) {
      return true;
    }
  }
  return false;
}
