import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "preact/jsx-runtime";
import { updateDefinition, findItemByKey } from '../../state/definition';
export function BehaviorSection({ item }) {
    function updateField(field, value) {
        updateDefinition((def) => {
            const found = findItemByKey(item.key, def.items);
            if (!found)
                return;
            const draft = found.item;
            if (value === '' || value === null || value === undefined) {
                draft[field] = undefined;
                return;
            }
            draft[field] = value;
        });
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { class: "section-title", children: "Behavior" }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Relevant (FEL)" }), _jsx("input", { class: "studio-input studio-input-mono", value: item.relevant || '', placeholder: "true()", onInput: (e) => updateField('relevant', e.target.value) })] }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Required (FEL)" }), _jsx("input", { class: "studio-input studio-input-mono", value: typeof item.required === 'string' ? item.required : '', placeholder: "true() or FEL expression", onInput: (e) => updateField('required', e.target.value) })] }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Read Only (FEL)" }), _jsx("input", { class: "studio-input studio-input-mono", value: typeof item.readonly === 'string' ? item.readonly : '', placeholder: "FEL expression", onInput: (e) => updateField('readonly', e.target.value) })] }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Calculate (FEL)" }), _jsx("input", { class: "studio-input studio-input-mono", value: item.calculate || '', placeholder: "FEL expression", onInput: (e) => updateField('calculate', e.target.value) })] })] }));
}
