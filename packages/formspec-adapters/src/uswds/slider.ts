/** @filedesc USWDS v3 adapter for Slider — usa-range input with optional value display and ticks. */
import type { SliderBehavior, AdapterRenderFn } from 'formspec-webcomponent';
import { el } from '../helpers';
import { createUSWDSFieldDOM } from './shared';

export const renderSlider: AdapterRenderFn<SliderBehavior> = (
    behavior, parent, actx
) => {
    const { root, label, hint, error, describedBy: _describedBy } = createUSWDSFieldDOM(behavior);

    // Container for range input + value display
    const container = el('div', {});

    const input = document.createElement('input') as HTMLInputElement;
    input.className = 'usa-range';
    input.id = behavior.id;
    input.name = behavior.fieldPath;
    input.type = 'range';
    if (behavior.min != null) input.min = String(behavior.min);
    if (behavior.max != null) input.max = String(behavior.max);
    if (behavior.step != null) input.step = String(behavior.step);

    // Ticks datalist
    if (behavior.showTicks && behavior.min != null && behavior.max != null && behavior.step != null) {
        const tickCount = Math.floor((behavior.max - behavior.min) / behavior.step) + 1;
        if (tickCount > 0 && tickCount <= 200) {
            const listId = `usa-ticks-${behavior.fieldPath.replace(/\./g, '-')}`;
            const datalist = document.createElement('datalist');
            datalist.id = listId;
            for (let v = behavior.min; v <= behavior.max; v += behavior.step) {
                const opt = document.createElement('option');
                opt.value = String(v);
                datalist.appendChild(opt);
            }
            container.appendChild(datalist);
            input.setAttribute('list', listId);
        }
    }

    container.appendChild(input);

    // Value display
    if (behavior.showValue) {
        const valueDisplay = el('span', { class: 'formspec-slider-value' });
        container.appendChild(valueDisplay);
    }

    root.appendChild(container);

    root.appendChild(error);

    parent.appendChild(root);

    const dispose = behavior.bind({
        root, label, control: container, hint, error,
        onValidationChange: (hasError) => {
            root.classList.toggle('usa-form-group--error', hasError);
            input.classList.toggle('usa-range--error', hasError);
        },
    });
    actx.onDispose(dispose);
};
