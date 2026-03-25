/** @filedesc shadcn adapter for TextInput — input or textarea with label, hint, error. */
import React, { useRef, useLayoutEffect } from 'react';
import type { TextInputBehavior, AdapterRenderFn } from 'formspec-webcomponent';
import { applyCascadeClasses, applyCascadeAccessibility } from '../helpers';
import { createReactAdapter } from './factory';
import { cn } from './cn';

// shadcn design token classes
const INPUT = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const TEXTAREA = 'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const LABEL = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';
const ERROR = 'text-sm font-medium text-destructive';
const HINT = 'text-sm text-muted-foreground';

function ShadcnTextInput({ behavior }: { behavior: TextInputBehavior }) {
    const rootRef = useRef<HTMLDivElement>(null!);
    const labelRef = useRef<HTMLLabelElement>(null!);
    const controlRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null!);
    const hintRef = useRef<HTMLParagraphElement>(null);
    const errorRef = useRef<HTMLParagraphElement>(null!);

    useLayoutEffect(() => {
        // Apply theme cascade to root
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
                if (hasError) {
                    el.classList.add('border-destructive', 'focus-visible:ring-destructive');
                    el.classList.remove('border-input');
                } else {
                    el.classList.remove('border-destructive', 'focus-visible:ring-destructive');
                    el.classList.add('border-input');
                }
            },
        });
        return dispose;
    }, [behavior]);

    const p = behavior.presentation;
    const isTextarea = behavior.maxLines != null && behavior.maxLines > 1;
    const describedBy = [
        behavior.hint ? `${behavior.id}-hint` : '',
        `${behavior.id}-error`,
    ].filter(Boolean).join(' ');

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
            {isTextarea ? (
                <textarea
                    ref={controlRef as React.RefObject<HTMLTextAreaElement>}
                    id={behavior.id}
                    name={behavior.fieldPath}
                    rows={behavior.maxLines!}
                    placeholder={behavior.placeholder}
                    className={TEXTAREA}
                    aria-describedby={describedBy}
                />
            ) : (
                <input
                    ref={controlRef as React.RefObject<HTMLInputElement>}
                    id={behavior.id}
                    name={behavior.fieldPath}
                    type={behavior.resolvedInputType || 'text'}
                    placeholder={behavior.placeholder}
                    inputMode={behavior.inputMode as any}
                    className={INPUT}
                    aria-describedby={describedBy}
                />
            )}
            <p ref={errorRef} id={`${behavior.id}-error`} role="alert" aria-live="polite" className={ERROR} />
        </div>
    );
}

export const renderTextInput: AdapterRenderFn<TextInputBehavior> = createReactAdapter(ShadcnTextInput);
