/** @filedesc USWDS v3 adapter for Checkbox — renders a single boolean usa-checkbox. */
import type { FieldBehavior, AdapterRenderFn } from '@formspec-org/webcomponent';
import { el, applyCascadeClasses, applyCascadeAccessibility } from '../helpers';
import { createUSWDSError } from './shared';

export const renderCheckbox: AdapterRenderFn<FieldBehavior> = (
    behavior, parent, actx
) => {
    const p = behavior.presentation;

    const root = el('div', { class: 'usa-form-group', 'data-name': behavior.fieldPath });
    applyCascadeClasses(root, p);
    applyCascadeAccessibility(root, p);

    const wrapper = el('div', { class: 'usa-checkbox' });

    const input = document.createElement('input') as HTMLInputElement;
    // No usa-checkbox__input class — that hides the native input via USWDS CSS.
    // We show the native checkbox directly in our trailing layout.
    input.id = behavior.id;
    input.type = 'checkbox';
    input.name = behavior.fieldPath;

    const describedBy = [
        behavior.hint ? `${behavior.id}-hint` : '',
        `${behavior.id}-error`,
    ].filter(Boolean).join(' ');
    input.setAttribute('aria-describedby', describedBy);

    // Standalone boolean: label text on the left, checkbox on the right.
    // We use a plain <label> instead of usa-checkbox__label to avoid USWDS's
    // ::before/::after pseudo-element checkbox rendering — the native checkbox
    // input is shown directly on the right via flex ordering.
    const label = el('label', { class: 'formspec-trailing-checkbox-label', for: behavior.id });
    label.textContent = behavior.label;
    if (p.labelPosition === 'hidden') label.classList.add('usa-sr-only');

    wrapper.classList.add('formspec-trailing-checkbox');
    wrapper.appendChild(label);
    wrapper.appendChild(input);
    root.appendChild(wrapper);

    let hint: HTMLElement | undefined;
    if (behavior.hint) {
        const hintId = `${behavior.id}-hint`;
        hint = el('span', { class: 'usa-hint', id: hintId });
        hint.textContent = behavior.hint;
        root.appendChild(hint);
    }

    const error = createUSWDSError(behavior.id);
    root.appendChild(error);

    parent.appendChild(root);

    const dispose = behavior.bind({
        root, label, control: input, hint, error,
        onValidationChange: (hasError) => {
            root.classList.toggle('usa-form-group--error', hasError);
        },
    });
    actx.onDispose(dispose);
};
