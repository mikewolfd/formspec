/** @filedesc shadcn adapter for Signature — canvas with clear button. */
import React, { useRef, useLayoutEffect } from 'react';
import type { SignatureBehavior, AdapterRenderFn } from 'formspec-webcomponent';
import { applyCascadeClasses, applyCascadeAccessibility } from '../helpers';
import { createReactAdapter } from './factory';
import { cn } from './cn';

const LABEL = 'text-sm font-medium leading-none';
const ERROR = 'text-sm font-medium text-destructive';
const BUTTON = 'inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function ShadcnSignature({ behavior }: { behavior: SignatureBehavior }) {
    const rootRef = useRef<HTMLDivElement>(null!);
    const labelRef = useRef<HTMLLabelElement>(null!);
    const canvasRef = useRef<HTMLCanvasElement>(null!);
    const errorRef = useRef<HTMLParagraphElement>(null!);

    useLayoutEffect(() => {
        applyCascadeClasses(rootRef.current, behavior.presentation);
        applyCascadeAccessibility(rootRef.current, behavior.presentation);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.strokeStyle = behavior.strokeColor;
            ctx.lineWidth = 2;
        }

        let drawing = false;
        const onMouseDown = (e: MouseEvent) => {
            drawing = true;
            ctx?.beginPath();
            ctx?.moveTo(e.offsetX, e.offsetY);
        };
        const onMouseMove = (e: MouseEvent) => {
            if (!drawing || !ctx) return;
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
        };
        const onMouseUp = () => { drawing = false; };

        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mouseleave', onMouseUp);

        const dispose = behavior.bind({
            root: rootRef.current,
            label: labelRef.current,
            control: canvas,
            error: errorRef.current,
        });

        return () => {
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('mouseleave', onMouseUp);
            dispose();
        };
    }, [behavior]);

    const p = behavior.presentation;

    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    return (
        <div ref={rootRef} className="space-y-2" data-name={behavior.fieldPath}>
            <label
                ref={labelRef}
                className={cn(LABEL, p.labelPosition === 'hidden' && 'sr-only')}
            >
                {behavior.label}
            </label>
            <div className="rounded-lg border border-input bg-background p-1">
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={behavior.height}
                    className="w-full cursor-crosshair"
                />
            </div>
            <button type="button" onClick={handleClear} className={BUTTON}>
                Clear
            </button>
            <p ref={errorRef} id={`${behavior.id}-error`} role="alert" aria-live="polite" className={ERROR} />
        </div>
    );
}

export const renderSignature: AdapterRenderFn<SignatureBehavior> = createReactAdapter(ShadcnSignature);
