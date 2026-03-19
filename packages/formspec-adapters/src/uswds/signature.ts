/** @filedesc USWDS v3 adapter for Signature — canvas drawing with USWDS button for clear. */
import type { SignatureBehavior, AdapterRenderFn } from 'formspec-webcomponent';
import { createSignatureCanvas } from 'formspec-webcomponent';
import { el } from '../helpers';
import { createUSWDSFieldDOM } from './shared';

export const renderSignature: AdapterRenderFn<SignatureBehavior> = (
    behavior, parent, actx
) => {
    const { root, label, hint, error, describedBy } = createUSWDSFieldDOM(behavior, { labelFor: false });

    // Canvas — shared utility handles drawing, resize, touch, events
    const { canvas, clear, dispose: canvasDispose } = createSignatureCanvas({
        height: behavior.height,
        strokeColor: behavior.strokeColor,
        eventTarget: root,
    });
    canvas.style.width = '100%';
    canvas.style.border = '1px solid';
    canvas.setAttribute('tabindex', '0');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Signature canvas. Use the Clear button to reset.');
    canvas.setAttribute('aria-describedby', describedBy);

    root.appendChild(canvas);
    actx.onDispose(canvasDispose);

    // Clear button — USWDS outline button
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'usa-button usa-button--outline';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', clear);
    root.appendChild(clearBtn);

    root.appendChild(error);

    parent.appendChild(root);

    const dispose = behavior.bind({
        root, label, control: canvas, hint, error,
        onValidationChange: (hasError) => {
            root.classList.toggle('usa-form-group--error', hasError);
        },
    });
    actx.onDispose(dispose);
};
