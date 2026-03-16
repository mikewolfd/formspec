import type { ScaffoldResult } from './types.js';
import type { FormDefinition } from 'formspec-types';

export interface AppliedScaffold {
  definition: FormDefinition;
  traces: ScaffoldResult['traces'];
  issues: ScaffoldResult['issues'];
}

export interface DefinitionDiff {
  added: string[];
  removed: string[];
  modified: string[];
}

/**
 * Bridges AI adapter output into form definitions and computes diffs
 * between versions for highlighting changes in the preview.
 */
export class FormScaffolder {
  apply(result: ScaffoldResult): AppliedScaffold {
    return {
      definition: result.definition,
      traces: result.traces,
      issues: result.issues,
    };
  }

  diff(oldDef: FormDefinition, newDef: FormDefinition): DefinitionDiff {
    const oldItems = flattenItems(oldDef.items ?? []);
    const newItems = flattenItems(newDef.items ?? []);

    const oldKeys = new Set(oldItems.map(i => i.key));
    const newKeys = new Set(newItems.map(i => i.key));

    const added = [...newKeys].filter(k => !oldKeys.has(k));
    const removed = [...oldKeys].filter(k => !newKeys.has(k));

    const modified: string[] = [];
    const oldMap = new Map(oldItems.map(i => [i.key, i]));
    const newMap = new Map(newItems.map(i => [i.key, i]));

    for (const key of oldKeys) {
      if (!newKeys.has(key)) continue;
      const oldItem = oldMap.get(key)!;
      const newItem = newMap.get(key)!;
      if (!shallowEqual(oldItem, newItem)) {
        modified.push(key);
      }
    }

    return { added, removed, modified };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

interface FlatItem {
  key: string;
  [k: string]: unknown;
}

function flattenItems(items: any[]): FlatItem[] {
  const result: FlatItem[] = [];
  for (const item of items) {
    // Capture a shallow copy without children for comparison
    const { children, ...rest } = item;
    result.push(rest);
    if (children) result.push(...flattenItems(children));
  }
  return result;
}

function shallowEqual(a: FlatItem, b: FlatItem): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}
