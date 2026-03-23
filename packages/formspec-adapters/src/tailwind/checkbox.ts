/** @filedesc Tailwind adapter for Checkbox — single boolean as a compact selectable card. */
import type { FieldBehavior, AdapterRenderFn } from 'formspec-webcomponent';
import { el, applyCascadeClasses, applyCascadeAccessibility } from '../helpers';
import { createTailwindError, TW, TW_CARD_OPTION, createCardOption, applyErrorStyling } from './shared';

export const renderCheckbox: AdapterRenderFn<FieldBehavior> = (
    behavior, parent, actx
) => {
    const p = behavior.presentation;

    const root = el('div', { class: TW.group, 'data-name': behavior.fieldPath });
    applyCascadeClasses(root, p);
    applyCascadeAccessibility(root, p);

    const { card, input } = createCardOption(behavior.id, behavior.label);
    input.name = behavior.fieldPath;
    input.type = 'checkbox';

    const describedBy = [
        behavior.hint ? `${behavior.id}-hint` : '',
        `${behavior.id}-error`,
    ].filter(Boolean).join(' ');
    input.setAttribute('aria-describedby', describedBy);

    // Label text is already added by createCardOption
    root.appendChild(card);

    let hint: HTMLElement | undefined;
    if (behavior.hint) {
        const hintId = `${behavior.id}-hint`;
        hint = el('p', { class: TW.hint, id: hintId });
        hint.textContent = behavior.hint;
        root.appendChild(hint);
    }

    const error = createTailwindError(behavior.id);
    root.appendChild(error);

    parent.appendChild(root);

    const dispose = behavior.bind({
        root, label: card, control: input, hint, error,
        onValidationChange: (hasError) => {
            applyErrorStyling(card, hasError);
        },
    });
    actx.onDispose(dispose);
};
