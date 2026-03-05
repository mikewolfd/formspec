import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { FormspecItem } from 'formspec-engine';
import { definition, findBindByPath, findItemByKey, updateBind, updateDefinition } from '../../state/definition';
import { componentDoc, documentInsertNonce } from '../../state/project';
import { selectedPath } from '../../state/selection';
import { findPathByBind } from '../../logic/component-tree';
import { createItemFromSlash, filterSlashTemplates, hasLogic, insertTopLevelItem } from '../../logic/document-ops';

export function DocumentEditor() {
    const def = definition.value;
    const items = def.items ?? [];
    const [activeInsertIndex, setActiveInsertIndex] = useState<number>(items.length === 0 ? 0 : items.length);

    useEffect(() => {
        if (items.length === 0) {
            setActiveInsertIndex(0);
            return;
        }
        setActiveInsertIndex((current) => {
            const capped = Math.min(current, items.length);
            return capped < 0 ? items.length : capped;
        });
    }, [items.length]);

    useEffect(() => {
        if (documentInsertNonce.value === 0) return;
        setActiveInsertIndex(items.length);
    }, [documentInsertNonce.value, items.length]);

    return (
        <div class="document-editor" onClick={(event) => {
            if (event.target === event.currentTarget) {
                selectedPath.value = '';
            }
        }}>
            <div class="document-form-header">
                <input
                    class="document-form-title"
                    value={def.title || ''}
                    placeholder="Untitled Form"
                    onInput={(event) => {
                        const next = (event.target as HTMLInputElement).value;
                        updateDefinition((draft) => {
                            draft.title = next;
                        });
                    }}
                    aria-label="Document title"
                />
                <textarea
                    class="document-form-description"
                    value={(def as { description?: string }).description ?? ''}
                    placeholder="Add a description..."
                    onInput={(event) => {
                        const next = (event.target as HTMLTextAreaElement).value;
                        updateDefinition((draft) => {
                            (draft as Record<string, unknown>).description = next;
                        });
                    }}
                    rows={2}
                    aria-label="Document description"
                />
            </div>

            <div class="document-items">
                {items.length === 0 && (
                    <div class="document-empty-prompt">Type / to add a field</div>
                )}

                {Array.from({ length: items.length + 1 }).map((_, index) => (
                    <div key={`insert-${index}`}>
                        <InsertRow
                            index={index}
                            active={activeInsertIndex === index}
                            onActivate={() => setActiveInsertIndex(index)}
                            onCommit={(nextItem) => {
                                updateDefinition((draft) => {
                                    draft.items = insertTopLevelItem(draft.items ?? [], nextItem, index);
                                });
                                selectByKey(nextItem.key);
                                setActiveInsertIndex(index + 1);
                            }}
                        />

                        {index < items.length && (
                            <ItemCard item={items[index]} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function InsertRow({
    index,
    active,
    onActivate,
    onCommit,
}: {
    index: number;
    active: boolean;
    onActivate: () => void;
    onCommit: (item: FormspecItem) => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('/');
    const [highlighted, setHighlighted] = useState(0);

    useEffect(() => {
        if (!active) return;
        requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.setSelectionRange(query.length, query.length);
        });
    }, [active]);

    const results = useMemo(() => {
        if (!query.startsWith('/')) return [];
        return filterSlashTemplates(query).slice(0, 8);
    }, [query]);

    useEffect(() => {
        setHighlighted(0);
    }, [query]);

    function commitHighlighted() {
        if (results.length === 0) return;
        const next = createItemFromSlash(results[Math.min(highlighted, results.length - 1)], definition.value.items ?? []);
        onCommit(next);
        setQuery('/');
        setHighlighted(0);
    }

    if (!active) {
        return (
            <div class="document-insert-row">
                <button
                    class="document-add-between"
                    onClick={onActivate}
                    aria-label={`Insert field at position ${index + 1}`}
                >
                    +
                </button>
            </div>
        );
    }

    return (
        <div class="document-insert-row active">
            <div class="document-slash-wrap">
                <input
                    ref={inputRef}
                    class="document-slash-input"
                    value={query}
                    placeholder="Type / to add a field"
                    aria-label="Slash command"
                    onInput={(event) => {
                        setQuery((event.target as HTMLInputElement).value);
                    }}
                    onKeyDown={(event) => {
                        if (!query.startsWith('/')) return;
                        if (event.key === 'ArrowDown') {
                            event.preventDefault();
                            setHighlighted((prev) => Math.min(prev + 1, results.length - 1));
                            return;
                        }
                        if (event.key === 'ArrowUp') {
                            event.preventDefault();
                            setHighlighted((prev) => Math.max(prev - 1, 0));
                            return;
                        }
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            commitHighlighted();
                            return;
                        }
                    }}
                />

                {query.startsWith('/') && results.length > 0 && (
                    <div class="document-slash-menu" role="listbox">
                        {results.map((result, idx) => (
                            <button
                                key={result.id}
                                class={`document-slash-item${idx === highlighted ? ' active' : ''}`}
                                onMouseEnter={() => setHighlighted(idx)}
                                onClick={() => {
                                    const next = createItemFromSlash(result, definition.value.items ?? []);
                                    onCommit(next);
                                    setQuery('/');
                                    setHighlighted(0);
                                }}
                            >
                                <span>{result.label}</span>
                                <span class="document-slash-item-category">{result.category}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ItemCard({ item }: { item: FormspecItem }) {
    const path = findItemByKey(item.key)?.path ?? item.key;
    const bind = (findBindByPath(definition.value, path) ?? {}) as Record<string, unknown>;

    const requiredActive = hasLogic(bind, 'required') || hasLogic(item as unknown as Record<string, unknown>, 'required');
    const relevantActive = hasLogic(bind, 'relevant') || hasLogic(item as unknown as Record<string, unknown>, 'relevant');
    const calculateActive = hasLogic(bind, 'calculate') || hasLogic(item as unknown as Record<string, unknown>, 'calculate');
    const constraintActive = hasLogic(bind, 'constraint') || hasLogic(item as unknown as Record<string, unknown>, 'constraint');
    const readonlyActive = hasLogic(bind, 'readonly') || hasLogic(item as unknown as Record<string, unknown>, 'readonly');

    return (
        <article
            class="doc-field-card"
            onClick={() => selectByKey(item.key)}
            role="button"
            tabIndex={0}
        >
            <div class="doc-field-main">
                <input
                    class="doc-field-label-input"
                    value={item.label || ''}
                    placeholder="Field label"
                    onInput={(event) => {
                        const next = (event.target as HTMLInputElement).value;
                        updateDefinition((draft) => {
                            const found = findItemByKey(item.key, draft.items);
                            if (!found) return;
                            found.item.label = next;
                        });
                    }}
                    onClick={(event) => event.stopPropagation()}
                    aria-label="Field label"
                />
                <div class="doc-field-meta">
                    <span class="doc-field-key">{item.key}</span>
                    {item.type === 'field' && <span class="doc-field-type">{item.dataType ?? 'string'}</span>}
                </div>
            </div>

            <input
                class="doc-field-description-input"
                value={item.description ?? ''}
                placeholder="Add description"
                onInput={(event) => {
                    const next = (event.target as HTMLInputElement).value;
                    updateDefinition((draft) => {
                        const found = findItemByKey(item.key, draft.items);
                        if (!found) return;
                        found.item.description = next;
                    });
                }}
                onClick={(event) => event.stopPropagation()}
                aria-label="Field description"
            />

            <div class="doc-field-toolbar">
                {item.type === 'field' && (
                    <button
                        class={`doc-required-toggle${requiredActive ? ' active' : ''}`}
                        role="switch"
                        aria-checked={requiredActive}
                        aria-label="Required"
                        onClick={(event) => {
                            event.stopPropagation();
                            updateBind(path, { required: requiredActive ? '' : 'true' });
                        }}
                    >
                        Required
                    </button>
                )}

                <div class="doc-logic-badges" aria-label="Logic badges">
                    {requiredActive && <span title="Required">●</span>}
                    {relevantActive && <span title="Show when">?</span>}
                    {calculateActive && <span title="Calculated">=</span>}
                    {constraintActive && <span title="Validation">!</span>}
                    {readonlyActive && <span title="Read only">🔒</span>}
                </div>
            </div>
        </article>
    );
}

function selectByKey(key: string) {
    const doc = componentDoc.value;
    if (!doc) {
        selectedPath.value = null;
        return;
    }
    const path = findPathByBind(doc.tree, key);
    selectedPath.value = path;
}
