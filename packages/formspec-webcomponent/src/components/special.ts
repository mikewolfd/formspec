import { effect } from '@preact/signals-core';
import { ComponentPlugin, RenderContext } from '../types';

export const ConditionalGroupPlugin: ComponentPlugin = {
    type: 'ConditionalGroup',
    render: (comp: any, parent: HTMLElement, ctx: RenderContext) => {
        const el = document.createElement('div');
        if (comp.id) el.id = comp.id;
        el.className = 'formspec-conditional-group';
        el.style.display = 'contents';
        ctx.applyStyle(el, comp.style);
        parent.appendChild(el);
        if (comp.children) {
            for (const child of comp.children) {
                ctx.renderComponent(child, el, ctx.prefix);
            }
        }
    }
};

export const DataTablePlugin: ComponentPlugin = {
    type: 'DataTable',
    render: (comp: any, parent: HTMLElement, ctx: RenderContext) => {
        const table = document.createElement('table');
        if (comp.id) table.id = comp.id;
        table.className = 'formspec-data-table';
        ctx.applyStyle(table, comp.style);
        parent.appendChild(table);

        const columns: { header: string; bind: string }[] = comp.columns || [];
        const bindKey = comp.bind;
        if (!bindKey || columns.length === 0) return;

        // Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        for (const col of columns) {
            const th = document.createElement('th');
            th.textContent = col.header;
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Body — reactively updates based on repeat count
        const tbody = document.createElement('tbody');
        table.appendChild(tbody);

        const fullName = ctx.prefix ? `${ctx.prefix}.${bindKey}` : bindKey;

        ctx.cleanupFns.push(effect(() => {
            const count = ctx.engine.repeats[fullName]?.value || 0;
            tbody.innerHTML = '';
            for (let i = 0; i < count; i++) {
                const tr = document.createElement('tr');
                for (const col of columns) {
                    const td = document.createElement('td');
                    const sigPath = `${fullName}[${i}].${col.bind}`;
                    const sig = ctx.engine.signals[sigPath];
                    td.textContent = sig ? String(sig.value ?? '') : '';
                    tr.appendChild(td);
                }
                tbody.appendChild(tr);
            }
        }));
    }
};
