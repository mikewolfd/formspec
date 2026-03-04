import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "preact/jsx-runtime";
import { signal } from '@preact/signals';
import { definitionVersion, findItemByKey } from '../../state/definition';
import { componentDoc, componentVersion, diagnostics } from '../../state/project';
import { selectedPath } from '../../state/selection';
import { resolveNode, classifyNode, nodeKindColor } from '../../logic/component-tree';
import { IdentitySection } from './identity-section';
import { DataSection } from './data-section';
import { BehaviorSection } from './behavior-section';
import { ValidationSection } from './validation-section';
import { LayoutSection } from './layout-section';
import { RootSection } from './root-section';
const activeTab = signal('properties');
export function InspectorPanel({ collapsed, onToggle, }) {
    const diags = diagnostics.value;
    const errorCount = diags.filter((d) => d.severity === 'error').length;
    if (collapsed) {
        return (_jsx("button", { class: "inspector-toggle-btn", onClick: onToggle, title: "Open inspector", children: "\u25C0" }));
    }
    return (_jsxs("div", { class: "inspector-panel", children: [_jsxs("div", { class: "inspector-header", children: [_jsxs("div", { class: "inspector-tabs", role: "tablist", children: [_jsx("button", { role: "tab", class: `inspector-tab${activeTab.value === 'properties' ? ' active' : ''}`, onClick: () => { activeTab.value = 'properties'; }, "aria-selected": activeTab.value === 'properties', children: "Inspector" }), _jsxs("button", { role: "tab", class: `inspector-tab${activeTab.value === 'diagnostics' ? ' active' : ''}`, onClick: () => { activeTab.value = 'diagnostics'; }, "aria-selected": activeTab.value === 'diagnostics', children: ["Diagnostics", errorCount > 0 && _jsx("span", { class: "diagnostics-badge", children: errorCount })] })] }), _jsx("button", { class: "inspector-close", onClick: onToggle, title: "Close inspector", children: "\u00D7" })] }), _jsx("div", { class: "inspector-body", role: "tabpanel", children: activeTab.value === 'properties' ? _jsx(PropertiesContent, {}) : _jsx(DiagnosticsContent, {}) })] }));
}
function PropertiesContent() {
    definitionVersion.value;
    componentVersion.value;
    const path = selectedPath.value;
    if (path === null) {
        return (_jsxs("div", { class: "inspector-empty", children: [_jsx("span", { class: "inspector-empty-icon", children: "\uD83D\uDC46" }), _jsxs("span", { children: ["Select an item in the tree", _jsx("br", {}), "to inspect its properties"] })] }));
    }
    if (path === '') {
        return _jsx(RootSection, {});
    }
    const doc = componentDoc.value;
    if (!doc) {
        return _jsx("div", { class: "inspector-empty", children: "No component tree loaded" });
    }
    const node = resolveNode(doc.tree, path);
    if (!node) {
        return _jsx("div", { class: "inspector-empty", children: "Node not found" });
    }
    const kind = classifyNode(node);
    const color = nodeKindColor(kind);
    // For bound items (fields, groups, displays), show definition properties
    if ((kind === 'bound-input' || kind === 'group' || kind === 'bound-display') && node.bind) {
        const found = findItemByKey(node.bind);
        if (found) {
            const item = found.item;
            const kindLabel = kind === 'bound-input' ? 'Field' : kind === 'group' ? 'Group' : 'Display';
            return (_jsxs("div", { class: "properties-content", children: [_jsxs("div", { class: "property-type-header", children: [_jsx("span", { class: "property-type-dot", style: { background: color } }), kindLabel, " \u2014 ", node.component] }), _jsx(IdentitySection, { item: item }), kind === 'bound-input' && (_jsxs(_Fragment, { children: [_jsx(DataSection, { item: item }), _jsx(BehaviorSection, { item: item }), _jsx(ValidationSection, { item: item })] })), kind === 'group' && _jsx(BehaviorSection, { item: item })] }));
        }
    }
    // Layout or unbound node
    return _jsx(LayoutSection, { node: node, path: path });
}
function DiagnosticsContent() {
    const diags = diagnostics.value;
    if (diags.length === 0) {
        return (_jsxs("div", { class: "diagnostics-empty", children: [_jsx("span", { class: "diagnostics-check", children: "\u2713" }), _jsx("span", { children: "No issues found" })] }));
    }
    const errors = diags.filter((d) => d.severity === 'error');
    const warnings = diags.filter((d) => d.severity === 'warning');
    const infos = diags.filter((d) => d.severity === 'info');
    return (_jsxs("div", { class: "diagnostics-list", children: [_jsxs("div", { class: "diagnostics-summary", children: [errors.length > 0 && _jsxs("span", { class: "diagnostics-pill error", children: [errors.length, " error", errors.length !== 1 ? 's' : ''] }), warnings.length > 0 && _jsxs("span", { class: "diagnostics-pill warning", children: [warnings.length, " warning", warnings.length !== 1 ? 's' : ''] }), infos.length > 0 && _jsxs("span", { class: "diagnostics-pill info", children: [infos.length, " info"] })] }), diags.map((diag, i) => (_jsxs("div", { class: "diagnostics-row", onClick: () => { if (diag.path)
                    selectedPath.value = diag.path; }, children: [_jsx("span", { class: `diagnostics-icon ${diag.severity}`, children: diag.severity === 'error' ? '●' : diag.severity === 'warning' ? '▲' : 'ℹ' }), _jsxs("div", { children: [_jsx("div", { class: "diagnostics-message", children: diag.message }), diag.path && _jsx("div", { class: "diagnostics-path", children: diag.path })] })] }, `${diag.path}-${i}`)))] }));
}
