/** @filedesc Tailwind adapter for Slider — range input with optional value display and ticks. */
import type { SliderBehavior, AdapterRenderFn } from '@formspec-org/webcomponent';
import { el } from '../helpers';
import { createTailwindFieldDOM } from './shared';

export const renderSlider: AdapterRenderFn<SliderBehavior> = (
    behavior, parent, actx
) => {
    const { root, label, hint, error } = createTailwindFieldDOM(behavior);

    const container = el('div', { class: 'flex flex-wrap items-center gap-2' });

    const input = document.createElement('input') as HTMLInputElement;
    input.className =
        'formspec-tw-range min-w-[10rem] flex-1 h-2 cursor-pointer rounded-full bg-[var(--formspec-tw-surface-muted)] accent-[var(--formspec-tw-accent)] appearance-none';
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
            const listId = `tw-ticks-${behavior.fieldPath.replace(/\./g, '-')}`;
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

    if (behavior.showValue) {
        const valueDisplay = el('span', {
            class: 'inline-flex min-w-[2.25rem] shrink-0 items-center justify-center rounded-lg px-2 py-0.5 text-sm font-semibold tabular-nums ring-1 ring-[var(--formspec-tw-accent-ring)] formspec-slider-value',
        });
        valueDisplay.style.backgroundColor = 'color-mix(in srgb, var(--formspec-tw-accent) 15%, var(--formspec-tw-surface-muted))';
        valueDisplay.style.color = 'var(--formspec-tw-accent)';
        container.appendChild(valueDisplay);
    }

    root.appendChild(container);
    root.appendChild(error);
    parent.appendChild(root);

    const dispose = behavior.bind({
        root, label, control: container, hint, error,
        onValidationChange: (hasError) => {
            input.classList.toggle('accent-[var(--formspec-tw-danger)]', hasError);
            input.classList.toggle('accent-[var(--formspec-tw-accent)]', !hasError);
        },
    });
    actx.onDispose(dispose);
};
