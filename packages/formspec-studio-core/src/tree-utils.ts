/** @filedesc Canonical component tree traversal helpers (find node/parent by id, bind, or ref). */
import type { CompNode, NodeRef } from './layout-helpers.js';
export type { NodeRef };

/**
 * Depth-first search for a node by `nodeId`. Matches the root if it carries the id.
 * Returns `null` when no match is found (null-style matches the public surface).
 */
export function findComponentNodeById(
  tree: CompNode | undefined,
  nodeId: string,
): CompNode | null {
  if (!tree) return null;
  if (tree.nodeId === nodeId) return tree;
  for (const child of tree.children ?? []) {
    const found = findComponentNodeById(child, nodeId);
    if (found) return found;
  }
  return null;
}

/**
 * Depth-first search for a node by `nodeId` OR `bind`. If both are given, a match on
 * either field is accepted (nodeId checked first). Returns `null` when no match.
 */
export function findComponentNodeByRef(
  tree: CompNode | undefined,
  ref: NodeRef,
): CompNode | null {
  if (!tree || (!ref.bind && !ref.nodeId)) return null;
  if (ref.nodeId && tree.nodeId === ref.nodeId) return tree;
  if (ref.bind && tree.bind === ref.bind) return tree;
  for (const child of tree.children ?? []) {
    const found = findComponentNodeByRef(child, ref);
    if (found) return found;
  }
  return null;
}

/** True if any node in the subtree (including the root) matches `ref` by bind or nodeId. */
export function treeContainsRef(tree: CompNode | undefined, ref: NodeRef): boolean {
  return findComponentNodeByRef(tree, ref) !== null;
}

/**
 * Find the parent node of the node matching `ref`.
 *
 * Tri-state return distinguishes three meaningful cases:
 * - A `CompNode` — the parent containing the match.
 * - `null` — the match IS the root (no parent exists).
 * - `undefined` — nothing matched.
 */
export function findParentOfNodeRef(
  tree: CompNode | undefined,
  ref: NodeRef,
): CompNode | null | undefined {
  if (!tree) return undefined;
  if (!ref.nodeId && !ref.bind) return undefined;

  const walk = (node: CompNode | undefined, parent: CompNode | null): CompNode | null | undefined => {
    if (!node) return undefined;
    const matches =
      (ref.nodeId != null && node.nodeId === ref.nodeId) ||
      (ref.bind != null && node.bind === ref.bind);
    if (matches) return parent;
    for (const child of node.children ?? []) {
      const hit = walk(child, node);
      if (hit !== undefined) return hit;
    }
    return undefined;
  };

  return walk(tree, null);
}

/**
 * Parent expressed as a single-key ref — `{ nodeId }` when the parent has a stable id,
 * otherwise `{ bind }`. Returns `null` when the match IS the root, when nothing matches,
 * or when the parent has neither id nor bind.
 */
export function findParentRefOfNodeRef(
  tree: CompNode | undefined,
  ref: NodeRef,
): { nodeId: string } | { bind: string } | null {
  const parent = findParentOfNodeRef(tree, ref);
  if (!parent) return null;
  if (parent.nodeId) return { nodeId: parent.nodeId };
  if (parent.bind) return { bind: parent.bind };
  return null;
}
