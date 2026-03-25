/** @filedesc shadcn adapter for MoneyInput — currency input with prefix. */
import React, { useRef, useLayoutEffect } from 'react';
import type { MoneyInputBehavior, AdapterRenderFn } from 'formspec-webcomponent';
import { applyCascadeClasses, applyCascadeAccessibility } from '../helpers';
import { createReactAdapter } from './factory';
import { cn } from './cn';

const INPUT = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const LABEL = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';
const ERROR = 'text-sm font-medium text-destructive';
const HINT = 'text-sm text-muted-foreground';
const PREFIX = 'inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground';

function ShadcnMoneyInput({ behavior }: { behavior: MoneyInputBehavior }) {
    const rootRef = useRef<HTMLDivElement>(null!);
    const labelRef = useRef<HTMLLabelElement>(null!);
    const controlRef = useRef<HTMLInputElement>(null!);
    const hintRef = useRef<HTMLParagraphElement>(null);
    const errorRef = useRef<HTMLParagraphElement>(null!);
    const currencyRef = useRef<HTMLInputElement>(null);

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
                controlRef.current?.classList.toggle('border-destructive', hasError);
                controlRef.current?.classList.toggle('border-input', !hasError);
            },
        });
        return dispose;
    }, [behavior]);

    const p = behavior.presentation;
    const hasCurrency = behavior.resolvedCurrency != null;
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
            <div className="flex">
                {hasCurrency && (
                    <span className={PREFIX}>{behavior.resolvedCurrency}</span>
                )}
                <input
                    ref={controlRef}
                    id={behavior.id}
                    name={behavior.fieldPath}
                    type="number"
                    min={behavior.min}
                    max={behavior.max}
                    step={behavior.step ?? 0.01}
                    placeholder={behavior.placeholder}
                    className={cn(
                        INPUT,
                        hasCurrency && 'rounded-l-none',
                    )}
                    aria-describedby={describedBy}
                />
                {!hasCurrency && (
                    <input
                        ref={currencyRef}
                        type="text"
                        placeholder="Currency"
                        className={cn(INPUT, 'ml-2 max-w-[80px]')}
                        aria-label="Currency code"
                    />
                )}
            </div>
            <p ref={errorRef} id={`${behavior.id}-error`} role="alert" aria-live="polite" className={ERROR} />
        </div>
    );
}

export const renderMoneyInput: AdapterRenderFn<MoneyInputBehavior> = createReactAdapter(ShadcnMoneyInput);
