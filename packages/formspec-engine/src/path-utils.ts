/** Basic tree item shape used by path traversal helpers. */
export interface TreeItemLike<T extends TreeItemLike<T> = any> {
  key: string;
  children?: T[];
}

/** Resolved mutable location of an item in a tree. */
export interface ItemLocation<T extends TreeItemLike<T>> {
  parent: T[];
  index: number;
  item: T;
}

/** Remove repeat indices/wildcards from a path segment (e.g. `lineItems[0]` -> `lineItems`). */
export function normalizePathSegment(segment: string): string {
  return segment.replace(/\[(?:\d+|\*)\]/g, '');
}

/** Normalize a dotted path by stripping repeat indices/wildcards from each segment. */
export function normalizeIndexedPath(path: string): string {
  if (!path) return path;
  return path
    .split('.')
    .map(normalizePathSegment)
    .filter(Boolean)
    .join('.');
}

/** Split a dotted path into normalized (index-free) segments. */
export function splitNormalizedPath(path: string): string[] {
  if (!path) return [];
  return normalizeIndexedPath(path).split('.').filter(Boolean);
}

/** Find an item at a dotted path in a nested item tree. */
export function itemAtPath<T extends TreeItemLike<T>>(items: T[], path: string): T | undefined {
  const parts = splitNormalizedPath(path);
  if (parts.length === 0) return undefined;

  let currentItems = items;
  for (let i = 0; i < parts.length; i++) {
    const found = currentItems.find(item => item.key === parts[i]);
    if (!found) return undefined;
    if (i === parts.length - 1) return found;
    if (!found.children) return undefined;
    currentItems = found.children;
  }
  return undefined;
}

/** Resolve the mutable parent/index/item triple for a dotted tree path. */
export function itemLocationAtPath<T extends TreeItemLike<T>>(items: T[], path: string): ItemLocation<T> | undefined {
  const parts = splitNormalizedPath(path);
  if (parts.length === 0) return undefined;

  let currentItems = items;
  for (let i = 0; i < parts.length - 1; i++) {
    const found = currentItems.find(item => item.key === parts[i]);
    if (!found?.children) return undefined;
    currentItems = found.children;
  }

  const index = currentItems.findIndex(item => item.key === parts[parts.length - 1]);
  if (index < 0) return undefined;

  return {
    parent: currentItems,
    index,
    item: currentItems[index],
  };
}
