export type FormulaTemplate = 'sum' | 'count' | 'average';

export interface ParsedFormulaTemplate {
    template: FormulaTemplate;
    field: string;
}

const TEMPLATE_TO_FN: Record<FormulaTemplate, string> = {
    sum: 'sum',
    count: 'count',
    average: 'avg',
};

export function buildFormulaTemplate(template: FormulaTemplate, field: string): string {
    const fn = TEMPLATE_TO_FN[template];
    return `${fn}($${field})`;
}

export function parseFormulaTemplate(expression: string): ParsedFormulaTemplate | null {
    const trimmed = expression.trim();
    if (!trimmed) return null;

    const match = trimmed.match(/^(sum|count|avg)\(\$([A-Za-z0-9_.\[*\]]+)\)$/);
    if (!match) return null;

    const [, fn, field] = match;
    const template: FormulaTemplate = fn === 'avg' ? 'average' : (fn as FormulaTemplate);
    return { template, field };
}
