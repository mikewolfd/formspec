import { FormEngine } from 'formspec-engine';
import { ScreenerRoute } from '../types.js';

export interface ScreenerHost {
    _definition: any;
    engine: FormEngine;
    _screenerCompleted: boolean;
    _screenerRoute: ScreenerRoute | null;
    classifyScreenerRoute(route: ScreenerRoute | null | undefined): 'none' | 'internal' | 'external';
    emitScreenerStateChange(reason: string, answers?: Record<string, any>): void;
    dispatchEvent(event: Event): boolean;
    render(): void;
}

export function renderScreener(host: ScreenerHost, container: HTMLElement): void {
    const screener = host._definition.screener;
    const panel = document.createElement('div');
    panel.className = 'formspec-screener';

    const heading = document.createElement('h2');
    heading.className = 'formspec-screener-heading';
    heading.textContent = host._definition.title || 'Screening Questions';
    panel.appendChild(heading);

    if (host._definition.description) {
        const intro = document.createElement('p');
        intro.className = 'formspec-screener-intro';
        intro.textContent = host._definition.description;
        panel.appendChild(intro);
    }

    const fieldsContainer = document.createElement('div');
    fieldsContainer.className = 'formspec-screener-fields';
    panel.appendChild(fieldsContainer);

    const answers: Record<string, any> = {};

    for (const item of screener.items) {
        const fieldWrapper = document.createElement('div');
        fieldWrapper.className = 'formspec-field formspec-screener-field';
        fieldWrapper.dataset.name = item.key;

        const fieldId = `screener-${item.key}`;
        const label = document.createElement('label');
        label.textContent = host.engine.getLabel(item);
        label.htmlFor = fieldId;
        fieldWrapper.appendChild(label);

        if (item.hint) {
            const hint = document.createElement('span');
            hint.className = 'formspec-hint';
            hint.textContent = item.hint;
            fieldWrapper.appendChild(hint);
        }

        if (item.dataType === 'choice' && item.options) {
            const select = document.createElement('select');
            select.className = 'formspec-input';
            select.id = fieldId;
            const emptyOpt = document.createElement('option');
            emptyOpt.value = '';
            emptyOpt.textContent = '-- Select --';
            select.appendChild(emptyOpt);
            for (const opt of item.options) {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label || opt.value;
                select.appendChild(option);
            }
            select.addEventListener('change', () => {
                answers[item.key] = select.value || null;
            });
            fieldWrapper.appendChild(select);
        } else if (item.dataType === 'boolean') {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'formspec-input';
            checkbox.id = fieldId;
            checkbox.addEventListener('change', () => {
                answers[item.key] = checkbox.checked;
            });
            fieldWrapper.appendChild(checkbox);
        } else if (item.dataType === 'money') {
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'formspec-input';
            input.id = fieldId;
            input.placeholder = 'Amount';
            input.addEventListener('input', () => {
                const val = parseFloat(input.value);
                answers[item.key] = isNaN(val) ? null : { amount: val, currency: host._definition.formPresentation?.defaultCurrency || 'USD' };
            });
            fieldWrapper.appendChild(input);
        } else {
            const input = document.createElement('input');
            input.type = item.dataType === 'integer' || item.dataType === 'decimal' || item.dataType === 'number' ? 'number' : 'text';
            input.className = 'formspec-input';
            input.id = fieldId;
            input.addEventListener('input', () => {
                const val = input.value;
                if (item.dataType === 'integer') {
                    answers[item.key] = val ? parseInt(val, 10) : null;
                } else if (item.dataType === 'decimal' || item.dataType === 'number') {
                    answers[item.key] = val ? parseFloat(val) : null;
                } else {
                    answers[item.key] = val || null;
                }
            });
            fieldWrapper.appendChild(input);
        }

        fieldsContainer.appendChild(fieldWrapper);
    }

    const continueBtn = document.createElement('button');
    continueBtn.type = 'button';
    continueBtn.className = 'formspec-screener-continue';
    continueBtn.textContent = 'Continue';
    continueBtn.addEventListener('click', () => {
        const route = host.engine.evaluateScreener(answers);
        host._screenerRoute = route;
        const routeType = host.classifyScreenerRoute(route);
        const isInternal = routeType === 'internal';

        host.dispatchEvent(new CustomEvent('formspec-screener-route', {
            detail: { route, answers, routeType, isInternal },
            bubbles: true,
            composed: true,
        }));

        if (isInternal) {
            host._screenerCompleted = true;
            host.emitScreenerStateChange('route-internal', answers);
            host.render();
            return;
        }

        host.emitScreenerStateChange(route ? 'route-external' : 'route-none', answers);
    });
    panel.appendChild(continueBtn);

    container.appendChild(panel);
}
