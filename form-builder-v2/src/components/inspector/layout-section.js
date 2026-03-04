import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { componentDoc, setComponentDoc } from '../../state/project';
import { updateNodeProps } from '../../logic/component-tree-ops';
export function LayoutSection({ node, path }) {
    function updateProp(key, value) {
        const doc = componentDoc.value;
        if (!doc)
            return;
        const newTree = updateNodeProps(doc.tree, path, { [key]: value || undefined });
        setComponentDoc({ ...doc, tree: newTree });
    }
    return (_jsxs("div", { class: "properties-content", children: [_jsxs("div", { class: "property-type-header", children: [_jsx("span", { class: "property-type-dot", style: { background: 'var(--color-layout)' } }), "Layout \u2014 ", node.component] }), _jsx("div", { class: "section-title", children: "Properties" }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Component" }), _jsx("div", { class: "property-static-value", style: { fontFamily: 'var(--font-mono)', fontSize: '12px' }, children: node.component })] }), typeof node.title === 'string' && (_jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Title" }), _jsx("input", { class: "studio-input", value: node.title, onInput: (e) => updateProp('title', e.target.value) })] })), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "CSS Class" }), _jsx("input", { class: "studio-input studio-input-mono", value: node.cssClass ?? '', placeholder: "custom-class", onInput: (e) => updateProp('cssClass', e.target.value) })] }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Conditional (when)" }), _jsx("input", { class: "studio-input studio-input-mono", value: node.when ?? '', placeholder: "FEL expression", onInput: (e) => updateProp('when', e.target.value) })] })] }));
}
