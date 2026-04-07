/** @filedesc Default adapter for Checkbox — renders a simple boolean checkbox input. */
import type { FieldBehavior } from '../../behaviors/types';
import type { AdapterRenderFn } from '../types';
import { createFieldDOM, finalizeFieldDOM, applyControlSlotClass } from './shared';

export const renderCheckbox: AdapterRenderFn<FieldBehavior> = (
    behavior, parent, actx
) => {
    const fieldDOM = createFieldDOM(behavior, actx);

    // Checkbox special case: when labelPosition is 'top' (default),
    // the original field-input.ts adds formspec-field--inline (lines 82-84).
    const effectiveLP = behavior.presentation.labelPosition || 'top';
    if (effectiveLP === 'top') {
        fieldDOM.root.classList.add('formspec-field--inline');
    }

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'formspec-input';
    checkbox.name = behavior.fieldPath;
    checkbox.id = behavior.id;

    // After label, description, and hint — same vertical order as other default adapters.
    const anchor =
        fieldDOM.hint
        ?? fieldDOM.root.querySelector<HTMLElement>('.formspec-description')
        ?? fieldDOM.label;
    anchor.insertAdjacentElement('afterend', checkbox);
    applyControlSlotClass(checkbox, behavior, actx);
    finalizeFieldDOM(fieldDOM, behavior, actx);
    parent.appendChild(fieldDOM.root);

    const dispose = behavior.bind({
        root: fieldDOM.root,
        label: fieldDOM.label,
        control: checkbox,
        hint: fieldDOM.hint,
        error: fieldDOM.error,
    });
    actx.onDispose(dispose);
};
