import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { definition, updateDefinition } from '../../state/definition';
export function RootSection() {
    const def = definition.value;
    function updateRoot(field, value) {
        updateDefinition((d) => {
            d[field] = value || undefined;
        });
    }
    return (_jsxs("div", { class: "properties-content", children: [_jsxs("div", { class: "property-type-header", children: [_jsx("span", { class: "property-type-dot", style: { background: 'var(--accent)' } }), "Form Root"] }), _jsx("div", { class: "section-title", children: "Definition" }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Title" }), _jsx("input", { class: "studio-input", value: def.title ?? '', onInput: (e) => updateRoot('title', e.target.value) })] }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "URL" }), _jsx("input", { class: "studio-input studio-input-mono", value: def.url ?? '', onInput: (e) => updateRoot('url', e.target.value) })] }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Version" }), _jsx("input", { class: "studio-input studio-input-mono", value: def.version ?? '', placeholder: "0.1.0", onInput: (e) => updateRoot('version', e.target.value) })] }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Status" }), _jsxs("select", { class: "studio-select", value: def.status ?? 'draft', onChange: (e) => updateRoot('status', e.target.value), children: [_jsx("option", { value: "draft", children: "draft" }), _jsx("option", { value: "published", children: "published" }), _jsx("option", { value: "deprecated", children: "deprecated" }), _jsx("option", { value: "archived", children: "archived" })] })] }), _jsxs("div", { class: "property-row", children: [_jsx("label", { class: "property-label", children: "Description" }), _jsx("textarea", { class: "studio-textarea", value: def.description ?? '', placeholder: "Describe this form...", onInput: (e) => updateRoot('description', e.target.value) })] })] }));
}
