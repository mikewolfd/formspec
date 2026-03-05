import { type FormspecItem } from 'formspec-engine';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { definition, updateBind, findItemByKey, findBindByPath } from '../../state/definition';
import { buildSimpleCondition, conditionFromField, normalizeRequiredExpression, parseSimpleCondition, type ConditionOperator } from '../../logic/condition-builder';
import { buildFormulaTemplate, parseFormulaTemplate, type FormulaTemplate } from '../../logic/formula-builder';
import { FelExpressionInput } from '../properties/fel-expression-input';
import { FelHelper } from '../properties/fel-helper';

const OPERATOR_LABELS: Array<{ value: ConditionOperator; label: string }> = [
    { value: '=', label: 'equals' },
    { value: '!=', label: 'not equal' },
    { value: '>', label: 'greater than' },
    { value: '>=', label: 'greater or equal' },
    { value: '<', label: 'less than' },
    { value: '<=', label: 'less or equal' },
];

function collectFieldKeys(items: FormspecItem[], acc: string[] = []): string[] {
    for (const candidate of items) {
        if (candidate.type === 'field') {
            acc.push(candidate.key);
        }
        if (candidate.children?.length) {
            collectFieldKeys(candidate.children, acc);
        }
    }
    return acc;
}

export function BehaviorSection({
    item,
    inspectorMode = 'advanced',
    showHeader = true,
}: {
    item: FormspecItem;
    inspectorMode?: 'simple' | 'advanced';
    showHeader?: boolean;
}) {
    const pathResult = findItemByKey(item.key);
    const path = pathResult?.path || item.key;

    const bind = (findBindByPath(definition.value, path) || {}) as any;

    const relevantValue = (bind.relevant ?? item.relevant ?? '') as string;
    const calculateValue = (bind.calculate ?? item.calculate ?? '') as string;

    const resolveProp = (p: any) => {
        if (typeof p === 'boolean') return p ? 'true' : '';
        return p || '';
    };

    const requiredValue = normalizeRequiredExpression(resolveProp(bind.required ?? item.required));
    const readonlyValue = resolveProp(bind.readonly ?? item.readonly);

    const fieldKeys = useMemo(
        () => collectFieldKeys(definition.value.items).filter((key) => key !== item.key),
        [definition.value, item.key],
    );

    const relevantParsed = parseSimpleCondition(relevantValue);
    const requiredParsed = parseSimpleCondition(requiredValue);
    const parsedFormula = parseFormulaTemplate(calculateValue);
    const [formulaField, setFormulaField] = useState<string>('');

    const [showRelevantExpression, setShowRelevantExpression] = useState(Boolean(relevantValue) && !relevantParsed);
    const [showRequiredExpression, setShowRequiredExpression] = useState(Boolean(requiredValue) && !requiredParsed && requiredValue !== 'true');

    useEffect(() => {
        setShowRelevantExpression(Boolean(relevantValue) && !parseSimpleCondition(relevantValue));
    }, [path, relevantValue]);

    useEffect(() => {
        setShowRequiredExpression(Boolean(requiredValue) && !parseSimpleCondition(requiredValue) && requiredValue !== 'true');
    }, [path, requiredValue]);

    useEffect(() => {
        if (parsedFormula?.field) {
            setFormulaField(parsedFormula.field);
            return;
        }
        if (fieldKeys[0]) setFormulaField(fieldKeys[0]);
    }, [path, parsedFormula?.field, fieldKeys]);

    return (
        <div class="properties-content">
            {showHeader && (
                <div class="section-header">
                    <div class="section-title">Behavior</div>
                    <FelHelper />
                </div>
            )}

            <ConditionProperty
                label="Show when"
                mode="relevant"
                expression={relevantValue}
                parsed={relevantParsed}
                fields={fieldKeys}
                expressionMode={showRelevantExpression}
                onExpressionModeChange={setShowRelevantExpression}
                onValueChange={(val) => updateBind(path, { relevant: val })}
            />

            <ConditionProperty
                label="Required when"
                mode="required"
                expression={requiredValue}
                parsed={requiredParsed}
                fields={fieldKeys}
                expressionMode={showRequiredExpression}
                onExpressionModeChange={setShowRequiredExpression}
                onValueChange={(val) => updateBind(path, { required: val })}
            />

            <FormulaTemplateProperty
                fields={fieldKeys}
                selectedField={formulaField}
                onFieldChange={setFormulaField}
                onApply={(template) => {
                    if (!formulaField) return;
                    updateBind(path, { calculate: buildFormulaTemplate(template, formulaField) });
                }}
            />

            {inspectorMode === 'advanced' && (
                <>
                    <div class="property-row">
                        <label class="property-label">Read Only (FEL)</label>
                        <FelExpressionInput
                            value={(readonlyValue as string) || ''}
                            placeholder="FEL expression"
                            onValueChange={(val) => updateBind(path, { readonly: val })}
                        />
                    </div>
                    <div class="property-row">
                        <label class="property-label">Calculate (FEL)</label>
                        <FelExpressionInput
                            value={(calculateValue as string) || ''}
                            placeholder="FEL expression"
                            onValueChange={(val) => updateBind(path, { calculate: val })}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

function FormulaTemplateProperty({
    fields,
    selectedField,
    onFieldChange,
    onApply,
}: {
    fields: string[];
    selectedField: string;
    onFieldChange: (field: string) => void;
    onApply: (template: FormulaTemplate) => void;
}) {
    return (
        <div class="property-row property-row-logic-builder">
            <label class="property-label">Calculate Template</label>
            <div class="logic-builder-row">
                <button
                    class="btn-ghost logic-builder-create"
                    disabled={!selectedField}
                    onClick={() => onApply('sum')}
                >
                    Sum
                </button>
                <button
                    class="btn-ghost logic-builder-create"
                    disabled={!selectedField}
                    onClick={() => onApply('count')}
                >
                    Count
                </button>
                <button
                    class="btn-ghost logic-builder-create"
                    disabled={!selectedField}
                    onClick={() => onApply('average')}
                >
                    Average
                </button>
                <select
                    class="studio-select logic-builder-field"
                    value={selectedField}
                    onChange={(event) => onFieldChange((event.target as HTMLSelectElement).value)}
                >
                    {fields.length === 0 && <option value="">No fields available</option>}
                    {fields.map((field) => (
                        <option key={field} value={field}>{field}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}

function ConditionProperty({
    label,
    mode,
    expression,
    parsed,
    fields,
    expressionMode,
    onExpressionModeChange,
    onValueChange,
}: {
    label: string;
    mode: 'relevant' | 'required';
    expression: string;
    parsed: ReturnType<typeof parseSimpleCondition>;
    fields: string[];
    expressionMode: boolean;
    onExpressionModeChange: (value: boolean) => void;
    onValueChange: (value: string) => void;
}) {
    const normalizedExpression = expression.trim();
    const isAlwaysRequired = mode === 'required' && normalizedExpression === 'true';

    if (!expressionMode && !parsed && !normalizedExpression) {
        const firstField = fields[0] ?? '';
        return (
            <div class="property-row property-row-logic-builder">
                <label class="property-label">{label}</label>
                <div class="logic-builder-empty">
                    <button
                        class="btn-ghost logic-builder-create"
                        onClick={() => {
                            if (!firstField) return;
                            onValueChange(buildSimpleCondition(conditionFromField(firstField)));
                        }}
                    >
                        Add condition
                    </button>
                    <button
                        class="btn-ghost logic-builder-mode"
                        onClick={() => onExpressionModeChange(true)}
                    >
                        Edit as FEL
                    </button>
                </div>
            </div>
        );
    }

    if (!expressionMode && isAlwaysRequired) {
        return (
            <div class="property-row property-row-logic-builder">
                <label class="property-label">{label}</label>
                <div class="logic-builder-empty">
                    <span class="logic-builder-static">Always required</span>
                    <button
                        class="btn-ghost logic-builder-mode"
                        onClick={() => {
                            const firstField = fields[0] ?? '';
                            if (!firstField) return;
                            onValueChange(buildSimpleCondition(conditionFromField(firstField)));
                        }}
                    >
                        Switch to condition
                    </button>
                    <button
                        class="btn-ghost logic-builder-mode"
                        onClick={() => onExpressionModeChange(true)}
                    >
                        Edit as FEL
                    </button>
                </div>
            </div>
        );
    }

    if (!expressionMode && parsed) {
        const currentValue = parsed.valueKind === 'null' ? '' : parsed.value;

        return (
            <div class="property-row property-row-logic-builder">
                <label class="property-label">{label}</label>
                <div class="logic-builder-row">
                    <select
                        class="studio-select logic-builder-field"
                        value={parsed.field}
                        onChange={(event) => {
                            const next = {
                                ...parsed,
                                field: (event.target as HTMLSelectElement).value,
                            };
                            onValueChange(buildSimpleCondition(next));
                        }}
                    >
                        {fields.map((fieldKey) => (
                            <option key={fieldKey} value={fieldKey}>{fieldKey}</option>
                        ))}
                    </select>

                    <select
                        class="studio-select logic-builder-op"
                        value={parsed.operator}
                        onChange={(event) => {
                            const next = {
                                ...parsed,
                                operator: (event.target as HTMLSelectElement).value as ConditionOperator,
                            };
                            onValueChange(buildSimpleCondition(next));
                        }}
                    >
                        {OPERATOR_LABELS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>

                    <input
                        class="studio-input logic-builder-value"
                        value={currentValue}
                        placeholder="value"
                        onInput={(event) => {
                            const nextRaw = (event.target as HTMLInputElement).value;
                            const kind = parsed.valueKind === 'null' ? 'string' : parsed.valueKind;
                            const next = {
                                ...parsed,
                                value: nextRaw,
                                valueKind: kind,
                            };
                            onValueChange(buildSimpleCondition(next));
                        }}
                    />

                    <button
                        class="btn-ghost logic-builder-mode"
                        onClick={() => onExpressionModeChange(true)}
                    >
                        FEL
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div class="property-row property-row-logic-builder">
            <label class="property-label">{label}</label>
            <div class="logic-builder-expression">
                <FelExpressionInput
                    value={expression}
                    placeholder="$field = 'value'"
                    onValueChange={onValueChange}
                />
                <button
                    class="btn-ghost logic-builder-mode"
                    disabled={!parsed}
                    title={parsed ? 'Switch to visual builder' : 'Expression is too complex for visual mode'}
                    onClick={() => {
                        if (!parsed) return;
                        onExpressionModeChange(false);
                    }}
                >
                    Visual
                </button>
            </div>
        </div>
    );
}
