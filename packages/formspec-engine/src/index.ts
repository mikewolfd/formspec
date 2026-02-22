import { signal, computed, Signal } from '@preact/signals-core';

export interface FormspecItem {
    key: string;
    type: "field" | "group" | "display";
    label: string;
    dataType?: "string" | "text" | "integer" | "decimal" | "boolean" | "date" | "dateTime" | "time" | "uri" | "attachment" | "choice" | "multiChoice" | "money";
    description?: string;
    hint?: string;
    repeatable?: boolean;
    minRepeat?: number;
    maxRepeat?: number;
    children?: FormspecItem[];
    options?: { value: string; label: string }[];
    optionSet?: string;
    initialValue?: any;
    presentation?: any;
    [key: string]: any;
}

export interface FormspecBind {
    target: string;
    relevant?: string;
    required?: string | boolean;
    calculate?: string;
    readonly?: string | boolean;
    constraint?: string;
    message?: string;
}

export interface FormspecDefinition {
    $formspec: string;
    url: string;
    version: string;
    title: string;
    items: FormspecItem[];
    binds?: FormspecBind[];
    [key: string]: any;
}

export class FormEngine {
    private definition: FormspecDefinition;
    public signals: Record<string, any> = {};
    public relevantSignals: Record<string, Signal<boolean>> = {};
    public requiredSignals: Record<string, Signal<boolean>> = {};
    public readonlySignals: Record<string, Signal<boolean>> = {};
    public errorSignals: Record<string, Signal<string | null>> = {};
    public repeats: Record<string, Signal<number>> = {};
    public dependencies: Record<string, string[]> = {};
    private knownNames: Set<string> = new Set();
    private bindConfigs: Record<string, FormspecBind> = {};
    public structureVersion = signal(0);

    constructor(definition: FormspecDefinition) {
        this.definition = definition;
        if (definition.binds) {
            for (const bind of definition.binds) {
                this.bindConfigs[bind.target] = bind;
            }
        }
        this.initializeSignals();
    }

    private discoverAllNames(items: FormspecItem[], prefix = ''): string[] {
        let names: string[] = [];
        for (const item of items) {
            const fullName = prefix ? `${prefix}.${item.key}` : item.key;
            names.push(fullName);
            if (item.children) {
                names.push(...this.discoverAllNames(item.children, fullName));
            }
        }
        return names;
    }

    private initializeSignals() {
        this.knownNames = new Set(this.discoverAllNames(this.definition.items));
        for (const item of this.definition.items) {
            this.initItem(item);
        }
        this.detectCycles();
        this.structureVersion.value++;
    }

    private detectCycles() {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const visit = (node: string) => {
            if (recursionStack.has(node)) {
                throw new Error(`Cyclic dependency detected involving field: ${node}`);
            }
            if (visited.has(node)) return;

            visited.add(node);
            recursionStack.add(node);

            const deps = this.dependencies[node] || [];
            for (const dep of deps) {
                visit(dep);
            }

            recursionStack.delete(node);
        };

        for (const node of Object.keys(this.dependencies)) {
            visit(node);
        }
    }

