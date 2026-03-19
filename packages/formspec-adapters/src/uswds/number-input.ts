/** @filedesc USWDS v3 adapter for NumberInput — renders usa-input with type="number". */
import type { NumberInputBehavior, AdapterRenderFn } from 'formspec-webcomponent';
import { createUSWDSFieldDOM } from './shared';

export const renderNumberInput: AdapterRenderFn<NumberInputBehavior> = (
    behavior, parent, actx
) => {
    const p = behavior.presentation;

    const { root, label, hint, error, describedBy } = createUSWDSFieldDOM(behavior);

    if (p.labelPosition === 'start') root.style.display = 'flex';

    const input = document.createElement('input') as HTMLInputElement;
    input.className = 'usa-input';
    input.type = 'number';
    input.id = behavior.id;
    input.name = behavior.fieldPath;
    if (behavior.step != null) input.step = String(behavior.step);
    if (behavior.min != null) input.min = String(behavior.min);
    if (behavior.max != null) input.max = String(behavior.max);

    input.setAttribute('aria-describedby', describedBy);
    root.appendChild(input);

    root.appendChild(error);

    parent.appendChild(root);

    const dispose = behavior.bind({
        root, label, control: input, hint, error,
        onValidationChange: (hasError) => {
            root.classList.toggle('usa-form-group--error', hasError);
            input.classList.toggle('usa-input--error', hasError);
        },
    });
    actx.onDispose(dispose);
};
