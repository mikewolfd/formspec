import { effect } from '@preact/signals-core';
import { ComponentPlugin, RenderContext } from '../types';

export const PagePlugin: ComponentPlugin = {
    type: 'Page',
    render: (comp: any, parent: HTMLElement, ctx: RenderContext) => {
        const el = document.createElement('section');
        if (comp.id) el.id = comp.id;
        el.className = 'formspec-page';
        ctx.applyStyle(el, comp.style);
        if (comp.title) {
            const h2 = document.createElement('h2');
            h2.textContent = comp.title;
            el.appendChild(h2);
        }
        parent.appendChild(el);
        if (comp.children) {
            for (const child of comp.children) {
                ctx.renderComponent(child, el, ctx.prefix);
            }
        }
    }
};

export const StackPlugin: ComponentPlugin = {
    type: 'Stack',
    render: (comp: any, parent: HTMLElement, ctx: RenderContext) => {
        const el = document.createElement('div');
        if (comp.id) el.id = comp.id;
        el.className = 'formspec-stack';
        el.style.display = 'flex';
        el.style.flexDirection = comp.direction === 'horizontal' ? 'row' : 'column';
        el.style.gap = comp.gap || '0.5rem';
        ctx.applyStyle(el, comp.style);
        parent.appendChild(el);
        if (comp.children) {
            for (const child of comp.children) {
                ctx.renderComponent(child, el, ctx.prefix);
            }
        }
    }
};

export const GridPlugin: ComponentPlugin = {
    type: 'Grid',
    render: (comp: any, parent: HTMLElement, ctx: RenderContext) => {
        const el = document.createElement('div');
        if (comp.id) el.id = comp.id;
        el.className = 'formspec-grid';
        el.style.display = 'grid';
        el.style.gridTemplateColumns = `repeat(${comp.columns || 2}, 1fr)`;
        el.style.gap = comp.gap || '0.5rem';
        ctx.applyStyle(el, comp.style);
        parent.appendChild(el);
        if (comp.children) {
            for (const child of comp.children) {
                ctx.renderComponent(child, el, ctx.prefix);
            }
        }
    }
};
