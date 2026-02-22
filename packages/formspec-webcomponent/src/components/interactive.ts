import { ComponentPlugin, RenderContext } from '../types';

export const WizardPlugin: ComponentPlugin = {
    type: 'Wizard',
    render: (comp: any, parent: HTMLElement, ctx: RenderContext) => {
        const el = document.createElement('div');
        if (comp.id) el.id = comp.id;
        el.className = 'formspec-wizard';
        ctx.applyStyle(el, comp.style);
        parent.appendChild(el);
        if (comp.children && comp.children.length > 0) {
            ctx.renderComponent(comp.children[0], el, ctx.prefix);
        }
    }
};

export const TabsPlugin: ComponentPlugin = {
    type: 'Tabs',
    render: (comp: any, parent: HTMLElement, ctx: RenderContext) => {
        const el = document.createElement('div');
        if (comp.id) el.id = comp.id;
        el.className = 'formspec-tabs';
        ctx.applyStyle(el, comp.style);
        parent.appendChild(el);

        const tabLabels: string[] = comp.tabLabels || [];
        const children: any[] = comp.children || [];

        // Tab bar
        const tabBar = document.createElement('div');
        tabBar.className = 'tab-bar';
        el.appendChild(tabBar);

        // Tab panels
        const panels: HTMLElement[] = [];
        for (let i = 0; i < children.length; i++) {
            const panel = document.createElement('div');
            panel.className = 'tab-panel';
            panel.style.display = i === 0 ? 'block' : 'none';
            ctx.renderComponent(children[i], panel, ctx.prefix);
            el.appendChild(panel);
            panels.push(panel);
        }

        // Tab buttons
        const buttons: HTMLButtonElement[] = [];
        for (let i = 0; i < children.length; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = tabLabels[i] || `Tab ${i + 1}`;
            btn.className = i === 0 ? 'tab-button active' : 'tab-button';
            btn.addEventListener('click', () => {
                panels.forEach((p, idx) => p.style.display = idx === i ? 'block' : 'none');
                buttons.forEach((b, idx) => b.className = idx === i ? 'tab-button active' : 'tab-button');
            });
            tabBar.appendChild(btn);
            buttons.push(btn);
        }
    }
};
