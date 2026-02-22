import { ComponentPlugin, RenderContext } from '../types';

const TextInputPlugin: ComponentPlugin = {
    type: 'TextInput',
    render: (comp: any, parent: HTMLElement, ctx: RenderContext) => {
        if (!comp.bind) return;
        const item = ctx.findItemByKey(comp.bind);
        if (!item) return;
        const fullName = ctx.prefix ? `${ctx.prefix}.${comp.bind}` : comp.bind;
        const el = ctx.renderInputComponent(comp, item, fullName);
        parent.appendChild(el);
    }
};

const NumberInputPlugin: ComponentPlugin = {
    type: 'NumberInput',
    render: (comp: any, parent: HTMLElement, ctx: RenderContext) => {
        if (!comp.bind) return;
        const item = ctx.findItemByKey(comp.bind);
        if (!item) return;
        const fullName = ctx.prefix ? `${ctx.prefix}.${comp.bind}` : comp.bind;
        const el = ctx.renderInputComponent(comp, item, fullName);
        parent.appendChild(el);
    }
};

const SelectPlugin: ComponentPlugin = {
    type: 'Select',
    render: (comp: any, parent: HTMLElement, ctx: RenderContext) => {
        if (!comp.bind) return;
        const item = ctx.findItemByKey(comp.bind);
        if (!item) return;
        const fullName = ctx.prefix ? `${ctx.prefix}.${comp.bind}` : comp.bind;
        const el = ctx.renderInputComponent(comp, item, fullName);
        parent.appendChild(el);
    }
};

const TogglePlugin: ComponentPlugin = {
    type: 'Toggle',
    render: (comp: any, parent: HTMLElement, ctx: RenderContext) => {
        if (!comp.bind) return;
        const item = ctx.findItemByKey(comp.bind);
        if (!item) return;
        const fullName = ctx.prefix ? `${ctx.prefix}.${comp.bind}` : comp.bind;
        const el = ctx.renderInputComponent(comp, item, fullName);
        parent.appendChild(el);
    }
};

const CheckboxPlugin: ComponentPlugin = {
    type: 'Checkbox',
    render: (comp: any, parent: HTMLElement, ctx: RenderContext) => {
        if (!comp.bind) return;
        const item = ctx.findItemByKey(comp.bind);
        if (!item) return;
        const fullName = ctx.prefix ? `${ctx.prefix}.${comp.bind}` : comp.bind;
        const el = ctx.renderInputComponent(comp, item, fullName);
        parent.appendChild(el);
    }
};

const DatePickerPlugin: ComponentPlugin = {
    type: 'DatePicker',
    render: (comp: any, parent: HTMLElement, ctx: RenderContext) => {
        if (!comp.bind) return;
        const item = ctx.findItemByKey(comp.bind);
        if (!item) return;
        const fullName = ctx.prefix ? `${ctx.prefix}.${comp.bind}` : comp.bind;
        const el = ctx.renderInputComponent(comp, item, fullName);
        parent.appendChild(el);
    }
};

const RadioGroupPlugin: ComponentPlugin = {
    type: 'RadioGroup',
    render: (comp: any, parent: HTMLElement, ctx: RenderContext) => {
        if (!comp.bind) return;
        const item = ctx.findItemByKey(comp.bind);
        if (!item) return;
        const fullName = ctx.prefix ? `${ctx.prefix}.${comp.bind}` : comp.bind;
        const el = ctx.renderInputComponent(comp, item, fullName);
        parent.appendChild(el);
    }
};

const CheckboxGroupPlugin: ComponentPlugin = {
    type: 'CheckboxGroup',
    render: (comp: any, parent: HTMLElement, ctx: RenderContext) => {
        if (!comp.bind) return;
        const item = ctx.findItemByKey(comp.bind);
        if (!item) return;
        const fullName = ctx.prefix ? `${ctx.prefix}.${comp.bind}` : comp.bind;
        const el = ctx.renderInputComponent(comp, item, fullName);
        parent.appendChild(el);
    }
};

export const InputPlugins: ComponentPlugin[] = [
    TextInputPlugin,
    NumberInputPlugin,
    SelectPlugin,
    TogglePlugin,
    CheckboxPlugin,
    DatePickerPlugin,
    RadioGroupPlugin,
    CheckboxGroupPlugin
];
