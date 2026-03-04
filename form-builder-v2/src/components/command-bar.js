import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { useEffect, useRef } from 'preact/hooks';
import { commandBarOpen } from '../state/project';
import { addPickerState } from '../state/selection';
import { setDefinition, definition } from '../state/definition';
import { handleImport, handleExport } from '../logic/import-export';
function getCommands() {
    return [
        {
            icon: '➕',
            label: 'Add Component...',
            shortcut: 'A',
            action: () => {
                addPickerState.value = { parentPath: '', insertIndex: Infinity };
            },
        },
        {
            icon: '↓',
            label: 'Import Definition',
            shortcut: '⌘I',
            action: () => handleImport(setDefinition),
        },
        {
            icon: '↑',
            label: 'Export Definition',
            shortcut: '⌘E',
            action: () => handleExport(definition.value),
        },
        {
            icon: '🗑',
            label: 'Clear Form',
            action: () => {
                setDefinition({
                    ...definition.value,
                    items: [],
                });
            },
        },
    ];
}
export function CommandBar() {
    const isOpen = commandBarOpen.value;
    const inputRef = useRef(null);
    const query = useRef('');
    useEffect(() => {
        function handleKeyDown(event) {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                commandBarOpen.value = !commandBarOpen.value;
            }
            if (event.key === 'Escape' && commandBarOpen.value) {
                commandBarOpen.value = false;
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [isOpen]);
    if (!isOpen)
        return null;
    const commands = getCommands();
    function executeAndClose(action) {
        commandBarOpen.value = false;
        action();
    }
    return (_jsx("div", { class: "command-bar-overlay", onClick: (event) => {
            if (event.target === event.currentTarget)
                commandBarOpen.value = false;
        }, children: _jsxs("div", { class: "command-bar", children: [_jsxs("div", { class: "command-bar-input", children: [_jsx("span", { class: "command-bar-icon", children: "\u2318" }), _jsx("input", { ref: inputRef, placeholder: "Type a command...", onInput: (event) => {
                                query.current = event.target.value;
                            } })] }), _jsx("div", { class: "command-bar-results", children: commands.map((cmd) => (_jsxs("div", { class: "command-bar-item", onClick: () => executeAndClose(cmd.action), children: [_jsx("span", { class: "command-bar-item-icon", children: cmd.icon }), _jsx("span", { class: "command-bar-item-label", children: cmd.label }), cmd.shortcut && (_jsx("span", { class: "command-bar-item-shortcut", children: cmd.shortcut }))] }, cmd.label))) })] }) }));
}
