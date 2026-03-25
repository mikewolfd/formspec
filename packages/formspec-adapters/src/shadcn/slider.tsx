/** @filedesc shadcn adapter for Slider — range input. */
import React, { useRef, useLayoutEffect } from 'react';
import type { SliderBehavior, AdapterRenderFn } from 'formspec-webcomponent';
import { applyCascadeClasses, applyCascadeAccessibility } from '../helpers';
import { createReactAdapter } from './factory';
import { cn } from './cn';

const LABEL = 'text-sm font-medium leading-none';
const ERROR = 'text-sm font-medium text-destructive';
const HINT = 'text-sm text-muted-foreground';

function ShadcnSlider({ behavior }: { behavior: SliderBehavior }) {
    const rootRef = useRef<HTMLDivElement>(null!);
    const labelRef = useRef<HTMLLabelElement>(null!);
    const controlRef = useRef<HTMLInputElement>(null!);
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
        });
        return dispose;
    }, [behavior]);

    const p = behavior.presentation;

    return (
        <div ref={rootRef} className="space-y-3" data-name={behavior.fieldPath}>
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
            <input
                ref={controlRef}
                id={behavior.id}
                name={behavior.fieldPath}
                type="range"
                min={behavior.min}
                max={behavior.max}
                step={behavior.step}
                className="w-full cursor-pointer accent-primary"
                aria-describedby={`${behavior.id}-error`}
            />
            <p ref={errorRef} id={`${behavior.id}-error`} role="alert" aria-live="polite" className={ERROR} />
        </div>
    );
}

export const renderSlider: AdapterRenderFn<SliderBehavior> = createReactAdapter(ShadcnSlider);
