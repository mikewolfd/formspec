/** @filedesc shadcn adapter for FileUpload — file input with drop zone. */
import React, { useRef, useLayoutEffect } from 'react';
import type { FileUploadBehavior, AdapterRenderFn } from 'formspec-webcomponent';
import { applyCascadeClasses, applyCascadeAccessibility } from '../helpers';
import { createReactAdapter } from './factory';
import { cn } from './cn';

const LABEL = 'text-sm font-medium leading-none';
const ERROR = 'text-sm font-medium text-destructive';
const HINT = 'text-sm text-muted-foreground';
const DROPZONE = 'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-input bg-background p-8 text-center transition-colors hover:border-primary hover:bg-accent/50';

function ShadcnFileUpload({ behavior }: { behavior: FileUploadBehavior }) {
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
            <div className={DROPZONE}>
                <p className="mb-2 text-sm text-muted-foreground">
                    {behavior.dragDrop ? 'Drag & drop files here, or click to browse' : 'Click to browse files'}
                </p>
                <input
                    ref={controlRef}
                    id={behavior.id}
                    name={behavior.fieldPath}
                    type="file"
                    accept={behavior.accept}
                    multiple={behavior.multiple}
                    className="cursor-pointer text-sm file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
                />
            </div>
            <p ref={errorRef} id={`${behavior.id}-error`} role="alert" aria-live="polite" className={ERROR} />
        </div>
    );
}

export const renderFileUpload: AdapterRenderFn<FileUploadBehavior> = createReactAdapter(ShadcnFileUpload);
