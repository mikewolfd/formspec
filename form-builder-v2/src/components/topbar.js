import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { definition, updateDefinition, setDefinition } from '../state/definition';
import { commandBarOpen } from '../state/project';
import { handleImport, handleExport } from '../logic/import-export';
export function Topbar() {
    const def = definition.value;
    const version = def?.version ?? '0.1.0';
    const status = def?.status ?? 'draft';
    return (_jsxs("header", { class: "studio-topbar", children: [_jsxs("div", { class: "topbar-brand", children: [_jsx("div", { class: "topbar-logo", children: _jsxs("svg", { viewBox: "0 0 16 16", fill: "none", children: [_jsx("rect", { x: "1", y: "1", width: "6", height: "6", rx: "1.5", fill: "#fff", opacity: "1" }), _jsx("rect", { x: "9", y: "1", width: "6", height: "6", rx: "1.5", fill: "#fff", opacity: "0.6" }), _jsx("rect", { x: "1", y: "9", width: "6", height: "6", rx: "1.5", fill: "#fff", opacity: "0.6" }), _jsx("rect", { x: "9", y: "9", width: "6", height: "6", rx: "1.5", fill: "#fff", opacity: "0.3" })] }) }), _jsxs("span", { class: "topbar-brand-text", children: ["Formspec ", _jsx("span", { class: "topbar-brand-accent", children: "Studio" })] })] }), _jsxs("div", { class: "topbar-center", children: [_jsx("input", { class: "topbar-title-input", value: def.title ?? 'Untitled Form', onInput: (event) => {
                            const next = event.target.value;
                            updateDefinition((d) => { d.title = next; });
                        }, "aria-label": "Form title" }), _jsxs("span", { class: "topbar-meta", children: [_jsx("span", { class: "topbar-status", children: status }), _jsxs("span", { children: ["v", version] })] })] }), _jsxs("div", { class: "topbar-actions", children: [_jsx("button", { class: "btn-ghost", onClick: () => { commandBarOpen.value = true; }, title: "Command palette (\u2318K)", children: "\u2318K" }), _jsx("button", { class: "btn-ghost", "aria-label": "Import", onClick: () => handleImport(setDefinition), children: "\u2193 Import" }), _jsx("button", { class: "btn-primary", "aria-label": "Export", onClick: () => handleExport(def), children: "\u2191 Export" })] })] }));
}
