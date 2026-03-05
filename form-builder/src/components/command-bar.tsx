import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { FormspecItem } from 'formspec-engine';
import { commandBarOpen, centerPanelMode, componentDoc, editorMode, requestDocumentInsert, structurePanelOpen } from '../state/project';
import { definition, setDefinition } from '../state/definition';
import { selectedPath } from '../state/selection';
import { handleImport, handleExport } from '../logic/import-export';
import { findPathByBind } from '../logic/component-tree';

interface CommandItem {
    id: string;
    icon: string;
    label: string;
    section: 'navigation' | 'actions' | 'advanced';
    shortcut?: string;
    searchText?: string;
    action: () => void;
}

function flattenItems(items: FormspecItem[], acc: FormspecItem[] = []): FormspecItem[] {
    for (const item of items) {
        acc.push(item);
        if (item.children?.length) flattenItems(item.children, acc);
    }
    return acc;
}

function getCommands(): CommandItem[] {
    const fieldCommands: CommandItem[] = flattenItems(definition.value.items).map((item) => ({
        id: `goto:${item.key}`,
        icon: '↳',
        label: `Go to field: ${item.label || item.key}`,
        section: 'navigation',
        searchText: `${item.key} ${item.label}`,
        shortcut: '⌘G',
        action: () => {
            const doc = componentDoc.value;
            if (!doc) return;
            const path = findPathByBind(doc.tree, item.key);
            selectedPath.value = path;
            centerPanelMode.value = 'document';
        },
    }));

    return [
        ...fieldCommands,
        {
            id: 'add-field',
            icon: '➕',
            label: 'Add field...',
            section: 'actions',
            shortcut: '/',
            action: () => {
                centerPanelMode.value = 'document';
                requestDocumentInsert();
            },
        },
        {
            id: 'toggle-preview',
            icon: '👁',
            label: centerPanelMode.value === 'preview' ? 'Open document editor' : 'Toggle preview',
            section: 'actions',
            shortcut: '⌘P',
            action: () => {
                centerPanelMode.value = centerPanelMode.value === 'preview' ? 'document' : 'preview';
            },
        },
        {
            id: 'toggle-structure',
            icon: '🧭',
            label: structurePanelOpen.value ? 'Hide structure panel' : 'Show structure panel',
            section: 'actions',
            shortcut: '⌘\\',
            action: () => {
                structurePanelOpen.value = !structurePanelOpen.value;
            },
        },
        {
            id: 'import-definition',
            icon: '↓',
            label: 'Import definition',
            section: 'advanced',
            shortcut: '⌘I',
            action: () => handleImport(setDefinition),
        },
        {
            id: 'export-definition',
            icon: '↑',
            label: 'Export form bundle',
            section: 'advanced',
            shortcut: '⌘E',
            action: () => handleExport(definition.value),
        },
        {
            id: 'open-json',
            icon: '{}',
            label: 'Open JSON editor',
            section: 'advanced',
            shortcut: '⌘⇧J',
            action: () => {
                structurePanelOpen.value = true;
                editorMode.value = 'json';
            },
        },
        {
            id: 'clear-form',
            icon: '🗑',
            label: 'Clear form',
            section: 'advanced',
            action: () => {
                setDefinition({ ...definition.value, items: [], binds: [] });
                selectedPath.value = '';
                centerPanelMode.value = 'document';
            },
        },
    ];
}

export function CommandBar() {
    const isOpen = commandBarOpen.value;
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                commandBarOpen.value = !commandBarOpen.value;
            }
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'j') {
                event.preventDefault();
                structurePanelOpen.value = true;
                editorMode.value = 'json';
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
        } else {
            setQuery('');
        }
    }, [isOpen]);

    const commands = useMemo(() => {
        const all = getCommands();
        const q = query.trim().toLowerCase();
        if (!q) return all;
        return all.filter((cmd) => {
            if (cmd.label.toLowerCase().includes(q)) return true;
            if (cmd.shortcut?.toLowerCase().includes(q)) return true;
            return (cmd.searchText ?? '').toLowerCase().includes(q);
        });
    }, [query, centerPanelMode.value, structurePanelOpen.value, definition.value, editorMode.value, componentDoc.value]);

    if (!isOpen) return null;

    function executeAndClose(action: () => void) {
        commandBarOpen.value = false;
        action();
    }

    const sectionOrder: Array<CommandItem['section']> = ['navigation', 'actions', 'advanced'];

    return (
        <div
            class="command-bar-overlay"
            onClick={(event) => {
                if (event.target === event.currentTarget) commandBarOpen.value = false;
            }}
        >
            <div class="command-bar">
                <div class="command-bar-input">
                    <span class="command-bar-icon">⌘</span>
                    <input
                        ref={inputRef}
                        placeholder="Type a command or search..."
                        value={query}
                        onInput={(event) => {
                            setQuery((event.target as HTMLInputElement).value);
                        }}
                    />
                </div>
                <div class="command-bar-results">
                    {sectionOrder.map((section) => {
                        const sectionItems = commands.filter((cmd) => cmd.section === section);
                        if (sectionItems.length === 0) return null;
                        return (
                            <div key={section} class="command-bar-section">
                                <div class="command-bar-section-title">{section.toUpperCase()}</div>
                                {sectionItems.map((cmd) => (
                                    <div
                                        key={cmd.id}
                                        class="command-bar-item"
                                        onClick={() => executeAndClose(cmd.action)}
                                    >
                                        <span class="command-bar-item-icon">{cmd.icon}</span>
                                        <span class="command-bar-item-label">{cmd.label}</span>
                                        {cmd.shortcut && (
                                            <span class="command-bar-item-shortcut">{cmd.shortcut}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                    {commands.length === 0 && (
                        <div class="command-bar-empty">No matches</div>
                    )}
                </div>
            </div>
        </div>
    );
}
