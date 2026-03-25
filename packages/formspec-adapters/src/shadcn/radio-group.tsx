/** @filedesc shadcn adapter for RadioGroup — fieldset with card-style radio options. */
import React, { useRef, useLayoutEffect } from 'react';
import type { RadioGroupBehavior, AdapterRenderFn } from 'formspec-webcomponent';
import { applyCascadeClasses, applyCascadeAccessibility } from '../helpers';
import { createReactAdapter } from './factory';
import { cn } from './cn';

const LEGEND = 'text-sm font-medium leading-none';
const ERROR = 'text-sm font-medium text-destructive';
const HINT = 'text-sm text-muted-foreground';
const RADIO = 'peer h-4 w-4 shrink-0 rounded-full border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
const OPTION_CARD = 'flex cursor-pointer items-center gap-3 rounded-lg border border-input bg-background p-4 transition-colors hover:bg-accent hover:text-accent-foreground has-[:checked]:border-primary has-[:checked]:bg-primary/5';

function buildOptions(
    behavior: RadioGroupBehavior,
    container: HTMLElement,
    options: ReadonlyArray<{ value: string; label: string }>,
): Map<string, HTMLInputElement> {
    container.innerHTML = '';
    const controls = new Map<string, HTMLInputElement>();

    for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const optId = `${behavior.id}-${i}`;

        const card = document.createElement('label');
        card.className = OPTION_CARD;
        card.htmlFor = optId;

        const input = document.createElement('input');
        input.className = RADIO;
        input.id = optId;
        input.type = 'radio';
        input.name = behavior.inputName;
        input.value = opt.value;
        controls.set(opt.value, input);

        const text = document.createElement('span');
        text.className = 'text-sm font-medium';
        text.textContent = opt.label;

        card.appendChild(input);
        card.appendChild(text);
        container.appendChild(card);
    }

    return controls;
}

function ShadcnRadioGroup({ behavior }: { behavior: RadioGroupBehavior }) {
    const rootRef = useRef<HTMLFieldSetElement>(null!);
    const legendRef = useRef<HTMLLegendElement>(null!);
    const optionContainerRef = useRef<HTMLDivElement>(null!);
    const hintRef = useRef<HTMLParagraphElement>(null);
    const errorRef = useRef<HTMLParagraphElement>(null!);

    useLayoutEffect(() => {
        applyCascadeClasses(rootRef.current, behavior.presentation);
        applyCascadeAccessibility(rootRef.current, behavior.presentation);

        const initialControls = buildOptions(behavior, optionContainerRef.current, behavior.options());

        const dispose = behavior.bind({
            root: rootRef.current,
            label: legendRef.current,
            control: rootRef.current,
            hint: hintRef.current ?? undefined,
            error: errorRef.current,
            optionControls: initialControls,
            rebuildOptions: (_container, newOptions) =>
                buildOptions(behavior, optionContainerRef.current, newOptions),
            onValidationChange: (hasError) => {
                rootRef.current?.classList.toggle('ring-2', hasError);
                rootRef.current?.classList.toggle('ring-destructive', hasError);
                rootRef.current?.classList.toggle('rounded-lg', hasError);
            },
        });
        return dispose;
    }, [behavior]);

    const p = behavior.presentation;

    return (
        <fieldset ref={rootRef} className="space-y-3 border-0 p-0" data-name={behavior.fieldPath}>
            <legend
                ref={legendRef}
                className={cn(LEGEND, p.labelPosition === 'hidden' && 'sr-only')}
            >
                {behavior.label}
            </legend>
            {behavior.hint && (
                <p ref={hintRef} id={`${behavior.id}-hint`} className={HINT}>
                    {behavior.hint}
                </p>
            )}
            <div ref={optionContainerRef} className="grid gap-3 sm:grid-cols-2" />
            <p ref={errorRef} id={`${behavior.id}-error`} role="alert" aria-live="polite" className={ERROR} />
        </fieldset>
    );
}

export const renderRadioGroup: AdapterRenderFn<RadioGroupBehavior> = createReactAdapter(ShadcnRadioGroup);
