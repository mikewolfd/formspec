/** @filedesc Main demo app — mounts formspec-render with the shadcn adapter. */
import React, { useEffect, useRef, useState } from 'react';
import definition from './definition.json';

// Teach TS about the custom element
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'formspec-render': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        }
    }
}

export function App() {
    const rendererRef = useRef<HTMLElement>(null);
    const [response, setResponse] = useState<object | null>(null);
    const [validationReport, setValidationReport] = useState<any>(null);

    useEffect(() => {
        const el = rendererRef.current as any;
        if (!el) return;
        el.definition = definition;
    }, []);

    const handleSubmit = () => {
        const el = rendererRef.current as any;
        if (!el?.submit) return;
        const detail = el.submit({ emitEvent: false, mode: 'submit' });
        if (detail) {
            setResponse(detail.response);
            setValidationReport(detail.validationReport);
        }
    };

    const handleReset = () => {
        const el = rendererRef.current as any;
        if (!el) return;
        el.definition = definition;
        setResponse(null);
        setValidationReport(null);
    };

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <header className="mb-8">
                <div className="flex items-center gap-3">
                    <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-bold tracking-wider text-primary-foreground uppercase">
                        Formspec
                    </span>
                    <h1 className="text-2xl font-bold tracking-tight">
                        shadcn Adapter Demo
                    </h1>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                    Every form field rendered through React components styled with shadcn design tokens.
                </p>
            </header>

            <div className="rounded-xl border border-border bg-background p-6 shadow-sm">
                <formspec-render ref={rendererRef} />
            </div>

            <div className="mt-6 flex gap-3">
                <button
                    onClick={handleSubmit}
                    className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    Submit
                </button>
                <button
                    onClick={handleReset}
                    className="rounded-md border border-input bg-background px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                    Reset
                </button>
            </div>

            {response && (
                <div className="mt-6 space-y-4">
                    {validationReport && !validationReport.valid && (
                        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                            <h3 className="text-sm font-semibold text-destructive">
                                Validation Errors ({validationReport.counts.error})
                            </h3>
                            <ul className="mt-2 list-inside list-disc text-sm text-destructive/80">
                                {validationReport.results
                                    .filter((r: any) => r.severity === 'error')
                                    .map((r: any, i: number) => (
                                        <li key={i}>{r.path}: {r.message}</li>
                                    ))
                                }
                            </ul>
                        </div>
                    )}
                    <details className="rounded-lg border border-border bg-background p-4">
                        <summary className="cursor-pointer text-sm font-semibold">
                            Response JSON
                        </summary>
                        <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-4 text-xs">
                            {JSON.stringify(response, null, 2)}
                        </pre>
                    </details>
                </div>
            )}
        </div>
    );
}
