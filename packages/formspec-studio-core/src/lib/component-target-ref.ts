/** @filedesc Resolve layout selection targets to component tree node refs. */
import { isLayoutId, nodeIdFromLayoutId } from '../authoring-helpers.js';

/** Resolve a layout selection target or path to a component node ref. */
export function componentTargetRef(target: string): { bind: string } | { nodeId: string } {
  if (isLayoutId(target)) {
    return { nodeId: nodeIdFromLayoutId(target) };
  }
  const leafKey = target.split('.').pop()!;
  return { bind: leafKey };
}
