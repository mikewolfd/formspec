import { type FormspecItem } from 'formspec-engine';
import { definition, updateBind, findItemByKey, findBindByPath } from '../../state/definition';
import { FelExpressionInput } from '../properties/fel-expression-input';
import { FelHelper } from '../properties/fel-helper';

export function ValidationSection({ item }: { item: FormspecItem }) {
    // Determine canonical path
    const pathResult = findItemByKey(item.key);
    const path = pathResult?.path || item.key;

    // Resolve current bind properties
    const bind = (findBindByPath(definition.value, path) || {}) as any;

    // Fallback to inline item properties (migration support)
    const constraintValue = bind.constraint ?? item.constraint ?? '';
    const messageValue = bind.constraintMessage ?? item.message ?? '';

    return (
        <div class="properties-content">
            <div class="section-header">
                <div class="section-title">Validation</div>
                <FelHelper />
            </div>
            <div class="property-row">
                <label class="property-label">Constraint (FEL)</label>
                <FelExpressionInput
                    value={(constraintValue as string) || ''}
                    placeholder="FEL expression"
                    onValueChange={(val) => updateBind(path, { constraint: val })}
                />
            </div>
            <div class="property-row">
                <label class="property-label">Validation Message</label>
                <input
                    class="studio-input"
                    value={(messageValue as string) || ''}
                    placeholder="Error message shown on constraint failure"
                    onInput={(e) => updateBind(path, { constraintMessage: (e.target as HTMLInputElement).value })}
                />
            </div>
        </div>
    );
}
