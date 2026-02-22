import { signal, computed, Signal } from '@preact/signals-core';
import { FelLexer } from './fel/lexer';
import { parser } from './fel/parser';
import { interpreter, FelContext } from './fel/interpreter';
import { dependencyVisitor } from './fel/dependency-visitor';
import { PathResolver } from './path-resolver';

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
    relevant?: string;
    required?: string | boolean;
    calculate?: string;
    readonly?: string | boolean;
    constraint?: string;
    message?: string;
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

export interface FormspecShape {
    id: string;
    target: string;
    severity?: "error" | "warning" | "info";
    constraint?: string;
    message: string;
    code?: string;
    activeWhen?: string;
    timing?: "continuous" | "submit" | "demand";
    and?: string[];
    or?: string[];
    not?: string;
    xone?: string[];
}

export interface FormspecDefinition {
    $formspec: string;
    url: string;
    version: string;
    title: string;
    items: FormspecItem[];
    binds?: FormspecBind[];
    shapes?: FormspecShape[];
    [key: string]: any;
}

export interface ValidationResult {
    severity: "error" | "warning" | "info";
    path: string;
    message: string;
    constraintKind: "required" | "type" | "cardinality" | "constraint" | "shape" | "external";
    code: string;
    source?: "bind" | "shape";
    shapeId?: string;
    constraint?: string;
}

export interface ValidationReport {
    valid: boolean;
    results: ValidationResult[];
}

export class FormEngine {
    private definition: FormspecDefinition;
    public signals: Record<string, any> = {};
    public relevantSignals: Record<string, Signal<boolean>> = {};
    public requiredSignals: Record<string, Signal<boolean>> = {};
    public readonlySignals: Record<string, Signal<boolean>> = {};
    public errorSignals: Record<string, Signal<string | null>> = {};
    public validationResults: Record<string, Signal<ValidationResult[]>> = {};
    public shapeResults: Record<string, Signal<ValidationResult[]>> = {};
    public repeats: Record<string, Signal<number>> = {};
    public dependencies: Record<string, string[]> = {};
    private knownNames: Set<string> = new Set();
    private bindConfigs: Record<string, FormspecBind> = {};
    private compiledExpressions: Record<string, () => any> = {};
    public structureVersion = signal(0);

    constructor(definition: FormspecDefinition) {
        this.definition = definition;
        this.initializeBindConfigs(definition.items);
        if (definition.binds) {
            for (const bind of definition.binds) {
                this.bindConfigs[bind.target] = { ...this.bindConfigs[bind.target], ...bind };
            }
        }
        this.initializeSignals();
        this.initializeShapes();
    }

    private initializeShapes() {
        if (!this.definition.shapes) return;
        for (const shape of this.definition.shapes) {
            this.initShape(shape);
        }
    }

    private initShape(shape: FormspecShape) {
        const shapeId = shape.id;
        this.shapeResults[shapeId] = computed(() => {
            this.structureVersion.value;
            const results: ValidationResult[] = [];
            const targetPaths = this.resolveWildcardPath(shape.target);

            for (const path of targetPaths) {
                if (shape.activeWhen) {
                    const activeFn = this.compileFEL(shape.activeWhen, path, undefined, true);
                    if (!activeFn()) continue;
                }

                if (shape.constraint) {
                    const constraintFn = this.compileFEL(shape.constraint, path, undefined, true);
                    const isValid = !!constraintFn();
                    if (!isValid) {
                        results.push({
                            severity: shape.severity || "error",
                            path: this.toExternalPath(path),
                            message: this.interpolateMessage(shape.message, path),
                            constraintKind: "shape",
                            code: shape.code || "SHAPE_FAILED",
                            source: "shape",
                            shapeId: shape.id,
                            constraint: shape.constraint
                        });
                    }
                }
            }
            return results;
        });
    }

    private interpolateMessage(message: string, contextPath: string): string {
        return message.replace(/\{\{(.+?)\}\}/g, (_, expr) => {
            try {
                const fn = this.compileFEL(expr, contextPath, undefined, true);
                return String(fn());
            } catch (e) {
                return `{{${expr}}}`;
            }
        });
    }

    private resolveWildcardPath(path: string): string[] {
        if (path === "#") return [""];
        if (!path.includes('[*]')) return [path];

        const results: string[] = [];
        const asteriskIndex = path.indexOf('[*]');
        const base = path.substring(0, asteriskIndex);
        const remaining = path.substring(asteriskIndex + 3);

        const count = this.repeats[base]?.value || 0;
        for (let i = 0; i < count; i++) {
            const concrete = `${base}[${i}]${remaining}`;
            results.push(...this.resolveWildcardPath(concrete));
        }
        return results;
    }

    private toExternalPath(path: string): string {
        if (!path) return "";
        return path.replace(/\[(\d+)\]/g, (_, p1) => `[${parseInt(p1) + 1}]`);
    }

