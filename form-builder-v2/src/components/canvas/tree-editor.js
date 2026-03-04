import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "preact/jsx-runtime";
import { definition, definitionVersion } from '../../state/definition';
import { componentDoc, componentVersion, setComponentDoc } from '../../state/project';
import { addPickerState, selectedPath } from '../../state/selection';
import { insertNode } from '../../logic/component-tree-ops';
import { draggedPath, dropTarget, executeDrop } from './drag-drop';
import { TreeNode } from './tree-node';
import { AddPicker } from './add-picker';
export function TreeEditor() {
    definitionVersion.value;
    componentVersion.value;
    const doc = componentDoc.value;
    const def = definition.value;
    const rootSelected = selectedPath.value === '';
    const picker = addPickerState.value;
    if (!doc) {
        return (_jsx("div", { class: "canvas-body", role: "tree", "aria-label": "Component tree", children: _jsxs("div", { class: "inspector-empty", children: [_jsx("span", { class: "inspector-empty-icon", children: "\uD83C\uDF3F" }), _jsx("span", { children: "No component tree" })] }) }));
    }
    const rootNode = doc.tree;
    function handleAdd(node) {
        if (!picker || !doc)
            return;
        const idx = Math.min(picker.insertIndex, rootNode.children?.length ?? 0);
        const newTree = insertNode(doc.tree, picker.parentPath, idx, node);
        setComponentDoc({ ...doc, tree: newTree });
        const newPath = picker.parentPath
            ? `${picker.parentPath}.${idx}`
            : String(idx);
        selectedPath.value = newPath;
        addPickerState.value = null;
    }
    return (_jsxs(_Fragment, { children: [_jsxs("div", { class: "canvas-body", role: "tree", "aria-label": "Component tree", children: [_jsxs("div", { class: `tree-header ${rootSelected ? 'selected' : ''}`, onClick: () => { selectedPath.value = ''; }, role: "treeitem", "aria-level": 1, "aria-selected": rootSelected, tabIndex: 0, children: [_jsx("span", { class: "tree-header-dot" }), _jsx("span", { class: "tree-header-title", children: def.title || 'Untitled Form' })] }), rootNode.children?.map((child, index) => (_jsx(TreeNode, { node: child, path: String(index), depth: 0 }, `${index}-${child.component}`))), draggedPath.value && (_jsx("div", { class: `tree-root-drop-zone ${dropTarget.value?.parentPath === '' &&
                            dropTarget.value?.mode === 'below' &&
                            dropTarget.value?.insertIndex === (rootNode.children?.length ?? 0)
                            ? 'drop-active'
                            : ''}`, onDragOver: (event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                            dropTarget.value = {
                                parentPath: '',
                                insertIndex: rootNode.children?.length ?? 0,
                                mode: 'below',
                            };
                        }, onDrop: (event) => {
                            event.preventDefault();
                            executeDrop();
                        } })), _jsx("div", { class: "tree-add-section", children: _jsx("button", { class: "tree-add-btn", "aria-label": "Add component", onClick: () => {
                                addPickerState.value = {
                                    parentPath: '',
                                    insertIndex: rootNode.children?.length ?? 0,
                                };
                            }, children: "+ Add Component" }) })] }), picker && (_jsx(AddPicker, { parentPath: picker.parentPath, insertIndex: picker.insertIndex, onAdd: handleAdd, onCancel: () => { addPickerState.value = null; } }))] }));
}
