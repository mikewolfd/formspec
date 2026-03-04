import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "preact/jsx-runtime";
import { updateDefinition, findItemByKey } from '../../state/definition';
import { componentDoc, setComponentDoc } from '../../state/project';
import { selectedPath } from '../../state/selection';
import { resolveNode } from '../../logic/component-tree';
import { updateNodeProps } from '../../logic/component-tree-ops';
export function IdentitySection({ item }) {
    function updateField(field, value) {
        updateDefinition((def) => {
            const found = findItemByKey(field === 'key' ? item.key : item.key, def.items);
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
    function handleKeyChange(newKey) {
        const oldKey = item.key;
        updateDefinition((def) => {
            const found = findItemByKey(oldKey, def.items);
            if (!found)
                return;
            found.item.key = newKey;
        });
        // Sync component tree bind
        const doc = componentDoc.value;
        const path = selectedPath.value;
        if (doc && path) {
            const node = resolveNode(doc.tree, path);
            if (node?.bind === oldKey) {
                const newTree = updateNodeProps(doc.tree, path, { bind: newKey });
                setComponentDoc({ ...doc, tree: newTree });
            }
        }
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { class: "section-title", children: "Identity" }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Key" }), _jsx("input", { class: "studio-input studio-input-mono", value: item.key, onInput: (e) => handleKeyChange(e.target.value) })] }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Label" }), _jsx("input", { class: "studio-input", value: item.label || '', onInput: (e) => updateField('label', e.target.value) })] }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Description" }), _jsx("input", { class: "studio-input", value: item.description || '', placeholder: "Optional description", onInput: (e) => updateField('description', e.target.value) })] }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Hint" }), _jsx("input", { class: "studio-input", value: item.hint || '', placeholder: "Hint text for users", onInput: (e) => updateField('hint', e.target.value) })] })] }));
}