    private initializeBindConfigs(items: FormspecItem[], prefix = '') {
        for (const item of items) {
            const fullName = prefix ? `${prefix}.${item.key}` : item.key;
            if (item.relevant || item.required || item.calculate || item.readonly || item.constraint) {
                this.bindConfigs[fullName] = {
                    target: fullName,
                    relevant: item.relevant,
                    required: item.required,
                    calculate: item.calculate,
                    readonly: item.readonly,
                    constraint: item.constraint,
                    message: item.message
                };
            }
            if (item.children) {
                this.initializeBindConfigs(item.children, fullName);
            }
        }
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
        // this.detectCycles();
        this.structureVersion.value++;
    }

    private detectCycles() {
        console.log("Detecting cycles for", Object.keys(this.dependencies).length, "nodes");
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const visit = (node: string) => {
            if (recursionStack.has(node)) {
                console.error(`Cyclic dependency detected involving field: ${node}`);
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
        console.log("Cycle detection complete");
    }

    private validateDataType(value: any, dataType: string): boolean {
        if (value === null || value === undefined || value === '') return true;
        switch (dataType) {
            case 'integer':
                return Number.isInteger(value);
            case 'decimal':
            case 'money':
                return typeof value === 'number' && !isNaN(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'date':
                return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
            case 'dateTime':
                return !isNaN(Date.parse(String(value)));
            case 'time':
                return /^\d{2}:\d{2}(:\d{2})?$/.test(String(value));
            case 'uri':
                try { new URL(String(value)); return true; } catch { return false; }
            default:
                return true;
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
            const compiled = this.compileFEL(bind.relevant!, fullName, undefined, true);
            this.relevantSignals[fullName] = computed(() => !!compiled());
        }

        if (item.type === 'group') {
            if (item.repeatable) {
                const initialCount = item.minRepeat !== undefined ? item.minRepeat : 1;
                this.repeats[fullName] = signal(initialCount);

                this.validationResults[fullName] = computed(() => {
                    const results: ValidationResult[] = [];
                    const count = this.repeats[fullName].value;
                    if (item.minRepeat !== undefined && count < item.minRepeat) {
                        results.push({
                            severity: "error",
                            path: this.toExternalPath(fullName),
                            message: `Minimum ${item.minRepeat} entries required`,
                            constraintKind: "cardinality",
                            code: "MIN_REPEAT"
                        });
                    }
                    if (item.maxRepeat !== undefined && count > item.maxRepeat) {
                        results.push({
                            severity: "error",
                            path: this.toExternalPath(fullName),
                            message: `Maximum ${item.maxRepeat} entries allowed`,
                            constraintKind: "cardinality",
                            code: "MAX_REPEAT"
                        });
                    }
                    return results;
                });

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
                const compiled = this.compileFEL(expr, fullName, undefined, true);
                initialValue = compiled();
            }

            if (initialValue === '' && (dataType === 'integer' || dataType === 'decimal' || dataType === 'money')) {
                initialValue = null;
            }
            if (initialValue === '' && dataType === 'boolean') {
                initialValue = false;
            }
            
            this.signals[fullName] = signal(initialValue);
            this.requiredSignals[fullName] = signal(false);
            this.readonlySignals[fullName] = signal(false);
            this.errorSignals[fullName] = signal(null);
            this.validationResults[fullName] = signal([]);

            const compiledConstraint = bind?.constraint ? this.compileFEL(bind.constraint, fullName, undefined, true) : null;
            
            this.validationResults[fullName] = computed(() => {
                const results: ValidationResult[] = [];
                const value = this.signals[fullName].value;
                const isRequired = this.requiredSignals[fullName].value;

                // 1. DataType Validation
                if (!this.validateDataType(value, dataType)) {
                    results.push({
                        severity: "error",
                        path: this.toExternalPath(fullName),
                        message: `Invalid ${dataType}`,
                        constraintKind: "type",
                        code: "TYPE_MISMATCH",
                        source: "bind"
                    });
                }

                // 2. Required Validation
                if (isRequired && (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0))) {
                    results.push({
                        severity: "error",
                        path: this.toExternalPath(fullName),
                        message: "Required",
                        constraintKind: "required",
                        code: "REQUIRED",
                        source: "bind"
                    });
                }
                
                // 3. Bind Constraint
                if (compiledConstraint) {
                    const isValid = !!compiledConstraint();
                    if (!isValid) {
                        results.push({
                            severity: "error",
                            path: this.toExternalPath(fullName),
                            message: bind?.message || "Invalid",
                            constraintKind: "constraint",
                            code: "CONSTRAINT_FAILED",
                            source: "bind",
                            constraint: bind?.constraint
                        });
                    }
                }
                return results;
            });

            this.errorSignals[fullName] = computed(() => {
                const res = this.validationResults[fullName].value;
                return res.length > 0 ? res[0].message : null;
            });

            if (bind) {
                if (bind.calculate) {
                    this.signals[fullName] = computed(this.compileFEL(bind.calculate, fullName, undefined, false));
                }
                if (bind.required) {
                    if (typeof bind.required === 'string') {
                        const compiled = this.compileFEL(bind.required as string, fullName, undefined, true);
                        this.requiredSignals[fullName] = computed(() => !!compiled());
                    } else {
                        this.requiredSignals[fullName] = signal(!!bind.required);
                    }
                }
                if (bind.readonly) {
                    if (typeof bind.readonly === 'string') {
                        const compiled = this.compileFEL(bind.readonly as string, fullName, undefined, true);
                        this.readonlySignals[fullName] = computed(() => !!compiled());
                    } else {
                        this.readonlySignals[fullName] = signal(!!bind.readonly);
                    }
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

    private compileFEL(expression: string, currentItemName: string, index?: number, includeSelf = false): () => any {
        const cacheKey = `${expression}|${currentItemName}|${includeSelf}`;
        if (this.compiledExpressions[cacheKey]) return this.compiledExpressions[cacheKey];

        console.log(`Compiling FEL: "${expression}" for ${currentItemName}`);
        const lexResult = FelLexer.tokenize(expression);
        parser.input = lexResult.tokens;
        const cst = parser.expression();

        if (parser.errors.length > 0) {
            console.error(`FEL Parse Errors for "${expression}":`, parser.errors);
            const errorFn = () => null;
            this.compiledExpressions[cacheKey] = errorFn;
            return errorFn;
        }

        const baseCurrentItemName = currentItemName.replace(/\[\d+\]/g, '');
        const astDeps = dependencyVisitor.getDependencies(cst);

        if (!this.dependencies[baseCurrentItemName]) {
            this.dependencies[baseCurrentItemName] = [];
        }

        const parts = currentItemName.split(/[.\[\]]/).filter(Boolean);
        const parentPath = parts.slice(0, -1).join('.');

        for (const dep of astDeps) {
            let fullDepPath = dep;
            if (dep === '') {
                fullDepPath = baseCurrentItemName;
            } else if (!dep.includes('.') && parentPath) {
                fullDepPath = `${parentPath}.${dep}`;
            }
            
            const cleanDepPath = fullDepPath.replace(/\[\d+\]/g, '');
            if (!this.dependencies[baseCurrentItemName].includes(cleanDepPath)) {
                this.dependencies[baseCurrentItemName].push(cleanDepPath);
            }
        }

        const compiled = () => {
            this.structureVersion.value;
            // Track dependencies in signals
            for (const dep of astDeps) {
                let fullDepPath = dep;
                if (dep === '') {
                    fullDepPath = currentItemName;
                } else if (!dep.includes('.') && parentPath) {
                    fullDepPath = `${parentPath}.${dep}`;
                }
                
                if (this.signals[fullDepPath]) this.signals[fullDepPath].value;
                if (this.repeats[fullDepPath]) this.repeats[fullDepPath].value;
                if (this.relevantSignals[fullDepPath]) this.relevantSignals[fullDepPath].value;
            }

            const context: FelContext = {
                getSignalValue: (path: string) => this.signals[path]?.value,
                getRepeatsValue: (path: string) => this.repeats[path]?.value ?? 0,
                getRelevantValue: (path: string) => this.relevantSignals[path]?.value ?? true,
                getRequiredValue: (path: string) => this.requiredSignals[path]?.value ?? false,
                getReadonlyValue: (path: string) => this.readonlySignals[path]?.value ?? false,
                currentItemPath: currentItemName,
                engine: this
            };

            try {
                return interpreter.evaluate(cst, context);
            } catch (e) {
                console.error("FEL Evaluation Error:", e);
                return null;
            }
        };

        this.compiledExpressions[cacheKey] = compiled;
        return compiled;
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

    public getValidationReport(): ValidationReport {
        const allResults: ValidationResult[] = [];

        for (const key of Object.keys(this.validationResults)) {
            if (this.isPathRelevant(key)) {
                allResults.push(...this.validationResults[key].value);
            }
        }

        for (const shapeId of Object.keys(this.shapeResults)) {
            allResults.push(...this.shapeResults[shapeId].value);
        }

        return {
            valid: !allResults.some(r => r.severity === 'error'),
            results: allResults
        };
    }

    private isPathRelevant(path: string): boolean {
        if (!path) return true;
        const parts = path.split(/[\[\]\.]/).filter(Boolean);
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
    }

    public getResponse() {
        const data: any = {};

        for (const key of Object.keys(this.signals)) {
            if (!this.isPathRelevant(key)) continue;
            const parts = key.split(/[\[\]\.]/).filter(Boolean);
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
        
        const report = this.getValidationReport();

        return {
            definitionUrl: this.definition.url || "http://example.org/form",
            definitionVersion: this.definition.version || "1.0.0",
            status: report.valid ? "completed" : "in-progress",
            data,
            validationReport: report,
            authored: new Date().toISOString()
        };
    }
}
export interface ComponentObject {
    component: string;
    bind?: string;
    when?: string;
    style?: Record<string, any>;
    children?: ComponentObject[];
    [key: string]: any;
}

export interface ComponentDocument {
    $formspecComponent: string;
    version: string;
    targetDefinition: {
        url: string;
        compatibleVersions?: string;
    };
    url?: string;
    name?: string;
    title?: string;
    description?: string;
    breakpoints?: Record<string, number>;
    tokens?: Record<string, any>;
    components?: Record<string, any>;
    tree: ComponentObject;
}

