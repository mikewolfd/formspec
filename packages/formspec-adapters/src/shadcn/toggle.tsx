/** @filedesc shadcn adapter for Toggle — switch control. */
import React, { useRef, useLayoutEffect } from 'react';
import type { ToggleBehavior, AdapterRenderFn } from 'formspec-webcomponent';
import { applyCascadeClasses, applyCascadeAccessibility } from '../helpers';
import { createReactAdapter } from './factory';
import { cn } from './cn';

const SWITCH = 'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';
const LABEL = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';
const ERROR = 'text-sm font-medium text-destructive';

function ShadcnToggle({ behavior }: { behavior: ToggleBehavior }) {
    const rootRef = useRef<HTMLDivElement>(null!);
    const labelRef = useRef<HTMLLabelElement>(null!);
    const controlRef = useRef<HTMLInputElement>(null!);
    const errorRef = useRef<HTMLParagraphElement>(null!);

    useLayoutEffect(() => {
        applyCascadeClasses(rootRef.current, behavior.presentation);
        applyCascadeAccessibility(rootRef.current, behavior.presentation);

        const dispose = behavior.bind({
            root: rootRef.current,
            label: labelRef.current,
            control: controlRef.current,
            error: errorRef.current,
            onValidationChange: (hasError) => {
                rootRef.current?.classList.toggle('text-destructive', hasError);
            },
        });
        return dispose;
    }, [behavior]);

    const p = behavior.presentation;

    return (
        <div ref={rootRef} className="flex items-center space-x-3" data-name={behavior.fieldPath}>
            <input
                ref={controlRef}
                id={behavior.id}
                name={behavior.fieldPath}
                type="checkbox"
                role="switch"
                className={SWITCH}
            />
            <label
                ref={labelRef}
                htmlFor={behavior.id}
                className={cn(LABEL, p.labelPosition === 'hidden' && 'sr-only')}
            >
                {behavior.label}
            </label>
            <p ref={errorRef} id={`${behavior.id}-error`} role="alert" aria-live="polite" className={ERROR} />
        </div>
    );
}

export const renderToggle: AdapterRenderFn<ToggleBehavior> = createReactAdapter(ShadcnToggle);
