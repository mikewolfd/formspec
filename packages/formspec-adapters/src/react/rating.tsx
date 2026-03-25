/** @filedesc shadcn adapter for Rating — star rating widget with ARIA slider. */
import React, { useRef, useLayoutEffect } from 'react';
import type { RatingBehavior, AdapterRenderFn } from 'formspec-webcomponent';
import { applyCascadeClasses, applyCascadeAccessibility } from '../helpers';
import { createReactAdapter } from './factory';
import { cn } from './cn';

const LABEL = 'text-sm font-medium leading-none';
const ERROR = 'text-sm font-medium text-destructive';
const HINT = 'text-sm text-muted-foreground';

function ShadcnRating({ behavior }: { behavior: RatingBehavior }) {
    const rootRef = useRef<HTMLDivElement>(null!);
    const labelRef = useRef<HTMLLabelElement>(null!);
    const controlRef = useRef<HTMLDivElement>(null!);
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
    const stars = Array.from({ length: behavior.maxRating }, (_, i) => i + 1);

    return (
        <div ref={rootRef} className="space-y-2" data-name={behavior.fieldPath}>
            <label
                ref={labelRef}
                className={cn(LABEL, p.labelPosition === 'hidden' && 'sr-only')}
            >
                {behavior.label}
            </label>
            {behavior.hint && (
                <p ref={hintRef} id={`${behavior.id}-hint`} className={HINT}>
                    {behavior.hint}
                </p>
            )}
            <div
                ref={controlRef}
                id={behavior.id}
                role="slider"
                tabIndex={0}
                aria-valuemin={0}
                aria-valuemax={behavior.maxRating}
                aria-valuenow={0}
                aria-label={behavior.label}
                className="flex items-center gap-1"
            >
                {stars.map((val) => (
                    <span
                        key={val}
                        className="formspec-rating-star cursor-pointer text-2xl text-muted-foreground transition-colors hover:text-primary"
                        data-value={val}
                        onClick={() => behavior.setValue(val)}
                    >
                        {behavior.icon}
                    </span>
                ))}
            </div>
            <p ref={errorRef} id={`${behavior.id}-error`} role="alert" aria-live="polite" className={ERROR} />
        </div>
    );
}

export const renderRating: AdapterRenderFn<RatingBehavior> = createReactAdapter(ShadcnRating);
