export type ConditionOperator = '=' | '!=' | '>' | '>=' | '<' | '<=';

export interface SimpleCondition {
    field: string;
    operator: ConditionOperator;
    value: string;
    valueKind: 'string' | 'number' | 'boolean' | 'null';
}

const OPERATORS: ConditionOperator[] = ['=', '!=', '>', '>=', '<', '<='];
const SIMPLE_EXPR_RE = /^\$([A-Za-z0-9_.\[*\]]+)\s*(=|!=|>|>=|<|<=)\s*(.+)$/;

export function parseSimpleCondition(expression: string): SimpleCondition | null {
    const trimmed = expression.trim();
    if (!trimmed) return null;

    const match = trimmed.match(SIMPLE_EXPR_RE);
    if (!match) return null;

    const [, field, operatorRaw, rawValue] = match;
    if (!OPERATORS.includes(operatorRaw as ConditionOperator)) return null;

    const valueToken = rawValue.trim();
    if (!valueToken) return null;

    if (/^'.*'$/.test(valueToken) || /^".*"$/.test(valueToken)) {
        const unquoted = valueToken.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
        return { field, operator: operatorRaw as ConditionOperator, value: unquoted, valueKind: 'string' };
    }

    if (/^(true|false)$/i.test(valueToken)) {
        return { field, operator: operatorRaw as ConditionOperator, value: valueToken.toLowerCase(), valueKind: 'boolean' };
    }

    if (/^null$/i.test(valueToken)) {
        return { field, operator: operatorRaw as ConditionOperator, value: 'null', valueKind: 'null' };
    }

    if (/^-?\d+(\.\d+)?$/.test(valueToken)) {
        return { field, operator: operatorRaw as ConditionOperator, value: valueToken, valueKind: 'number' };
    }

    return null;
}

export function buildSimpleCondition(condition: SimpleCondition): string {
    const lhs = `$${condition.field}`;

    if (condition.valueKind === 'number') {
        return `${lhs} ${condition.operator} ${condition.value}`;
    }

    if (condition.valueKind === 'boolean' || condition.valueKind === 'null') {
        return `${lhs} ${condition.operator} ${condition.value}`;
    }

    const escaped = condition.value.replace(/'/g, "\\'");
    return `${lhs} ${condition.operator} '${escaped}'`;
}

export function conditionFromField(field: string): SimpleCondition {
    return {
        field,
        operator: '=',
        value: '',
        valueKind: 'string',
    };
}

export function normalizeRequiredExpression(expression: string): string {
    const trimmed = expression.trim().toLowerCase();
    if (trimmed === 'true' || trimmed === 'true()') return 'true';
    if (trimmed === 'false' || trimmed === 'false()') return '';
    return expression;
}
