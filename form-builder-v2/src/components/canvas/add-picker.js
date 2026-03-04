import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { useState, useEffect, useRef } from 'preact/hooks';
import { getCatalogByCategory, getCategoryColor, searchCatalog } from '../../logic/add-picker-catalog';
import { updateDefinition } from '../../state/definition';
export function AddPicker({ parentPath, insertIndex, onAdd, onCancel }) {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(null);
    const [labelValue, setLabelValue] = useState('');
    const inputRef = useRef(null);
    const labelRef = useRef(null);
    useEffect(() => {
        inputRef.current?.focus();
    }, []);
    useEffect(() => {
        if (selected && labelRef.current) {
            labelRef.current.focus();
        }
    }, [selected]);
    const catalogByCategory = query ? { results: searchCatalog(query) } : getCatalogByCategory();
    const isSearchMode = 'results' in catalogByCategory;
    function handleSelect(entry) {
        if (entry.promptForLabel) {
            setSelected(entry);
            setLabelValue(entry.label);
        }
        else {
            commitAdd(entry, entry.label);
        }
    }
    function commitAdd(entry, label) {
        const key = label.replace(/[^a-zA-Z0-9]/g, '').replace(/^./, (c) => c.toLowerCase()) || 'field';
        // Create definition item if needed
        if (entry.createsDefinitionItem) {
            updateDefinition((def) => {
                const newItem = {
                    key,
                    type: entry.definitionType ?? 'field',
                    label,
                };
                if (entry.defaultDataType) {
                    newItem.dataType = entry.defaultDataType;
                }
                def.items.push(newItem);
            });
        }
        const node = {
            component: entry.component,
            ...(entry.createsDefinitionItem ? { bind: key } : {}),
            ...(entry.promptForLabel && !entry.createsDefinitionItem ? { title: label } : {}),
        };
        onAdd(node);
    }
    function handleLabelSubmit() {
        if (selected && labelValue.trim()) {
            commitAdd(selected, labelValue.trim());
        }
    }
    return (_jsx("div", { class: "add-picker-overlay", onClick: (e) => { if (e.target === e.currentTarget)
            onCancel(); }, children: _jsxs("div", { class: "add-picker", children: [_jsx("div", { class: "add-picker-search", children: _jsx("input", { ref: inputRef, type: "text", placeholder: "Search components...", value: query, onInput: (e) => {
                            setQuery(e.target.value);
                            setSelected(null);
                        }, onKeyDown: (e) => {
                            if (e.key === 'Escape')
                                onCancel();
                        } }) }), _jsx("div", { class: "add-picker-body", children: isSearchMode ? (catalogByCategory.results.map((entry) => (_jsxs("div", { class: "add-picker-item", onClick: () => handleSelect(entry), children: [_jsx("span", { class: "add-picker-item-dot", style: { background: getCategoryColor(entry.category) } }), _jsx("span", { class: "add-picker-item-label", children: entry.label }), _jsx("span", { class: "add-picker-item-type", children: entry.component })] }, entry.component)))) : (Object.entries(catalogByCategory).map(([category, entries]) => entries.length > 0 && (_jsxs("div", { class: "add-picker-category", children: [_jsx("div", { class: "add-picker-category-title", children: category }), entries.map((entry) => (_jsxs("div", { class: "add-picker-item", onClick: () => handleSelect(entry), children: [_jsx("span", { class: "add-picker-item-dot", style: { background: getCategoryColor(entry.category) } }), _jsx("span", { class: "add-picker-item-label", children: entry.label }), _jsx("span", { class: "add-picker-item-type", children: entry.component })] }, entry.component)))] }, category)))) }), selected && (_jsxs("div", { class: "add-picker-label-prompt", children: [_jsx("input", { ref: labelRef, type: "text", placeholder: "Enter label...", value: labelValue, onInput: (e) => setLabelValue(e.target.value), onKeyDown: (e) => {
                                if (e.key === 'Enter')
                                    handleLabelSubmit();
                                if (e.key === 'Escape') {
                                    setSelected(null);
                                    inputRef.current?.focus();
                                }
                            } }), _jsx("button", { class: "btn-primary", onClick: handleLabelSubmit, children: "Add" })] }))] }) }));
}
