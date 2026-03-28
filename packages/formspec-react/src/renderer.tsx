/** @filedesc FormspecForm — auto-renderer that walks LayoutNode tree into React elements. */
import React, { useState, useCallback } from 'react';
import { FormspecProvider } from './context';
import type { FormspecProviderProps } from './context';
import { useFormspecContext } from './context';
import { FormspecNode } from './node-renderer';
import { FormspecScreener } from './screener/FormspecScreener';
import type { ScreenerRoute, ScreenerRouteType } from './screener/types';

export interface FormspecFormProps extends Omit<FormspecProviderProps, 'children'> {
    /** Optional className on the root container. */
    className?: string;
    /** When true, bypass the screener gate entirely. */
    skipScreener?: boolean;
    /** Pre-fill answers for the screener fields. */
    screenerSeedAnswers?: Record<string, any>;
    /** Render prop for the external route result in the screener. */
    renderExternalRoute?: (route: ScreenerRoute) => React.ReactNode;
    /** Render prop for the "no match" result in the screener. */
    renderNoMatch?: () => React.ReactNode;
    /** Callback when the screener determines a route. */
    onScreenerRoute?: (route: ScreenerRoute, routeType: ScreenerRouteType, answers: Record<string, any>) => void;
}

/**
 * Drop-in auto-renderer: takes a definition and renders the full form.
 *
 * Wraps itself in a FormspecProvider, plans the layout, and renders
 * each LayoutNode through the component map.
 *
 * When the definition contains a screener, the screener gate is rendered first.
 * Once the screener routes internally (or is skipped), the form is shown.
 */
export function FormspecForm({
    className,
    skipScreener,
    screenerSeedAnswers,
    renderExternalRoute,
    renderNoMatch,
    onScreenerRoute,
    ...providerProps
}: FormspecFormProps) {
    const definition = providerProps.definition ?? providerProps.engine?.getDefinition();
    const hasScreener = !skipScreener && hasActiveScreenerDef(definition);

    const [screenerDone, setScreenerDone] = useState(!hasScreener);

    const handleRoute = useCallback(
        (route: ScreenerRoute, routeType: ScreenerRouteType, answers: Record<string, any>) => {
            if (routeType === 'internal') {
                setScreenerDone(true);
            }
            onScreenerRoute?.(route, routeType, answers);
        },
        [onScreenerRoute],
    );

    // If the screener is active and not yet resolved, render it standalone
    if (hasScreener && !screenerDone) {
        return (
            <FormspecProvider {...providerProps}>
                <ScreenerGate
                    definition={definition}
                    className={className}
                    seedAnswers={screenerSeedAnswers}
                    renderExternalRoute={renderExternalRoute}
                    renderNoMatch={renderNoMatch}
                    onRoute={handleRoute}
                    onSkip={() => setScreenerDone(true)}
                />
            </FormspecProvider>
        );
    }

    return (
        <FormspecProvider {...providerProps}>
            <FormspecFormInner className={className} />
        </FormspecProvider>
    );
}

/**
 * Screener gate rendered inside a FormspecProvider so it has access to the engine.
 * When the screener component returns null (internal route or skip), we notify the
 * parent to flip to form rendering.
 */
function ScreenerGate({
    definition,
    className,
    seedAnswers,
    renderExternalRoute,
    renderNoMatch,
    onRoute,
    onSkip,
}: {
    definition: any;
    className?: string;
    seedAnswers?: Record<string, any>;
    renderExternalRoute?: (route: ScreenerRoute) => React.ReactNode;
    renderNoMatch?: () => React.ReactNode;
    onRoute?: (route: ScreenerRoute, routeType: ScreenerRouteType, answers: Record<string, any>) => void;
    onSkip: () => void;
}) {
    const { engine } = useFormspecContext();

    return (
        <div className={className ? `formspec-container ${className}` : 'formspec-container'}>
            <FormspecScreener
                definition={definition}
                engine={engine}
                seedAnswers={seedAnswers}
                renderExternalRoute={renderExternalRoute}
                renderNoMatch={renderNoMatch}
                onRoute={(route, routeType, answers) => {
                    onRoute?.(route, routeType, answers);
                    // If the screener resolved to internal or was skipped,
                    // FormspecScreener returns null — but we also need to
                    // notify the parent so it can switch to form rendering.
                    // The parent's handleRoute already does setScreenerDone
                    // for internal routes.
                }}
            />
        </div>
    );
}

function FormspecFormInner({ className }: { className?: string }) {
    const { layoutPlan } = useFormspecContext();

    if (!layoutPlan) {
        const containerClass = className
            ? `formspec-container ${className}`
            : 'formspec-container';
        return <div className={containerClass}>No layout plan available.</div>;
    }

    // The layout plan root already carries `formspec-container` (added in
    // context.tsx during planning). Wrapping it in another container div
    // creates nested flex-column parents that stretch children (submit
    // button, add/remove buttons) to full width.  Render the plan directly;
    // pass any caller className through by appending to the root node.
    if (className) {
        if (!layoutPlan.cssClasses.includes(className)) {
            layoutPlan.cssClasses = [...layoutPlan.cssClasses, className];
        }
    }

    return <FormspecNode node={layoutPlan} />;
}

/** Check whether a definition has an active screener block. */
function hasActiveScreenerDef(definition: any): boolean {
    const screener = definition?.screener;
    return (
        screener?.enabled !== false &&
        Array.isArray(screener?.items) &&
        screener.items.length > 0
    );
}
