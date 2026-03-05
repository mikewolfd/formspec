import type { FormspecItem } from 'formspec-engine';

export interface SlashFieldTemplate {
    id: string;
    label: string;
    category: 'common' | 'structure' | 'display' | 'advanced';
    keywords: string[];
    itemFactory: (labelOverride?: string) => FormspecItem;
}

function toCamelCaseKey(text: string): string {
    const cleaned = text
        .toLowerCase()
        .replace(/[^a-z0-9]+(.)/g, (_, char: string) => char.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '');

    if (!cleaned) return 'field';
    return cleaned[0].toLowerCase() + cleaned.slice(1);
}

function collectKeys(items: FormspecItem[], acc = new Set<string>()): Set<string> {
    for (const item of items) {
        acc.add(item.key);
        if (item.children?.length) collectKeys(item.children, acc);
    }
    return acc;
}

export function deriveUniqueKey(items: FormspecItem[], label: string): string {
    const base = toCamelCaseKey(label);
    const used = collectKeys(items);
    if (!used.has(base)) return base;

    let n = 2;
    while (used.has(`${base}${n}`)) n += 1;
    return `${base}${n}`;
}

export function insertTopLevelItem(items: FormspecItem[], item: FormspecItem, index: number): FormspecItem[] {
    const next = [...items];
    const safeIndex = Math.max(0, Math.min(index, next.length));
    next.splice(safeIndex, 0, item);
    return next;
}

const choiceOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
];

function field(label: string, dataType: FormspecItem['dataType']): FormspecItem {
    const base: FormspecItem = {
        key: '',
        type: 'field',
        label,
        dataType,
    };
    if (dataType === 'choice' || dataType === 'multiChoice') {
        base.options = choiceOptions.map((opt) => ({ ...opt }));
    }
    return base;
}

export const SLASH_TEMPLATES: SlashFieldTemplate[] = [
    { id: 'short-answer', label: 'Short Answer', category: 'common', keywords: ['text', 'string', 'short', 'input'], itemFactory: (l) => field(l ?? 'Short Answer', 'string') },
    { id: 'long-answer', label: 'Long Answer', category: 'common', keywords: ['long', 'textarea', 'paragraph'], itemFactory: (l) => field(l ?? 'Long Answer', 'text') },
    { id: 'number', label: 'Number', category: 'common', keywords: ['integer', 'decimal', 'numeric'], itemFactory: (l) => field(l ?? 'Number', 'decimal') },
    { id: 'email', label: 'Email', category: 'common', keywords: ['mail', 'contact'], itemFactory: (l) => field(l ?? 'Email', 'string') },
    { id: 'date', label: 'Date', category: 'common', keywords: ['calendar'], itemFactory: (l) => field(l ?? 'Date', 'date') },
    { id: 'dropdown', label: 'Dropdown', category: 'common', keywords: ['select', 'choice', 'options'], itemFactory: (l) => field(l ?? 'Dropdown', 'choice') },
    { id: 'checkboxes', label: 'Checkboxes', category: 'common', keywords: ['multi', 'select', 'options'], itemFactory: (l) => field(l ?? 'Checkboxes', 'multiChoice') },
    { id: 'yes-no', label: 'Yes / No', category: 'common', keywords: ['boolean', 'toggle'], itemFactory: (l) => field(l ?? 'Yes / No', 'boolean') },
    { id: 'file-upload', label: 'File Upload', category: 'common', keywords: ['attachment', 'file'], itemFactory: (l) => field(l ?? 'File Upload', 'attachment') },
    {
        id: 'section',
        label: 'Section',
        category: 'structure',
        keywords: ['group', 'container'],
        itemFactory: (l) => ({ key: '', type: 'group', label: l ?? 'Section', children: [] }),
    },
    {
        id: 'repeating-group',
        label: 'Repeating Group',
        category: 'structure',
        keywords: ['repeat', 'array', 'list'],
        itemFactory: (l) => ({ key: '', type: 'group', label: l ?? 'Repeating Group', repeatable: true, minRepeat: 1, children: [] }),
    },
    {
        id: 'heading',
        label: 'Heading',
        category: 'display',
        keywords: ['title', 'display'],
        itemFactory: (l) => ({ key: '', type: 'display', label: l ?? 'Heading' }),
    },
    {
        id: 'instructions',
        label: 'Instructions',
        category: 'display',
        keywords: ['help', 'copy', 'description'],
        itemFactory: (l) => ({ key: '', type: 'display', label: l ?? 'Instructions' }),
    },
    { id: 'money', label: 'Money', category: 'advanced', keywords: ['currency', 'amount'], itemFactory: (l) => field(l ?? 'Money', 'money') },
    { id: 'slider', label: 'Slider', category: 'advanced', keywords: ['range'], itemFactory: (l) => field(l ?? 'Slider', 'decimal') },
];

export function filterSlashTemplates(query: string): SlashFieldTemplate[] {
    const q = query.trim().toLowerCase().replace(/^\//, '');
    if (!q) return SLASH_TEMPLATES;

    return SLASH_TEMPLATES.filter((template) => {
        if (template.label.toLowerCase().includes(q)) return true;
        if (template.id.includes(q)) return true;
        return template.keywords.some((kw) => kw.includes(q));
    });
}

export function createItemFromSlash(
    template: SlashFieldTemplate,
    currentItems: FormspecItem[],
): FormspecItem {
    const item = template.itemFactory(template.label);
    item.key = deriveUniqueKey(currentItems, item.label);
    return item;
}

export function hasLogic(bindLike: Record<string, unknown> | undefined, key: string): boolean {
    if (!bindLike) return false;
    const value = bindLike[key];
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'boolean') return value;
    return true;
}
