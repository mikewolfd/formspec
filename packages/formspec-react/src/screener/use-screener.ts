/** @filedesc useScreener — React hook for the Formspec screener gate. */
import { useState, useCallback } from 'react';
import type { IFormEngine } from '@formspec-org/engine';
import type { UseScreenerOptions, UseScreenerResult, ScreenerRoute, ScreenerRouteType } from './types';

/**
 * Read the item's data type, supporting both the canonical schema field
 * (`dataType`) and the simplified alias (`type`) from the user-facing API.
 */
function itemDataType(item: any): string {
    return item.dataType ?? item.type ?? 'text';
}

/**
 * Read the item's option list, supporting both the canonical schema field
 * (`options`) and the simplified alias (`choices`).
 */
function itemOptions(item: any): any[] {
    return item.options ?? item.choices ?? [];
}

/**
 * Determine whether a screener item is required.
 * Checks the item's own `required` flag first, then falls back to
 * `screener.binds` (the canonical location in the definition schema).
 */
function isItemRequired(item: any, screener: any): boolean {
    if (item.required === true) return true;
    const binds: any[] = screener?.binds ?? [];
    return binds.some(
        (b: any) => b.path === item.key && (b.required === 'true' || b.required === true),
    );
}

function buildSeedAnswers(items: any[], seed: Record<string, any> | undefined): Record<string, any> {
    const out: Record<string, any> = {};
    if (!seed) return out;
    for (const item of items) {
        if (seed[item.key] !== undefined) {
            out[item.key] = seed[item.key];
        }
    }
    return out;
}

export function useScreener(
    engine: IFormEngine,
    definition: any,
    options: UseScreenerOptions = {},
): UseScreenerResult {
    const screener = definition?.screener;
    const items: any[] = screener?.items ?? [];
    const routes: any[] = screener?.routes ?? [];

    const [answers, setAnswers] = useState<Record<string, any>>(() =>
        buildSeedAnswers(items, options.seedAnswers),
    );

    const [state, setState] = useState<'idle' | 'answering' | 'routed'>('idle');
    const [routeResult, setRouteResult] = useState<{
        route: ScreenerRoute;
        routeType: ScreenerRouteType;
    } | null>(null);
    const [skipped, setSkipped] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const setAnswer = useCallback((key: string, value: any) => {
        setAnswers(prev => ({ ...prev, [key]: value }));
        // Clear error for this field when the user changes it
        setErrors(prev => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setState(s => (s === 'idle' ? 'answering' : s));
    }, []);

    const submit = useCallback(() => {
        // Validate required fields
        const newErrors: Record<string, string> = {};
        const hasExplicitRequired = items.some(i => isItemRequired(i, screener));

        if (hasExplicitRequired) {
            for (const item of items) {
                if (isItemRequired(item, screener)) {
                    const val = answers[item.key];
                    if (val === undefined || val === null || val === '') {
                        newErrors[item.key] = `${item.label || item.key} is required`;
                    }
                }
            }
        } else {
            // No explicit required binds — require at least one non-empty answer
            const hasAny = items.some(i => {
                const v = answers[i.key];
                return v !== undefined && v !== null && v !== '';
            });
            if (!hasAny) {
                // Mark the first item as needing a value
                if (items.length > 0) {
                    newErrors[items[0].key] = 'Please answer at least one question';
                }
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setErrors({});

        const result = engine.evaluateScreener(answers);
        if (!result) {
            setRouteResult({ route: { target: '' }, routeType: 'none' });
            setState('routed');
            options.onRoute?.({ target: '' }, 'none', answers);
            return;
        }

        // Determine route type from definition routes.
        // The webcomponent checks whether the target matches the definition's own URL
        // (internal) vs. an external URL. For the React adapter we inspect the routes
        // array: a route whose target matches the definition URL is internal; otherwise
        // we fall back to checking for an explicit `type` field or URL heuristics.
        let routeType: ScreenerRouteType = 'internal';
        const defUrl = definition?.url;
        if (defUrl && result.target === defUrl) {
            routeType = 'internal';
        } else {
            const matchedRoute = routes.find(
                (r: any) => r.target === result.target || r.label === result.target,
            );
            if (matchedRoute?.type === 'external' || matchedRoute?.externalUrl) {
                routeType = 'external';
            } else if (defUrl && result.target !== defUrl) {
                // Different target than the definition's own URL — external
                routeType = 'external';
            }
        }

        const route: ScreenerRoute = {
            target: result.target,
            label: result.label,
            extensions: result.extensions,
        };

        setRouteResult({ route, routeType });
        setState('routed');
        options.onRoute?.(route, routeType, answers);
    }, [engine, answers, items, routes, screener, definition, options]);

    const restart = useCallback(() => {
        setAnswers(buildSeedAnswers(items, options.seedAnswers));
        setRouteResult(null);
        setErrors({});
        setState('idle');
        setSkipped(false);
    }, [items, options.seedAnswers]);

    const skip = useCallback(() => {
        setSkipped(true);
    }, []);

    return { state, answers, setAnswer, submit, restart, skip, routeResult, skipped, errors };
}

// Re-export helpers for use outside the hook (e.g. FormspecScreener field rendering)
export { itemDataType, itemOptions, isItemRequired };
