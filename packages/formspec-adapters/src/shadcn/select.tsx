/** @filedesc shadcn adapter for Select — native select dropdown. */
import React, { useRef, useLayoutEffect } from 'react';
import type { SelectBehavior, AdapterRenderFn } from 'formspec-webcomponent';
import { applyCascadeClasses, applyCascadeAccessibility } from '../helpers';
import { createReactAdapter } from './factory';
import { cn } from './cn';

const SELECT = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const LABEL = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';
const ERROR = 'text-sm font-medium text-destructive';
const HINT = 'text-sm text-muted-foreground';

function ShadcnSelect({ behavior }: { behavior: SelectBehavior }) {
    const rootRef = useRef<HTMLDivElement>(null!);
    const labelRef = useRef<HTMLLabelElement>(null!);
    const controlRef = useRef<HTMLSelectElement>(null!);
    const hintRef = useRef<HTMLParagraphElement>(null);
    const errorRef = useRef<HTMLParagraphElement>(null!);

    useLayoutEffect(() => {
        applyCascadeClasses(rootRef.current, behavior.presentation);
        applyCascadeAccessibility(rootRef.current, behavior.presentation);

        const dispose = behavior.bind({
            root: rootRef.current,
            label: labelRef.current,
            control: controlRef.current,
            hint: hintRef.current ?? undefined,
            error: errorRef.current,
            onValidationChange: (hasError) => {
                const el = controlRef.current;
                if (!el) return;
                el.classList.toggle('border-destructive', hasError);
                el.classList.toggle('border-input', !hasError);
            },
            rebuildOptions: (_container, newOptions) => {
                const sel = controlRef.current;
                while (sel.options.length > 1) sel.remove(sel.options.length - 1);
                const controls = new Map<string, HTMLInputElement>();
                for (const opt of newOptions) {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label;
                    sel.appendChild(option);
                }
                return controls;
            },
        });
        return dispose;
    }, [behavior]);

    const p = behavior.presentation;
    const describedBy = [
        behavior.hint ? `${behavior.id}-hint` : '',
        `${behavior.id}-error`,
    ].filter(Boolean).join(' ');

    const options = behavior.options();

    return (
        <div ref={rootRef} className="space-y-2" data-name={behavior.fieldPath}>
            <label
                ref={labelRef}
                htmlFor={behavior.id}
                className={cn(LABEL, p.labelPosition === 'hidden' && 'sr-only')}
            >
                {behavior.label}
            </label>
            {behavior.hint && (
                <p ref={hintRef} id={`${behavior.id}-hint`} className={HINT}>
                    {behavior.hint}
                </p>
            )}
            <select
                ref={controlRef}
                id={behavior.id}
                name={behavior.fieldPath}
                defaultValue=""
                className={SELECT}
                aria-describedby={describedBy}
            >
                <option value="" disabled={!behavior.clearable}>
                    {behavior.placeholder || '- Select -'}
                </option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            <p ref={errorRef} id={`${behavior.id}-error`} role="alert" aria-live="polite" className={ERROR} />
        </div>
    );
}

export const renderSelect: AdapterRenderFn<SelectBehavior> = createReactAdapter(ShadcnSelect);
