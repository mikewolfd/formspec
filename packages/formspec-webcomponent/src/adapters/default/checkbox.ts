/** @filedesc Default adapter for Checkbox — renders a simple boolean checkbox input. */
import type { FieldBehavior } from '../../behaviors/types';
import type { AdapterRenderFn } from '../types';
import { createFieldDOM, finalizeFieldDOM, applyControlSlotClass } from './shared';

export const renderCheckbox: AdapterRenderFn<FieldBehavior> = (
    behavior, parent, actx
) => {
    const fieldDOM = createFieldDOM(behavior, actx);

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'formspec-input';
    checkbox.name = behavior.fieldPath;
    checkbox.id = behavior.id;
    checkbox.setAttribute('aria-describedby', fieldDOM.describedBy.join(' '));

    fieldDOM.root.appendChild(checkbox);
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
