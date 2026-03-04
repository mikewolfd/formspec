import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "preact/jsx-runtime";
import { updateDefinition, findItemByKey } from '../../state/definition';
export function ValidationSection({ item }) {
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
    return (_jsxs(_Fragment, { children: [_jsx("div", { class: "section-title", children: "Validation" }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Constraint (FEL)" }), _jsx("input", { class: "studio-input studio-input-mono", value: item.constraint || '', placeholder: "FEL expression", onInput: (e) => updateField('constraint', e.target.value) })] }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Validation Message" }), _jsx("input", { class: "studio-input", value: item.message || '', placeholder: "Error message shown on constraint failure", onInput: (e) => updateField('message', e.target.value) })] })] }));
}
