/** @filedesc shadcn adapter for Wizard — multi-step form with progress indicator. */
import React, { useRef, useLayoutEffect } from 'react';
import type { WizardBehavior, AdapterRenderFn } from 'formspec-webcomponent';
import { createReactAdapter } from './factory';

const BUTTON = 'inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
const BUTTON_OUTLINE = 'inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

function ShadcnWizard({ behavior }: { behavior: WizardBehavior }) {
    const rootRef = useRef<HTMLDivElement>(null!);
    const stepContentRef = useRef<HTMLDivElement>(null!);
    const prevRef = useRef<HTMLButtonElement>(null!);
    const nextRef = useRef<HTMLButtonElement>(null!);
    const panelRefs = useRef<HTMLDivElement[]>([]);
    const progressRefs = useRef<HTMLDivElement[]>([]);

    useLayoutEffect(() => {
        // Render initial step content into panels
        for (let i = 0; i < behavior.steps.length; i++) {
            const panel = panelRefs.current[i];
            if (panel) behavior.renderStep(i, panel);
        }

        const dispose = behavior.bind({
            root: rootRef.current,
            panels: panelRefs.current,
            stepContent: stepContentRef.current,
            prevButton: prevRef.current,
            nextButton: nextRef.current,
            progressItems: behavior.showProgress
                ? progressRefs.current.map((el) => ({ indicator: el }))
                : undefined,
        });
        return dispose;
    }, [behavior]);

    return (
        <div ref={rootRef} className="formspec-wizard space-y-6">
            {behavior.showProgress && (
                <div className="flex items-center gap-2">
                    {behavior.steps.map((step, i) => (
                        <div
                            key={step.id}
                            ref={(el) => { if (el) progressRefs.current[i] = el; }}
                            className="flex items-center gap-2"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted bg-background text-sm font-medium">
                                {i + 1}
                            </div>
                            <span className="text-sm text-muted-foreground">{step.title}</span>
                            {i < behavior.steps.length - 1 && (
                                <div className="h-px w-8 bg-border" />
                            )}
                        </div>
                    ))}
                </div>
            )}
            <div ref={stepContentRef}>
                {behavior.steps.map((step, i) => (
                    <div
                        key={step.id}
                        ref={(el) => { if (el) panelRefs.current[i] = el; }}
                        className="formspec-wizard-panel"
                        role="tabpanel"
                        aria-label={step.title}
                    />
                ))}
            </div>
            <div className="flex justify-between">
                <button ref={prevRef} type="button" className={BUTTON_OUTLINE} onClick={() => behavior.goPrev()}>
                    Previous
                </button>
                <button ref={nextRef} type="button" className={BUTTON} onClick={() => behavior.goNext()}>
                    Next
                </button>
            </div>
        </div>
    );
}

export const renderWizard: AdapterRenderFn<WizardBehavior> = createReactAdapter(ShadcnWizard);
