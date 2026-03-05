import type { FormspecItem } from 'formspec-engine';
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { definition, definitionVersion } from '../../state/definition';
import { project } from '../../state/project';
import felFunctionsSchema from '../../../../schemas/fel-functions.schema.json';

type TriggerKind = '$' | '@';

type Suggestion = {
    key: string;
    text: string;
    detail?: string;
    insertText: string;
    caretOffset?: number;
};

type TriggerMatch = {
    trigger: TriggerKind;
    start: number;
    end: number;
    query: string;
};

const MAX_SUGGESTIONS = 10;
const tokenCharPattern = /[A-Za-z0-9_$@.[\]]/;

function collectItemKeys(items: FormspecItem[], keys = new Set<string>()): Set<string> {
    for (const item of items) {
        keys.add(item.key);
        if (item.children?.length) {
            collectItemKeys(item.children, keys);
        }
    }
    return keys;
}

function readTriggerToken(text: string, caret: number): TriggerMatch | null {
    let start = caret;
    while (start > 0 && tokenCharPattern.test(text[start - 1])) {
        start -= 1;
    }

    let end = caret;
    while (end < text.length && tokenCharPattern.test(text[end])) {
        end += 1;
    }

    const token = text.slice(start, caret);
    if (!token) return null;

    const firstChar = token[0];
    const trigger: TriggerKind = (firstChar === '$' || firstChar === '@') ? firstChar as TriggerKind : null as any;

    return {
        trigger,
        start,
        end,
        query: trigger ? token.slice(1).toLowerCase() : token.toLowerCase(),
    };
}

function scoreMatch(label: string, query: string): number {
    if (!query) return 0;
    if (label === query) return 0;
    if (label.startsWith(query)) return 1;
    const index = label.indexOf(query);
    if (index >= 0) return 5 + index;
    return Number.POSITIVE_INFINITY;
}

