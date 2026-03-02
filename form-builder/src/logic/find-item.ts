import type { FormspecItem } from 'formspec-engine';

export function findItemByKey(
  key: string,
  items: FormspecItem[],
): { item: FormspecItem; siblings: FormspecItem[]; index: number } | null {
  for (let i = 0; i < items.length; i += 1) {
    const candidate = items[i];
    if (candidate.key === key) {
      return { item: candidate, siblings: items, index: i };
    }
    if (candidate.children?.length) {
      const found = findItemByKey(key, candidate.children);
      if (found) {
        return found;
      }
    }
  }
  return null;
}
