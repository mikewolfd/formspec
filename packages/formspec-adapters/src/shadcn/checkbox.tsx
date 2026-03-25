/** @filedesc shadcn adapter for Checkbox — single boolean toggle. */
import React, { useRef, useLayoutEffect } from 'react';
import type { FieldBehavior, AdapterRenderFn } from 'formspec-webcomponent';
import { applyCascadeClasses, applyCascadeAccessibility } from '../helpers';
import { createReactAdapter } from './factory';

const CHECKBOX = 'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const LABEL = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';
const ERROR = 'text-sm font-medium text-destructive';

function ShadcnCheckbox({ behavior }: { behavior: FieldBehavior }) {
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
                controlRef.current?.classList.toggle('border-destructive', hasError);
            },
        });
        return dispose;
    }, [behavior]);

    return (
        <div ref={rootRef} className="flex items-start space-x-3" data-name={behavior.fieldPath}>
            <input
                ref={controlRef}
                id={behavior.id}
                name={behavior.fieldPath}
                type="checkbox"
                className={CHECKBOX}
            />
            <label ref={labelRef} htmlFor={behavior.id} className={LABEL}>
                {behavior.label}
            </label>
            <p ref={errorRef} id={`${behavior.id}-error`} role="alert" aria-live="polite" className={ERROR} />
        </div>
    );
}

export const renderCheckbox: AdapterRenderFn<FieldBehavior> = createReactAdapter(ShadcnCheckbox);
