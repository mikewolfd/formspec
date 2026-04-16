/** @filedesc Tests Pragmatic layout index helper — matches `component.moveNode` remove-then-insert semantics. */
import { describe, expect, it } from 'vitest';
import { postRemovalIndexForFinalIndex } from '../../../src/workspaces/shared/reorder-insert-index';

function assertMove(n: number, from: number, toFinal: number): void {
  const pos = postRemovalIndexForFinalIndex(n, from, toFinal);
  const arr = Array.from({ length: n }, (_, i) => i);
  const [v] = arr.splice(from, 1);
  arr.splice(pos, 0, v);
  expect(arr.indexOf(v)).toBe(toFinal);
}

describe('postRemovalIndexForFinalIndex', () => {
  it('covers small n exhaustively', () => {
    for (let n = 1; n <= 5; n++) {
      for (let from = 0; from < n; from++) {
        for (let toFinal = 0; toFinal < n; toFinal++) {
          assertMove(n, from, toFinal);
        }
      }
    }
  });
});
