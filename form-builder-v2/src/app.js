import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { signal } from '@preact/signals';
import { Topbar } from './components/topbar';
import { TreeEditor } from './components/canvas/tree-editor';
import { Preview } from './components/preview';
import { InspectorPanel } from './components/inspector/inspector-panel';
import { CommandBar } from './components/command-bar';
import { ToastContainer } from './components/toast';
import { editorMode } from './state/project';
import { definition, setDefinition } from './state/definition';
import { FORM_TEMPLATES } from './logic/seed-definition';
import './state/definition'; // ensure engine is bootstrapped
const inspectorCollapsed = signal(false);
/** Starts true — shows the template picker on first load */
export const showTemplatePicker = signal(true);
export function App() {
    const showPicker = showTemplatePicker.value;
    return (_jsxs("div", { class: "studio-root", children: [_jsx(Topbar, {}), _jsxs("div", { class: "studio-workspace", children: [_jsxs("div", { class: "canvas-panel", children: [_jsxs("div", { class: "canvas-header", children: [_jsx("span", { class: "canvas-header-title", children: "Structure" }), _jsxs("div", { class: "mode-tabs", children: [_jsx("button", { class: `mode-tab${editorMode.value === 'guided' ? ' active' : ''}`, onClick: () => { editorMode.value = 'guided'; }, children: "Tree" }), _jsx("button", { class: `mode-tab${editorMode.value === 'json' ? ' active' : ''}`, onClick: () => { editorMode.value = 'json'; }, children: "JSON" })] })] }), editorMode.value === 'guided' ? (_jsx(TreeEditor, {})) : (_jsx(JsonEditor, {}))] }), showPicker ? (_jsx(EmptyState, { onTemplateSelect: (def) => {
                            setDefinition(def);
                            showTemplatePicker.value = false;
                        } })) : (_jsx(Preview, {})), !showPicker && (_jsx(InspectorPanel, { collapsed: inspectorCollapsed.value, onToggle: () => { inspectorCollapsed.value = !inspectorCollapsed.value; } }))] }), _jsx(CommandBar, {}), _jsx(ToastContainer, {})] }));
}
/* ── Inline JSON Editor ─────────────────────────────────────── */
function JsonEditor() {
    const def = definition.value;
    let json;
    try {
        json = JSON.stringify(def, null, 2);
    }
    catch {
        json = '{}';
    }
    return (_jsx("div", { class: "json-editor", children: _jsx("textarea", { class: "json-editor-textarea", value: json, onInput: (e) => {
                try {
                    const parsed = JSON.parse(e.target.value);
                    if (parsed.$formspec) {
                        setDefinition(parsed);
                    }
                }
                catch {
                    // ignore parse errors while typing
                }
            }, spellcheck: false }) }));
}
/* ── Empty State with Template Picker ───────────────────────── */
function EmptyState({ onTemplateSelect }) {
    return (_jsx("div", { class: "preview-panel", children: _jsxs("div", { class: "empty-state", children: [_jsx("div", { class: "empty-state-icon", children: _jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "white", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", children: [_jsx("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }), _jsx("polyline", { points: "14 2 14 8 20 8" }), _jsx("line", { x1: "12", y1: "18", x2: "12", y2: "12" }), _jsx("line", { x1: "9", y1: "15", x2: "15", y2: "15" })] }) }), _jsx("h1", { class: "empty-state-title", children: "Build Your Form" }), _jsx("p", { class: "empty-state-description", children: "Choose a template to get started, or begin with a blank canvas. Use the tree panel to add fields, groups, and layout components." }), _jsx("div", { class: "empty-state-actions", children: FORM_TEMPLATES.map((tmpl) => (_jsxs("div", { class: "template-card", onClick: () => onTemplateSelect(tmpl.factory()), role: "button", tabIndex: 0, children: [_jsx("span", { class: "template-card-icon", children: tmpl.icon }), _jsx("span", { class: "template-card-label", children: tmpl.label }), _jsx("span", { class: "template-card-desc", children: tmpl.desc })] }, tmpl.id))) })] }) }));
}