    private initItem(item: FormspecItem, prefix = '') {
        const key = item.key;
        if (!key) throw new Error("Item missing required 'key'");
        const fullName = prefix ? `${prefix}.${key}` : key;
        const baseKey = fullName.replace(/\[\d+\]/g, '');
        const bind = this.bindConfigs[baseKey];

        // Relevancy (Visibility)
        this.relevantSignals[fullName] = signal(true);
        if (bind && bind.relevant) {
            this.relevantSignals[fullName] = computed(() => !!this.compileFEL(bind.relevant!, fullName, undefined, true)());
        }

        if (item.type === 'group') {
            if (item.repeatable) {
                const initialCount = item.minRepeat !== undefined ? item.minRepeat : 1;
                this.repeats[fullName] = signal(initialCount);
                for (let i = 0; i < initialCount; i++) {
                    this.initRepeatInstance(item, fullName, i);
                }
            } else if (item.children) {
                for (const child of item.children) {
                    this.initItem(child, fullName);
                }
            }
        } else if (item.type === 'field') {
            let initialValue: any = item.initialValue !== undefined ? item.initialValue : '';
            const dataType = item.dataType;
            if (!dataType) throw new Error(`Field '${fullName}' missing required 'dataType'`);

            if (typeof initialValue === 'string' && initialValue.startsWith('=')) {
                const expr = initialValue.substring(1);
                initialValue = this.compileFEL(expr, fullName, undefined, true)();
            }

            if (initialValue === '' && (dataType === 'integer' || dataType === 'decimal')) {
                initialValue = null;
            }
            if (initialValue === '' && dataType === 'boolean') {
                initialValue = false;
            }
            
            this.signals[fullName] = signal(initialValue);
            this.requiredSignals[fullName] = signal(false);
            this.readonlySignals[fullName] = signal(false);
            this.errorSignals[fullName] = signal(null);

            if (bind) {
                if (bind.calculate) {
                    this.signals[fullName] = computed(this.compileFEL(bind.calculate, fullName, undefined, false));
                }
                if (bind.required) {
                    if (typeof bind.required === 'string') {
                        this.requiredSignals[fullName] = computed(() => !!this.compileFEL(bind.required as string, fullName, undefined, true)());
                    } else {
                        this.requiredSignals[fullName] = signal(!!bind.required);
                    }
                }
                if (bind.readonly) {
                    if (typeof bind.readonly === 'string') {
                        this.readonlySignals[fullName] = computed(() => !!this.compileFEL(bind.readonly as string, fullName, undefined, true)());
                    } else {
                        this.readonlySignals[fullName] = signal(!!bind.readonly);
                    }
                }
                
                if (bind.constraint || bind.required) {
                    this.errorSignals[fullName] = computed(() => {
                        const isRequired = this.requiredSignals[fullName].value;
                        const value = this.signals[fullName].value;
                        
                        if (isRequired && (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0))) {
                            return "Required";
                        }
                        
                        if (bind.constraint) {
                            const isValid = !!this.compileFEL(bind.constraint, fullName, undefined, true)();
                            if (!isValid) return bind.message || "Invalid";
                        }
                        return null;
                    });
                }
            }
            
            if (item.children) {
                for (const child of item.children) {
                    this.initItem(child, fullName);
                }
            }
        } else if (item.type === 'display') {
            // Display items don't have values, but they can have relevancy
        }
    }

    private initRepeatInstance(item: FormspecItem, fullName: string, index: number) {
        if (!item.children) return;
        const prefix = `${fullName}[${index}]`;
        for (const child of item.children) {
            this.initItem(child, prefix);
        }
    }

    public addRepeatInstance(itemName: string) {
        const item = this.findItem(this.definition.items, itemName);
        if (item && item.repeatable) {
            const index = this.repeats[itemName].value;
            this.initRepeatInstance(item, itemName, index);
            this.repeats[itemName].value++;
            this.structureVersion.value++;
            return index;
        }
    }

    private findItem(items: FormspecItem[], name: string): FormspecItem | undefined {
        const parts = name.split('.');
        let currentItems = items;
        let foundItem: FormspecItem | undefined;

        for (const part of parts) {
            const cleanPart = part.replace(/\[\d+\]/g, '');
            foundItem = currentItems.find(i => i.key === cleanPart);
            if (!foundItem) return undefined;
            if (foundItem.children) {
                currentItems = foundItem.children;
            } else {
                if (parts.indexOf(part) !== parts.length - 1) return undefined;
            }
        }
        return foundItem;
    }

    public compileExpression(expression: string, currentItemName: string = '') {
        return this.compileFEL(expression, currentItemName, undefined, true);
    }

    private compileFEL(expression: string, currentItemName: string, index?: number, includeSelf = false) {
        const felStdLib = {
            sum: (arr: any[]) => {
                if (!Array.isArray(arr)) return 0;
                return arr.reduce((a, b) => {
                    const val = typeof b === 'string' ? parseFloat(b) : b;
                    return a + (Number.isFinite(val) ? val : 0);
                }, 0);
            },
            upper: (s: string) => (s || '').toUpperCase(),
            round: (n: number, p: number = 0) => {
                const factor = Math.pow(10, p);
                return Math.round(n * factor) / factor;
            },
            year: (d: string) => d ? new Date(d).getFullYear() : null,
            coalesce: (...args: any[]) => args.find(a => a !== null && a !== undefined && a !== ''),
            isNull: (a: any) => a === null || a === undefined || a === '',
            present: (a: any) => a !== null && a !== undefined && a !== '',
            relevant: (path: string) => this.relevantSignals[path]?.value ?? true,
            required: (path: string) => this.requiredSignals[path]?.value ?? false,
            readonly: (path: string) => this.readonlySignals[path]?.value ?? false,
            contains: (s: string, sub: string) => (s || '').includes(sub || ''),
            abs: (n: number) => Math.abs(n || 0),
            power: (b: number, e: number) => Math.pow(b || 0, e || 0),
            empty: (v: any) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0),
            dateAdd: (d: string, n: number, unit: string) => {
                const date = new Date(d);
                if (unit === 'days') date.setDate(date.getDate() + n);
                else if (unit === 'months') date.setMonth(date.getMonth() + n);
                else if (unit === 'years') date.setFullYear(date.getFullYear() + n);
                return date.toISOString().split('T')[0];
            },
            dateDiff: (d1: string, d2: string, unit: string) => {
                const t1 = new Date(d1).getTime();
                const t2 = new Date(d2).getTime();
                const diff = t1 - t2;
                if (unit === 'days') return Math.floor(diff / (1000 * 60 * 60 * 24));
                return 0;
            },
            fel_if: (cond: boolean, t: any, f: any) => cond ? t : f,
            count: (arr: any[]) => Array.isArray(arr) ? arr.length : 0,
            avg: (arr: any[]) => {
                if (!Array.isArray(arr) || arr.length === 0) return 0;
                const valid = arr.map(a => typeof a === 'string' ? parseFloat(a) : a).filter(a => Number.isFinite(a));
                return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
            },
            min: (arr: any[]) => {
                if (!Array.isArray(arr) || arr.length === 0) return 0;
                const valid = arr.map(a => typeof a === 'string' ? parseFloat(a) : a).filter(a => Number.isFinite(a));
                return valid.length ? Math.min(...valid) : 0;
            },
            max: (arr: any[]) => {
                if (!Array.isArray(arr) || arr.length === 0) return 0;
                const valid = arr.map(a => typeof a === 'string' ? parseFloat(a) : a).filter(a => Number.isFinite(a));
                return valid.length ? Math.max(...valid) : 0;
            },
            countWhere: (arr: any[], pred: any) => Array.isArray(arr) ? arr.filter(pred).length : 0,
            length: (s: string) => (s || '').length,
            startsWith: (s: string, sub: string) => (s || '').startsWith(sub || ''),
            endsWith: (s: string, sub: string) => (s || '').endsWith(sub || ''),
            substring: (s: string, start: number, len?: number) => len === undefined ? (s || '').substring(start) : (s || '').substring(start, start + len),
            replace: (s: string, old: string, nw: string) => (s || '').split(old || '').join(nw || ''),
            lower: (s: string) => (s || '').toLowerCase(),
            trim: (s: string) => (s || '').trim(),
            matches: (s: string, pat: string) => new RegExp(pat).test(s || ''),
            format: (s: string, ...args: any[]) => {
                let i = 0;
                return (s || '').replace(/%s/g, () => String(args[i++] || ''));
            },
            floor: (n: number) => Math.floor(n || 0),
            ceil: (n: number) => Math.ceil(n || 0),
            today: () => new Date().toISOString().split('T')[0],
            now: () => new Date().toISOString(),
            month: (d: string) => d ? new Date(d).getMonth() + 1 : null,
            day: (d: string) => d ? new Date(d).getDate() : null,
            hours: (d: string) => d ? new Date(d).getHours() : null,
            minutes: (d: string) => d ? new Date(d).getMinutes() : null,
            seconds: (d: string) => d ? new Date(d).getSeconds() : null,
            time: (d: string) => d ? new Date(d).toTimeString().split(' ')[0] : null,
            timeDiff: (t1: string, t2: string, unit: string) => {
                const d1 = new Date(`1970-01-01T${t1}Z`);
                const d2 = new Date(`1970-01-01T${t2}Z`);
                const diff = d1.getTime() - d2.getTime();
                if (unit === 'hours') return Math.floor(diff / (1000 * 60 * 60));
                if (unit === 'minutes') return Math.floor(diff / (1000 * 60));
                if (unit === 'seconds') return Math.floor(diff / 1000);
                return diff;
            },
            selected: (val: any, opt: any) => Array.isArray(val) ? val.includes(opt) : val === opt,
            isNumber: (v: any) => typeof v === 'number' && !isNaN(v),
            isString: (v: any) => typeof v === 'string',
            isDate: (v: any) => !isNaN(Date.parse(v)),
            typeOf: (v: any) => Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v,
            number: (v: any) => { const n = Number(v); return isNaN(n) ? null : n; },
            money: (amount: number, currency: string) => ({ amount, currency }),
            moneyAmount: (m: any) => m && m.amount !== undefined ? m.amount : null,
            moneyCurrency: (m: any) => m && m.currency !== undefined ? m.currency : null,
            moneyAdd: (m1: any, m2: any) => {
                if (m1 && m2 && m1.currency === m2.currency) {
                    const a1 = typeof m1.amount === 'string' ? parseFloat(m1.amount) : (m1.amount || 0);
                    const a2 = typeof m2.amount === 'string' ? parseFloat(m2.amount) : (m2.amount || 0);
                    return { amount: a1 + a2, currency: m1.currency };
                }
                return null;
            },
            moneySum: (arr: any[]) => {
                if (!Array.isArray(arr) || arr.length === 0) return { amount: 0, currency: 'USD' };
                const currency = arr[0]?.currency || 'USD';
                const sum = arr.reduce((acc, m) => {
                    const amt = typeof m?.amount === 'string' ? parseFloat(m.amount) : (m?.amount || 0);
                    return acc + (m?.currency === currency ? amt : 0);
                }, 0);
                return { amount: sum, currency };
            },
            prev: (name: string) => {
                const parts = currentItemName.split(/[\[\].]/).filter(Boolean);
                let lastNumIndex = -1;
                for (let i = parts.length - 1; i >= 0; i--) {
                    if (!isNaN(parseInt(parts[i]))) { lastNumIndex = i; break; }
                }
                if (lastNumIndex === -1) return null;
                const idx = parseInt(parts[lastNumIndex]);
                if (idx <= 0) return null;
                const siblingsPath = parts.slice(0, lastNumIndex).join('.') + `[${idx-1}].` + name;
                return this.signals[siblingsPath]?.value;
            },
            next: (name: string) => {
                const parts = currentItemName.split(/[\[\].]/).filter(Boolean);
                let lastNumIndex = -1;
                for (let i = parts.length - 1; i >= 0; i--) {
                    if (!isNaN(parseInt(parts[i]))) { lastNumIndex = i; break; }
                }
                if (lastNumIndex === -1) return null;
                const idx = parseInt(parts[lastNumIndex]);
                const siblingsPath = parts.slice(0, lastNumIndex).join('.') + `[${idx+1}].` + name;
                return this.signals[siblingsPath]?.value;
            },
            parent: (name: string) => {
                const parts = currentItemName.split(/[\[\].]/).filter(Boolean);
                for (let i = parts.length - 2; i >= 0; i--) {
                    const path = parts.slice(0, i).join('.') + (i > 0 ? '.' : '') + name;
                    if (this.signals[path]) return this.signals[path].value;
                }
                return this.signals[name]?.value;
            }
        };

        const stdLibKeys = Object.keys(felStdLib);
        const stdLibValues = Object.values(felStdLib);

        let expr = expression;

        if (expr.includes('$index')) {
            const parts = currentItemName.split(/[\[\]]/).filter(p => !isNaN(parseInt(p)));
            const currentIndex = parts.length > 0 ? parseInt(parts[parts.length - 1]) : -1;
            if (currentIndex >= 0) {
                expr = expr.replace(/\$index/g, currentIndex.toString());
            }
        }

        const mipRegex = /(relevant|valid|readonly|required)\(([a-zA-Z0-9_.\\\[\\\]]+)\)/g;
        expr = expr.replace(mipRegex, "$1('$2')");
        expr = expr.replace(/\bif\s*\(/g, "fel_if(");
        expr = expr.replace(/\bcountWhere\(([^,]+),\s*(.+)\)/g, "countWhere($1, ($) => $2)");

        // Replace $identifier with identifier
        expr = expr.replace(/\$([a-zA-Z][a-zA-Z0-9_]*)/g, "$1");

        // Replace single = with == for comparison, but avoid >=, <=, !=, ==, =>
        expr = expr.replace(/(?<![=<>!])=(?![=>])/g, "==");

        const pathRegex = /([a-zA-Z][a-zA-Z0-9_]*)\.([a-zA-Z0-9_]+)/g;
        const groupMatches = Array.from(expr.matchAll(pathRegex)).map(m => ({
            full: m[0], group: m[1], field: m[2]
        }));

        for (const m of groupMatches) {
            expr = expr.replace(m.full, m.full.replace(/[\\\[\\\]\.]/g, '_'));
        }

        // Replace array access notation: array[index].field -> array_index__field
        let sanitizedExpr = expr.replace(/([a-zA-Z][a-zA-Z0-9_]*)\[(\d+)\]\.([a-zA-Z0-9_]+)/g, '$1_$2__$3');
        // Handle normal dot notation: group.field -> group_field
        sanitizedExpr = sanitizedExpr.replace(/([a-zA-Z][a-zA-Z0-9_]*)\.([a-zA-Z0-9_]+)/g, '$1_$2');
        // Handle any remaining brackets
        const finalExpr = sanitizedExpr.replace(/[\[\]]/g, '_');

        const currentPartsForDeps = currentItemName.replace(/\[\d+\]/g, '').split(/[\\\[\\\]\.]/).filter(Boolean);
        const currentParentPathForDeps = currentPartsForDeps.slice(0, -1).join('.');
        const baseCurrentItemName = currentItemName.replace(/\[\d+\]/g, '');

        const potentialDeps = Array.from(this.knownNames).filter(n => {
            if (n === baseCurrentItemName && !includeSelf) return false;
            const safeN = n.replace(/[\\\[\\\]\.]/g, '_');
            if (new RegExp(`\\b${safeN}\\b`).test(finalExpr)) return true;
            const parts = n.split(/[\\\[\\\]\.]/).filter(Boolean);
            if (parts.slice(0, -1).join('.') === currentParentPathForDeps) {
                if (new RegExp(`\\b${parts[parts.length - 1]}\\b`).test(finalExpr)) return true;
            }
            return false;
        });

        if (!this.dependencies[baseCurrentItemName]) {
            this.dependencies[baseCurrentItemName] = [];
        }
        potentialDeps.forEach(d => {
            if (!this.dependencies[baseCurrentItemName].includes(d)) {
                this.dependencies[baseCurrentItemName].push(d);
            }
        });

        return () => {
            this.structureVersion.value;
            const currentParts = currentItemName.split(/[\\\[\\\]\.]/).filter(Boolean);
            const currentParentPath = currentParts.slice(0, -1).join('.');

            const potentialNames = Object.keys(this.signals).filter(n => {
                if (n === currentItemName && !includeSelf) return false;
                if (new RegExp(`\\b${n.replace(/[\\\[\\\]\.]/g, '_')}\\b`).test(finalExpr)) return true;
                const parts = n.split(/[\\\[\\\]\.]/).filter(Boolean);
                if (parts.length > 1 && currentParts.length > 1) {
                    if (parts.slice(0, -1).join('.') === currentParentPath) {
                        if (new RegExp(`\\b${parts[parts.length - 1]}\\b`).test(finalExpr)) return true;
                    }
                }
                return false;
            });
            for (let i = 0; i < currentParts.length - 1; i++) {
                const subPath = currentParts.slice(0, i + 1).join('.');
                if (this.repeats[subPath]) this.repeats[subPath].value;
                if (this.relevantSignals[subPath]) this.relevantSignals[subPath].value;
            }
            // For the last part (the item itself), only track repeats if it's a repeat instance
            const lastPath = currentParts.join('.');
            if (this.repeats[lastPath]) this.repeats[lastPath].value;

            const pathArrays: Record<string, any[]> = {};
            for (const m of groupMatches) {
                if (this.repeats[m.group]) this.repeats[m.group].value;
                const matches = Object.keys(this.signals).filter(k => k.endsWith(`].${m.field}`));
                pathArrays[m.full.replace(/[\\\[\\\]\.]/g, '_')] = matches
                    .filter(k => {
                        const kParts = k.split(/[\\\[\\\]\.]/).filter(Boolean);
                        const groupIndexInK = kParts.indexOf(m.group);
                        if (groupIndexInK === -1) return false;
                        for (let i = 0; i < groupIndexInK; i++) {
                            if (kParts[i] !== currentParts[i]) return false;
                        }
                        return true;
                    })
                    .map(k => this.signals[k].value);
            }

            const values = potentialNames.map(n => this.signals[n].value);
            const localValues: Record<string, any> = {};
            // currentParentPath is already defined above

            for (let i = 0; i < potentialNames.length; i++) {
                const n = potentialNames[i];
                const parts = n.split(/[\\\[\\\]\.]/).filter(Boolean);
                if (parts.slice(0, -1).join('.') === currentParentPath) {
                    localValues[parts[parts.length - 1]] = values[i];
                }
            }

            const pathArrayKeys = Object.keys(pathArrays);
            const pathArrayValues = pathArrayKeys.map(k => pathArrays[k]);
            const localKeys = Object.keys(localValues);
            const localVals = localKeys.map(k => localValues[k]);
            const argNames = [...stdLibKeys, ...pathArrayKeys, ...potentialNames.map(n => n.replace(/[\\\[\\\]\.]/g, '_')), ...localKeys];
            const argValues = [...stdLibValues, ...pathArrayValues, ...values, ...localVals];

            try {
                const f = new Function(...argNames, `return ${finalExpr}`);
                return f(...argValues);
            } catch (e) {
                return null;
            }
        };
    }

    public setValue(name: string, value: any) {
        const baseName = name.replace(/\[\d+\]/g, '');
        const item = this.findItem(this.definition.items, baseName);
        const dataType = item?.dataType || (item?.type as string);
        if (dataType && (dataType === 'integer' || dataType === 'decimal') && typeof value === 'string') {
            value = value === '' ? null : Number(value);
        }
        if (this.signals[name]) {
            this.signals[name].value = value;
        }
    }

    public getResponse() {
        const data: any = {};
        const isPathRelevant = (path: string): boolean => {
            // Check the path itself and all its parents
            const parts = path.split(/[\\\[\\\]\.]/).filter(Boolean);
            let currentPath = '';
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isNumber = !isNaN(parseInt(part));
                if (isNumber) {
                    currentPath += `[${part}]`;
                } else {
                    currentPath += (currentPath ? '.' : '') + part;
                }
                
                if (this.relevantSignals[currentPath] && !this.relevantSignals[currentPath].value) {
                    return false;
                }
            }
            return true;
        };

        for (const key of Object.keys(this.signals)) {
            if (!isPathRelevant(key)) continue;
            const parts = key.split(/[\\\[\\\]\.]/).filter(Boolean);
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
            const val = this.signals[key].value;
            current[parts[parts.length - 1]] = Array.isArray(val) ? [...val] : (typeof val === 'object' && val !== null ? {...val} : val);
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
