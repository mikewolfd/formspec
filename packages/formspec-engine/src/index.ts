import { signal, computed, Signal } from '@preact/signals-core';

export interface FormspecItem {
    type: string;
    name: string;
    label?: string;
    calculate?: string;
    visible?: string;
    valid?: string;
    pattern?: string;
    readonly?: boolean;
    repeatable?: boolean;
    children?: FormspecItem[];
}

export interface FormspecDefinition {
    items: FormspecItem[];
    [key: string]: any;
}

export class FormEngine {
    private definition: FormspecDefinition;
    public signals: Record<string, any> = {};
    public visibleSignals: Record<string, Signal<boolean>> = {};
    public errorSignals: Record<string, Signal<string | null>> = {};
    public repeats: Record<string, Signal<number>> = {};

    constructor(definition: FormspecDefinition) {
        this.definition = definition;
        this.initializeSignals();
    }

    private initializeSignals() {
        for (const item of this.definition.items) {
            this.initItem(item);
        }
    }

    private initItem(item: FormspecItem, prefix = '') {
        const fullName = prefix ? `${prefix}.${item.name}` : item.name;

        if (item.type === 'group' && item.repeatable) {
            this.repeats[fullName] = signal(1);
            this.initRepeatInstance(item, fullName, 0);
        } else if (item.type === 'group' && item.children) {
            for (const child of item.children) {
                this.initItem(child, fullName);
            }
        } else {
            const initialValue = item.type === 'number' ? 0 : '';
            this.signals[fullName] = signal(initialValue);
            this.visibleSignals[fullName] = signal(true);
            this.errorSignals[fullName] = signal(null);

            if (item.calculate) {
                this.signals[fullName] = computed(this.compileFEL(item.calculate, fullName, undefined, false));
            }
            if (item.visible) {
                this.visibleSignals[fullName] = computed(() => !!this.compileFEL(item.visible!, fullName, undefined, true)());
            }
            if (item.valid || item.pattern) {
                const regex = item.pattern ? new RegExp(item.pattern) : null;
                this.errorSignals[fullName] = computed(() => {
                    const isValid = item.valid ? !!this.compileFEL(item.valid, fullName, undefined, true)() : true;
                    if (!isValid) return "Invalid";
                    if (regex && !regex.test(this.signals[fullName].value)) return "Pattern mismatch";
                    return null;
                });
            }
        }
    }

    private initRepeatInstance(item: FormspecItem, fullName: string, index: number) {
        if (!item.children) return;
        for (const child of item.children) {
            const childName = `${fullName}[${index}].${child.name}`;
            const initialValue = child.type === 'number' ? 0 : '';
            this.signals[childName] = signal(initialValue);
            this.visibleSignals[childName] = signal(true);
            this.errorSignals[childName] = signal(null);

            if (child.calculate) {
                this.signals[childName] = computed(this.compileFEL(child.calculate, childName, index, false));
            }
        }
    }

    public addRepeatInstance(itemName: string) {
        const item = this.findItem(this.definition.items, itemName);
        if (item && item.repeatable) {
            const index = this.repeats[itemName].value;
            this.initRepeatInstance(item, itemName, index);
            this.repeats[itemName].value++;
        }
    }

    private findItem(items: FormspecItem[], name: string): FormspecItem | undefined {
        for (const item of items) {
            if (item.name === name) return item;
            if (item.children) {
                const found = this.findItem(item.children, name);
                if (found) return found;
            }
        }
        return undefined;
    }

    private compileFEL(expression: string, currentItemName: string, index?: number, includeSelf = false) {
        return () => {
            const names = Object.keys(this.signals).filter(n => includeSelf || n !== currentItemName);
            const values = names.map(n => this.signals[n].value);
            let expr = expression;
            if (index !== undefined) {
                expr = expr.replace(/\$index/g, index.toString());
            }
            const funcBody = `
                ${names.map((n, i) => `const ${n.replace(/[\[\].]/g, '_')} = arguments[${i}];`).join('\n')}
                return ${expr.replace(/[\[\].]/g, '_')};
            `;
            try {
                const func = new Function(funcBody);
                return func.apply(null, values);
            } catch (e) {
                return null;
            }
        };
    }

    public setValue(name: string, value: any) {
        if (this.signals[name] && !(this.signals[name] instanceof computed)) {
            this.signals[name].value = value;
        }
    }

    public getResponse() {
        const data: any = {};
        for (const key of Object.keys(this.signals)) {
            if (this.visibleSignals[key] && !this.visibleSignals[key].value) {
                continue;
            }
            const parts = key.split(/[\[\].]/).filter(Boolean);
            let current = data;
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                const nextPart = parts[i+1];
                const isNextNumber = !isNaN(parseInt(nextPart));
                if (!current[part]) {
                    current[part] = isNextNumber ? [] : {};
                }
                current = current[part];
            }
            current[parts[parts.length - 1]] = this.signals[key].value;
        }
        return {
            definitionUrl: this.definition.url || "http://example.org/form",
            definitionVersion: this.definition.version || "1.0.0",
            status: "completed",
            data,
            authored: new Date().toISOString()
        };
    }
}
