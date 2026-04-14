/** Tests for the canonical component tree traversal helpers. */
import { describe, it, expect } from 'vitest';
import type { CompNode } from '../src/layout-helpers.js';
import {
  findComponentNodeById,
  findComponentNodeByRef,
  treeContainsRef,
  findParentOfNodeRef,
  findParentRefOfNodeRef,
} from '../src/tree-utils.js';

// Fixture: root → page → [card → text field, stack → email]
function makeTree(): CompNode {
  return {
    component: 'Root',
    nodeId: 'root',
    children: [
      {
        component: 'Page',
        nodeId: 'page_1',
        children: [
          {
            component: 'Card',
            nodeId: 'card_1',
            children: [
              { component: 'TextInput', bind: 'name' },
            ],
          },
          {
            component: 'Stack',
            bind: 'section',
            children: [
              { component: 'TextInput', bind: 'email' },
            ],
          },
        ],
      },
    ],
  };
}

describe('findComponentNodeById', () => {
  it('finds the root by nodeId', () => {
    expect(findComponentNodeById(makeTree(), 'root')?.component).toBe('Root');
  });

  it('finds a deep node by nodeId', () => {
    expect(findComponentNodeById(makeTree(), 'card_1')?.component).toBe('Card');
  });

  it('returns null when no match', () => {
    expect(findComponentNodeById(makeTree(), 'missing')).toBeNull();
  });

  it('returns null when tree is undefined', () => {
    expect(findComponentNodeById(undefined, 'x')).toBeNull();
  });
});

describe('findComponentNodeByRef', () => {
  it('resolves by nodeId', () => {
    expect(findComponentNodeByRef(makeTree(), { nodeId: 'card_1' })?.component).toBe('Card');
  });

  it('resolves by bind', () => {
    expect(findComponentNodeByRef(makeTree(), { bind: 'email' })?.bind).toBe('email');
  });

  it('returns null when neither nodeId nor bind is supplied', () => {
    expect(findComponentNodeByRef(makeTree(), {})).toBeNull();
  });

  it('returns null when the ref does not match', () => {
    expect(findComponentNodeByRef(makeTree(), { nodeId: 'nope' })).toBeNull();
  });
});

describe('treeContainsRef', () => {
  it('is true for a bind anywhere in the subtree', () => {
    expect(treeContainsRef(makeTree(), { bind: 'email' })).toBe(true);
  });

  it('is true for a nodeId', () => {
    expect(treeContainsRef(makeTree(), { nodeId: 'card_1' })).toBe(true);
  });

  it('is true for the root itself', () => {
    expect(treeContainsRef(makeTree(), { nodeId: 'root' })).toBe(true);
  });

  it('is false for a missing ref', () => {
    expect(treeContainsRef(makeTree(), { bind: 'absent' })).toBe(false);
  });
});

describe('findParentOfNodeRef', () => {
  it('returns the parent node for a deep match', () => {
    const tree = makeTree();
    const parent = findParentOfNodeRef(tree, { bind: 'email' });
    expect(parent?.bind).toBe('section');
  });

  it('returns null when the match is the root', () => {
    expect(findParentOfNodeRef(makeTree(), { nodeId: 'root' })).toBeNull();
  });

  it('returns undefined when nothing matches', () => {
    expect(findParentOfNodeRef(makeTree(), { bind: 'nope' })).toBeUndefined();
  });

  it('returns undefined when tree is undefined', () => {
    expect(findParentOfNodeRef(undefined, { bind: 'x' })).toBeUndefined();
  });
});

describe('findParentRefOfNodeRef', () => {
  it('prefers nodeId when the parent has one', () => {
    // parent of 'name' is card_1, which has a nodeId
    expect(findParentRefOfNodeRef(makeTree(), { bind: 'name' })).toEqual({ nodeId: 'card_1' });
  });

  it('falls back to bind when the parent has no nodeId', () => {
    // parent of 'email' is the Stack with bind='section' and no nodeId
    expect(findParentRefOfNodeRef(makeTree(), { bind: 'email' })).toEqual({ bind: 'section' });
  });

  it('returns null when the match is the root', () => {
    expect(findParentRefOfNodeRef(makeTree(), { nodeId: 'root' })).toBeNull();
  });

  it('returns null when no match', () => {
    expect(findParentRefOfNodeRef(makeTree(), { bind: 'missing' })).toBeNull();
  });
});
