import { FormEngine } from 'formspec-engine';

export interface RenderContext {
    engine: FormEngine;
    componentDocument: any;
    themeDocument: any;
    prefix: string;
    renderComponent: (comp: any, parent: HTMLElement, prefix?: string) => void;
    resolveToken: (val: any) => any;
    applyStyle: (el: HTMLElement, style: any) => void;
    cleanupFns: Array<() => void>;
    findItemByKey: (key: string, items?: any[]) => any | null;
    renderInputComponent: (comp: any, item: any, fullName: string) => HTMLElement;
}

export interface ComponentPlugin {
    type: string;
    render: (comp: any, parent: HTMLElement, ctx: RenderContext) => void;
}
