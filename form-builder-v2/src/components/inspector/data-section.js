import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "preact/jsx-runtime";
import { updateDefinition, findItemByKey } from '../../state/definition';
export function DataSection({ item }) {
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
    const isChoice = item.dataType === 'choice' || item.dataType === 'multiChoice';
    const rawOptions = item.options;
    const options = Array.isArray(rawOptions) ? rawOptions : [];
    function addOption() {
        updateDefinition((def) => {
            const found = findItemByKey(item.key, def.items);
            if (!found)
                return;
            const draft = found.item;
            const current = Array.isArray(draft.options) ? draft.options : [];
            draft.options = [...current, { value: '', label: '' }];
        });
    }
    function updateOption(index, field, val) {
        updateDefinition((def) => {
            const found = findItemByKey(item.key, def.items);
            if (!found)
                return;
            const draft = found.item;
            const current = draft.options ?? [];
            draft.options = current.map((opt, i) => (i === index ? { ...opt, [field]: val } : opt));
        });
    }
    function removeOption(index) {
        updateDefinition((def) => {
            const found = findItemByKey(item.key, def.items);
            if (!found)
                return;
            const draft = found.item;
            const current = draft.options ?? [];
            draft.options = current.filter((_, i) => i !== index);
        });
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { class: "section-title", children: "Data" }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Data Type" }), _jsxs("select", { class: "studio-select", value: item.dataType || 'string', onChange: (e) => updateField('dataType', e.target.value), children: [_jsx("option", { value: "string", children: "string" }), _jsx("option", { value: "text", children: "text" }), _jsx("option", { value: "integer", children: "integer" }), _jsx("option", { value: "decimal", children: "decimal" }), _jsx("option", { value: "boolean", children: "boolean" }), _jsx("option", { value: "date", children: "date" }), _jsx("option", { value: "dateTime", children: "dateTime" }), _jsx("option", { value: "time", children: "time" }), _jsx("option", { value: "choice", children: "choice" }), _jsx("option", { value: "multiChoice", children: "multiChoice" }), _jsx("option", { value: "money", children: "money" }), _jsx("option", { value: "uri", children: "uri" }), _jsx("option", { value: "attachment", children: "attachment" })] })] }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Placeholder" }), _jsx("input", { class: "studio-input", value: String(item.placeholder ?? ''), placeholder: "Placeholder text", onInput: (e) => updateField('placeholder', e.target.value) })] }), isChoice && (_jsxs("div", { class: "options-editor", children: [_jsx("div", { class: "section-title", children: "Options" }), options.map((opt, i) => (_jsxs("div", { class: "option-row", children: [_jsx("input", { class: "studio-input studio-input-mono", value: opt.value, placeholder: "value", "aria-label": `Option ${i + 1} value`, onInput: (e) => updateOption(i, 'value', e.target.value) }), _jsx("input", { class: "studio-input", value: opt.label ?? '', placeholder: "label", "aria-label": `Option ${i + 1} label`, onInput: (e) => updateOption(i, 'label', e.target.value) }), _jsx("button", { class: "btn-ghost option-remove-btn", "aria-label": `Remove option ${i + 1}`, onClick: () => removeOption(i), children: "\u2715" })] }, i))), _jsx("button", { class: "tree-add-btn", onClick: addOption, children: "+ Add Option" })] }))] }));
}
