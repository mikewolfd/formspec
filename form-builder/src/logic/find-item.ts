import type { FormspecItem } from 'formspec-engine';

export function findItemByKey(
    key: string,
    items: FormspecItem[],
    prefix = '',
): { item: FormspecItem; siblings: FormspecItem[]; index: number; path: string } | null {
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const currentPath = prefix ? `${prefix}.${item.key}` : item.key;
        if (item.key === key) {
            return { item, siblings: items, index: i, path: currentPath };
        }
        if (item.children) {
            const found = findItemByKey(key, item.children, item.repeatable ? `${currentPath}[*]` : currentPath);
            if (found) return found;
        }
    }
    return null;
}