export function FelExpressionInput({
    value,
    placeholder,
    onValueChange,
    className = 'studio-input studio-input-mono',
}: {
    value: string;
    placeholder?: string;
    onValueChange: (value: string) => void;
    className?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [match, setMatch] = useState<TriggerMatch | null>(null);
    const [openUpward, setOpenUpward] = useState(false);
    const version = definitionVersion.value;
    const listboxId = useMemo(() => `fel-autocomplete-${Math.random().toString(36).slice(2)}`, []);

    const itemKeys = useMemo(
        () => Array.from(collectItemKeys(definition.value.items)).sort((a, b) => a.localeCompare(b)),
        [version],
    );

    const variableSuggestions = useMemo(() => {
        return Array.from(new Set(['$', ...itemKeys.map((key) => `$${key}`)]));
    }, [itemKeys]);

    const contextSuggestions = useMemo(() => {
        return [
            { key: 'context-current', text: '@current', detail: 'Current repeat instance', insertText: '@current' },
            { key: 'context-index', text: '@index', detail: '1-based repeat index', insertText: '@index' },
            { key: 'context-count', text: '@count', detail: 'Total repeat count', insertText: '@count' },
            { key: 'context-instance', text: '@instance', detail: 'Secondary data instance', insertText: 'instance("")', caretOffset: -2 },
        ];
    }, []);

    const functionSuggestions = useMemo(() => {
        return felFunctionsSchema.functions
            .map((fn: any) => ({
                key: `fn-${fn.name}`,
                text: fn.name,
                detail: fn.description,
                insertText: `${fn.name}()`,
                caretOffset: -1,
            }))
            .sort((a, b) => a.text.localeCompare(b.text));
    }, []);

    const registrySuggestions = useMemo(() => {
        const registries = (project.value.registries || []) as any[];
        return registries.flatMap(reg =>
            reg.entries
                .filter((e: any) => e.category === 'function' || e.category === 'constraint')
                .map((e: any) => ({
                    key: `reg-${e.name}`,
                    text: e.name,
                    detail: `[${e.category}] ${e.description}`,
                    insertText: `${e.name}()`,
                    caretOffset: -1,
                }))
        );
    }, [version]);

    const allFunctionSuggestions = useMemo(() => {
        return [...functionSuggestions, ...registrySuggestions].sort((a, b) => a.text.localeCompare(b.text));
    }, [functionSuggestions, registrySuggestions]);

    function closeSuggestions() {
        setSuggestions([]);
        setActiveIndex(0);
        setMatch(null);
    }

    function updateSuggestionsForInput(text: string, inputEl: HTMLInputElement) {
        const selectionStart = inputEl.selectionStart ?? text.length;
        const selectionEnd = inputEl.selectionEnd ?? selectionStart;
        if (selectionStart !== selectionEnd) {
            closeSuggestions();
            return;
        }

        const trigger = readTriggerToken(text, selectionStart);
        if (!trigger) {
            closeSuggestions();
            return;
        }

        if (trigger.trigger === '$') {
            const filtered = variableSuggestions
                .filter((token) => token.toLowerCase().includes(trigger.query))
                .map((token) => ({
                    key: `var-${token}`,
                    text: token,
                    insertText: token,
                }))
                .sort((left, right) => {
                    const leftLabel = left.text.toLowerCase();
                    const rightLabel = right.text.toLowerCase();
                    const scoreDelta = scoreMatch(leftLabel, trigger.query) - scoreMatch(rightLabel, trigger.query);
                    if (scoreDelta !== 0) return scoreDelta;
                    return leftLabel.localeCompare(rightLabel);
                })
                .slice(0, MAX_SUGGESTIONS);

            setSuggestions(filtered);
            setActiveIndex(0);
            setMatch(trigger);
            return;
        }

        if (trigger.trigger === '@') {
            const filtered = contextSuggestions
                .filter((item) => item.text.toLowerCase().includes(trigger.query))
                .sort((left, right) => {
                    const leftLabel = left.text.toLowerCase();
                    const rightLabel = right.text.toLowerCase();
                    const scoreDelta = scoreMatch(leftLabel, trigger.query) - scoreMatch(rightLabel, trigger.query);
                    if (scoreDelta !== 0) return scoreDelta;
                    return leftLabel.localeCompare(rightLabel);
                })
                .slice(0, MAX_SUGGESTIONS);

            setSuggestions(filtered);
            setActiveIndex(0);
            setMatch(trigger);
            return;
        }

        // Only show function suggestions if they typed at least 2 characters of a bare word
        if (!trigger.trigger && trigger.query.length < 2) {
            closeSuggestions();
            return;
        }

        const filtered = allFunctionSuggestions
            .filter((item) => item.text.toLowerCase().startsWith(trigger.query))
            .sort((left, right) => {
                const leftLabel = left.text.toLowerCase();
                const rightLabel = right.text.toLowerCase();
                return leftLabel.localeCompare(rightLabel);
            })
            .slice(0, MAX_SUGGESTIONS);

        if (filtered.length === 0) {
            closeSuggestions();
            return;
        }

        setSuggestions(filtered);
        setActiveIndex(0);
        setMatch(trigger);
    }

    function applySuggestion(suggestion: Suggestion) {
        if (!match) return;
        const nextValue = `${value.slice(0, match.start)}${suggestion.insertText}${value.slice(match.end)}`;
        const nextCaret = match.start + suggestion.insertText.length + (suggestion.caretOffset ?? 0);
        onValueChange(nextValue);
        closeSuggestions();

        requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.setSelectionRange(nextCaret, nextCaret);
        });
    }

    function handleInput(event: Event) {
        const inputEl = event.currentTarget as HTMLInputElement;
        const nextValue = inputEl.value;
        onValueChange(nextValue);
        updateSuggestionsForInput(nextValue, inputEl);
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (suggestions.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((prev) => (prev + 1) % suggestions.length);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
            return;
        }

        if (event.key === 'Tab') {
            closeSuggestions();
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            applySuggestion(suggestions[activeIndex]);
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            closeSuggestions();
        }
    }

    function syncDropdownDirection() {
        const inputEl = inputRef.current;
        if (!inputEl || suggestions.length === 0) {
            setOpenUpward(false);
            return;
        }
        const rect = inputEl.getBoundingClientRect();
        const estimatedHeight = Math.min(220, suggestions.length * 42 + 8);
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const shouldOpenUpward = spaceBelow < Math.min(160, estimatedHeight) && spaceAbove > spaceBelow;
        setOpenUpward(shouldOpenUpward);
    }

    useLayoutEffect(() => {
        if (suggestions.length === 0) {
            setOpenUpward(false);
            return;
        }
        syncDropdownDirection();
        const onViewportChange = () => {
            syncDropdownDirection();
        };
        window.addEventListener('resize', onViewportChange);
        window.addEventListener('scroll', onViewportChange, true);
        return () => {
            window.removeEventListener('resize', onViewportChange);
            window.removeEventListener('scroll', onViewportChange, true);
        };
    }, [suggestions.length]);

    return (
        <div class="fel-input-wrap">
            <input
                ref={inputRef}
                class={className}
                value={value}
                placeholder={placeholder}
                autoComplete="off"
                aria-expanded={suggestions.length > 0}
                aria-controls={suggestions.length > 0 ? listboxId : undefined}
                aria-activedescendant={suggestions.length > 0 ? `${listboxId}-opt-${activeIndex}` : undefined}
                spellcheck={false}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={(event) => {
                    const inputEl = event.currentTarget as HTMLInputElement;
                    updateSuggestionsForInput(inputEl.value, inputEl);
                }}
                onBlur={() => {
                    // Small delay to allow onMouseDown on suggestions to trigger first
                    setTimeout(closeSuggestions, 150);
                }}
            />
            {suggestions.length > 0 && (
                <div
                    id={listboxId}
                    class={`fel-autocomplete ${openUpward ? 'fel-autocomplete--up' : ''}`}
                    role="listbox"
                >
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={suggestion.key}
                            id={`${listboxId}-opt-${index}`}
                            role="option"
                            aria-selected={index === activeIndex}
                            class={`fel-autocomplete-option ${index === activeIndex ? 'active' : ''}`}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                applySuggestion(suggestion);
                            }}
                        >
                            <div class="fel-autocomplete-text">{suggestion.text}</div>
                            {suggestion.detail && <div class="fel-autocomplete-detail">{suggestion.detail}</div>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
