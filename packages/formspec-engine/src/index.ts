/** @filedesc Batch FormEngine powered by the Rust/WASM evaluator. */

import { batch, signal, type Signal } from '@preact/signals-core';
import type {
    FormBind,
    FormDefinition,
    FormInstance,
    FormItem,
    FormShape,
    FormVariable,
    OptionEntry,
    ValidationReport as FormspecValidationReport,
    ValidationResult as FormspecValidationResult,
} from 'formspec-types';

import { diffEvalResults, type EvalResult, type EvalValidation } from './diff.js';
import {
    assembleDefinition as legacyAssembleDefinition,
    assembleDefinitionSync as legacyAssembleDefinitionSync,
    rewriteFEL as legacyRewriteFEL,
} from './assembler.js';
import { analyzeFEL as legacyAnalyzeFEL } from './fel/analysis.js';
import { rewriteFELReferences as legacyRewriteFELReferences } from './fel/rewrite.js';
import type {
    AssemblyProvenance,
    AssemblyResult,
    ComponentDocument,
    ComponentObject,
    DefinitionResolver,
    DocumentType,
    EngineReplayApplyResult,
    EngineReplayEvent,
    EngineReplayResult,
    ExtensionUsageIssue,
    FELAnalysis,
    FELBuiltinFunctionCatalogEntry,
    FormEngineDiagnosticsSnapshot,
    FormEngineRuntimeContext,
    IFormEngine,
    IRuntimeMappingEngine,
    MappingDiagnostic,
    MappingDirection,
    PinnedResponseReference,
    RegistryEntry,
    RemoteOptionsState,
    RewriteMap,
    RuntimeMappingResult,
    SchemaValidationError,
    SchemaValidationResult,
    SchemaValidator,
    SchemaValidatorSchemas,
} from './interfaces.js';
import { RuntimeMappingEngine as LegacyRuntimeMappingEngine } from './runtime-mapping.js';
import {
    initWasm,
    isWasmReady,
    wasmAssembleDefinition,
    wasmEvaluateDefinition,
    wasmEvalFELWithContext,
    wasmExecuteMappingDoc,
    wasmFindRegistryEntry,
    wasmGenerateChangelog,
    wasmGetFELDependencies,
    wasmItemAtPath,
    wasmItemLocationAtPath,
    wasmLintDocument,
    wasmListBuiltinFunctions,
    wasmNormalizeIndexedPath,
    wasmParseRegistry,
    wasmPrintFEL,
    wasmRewriteFELReferences,
    wasmRewriteMessageTemplate,
    wasmTokenizeFEL,
    wasmValidateExtensionUsage,
    wasmValidateLifecycleTransition,
    wasmWellKnownRegistryUrl,
    type WasmFelContext,
} from './wasm-bridge.js';

export type {
    AssemblyProvenance,
    AssemblyResult,
    ComponentDocument,
    ComponentObject,
    DefinitionResolver,
    DocumentType,
    EngineReplayApplyResult,
    EngineReplayEvent,
    EngineReplayResult,
    ExtensionUsageIssue,
    FELAnalysis,
    FELBuiltinFunctionCatalogEntry,
    FormEngineDiagnosticsSnapshot,
    FormEngineRuntimeContext,
    IFormEngine,
    IRuntimeMappingEngine,
    MappingDiagnostic,
    MappingDirection,
    PinnedResponseReference,
    RegistryEntry,
    RemoteOptionsState,
    RewriteMap,
    RuntimeMappingResult,
    SchemaValidationError,
    SchemaValidationResult,
    SchemaValidator,
    SchemaValidatorSchemas,
} from './interfaces.js';

export type FormspecItem = FormItem;
export type FormspecBind = FormBind & { remoteOptions?: string };
export type FormspecShape = FormShape;
export type FormspecVariable = FormVariable;
export type FormspecInstance = FormInstance;
export type FormspecDefinition = FormDefinition;
export type FormspecOption = OptionEntry;
export type ValidationResult = FormspecValidationResult;
export type ValidationReport = FormspecValidationReport;

export { initWasm, isWasmReady };

export const normalizeIndexedPath = wasmNormalizeIndexedPath;
export const itemAtPath = wasmItemAtPath;
export const itemLocationAtPath = wasmItemLocationAtPath;
export const analyzeFEL = legacyAnalyzeFEL;
export const tokenizeFEL = wasmTokenizeFEL;
export const rewriteFELReferences = legacyRewriteFELReferences;
export const rewriteMessageTemplate = wasmRewriteMessageTemplate;
export const lintDocument = wasmLintDocument;
export const parseRegistry = wasmParseRegistry;
export const findRegistryEntry = wasmFindRegistryEntry;
export const validateLifecycleTransition = wasmValidateLifecycleTransition;
export const wellKnownRegistryUrl = wasmWellKnownRegistryUrl;
export const generateChangelog = wasmGenerateChangelog;
export const printFEL = wasmPrintFEL;
export const evaluateDefinition = wasmEvaluateDefinition;

export function getBuiltinFELFunctionCatalog(): FELBuiltinFunctionCatalogEntry[] {
    return wasmListBuiltinFunctions();
}

export function getFELDependencies(expression: string): string[] {
    return wasmGetFELDependencies(expression);
}

export function validateExtensionUsage(
    items: unknown[],
    options: { resolveEntry: (name: string) => RegistryEntry | undefined },
): ExtensionUsageIssue[] {
    const names = new Set<string>();
    collectExtensionNames(items, names);
    const registryEntries: Record<string, RegistryEntry> = {};
    for (const name of names) {
        const entry = options.resolveEntry(name);
        if (entry) {
            registryEntries[name] = entry;
        }
    }
    return wasmValidateExtensionUsage(items, registryEntries) as ExtensionUsageIssue[];
}

export function createSchemaValidator(_schemas?: SchemaValidatorSchemas): SchemaValidator {
    return {
        validate(document: unknown, documentType?: DocumentType | null): SchemaValidationResult {
            const result = lintDocument(document);
            return {
                documentType: (documentType ?? result.documentType ?? null) as DocumentType | null,
                errors: (result.diagnostics ?? [])
                    .filter((diag: any) => diag?.severity === 'error')
                    .map(
                        (diag: any): SchemaValidationError => ({
                            path: typeof diag.path === 'string' ? diag.path : '$',
                            message: typeof diag.message === 'string' ? diag.message : 'Schema validation failed',
                            raw: diag,
                        }),
                    ),
            };
        },
    };
}

export function createMappingEngine(mappingDoc: unknown): IRuntimeMappingEngine {
    return new LegacyRuntimeMappingEngine(mappingDoc as any);
}

export class RuntimeMappingEngine implements IRuntimeMappingEngine {
    private readonly runtime: IRuntimeMappingEngine;

    constructor(mappingDoc: unknown) {
        this.runtime = new LegacyRuntimeMappingEngine(mappingDoc as any);
    }

    public forward(source: any): RuntimeMappingResult {
        return this.runtime.forward(source);
    }

    public reverse(source: any): RuntimeMappingResult {
        return this.runtime.reverse(source);
    }
}

export function createFormEngine(
    definition: FormDefinition,
    context?: FormEngineRuntimeContext,
    registryEntries?: RegistryEntry[],
): FormEngine {
    return new FormEngine(definition, context, registryEntries);
}

export function rewriteFEL(expression: string, map: RewriteMap): string {
    return legacyRewriteFEL(expression, map as any);
}

export function assembleDefinitionSync(
    definition: FormDefinition,
    resolver: Record<string, unknown> | ((url: string, version?: string) => unknown),
): AssemblyResult {
    if (typeof resolver !== 'function') {
        return legacyAssembleDefinitionSync(
            definition as any,
            ((url: string, version?: string) => resolver[version ? `${url}|${version}` : url] ?? resolver[url]) as any,
        ) as AssemblyResult;
    }
    return legacyAssembleDefinitionSync(definition as any, resolver as any) as AssemblyResult;
}

export async function assembleDefinition(
    definition: FormDefinition,
    resolver: DefinitionResolver,
): Promise<AssemblyResult> {
    return legacyAssembleDefinition(definition as any, resolver as any) as Promise<AssemblyResult>;
}

type EngineBindConfig = FormspecBind & {
    precision?: number;
    disabledDisplay?: 'hidden' | 'protected';
};

type RuntimeNowInput = Date | string | number;

interface ExtensionConstraintState {
    diagnostics: ValidationResult[];
    pattern?: RegExp;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    displayName?: string;
}

interface PendingInitialExpression {
    path: string;
    expression: string;
}

interface RegistryValidationFinding {
    path: string;
    result: ValidationResult;
}

interface FieldRecord {
    path: string;
    item: FormItem;
}

interface OrderedVariableDef {
    key: string;
    scope: string;
    name: string;
    expression: string;
}

export class FormEngine implements IFormEngine {
    public static instanceSourceCache = new Map<string, any>();

    public readonly definition: FormDefinition;
    public readonly signals: Record<string, Signal<any>> = {};
    public readonly relevantSignals: Record<string, Signal<boolean>> = {};
    public readonly requiredSignals: Record<string, Signal<boolean>> = {};
    public readonly readonlySignals: Record<string, Signal<boolean>> = {};
    public readonly errorSignals: Record<string, Signal<string | null>> = {};
    public readonly validationResults: Record<string, Signal<ValidationResult[]>> = {};
    public readonly shapeResults: Record<string, Signal<ValidationResult[]>> = {};
    public readonly repeats: Record<string, Signal<number>> = {};
    public readonly optionSignals: Record<string, Signal<OptionEntry[]>> = {};
    public readonly optionStateSignals: Record<string, Signal<RemoteOptionsState>> = {};
    public readonly variableSignals: Record<string, Signal<any>> = {};
    public readonly instanceData: Record<string, any> = {};
    public readonly instanceVersion = signal(0);
    public readonly structureVersion = signal(0);

    private readonly _evaluationVersion = signal(0);
    private readonly _bindConfigs: Record<string, EngineBindConfig> = {};
    private readonly _fieldItems = new Map<string, FormItem>();
    private readonly _groupItems = new Map<string, FormItem>();
    private readonly _shapeTiming = new Map<string, 'continuous' | 'submit' | 'demand'>();
    private readonly _pendingInitialExpressions: PendingInitialExpression[] = [];
    private readonly _instanceCalculateBinds: EngineBindConfig[] = [];
    private readonly _displaySignalPaths = new Set<string>();
    private readonly _prePopulateReadonly = new Set<string>();
    private readonly _calculatedFields = new Set<string>();
    private readonly _registryEntries = new Map<string, RegistryEntry>();
    private readonly _remoteOptionsTasks: Array<Promise<void>> = [];
    private readonly _instanceSourceTasks: Array<Promise<void>> = [];
    private readonly _variableDefs: FormspecVariable[];
    private readonly _variableSignalKeys = new Map<string, string[]>();
    private readonly _externalValidation: ValidationResult[] = [];
    private readonly _orderedVariableDefs: OrderedVariableDef[];
    private readonly _orderedCalculatedPaths: string[];

    private _data: Record<string, any> = {};
    private _previousVisibleResult: EvalResult | null = null;
    private _fullResult: EvalResult | null = null;
    private _labelContext: string | null = null;
    private _runtimeContext: {
        nowProvider: () => Date;
        locale?: string;
        timeZone?: string;
        seed?: string | number;
    } = {
        nowProvider: () => new Date(),
    };

    public constructor(
        definition: FormDefinition,
        runtimeContext?: FormEngineRuntimeContext,
        registryEntries?: RegistryEntry[],
    ) {
        this.definition = cloneValue(definition);
        this._variableDefs = [...(this.definition.variables ?? [])];

        if (runtimeContext) {
            this.setRuntimeContext(runtimeContext);
        }
        if (registryEntries) {
            for (const entry of registryEntries) {
                if (entry?.name) {
                    this._registryEntries.set(entry.name, entry);
                }
            }
        }

        this.resolveOptionSets();
        this.initializeOptionSignals();
        this.initializeInstances();
        this.initializeBindConfigs(this.definition.items);
        this.collectInstanceCalculateBinds();
        this.validateInstanceCalculateTargets();
        this.validateVariableCycles();
        this.validateCalculateCycles();
        this._orderedVariableDefs = this.buildOrderedVariableDefs();
        this._orderedCalculatedPaths = this.buildOrderedCalculatedPaths();
        this.registerItems(this.definition.items);
        this.initializeRemoteOptions();
        this._evaluate();
    }

    public static resolvePinnedDefinition<T extends { url?: string; version?: string }>(
        response: PinnedResponseReference,
        definitions: T[],
    ): T {
        const exact = definitions.find(
            (definition) =>
                definition.url === response.definitionUrl
                && definition.version === response.definitionVersion,
        );
        if (exact) {
            return exact;
        }

        const availableVersions = definitions
            .filter((definition) => definition.url === response.definitionUrl)
            .map((definition) => definition.version)
            .filter((version): version is string => typeof version === 'string')
            .sort();

        let message = `No definition found for pinned response ${response.definitionUrl}@${response.definitionVersion}`;
        if (availableVersions.length > 0) {
            message += `; available versions: ${availableVersions.join(', ')}`;
        }
        throw new Error(message);
    }

    public get formPresentation(): any {
        return this.definition.formPresentation ?? null;
    }

    public setRuntimeContext(context: FormEngineRuntimeContext = {}): void {
        if (Object.prototype.hasOwnProperty.call(context, 'now')) {
            this._runtimeContext.nowProvider = resolveNowProvider(context.now);
        }
        if (Object.prototype.hasOwnProperty.call(context, 'locale')) {
            this._runtimeContext.locale = context.locale;
        }
        if (Object.prototype.hasOwnProperty.call(context, 'timeZone')) {
            this._runtimeContext.timeZone = context.timeZone;
        }
        if (Object.prototype.hasOwnProperty.call(context, 'seed')) {
            this._runtimeContext.seed = context.seed;
        }
        if (this._fullResult) {
            this._evaluate();
        }
    }

    public getOptions(path: string): OptionEntry[] {
        return this.optionSignals[toBasePath(path)]?.value ?? [];
    }

    public getOptionsSignal(path: string): Signal<OptionEntry[]> | undefined {
        return this.optionSignals[toBasePath(path)];
    }

    public getOptionsState(path: string): RemoteOptionsState {
        return this.optionStateSignals[toBasePath(path)]?.value ?? { loading: false, error: null };
    }

    public getOptionsStateSignal(path: string): Signal<RemoteOptionsState> | undefined {
        return this.optionStateSignals[toBasePath(path)];
    }

    public async waitForRemoteOptions(): Promise<void> {
        await Promise.allSettled(this._remoteOptionsTasks);
    }

    public async waitForInstanceSources(): Promise<void> {
        await Promise.allSettled(this._instanceSourceTasks);
    }

    public setInstanceValue(name: string, path: string | undefined, value: any): void {
        this.writeInstanceValue(name, path, value);
        this._evaluate();
    }

    public getInstanceData(name: string, path?: string): any {
        const data = this.instanceData[name];
        if (data === undefined) {
            return undefined;
        }
        return path ? getNestedValue(data, path) : data;
    }

    public getDisabledDisplay(path: string): 'hidden' | 'protected' {
        return this._bindConfigs[toBasePath(path)]?.disabledDisplay ?? 'hidden';
    }

    public getVariableValue(name: string, scopePath: string): any {
        const visible = this.getVisibleVariableEntries(scopePath);
        return visible[name];
    }

    public addRepeatInstance(itemName: string): number | undefined {
        const path = this.resolveRepeatPath(itemName);
        const item = this._groupItems.get(path);
        if (!item?.repeatable) {
            return undefined;
        }
        const index = this.repeats[path]?.value ?? 0;
        batch(() => {
            this.repeats[path].value = index + 1;
            this.registerItemChildren(item.children ?? [], `${path}[${index}]`);
            this.structureVersion.value += 1;
        });
        this._evaluate();
        return index;
    }

    public removeRepeatInstance(itemName: string, index: number): void {
        const path = this.resolveRepeatPath(itemName);
        const item = this._groupItems.get(path);
        const count = this.repeats[path]?.value ?? 0;
        if (!item?.repeatable || index < 0 || index >= count) {
            return;
        }

        const rows: Record<string, any>[] = [];
        for (let current = 0; current < count; current += 1) {
            rows.push(this.snapshotGroupChildren(item.children ?? [], `${path}[${current}]`));
        }
        rows.splice(index, 1);

        batch(() => {
            this.clearRepeatSubtree(path);
            this.repeats[path].value = rows.length;
            for (let current = 0; current < rows.length; current += 1) {
                this.registerItemChildren(item.children ?? [], `${path}[${current}]`);
                this.applyGroupChildrenSnapshot(item.children ?? [], `${path}[${current}]`, rows[current]);
            }
            this.structureVersion.value += 1;
        });

        this._evaluate();
    }

    public compileExpression(expression: string, currentItemName = ''): () => any {
        return () => {
            this._evaluationVersion.value;
            this.instanceVersion.value;
            this.structureVersion.value;
            return this.evaluateExpression(expression, currentItemName);
        };
    }

    public setValue(name: string, value: any): void {
        if (typeof name !== 'string') {
            throw new TypeError('setValue path cannot be null');
        }

        const instanceTarget = parseInstanceTarget(name);
        if (instanceTarget) {
            this.writeInstanceValue(instanceTarget.instanceName, instanceTarget.instancePath, value);
            this._evaluate();
            return;
        }

        const basePath = toBasePath(name);
        if (this._calculatedFields.has(basePath)) {
            return;
        }

        const item = this._fieldItems.get(basePath);
        if (!item) {
            return;
        }

        const bind = this._bindConfigs[basePath];
        const nextValue = coerceFieldValue(item, bind, this.definition, value);
        this._data[name] = cloneValue(nextValue);
        this._evaluate();
    }

    public getValidationReport(options?: { mode?: 'continuous' | 'submit' }): ValidationReport {
        const mode = options?.mode ?? 'continuous';
        const results: ValidationResult[] = [];

        for (const [path, signalRef] of Object.entries(this.validationResults)) {
            if (this.isPathRelevant(path)) {
                results.push(...signalRef.value);
            }
        }

        for (const signalRef of Object.values(this.shapeResults)) {
            results.push(...signalRef.value);
        }

        if (mode === 'submit') {
            const submitResult = this.evaluateResultForTrigger('submit');
            for (const validation of submitResult.validations) {
                if (!validation.shapeId) {
                    continue;
                }
                if ((this._shapeTiming.get(validation.shapeId) ?? 'continuous') === 'submit') {
                    results.push(toValidationResult(validation));
                }
            }
        }

        const counts = { error: 0, warning: 0, info: 0 };
        for (const result of results) {
            counts[result.severity as keyof typeof counts] += 1;
        }

        return {
            valid: counts.error === 0,
            results,
            counts,
            timestamp: this.nowISO(),
        };
    }

    public evaluateShape(shapeId: string): ValidationResult[] {
        const timing = this._shapeTiming.get(shapeId) ?? 'continuous';
        if (timing === 'demand') {
            return this.evaluateResultForTrigger('demand').validations
                .filter((result) => result.shapeId === shapeId)
                .map(toValidationResult);
        }
        if (!this._fullResult) {
            this._evaluate();
        }
        return this._fullResult?.validations
            .filter((result) => result.shapeId === shapeId)
            .map(toValidationResult) ?? [];
    }

    public isPathRelevant(path: string): boolean {
        if (!path) {
            return true;
        }
        const segments = splitIndexedPath(path);
        let current = '';
        for (const segment of segments) {
            current = current ? appendPath(current, segment) : segment;
            if (this.relevantSignals[current] && !this.relevantSignals[current].value) {
                return false;
            }
        }
        return true;
    }

    public getResponse(meta?: {
        id?: string;
        author?: { id: string; name?: string };
        subject?: { id: string; type?: string };
        mode?: 'continuous' | 'submit';
    }): any {
        const data: Record<string, any> = {};
        const mode = meta?.mode ?? 'continuous';
        const defaultBehavior = this.definition.nonRelevantBehavior ?? 'remove';

        for (const [path, signalRef] of Object.entries(this.signals)) {
            if (this._displaySignalPaths.has(path)) {
                continue;
            }

            const relevant = this.isPathRelevant(path);
            let behavior = defaultBehavior;
            for (const ancestor of getAncestorBasePaths(path)) {
                const bind = this._bindConfigs[ancestor];
                if (bind?.nonRelevantBehavior) {
                    behavior = bind.nonRelevantBehavior;
                    break;
                }
            }

            if (!relevant && behavior === 'remove') {
                continue;
            }

            const value = !relevant && behavior === 'empty'
                ? null
                : cloneValue(signalRef.value);
            setResponsePathValue(data, path, value);
        }

        const report = this.getValidationReport({ mode });
        const response: any = {
            definitionUrl: this.definition.url ?? 'http://example.org/form',
            definitionVersion: this.definition.version ?? '1.0.0',
            status: report.valid ? 'completed' : 'in-progress',
            data,
            validationResults: report.results,
            authored: this.nowISO(),
        };

        if (meta?.id) {
            response.id = meta.id;
        }
        if (meta?.author) {
            response.author = meta.author;
        }
        if (meta?.subject) {
            response.subject = meta.subject;
        }

        return response;
    }

    public getDiagnosticsSnapshot(options?: { mode?: 'continuous' | 'submit' }): FormEngineDiagnosticsSnapshot {
        const values: Record<string, any> = {};
        const mips: FormEngineDiagnosticsSnapshot['mips'] = {};
        const repeats: Record<string, number> = {};

        for (const [path, repeatSignal] of Object.entries(this.repeats)) {
            repeats[path] = repeatSignal.value;
        }

        for (const [path, signalRef] of Object.entries(this.signals)) {
            values[path] = cloneValue(signalRef.value);
            mips[path] = {
                relevant: this.relevantSignals[path]?.value ?? true,
                required: this.requiredSignals[path]?.value ?? false,
                readonly: this.readonlySignals[path]?.value ?? false,
                error: this.errorSignals[path]?.value ?? null,
            };
        }

        const timestamp = this.nowISO();
        return {
            definition: {
                url: this.definition.url,
                version: this.definition.version,
                title: this.definition.title,
            },
            timestamp,
            structureVersion: this.structureVersion.value,
            repeats,
            values,
            mips,
            validation: this.getValidationReport(options),
            runtimeContext: {
                now: timestamp,
                locale: this._runtimeContext.locale,
                timeZone: this._runtimeContext.timeZone,
                seed: this._runtimeContext.seed,
            },
        };
    }

    public applyReplayEvent(event: EngineReplayEvent): EngineReplayApplyResult {
        try {
            switch (event.type) {
                case 'setValue':
                    this.setValue(event.path, event.value);
                    return { ok: true, event };
                case 'addRepeatInstance':
                    return { ok: true, event, output: this.addRepeatInstance(event.path) };
                case 'removeRepeatInstance':
                    this.removeRepeatInstance(event.path, event.index);
                    return { ok: true, event };
                case 'evaluateShape':
                    return { ok: true, event, output: this.evaluateShape(event.shapeId) };
                case 'getValidationReport':
                    return { ok: true, event, output: this.getValidationReport({ mode: event.mode }) };
                case 'getResponse':
                    return { ok: true, event, output: this.getResponse({ mode: event.mode }) };
                default: {
                    const neverType: never = event;
                    throw new Error(`Unsupported replay event: ${(neverType as any).type}`);
                }
            }
        } catch (error) {
            return {
                ok: false,
                event,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    public replay(events: EngineReplayEvent[], options?: { stopOnError?: boolean }): EngineReplayResult {
        const results: EngineReplayApplyResult[] = [];
        const errors: EngineReplayResult['errors'] = [];
        let applied = 0;

        for (let index = 0; index < events.length; index += 1) {
            const result = this.applyReplayEvent(events[index]);
            results.push(result);
            if (result.ok) {
                applied += 1;
                continue;
            }
            errors.push({
                index,
                event: events[index],
                error: result.error ?? 'Unknown replay error',
            });
            if (options?.stopOnError) {
                break;
            }
        }

        return { applied, results, errors };
    }

    public getDefinition(): FormDefinition {
        return this.definition;
    }

    public setLabelContext(context: string | null): void {
        this._labelContext = context;
    }

    public getLabel(item: FormItem): string {
        if (this._labelContext && item.labels?.[this._labelContext]) {
            return item.labels[this._labelContext];
        }
        return item.label;
    }

    public injectExternalValidation(
        results: Array<{ path: string; severity: string; code: string; message: string; source?: string }>,
    ): void {
        this._externalValidation.splice(
            0,
            this._externalValidation.length,
            ...results.map((result) =>
                makeValidationResult({
                    path: result.path,
                    severity: result.severity as ValidationResult['severity'],
                    constraintKind: 'constraint',
                    code: result.code,
                    message: result.message,
                    source: (result.source ?? 'external') as ValidationResult['source'],
                })),
        );
        this._evaluate();
    }

    public clearExternalValidation(path?: string): void {
        if (!path) {
            this._externalValidation.splice(0, this._externalValidation.length);
        } else {
            const base = toBasePath(path);
            for (let index = this._externalValidation.length - 1; index >= 0; index -= 1) {
                if (toBasePath(this._externalValidation[index].path) === base) {
                    this._externalValidation.splice(index, 1);
                }
            }
        }
        this._evaluate();
    }

    public setRegistryEntries(entries: any[]): void {
        this._registryEntries.clear();
        for (const entry of entries) {
            if (entry?.name) {
                this._registryEntries.set(entry.name, entry);
            }
        }
        this._evaluate();
    }

    public evaluateScreener(
        answers: Record<string, any>,
    ): { target: string; label?: string; extensions?: Record<string, any> } | null {
        const routes = this.definition.screener?.routes;
        if (!routes) {
            return null;
        }
        const fields = flattenObject(answers);
        for (const route of routes) {
            const value = safeEvaluateExpression(route.condition, {
                fields,
                variables: {},
                instances: {},
                nowIso: this.nowISO(),
            });
            if (value) {
                const output: { target: string; label?: string; extensions?: Record<string, any> } = {
                    target: route.target,
                };
                if (route.label !== undefined) {
                    output.label = route.label;
                }
                if (route.extensions !== undefined) {
                    output.extensions = route.extensions;
                }
                return output;
            }
        }
        return null;
    }

    public migrateResponse(responseData: Record<string, any>, fromVersion: string): Record<string, any> {
        const migrations = this.definition.migrations;
        if (!Array.isArray(migrations)) {
            return responseData;
        }

        const applicable = migrations
            .filter((migration: any) => migration.fromVersion >= fromVersion)
            .sort((left: any, right: any) => left.fromVersion.localeCompare(right.fromVersion));

        let data = cloneValue(responseData);
        for (const migration of applicable) {
            for (const change of migration.changes ?? []) {
                switch (change.type) {
                    case 'rename':
                        if (data[change.from] !== undefined) {
                            data[change.to] = data[change.from];
                            delete data[change.from];
                        }
                        break;
                    case 'remove':
                        delete data[change.path];
                        break;
                    case 'add':
                        if (data[change.path] === undefined) {
                            data[change.path] = cloneValue(change.default);
                        }
                        break;
                    case 'transform':
                        if (data[change.path] !== undefined && typeof change.expression === 'string') {
                            const fields = flattenObject(data);
                            data[change.path] = safeEvaluateExpression(change.expression, {
                                fields,
                                variables: {},
                                instances: {},
                                nowIso: this.nowISO(),
                            });
                        }
                        break;
                }
            }
        }
        return data;
    }

    private nowISO(): string {
        return this._runtimeContext.nowProvider().toISOString();
    }

    private resolveOptionSets(): void {
        const optionSets = this.definition.optionSets;
        if (!optionSets) {
            return;
        }
        const visit = (items: FormItem[]): void => {
            for (const item of items) {
                if (item.optionSet && optionSets[item.optionSet]) {
                    const entry = optionSets[item.optionSet];
                    item.options = Array.isArray(entry) ? entry : (entry.options ?? []);
                }
                if (item.children) {
                    visit(item.children);
                }
            }
        };
        visit(this.definition.items);
    }

    private initializeOptionSignals(): void {
        const visit = (items: FormItem[], prefix = ''): void => {
            for (const item of items) {
                const path = prefix ? `${prefix}.${item.key}` : item.key;
                if (item.type === 'field') {
                    const options = Array.isArray(item.options)
                        ? item.options.map((option) => ({
                            value: String(option.value),
                            label: String(option.label),
                        }))
                        : [];
                    this.optionSignals[path] = signal(options);
                    this.optionStateSignals[path] = signal({ loading: false, error: null });
                }
                if (item.children) {
                    visit(item.children, path);
                }
            }
        };
        visit(this.definition.items);
    }

    private initializeInstances(): void {
        const instances = this.definition.instances;
        if (!instances) {
            return;
        }

        for (const [name, instance] of Object.entries(instances)) {
            if (instance.data !== undefined) {
                const seedData = cloneValue(instance.data);
                this.validateInstanceSchema(name, seedData);
                this.instanceData[name] = seedData;
            }
            this.initializeInstanceSource(name, instance);
        }
    }

    private initializeInstanceSource(name: string, instance: FormspecInstance): void {
        if (!instance.source) {
            return;
        }

        if (instance.static && FormEngine.instanceSourceCache.has(instance.source)) {
            this.instanceData[name] = cloneValue(FormEngine.instanceSourceCache.get(instance.source));
            return;
        }

        const task = fetch(instance.source)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Instance source fetch failed (${response.status})`);
                }
                return response.json();
            })
            .then((payload) => {
                this.validateInstanceSchema(name, payload);
                const nextValue = cloneValue(payload);
                if (instance.static) {
                    FormEngine.instanceSourceCache.set(instance.source!, cloneValue(nextValue));
                }
                this.instanceData[name] = nextValue;
                this.instanceVersion.value += 1;
                this._evaluate();
            })
            .catch((error) => {
                console.error(`Failed to load instance source '${name}':`, error);
            });

        this._instanceSourceTasks.push(task);
    }

    private initializeBindConfigs(items: FormItem[], prefix = ''): void {
        for (const item of items) {
            const path = prefix ? `${prefix}.${item.key}` : item.key;
            this._groupItems.set(path, item);
            const inlineBind = extractInlineBind(item, path);
            if (inlineBind) {
                this._bindConfigs[path] = { ...this._bindConfigs[path], ...inlineBind };
            }
            if (item.children) {
                this.initializeBindConfigs(item.children, path);
            }
        }

        for (const bind of this.definition.binds ?? []) {
            const path = toBasePath(bind.path);
            this._bindConfigs[path] = { ...this._bindConfigs[path], ...(bind as EngineBindConfig), path };
            if (bind.calculate && !parseInstanceTarget(bind.path)) {
                this._calculatedFields.add(path);
            }
        }

        for (const shape of this.definition.shapes ?? []) {
            if (shape.id) {
                this._shapeTiming.set(shape.id, (shape.timing ?? 'continuous') as 'continuous' | 'submit' | 'demand');
                if (!this.shapeResults[shape.id]) {
                    this.shapeResults[shape.id] = signal([]);
                }
            }
        }

        for (const variableDef of this._variableDefs) {
            const key = `${variableDef.scope ?? '#'}:${variableDef.name}`;
            this.variableSignals[key] = signal(null);
            const existing = this._variableSignalKeys.get(variableDef.name) ?? [];
            existing.push(key);
            this._variableSignalKeys.set(variableDef.name, existing);
        }
    }

    private collectInstanceCalculateBinds(): void {
        for (const bind of Object.values(this._bindConfigs)) {
            if (bind.calculate && parseInstanceTarget(bind.path)) {
                this._instanceCalculateBinds.push(bind);
            }
        }
    }

    private validateInstanceCalculateTargets(): void {
        for (const bind of this._instanceCalculateBinds) {
            const target = parseInstanceTarget(bind.path);
            if (!target) {
                continue;
            }
            const instance = this.definition.instances?.[target.instanceName];
            if (!instance) {
                throw new Error(`Unknown instance '${target.instanceName}' targeted by bind '${bind.path}'`);
            }
            if (instance.readonly !== false) {
                throw new Error(`Calculate bind cannot target readonly instance '${target.instanceName}'`);
            }
        }
    }

    private validateVariableCycles(): void {
        const graph = new Map<string, Set<string>>();
        for (const variableDef of this._variableDefs) {
            const deps = new Set<string>();
            for (const name of legacyAnalyzeFEL(variableDef.expression).variables) {
                deps.add(name);
            }
            graph.set(variableDef.name, deps);
        }
        detectNamedCycle(graph, 'Circular variable dependency');
    }

    private validateCalculateCycles(): void {
        const graph = new Map<string, Set<string>>();
        for (const [path, bind] of Object.entries(this._bindConfigs)) {
            if (!bind.calculate || parseInstanceTarget(path)) {
                continue;
            }
            const deps = new Set<string>();
            const parentPath = parentPathOf(path);
            for (const dep of wasmGetFELDependencies(bind.calculate)) {
                const resolved = resolveRelativeDependency(dep, parentPath, path);
                if (resolved) {
                    deps.add(toBasePath(resolved));
                }
            }
            graph.set(path, deps);
        }
        detectNamedCycle(graph, 'Cyclic dependency detected');
    }

    private registerItems(items: FormItem[], prefix = ''): void {
        for (const item of items) {
            const path = prefix ? `${prefix}.${item.key}` : item.key;
            this._groupItems.set(path, item);
            this.relevantSignals[path] ??= signal(true);
            this.requiredSignals[path] ??= signal(false);
            this.readonlySignals[path] ??= signal(false);
            this.validationResults[path] ??= signal([]);
            this.errorSignals[path] ??= signal(null);

            if (item.type === 'field') {
                this._fieldItems.set(path, item);
                this.initializeFieldSignal(path, item);
                if (item.children) {
                    this.registerItemChildren(item.children, path);
                }
                continue;
            }

            if (item.type === 'display') {
                this._displaySignalPaths.add(path);
                if (this._bindConfigs[path]?.calculate) {
                    this.signals[path] = signal(null);
                }
                continue;
            }

            if (item.repeatable) {
                const count = item.minRepeat ?? 1;
                this.repeats[path] = signal(count);
                for (let index = 0; index < count; index += 1) {
                    this.registerItemChildren(item.children ?? [], `${path}[${index}]`);
                }
            } else {
                this.registerItemChildren(item.children ?? [], path);
            }
        }
    }

    private registerItemChildren(items: FormItem[], prefix: string): void {
        for (const item of items) {
            const path = `${prefix}.${item.key}`;
            this._groupItems.set(path, item);
            this.relevantSignals[path] ??= signal(true);
            this.requiredSignals[path] ??= signal(false);
            this.readonlySignals[path] ??= signal(false);
            this.validationResults[path] ??= signal([]);
            this.errorSignals[path] ??= signal(null);

            if (item.type === 'field') {
                this._fieldItems.set(toBasePath(path), item);
                this.initializeFieldSignal(path, item);
                if (item.children) {
                    this.registerItemChildren(item.children, path);
                }
                continue;
            }

            if (item.type === 'display') {
                this._displaySignalPaths.add(path);
                if (this._bindConfigs[toBasePath(path)]?.calculate) {
                    this.signals[path] ??= signal(null);
                }
                continue;
            }

            if (item.repeatable) {
                const count = item.minRepeat ?? 1;
                this.repeats[path] = signal(count);
                for (let index = 0; index < count; index += 1) {
                    this.registerItemChildren(item.children ?? [], `${path}[${index}]`);
                }
            } else {
                this.registerItemChildren(item.children ?? [], path);
            }
        }
    }

    private initializeFieldSignal(path: string, item: FormItem): void {
        if (this.signals[path]) {
            return;
        }
        const initial = this.resolveInitialFieldValue(path, item);
        this.signals[path] = signal(cloneValue(initial));
        this._data[path] = cloneValue(initial);
    }

    private resolveInitialFieldValue(path: string, item: FormItem): any {
        const prePopulate = item.prePopulate;
        if (prePopulate) {
            const value = this.getInstanceData(prePopulate.instance, prePopulate.path);
            if (value !== undefined) {
                if (prePopulate.editable === false) {
                    this._prePopulateReadonly.add(path);
                }
                return cloneValue(value);
            }
            if (prePopulate.editable === false) {
                this._prePopulateReadonly.add(path);
            }
        }

        if (typeof item.initialValue === 'string' && item.initialValue.startsWith('=')) {
            this._pendingInitialExpressions.push({
                path,
                expression: item.initialValue.slice(1),
            });
            return emptyValueForItem(item);
        }

        if (item.initialValue !== undefined) {
            return coerceInitialValue(item, item.initialValue);
        }

        return emptyValueForItem(item);
    }

    private initializeRemoteOptions(): void {
        for (const bind of Object.values(this._bindConfigs)) {
            if (!bind.remoteOptions) {
                continue;
            }
            const path = toBasePath(bind.path);
            const state = this.optionStateSignals[path] ?? signal({ loading: false, error: null });
            this.optionStateSignals[path] = state;
            state.value = { loading: true, error: null };
            const task = fetch(bind.remoteOptions)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Remote options fetch failed (${response.status})`);
                    }
                    return response.json();
                })
                .then((payload) => {
                    const options = normalizeRemoteOptions(payload);
                    this.optionSignals[path] = this.optionSignals[path] ?? signal([]);
                    this.optionSignals[path].value = options;
                    state.value = { loading: false, error: null };
                })
                .catch((error) => {
                    state.value = {
                        loading: false,
                        error: error instanceof Error ? error.message : String(error),
                    };
                });
            this._remoteOptionsTasks.push(task);
        }
    }

    private writeInstanceValue(
        instanceName: string,
        path: string | undefined,
        value: any,
        options?: { bypassReadonly?: boolean },
    ): void {
        const instance = this.definition.instances?.[instanceName];
        if (!instance) {
            throw new Error(`Unknown instance '${instanceName}'`);
        }
        if (!options?.bypassReadonly && instance.readonly !== false) {
            throw new Error(`Instance '${instanceName}' is readonly`);
        }

        let nextValue: any;
        if (!path) {
            nextValue = cloneValue(value);
        } else {
            nextValue = cloneValue(this.instanceData[instanceName] ?? {});
            setNestedPathValue(nextValue, path, cloneValue(value));
        }
        this.validateInstanceSchema(instanceName, nextValue);
        if (deepEqual(this.instanceData[instanceName], nextValue)) {
            return;
        }
        this.instanceData[instanceName] = nextValue;
        this.instanceVersion.value += 1;
    }

    private validateInstanceSchema(instanceName: string, data: any): void {
        const schema = this.definition.instances?.[instanceName]?.schema;
        if (!schema || typeof schema !== 'object') {
            return;
        }
        for (const [path, dataType] of Object.entries(schema)) {
            if (typeof dataType !== 'string') {
                continue;
            }
            const value = getNestedValue(data, path);
            if (value === undefined || value === null) {
                continue;
            }
            if (!validateDataType(value, dataType)) {
                throw new Error(`Instance '${instanceName}' schema mismatch at '${path}': expected ${dataType}`);
            }
        }
    }

    private evaluateExpression(
        expression: string,
        currentItemPath = '',
        dataOverride?: Record<string, any>,
        resultOverride?: EvalResult | null,
        scopedVariableOverrides?: Record<string, any>,
    ): any {
        return safeEvaluateExpression(
            this.normalizeExpressionForWasm(expression, currentItemPath),
            this.buildExpressionContext(currentItemPath, dataOverride, resultOverride, scopedVariableOverrides),
        );
    }

    private buildExpressionContext(
        currentItemPath = '',
        dataOverride?: Record<string, any>,
        resultOverride?: EvalResult | null,
        scopedVariableOverrides?: Record<string, any>,
    ): WasmFelContext {
        const result = resultOverride ?? this._fullResult;
        const rawFields = {
            ...(dataOverride ?? this._data),
            ...(result?.values ?? {}),
            ...snapshotSignals(this.signals),
        };
        const fields: Record<string, any> = {};
        for (const [path, value] of Object.entries(rawFields)) {
            setExpressionContextValue(fields, path, cloneValue(this.getExpressionValueForPath(path, value)));
        }

        const scopePath = parentPathOf(currentItemPath);
        if (scopePath) {
            const prefixA = `${scopePath}.`;
            const prefixB = `${scopePath}[`;
            for (const [path, value] of Object.entries(rawFields)) {
                if (path.startsWith(prefixA)) {
                    setExpressionContextValue(fields, path.slice(prefixA.length), cloneValue(value));
                } else if (path.startsWith(prefixB)) {
                    setExpressionContextValue(fields, path.slice(scopePath.length + 1), cloneValue(value));
                }
            }
        }

        const mipStates: WasmFelContext['mipStates'] = {};
        for (const path of Object.keys(this.signals)) {
            const state = {
                valid: (this.validationResults[path]?.value ?? []).every((result) => result.severity !== 'error'),
                relevant: this.relevantSignals[path]?.value ?? true,
                readonly: this.readonlySignals[path]?.value ?? false,
                required: this.requiredSignals[path]?.value ?? false,
            };
            if (path.includes('[')) {
                mipStates[toFelIndexedPath(path)] = { ...state };
            } else {
                mipStates[path] = state;
            }
            if (scopePath) {
                const prefixA = `${scopePath}.`;
                const prefixB = `${scopePath}[`;
                if (path.startsWith(prefixA)) {
                    mipStates[path.slice(prefixA.length)] = { ...state };
                } else if (path.startsWith(prefixB)) {
                    mipStates[path.slice(scopePath.length + 1)] = { ...state };
                }
            }
        }

        return {
            fields,
            variables: this.getVisibleVariableEntries(currentItemPath, scopedVariableOverrides),
            mipStates,
            repeatContext: this.buildRepeatContext(currentItemPath),
            instances: cloneValue(this.instanceData),
            nowIso: this.nowISO(),
        };
    }

    private buildRepeatContext(currentItemPath: string): WasmFelContext['repeatContext'] | undefined {
        const repeatAncestors = getRepeatAncestors(currentItemPath, this.repeats);
        if (repeatAncestors.length === 0) {
            return undefined;
        }

        let parent: WasmFelContext['repeatContext'] | undefined;
        for (const entry of repeatAncestors) {
            const collection = buildRepeatCollection(entry.groupPath, entry.count, this.signals);
            parent = {
                current: collection[entry.index] ?? null,
                index: entry.index + 1,
                count: entry.count,
                collection,
                parent,
            };
        }

        const outerParentPath = parentPathOf(repeatAncestors[repeatAncestors.length - 1].groupPath);
        if (parent && outerParentPath) {
            parent.parent = {
                current: buildGroupSnapshotForPath(outerParentPath, this.signals),
                index: 1,
                count: 1,
                collection: [buildGroupSnapshotForPath(outerParentPath, this.signals)],
                parent: parent.parent,
            };
        }

        return parent;
    }

    private getVisibleVariableEntries(scopePath: string, overrides?: Record<string, any>): Record<string, any> {
        const visible: Record<string, any> = {};
        const candidates = ['#', ...getScopeAncestors(scopePath)];
        for (const scope of candidates) {
            for (const variableDef of this._variableDefs) {
                if ((variableDef.scope ?? '#') !== scope) {
                    continue;
                }
                const key = `${variableDef.scope ?? '#'}:${variableDef.name}`;
                visible[variableDef.name] = overrides && Object.prototype.hasOwnProperty.call(overrides, key)
                    ? overrides[key]
                    : (this.variableSignals[key]?.value ?? null);
            }
        }
        return visible;
    }

    private _evaluate(): void {
        let attempt = 0;
        let fullResult: EvalResult | null = null;

        while (attempt < 6) {
            const baseResult = wasmEvaluateDefinition(this.definition, this._data, {
                nowIso: this.nowISO(),
                previousValidations: this._fullResult?.validations as unknown as Array<{
                    path: string;
                    severity: string;
                    constraintKind: string;
                    code: string;
                    message: string;
                    source: string;
                    shapeId?: string;
                    context?: Record<string, unknown>;
                }> | undefined,
            }) as EvalResult;
            fullResult = this.withExtraValidations(baseResult);

            const appliedInitial = this.applyPendingInitialExpressions(fullResult);
            const appliedDefaults = this.applyRelevanceDefaults(fullResult);
            const appliedInstanceCalculates = this.applyInstanceCalculates(fullResult);

            if (!appliedInitial && !appliedDefaults && !appliedInstanceCalculates) {
                break;
            }
            attempt += 1;
        }

        if (!fullResult) {
            return;
        }

        const visibleResult = this.filterContinuousShapeResults(fullResult);
        const delta = diffEvalResults(this._previousVisibleResult, visibleResult);

        batch(() => {
            this.patchValueSignals(fullResult.values);
            this.patchDeltaSignals(delta);
            for (let pass = 0; pass < 3; pass += 1) {
                this.patchDerivedMipSignals();
                this.patchBindValidationSignals();
                this.patchVariableSignals(fullResult);
                this.patchCalculatedSignals();
            }
            this.patchDerivedMipSignals();
            this.patchBindValidationSignals();
            this.syncInstanceCalculateSignals();
            this.patchErrorSignals();
            this._evaluationVersion.value += 1;
        });

        this._previousVisibleResult = visibleResult;
        this._fullResult = fullResult;
    }

    private evaluateResultForTrigger(trigger: 'continuous' | 'submit' | 'demand' | 'disabled'): EvalResult {
        return this.withExtraValidations(wasmEvaluateDefinition(this.definition, this._data, {
            nowIso: this.nowISO(),
            trigger,
            previousValidations: this._fullResult?.validations as unknown as Array<{
                path: string;
                severity: string;
                constraintKind: string;
                code: string;
                message: string;
                source: string;
                shapeId?: string;
                context?: Record<string, unknown>;
            }> | undefined,
        }) as EvalResult);
    }

    private withExtraValidations(result: EvalResult): EvalResult {
        const validations: EvalValidation[] = result.validations.filter((validation) => validation.source !== 'extension');
        const nonRelevant = new Set(result.nonRelevant.map(toBasePath));
        const mergedValues = { ...this._data, ...result.values };

        for (const [path, repeatSignal] of Object.entries(this.repeats)) {
            if (nonRelevant.has(path)) {
                continue;
            }
            const item = this._groupItems.get(path);
            if (!item?.repeatable) {
                continue;
            }
            if (item.minRepeat !== undefined && repeatSignal.value < item.minRepeat) {
                validations.push({
                    path,
                    severity: 'error',
                    constraintKind: 'cardinality',
                    code: 'MIN_REPEAT',
                    message: `Minimum ${item.minRepeat} entries required`,
                    source: 'bind',
                });
            }
            if (item.maxRepeat !== undefined && repeatSignal.value > item.maxRepeat) {
                validations.push({
                    path,
                    severity: 'error',
                    constraintKind: 'cardinality',
                    code: 'MAX_REPEAT',
                    message: `Maximum ${item.maxRepeat} entries allowed`,
                    source: 'bind',
                });
            }
        }

        for (const finding of this.collectRegistryValidationFindings(mergedValues, nonRelevant)) {
            validations.push(finding.result as unknown as EvalValidation);
        }

        validations.push(...this._externalValidation as unknown as EvalValidation[]);

        return {
            ...result,
            validations,
        };
    }

    private filterContinuousShapeResults(result: EvalResult): EvalResult {
        return {
            ...result,
            validations: result.validations.filter((validation) => {
                if (!validation.shapeId) {
                    return true;
                }
                return (this._shapeTiming.get(validation.shapeId) ?? 'continuous') === 'continuous';
            }),
        };
    }

    private collectRegistryValidationFindings(
        values: Record<string, any>,
        nonRelevant: Set<string>,
    ): RegistryValidationFinding[] {
        const findings: RegistryValidationFinding[] = [];

        for (const [path, item] of this._allRegistryAwareItems()) {
            const basePath = toBasePath(path);
            if (nonRelevant.has(basePath)) {
                continue;
            }

            const state = this.buildExtensionConstraintState(basePath, item);
            for (const diagnostic of state.diagnostics) {
                findings.push({ path: basePath, result: diagnostic });
            }

            if (item.type !== 'field') {
                continue;
            }

            const value = values[path];
            if (value === undefined || value === null || value === '') {
                continue;
            }

            if (state.pattern && !state.pattern.test(String(value))) {
                findings.push({
                    path,
                    result: {
                        path,
                        severity: 'error',
                        constraintKind: 'constraint',
                        code: 'PATTERN_MISMATCH',
                        message: state.displayName ? `Must be a valid ${state.displayName}` : 'Pattern mismatch',
                        source: 'bind',
                    },
                });
            }

            if (state.maxLength != null && String(value).length > state.maxLength) {
                findings.push({
                    path,
                    result: {
                        path,
                        severity: 'error',
                        constraintKind: 'constraint',
                        code: 'MAX_LENGTH_EXCEEDED',
                        message: `Must be at most ${state.maxLength} characters`,
                        source: 'bind',
                    },
                });
            }

            const numericValue = typeof value === 'number' ? value : Number(value);
            if (!Number.isNaN(numericValue)) {
                if (state.minimum != null && numericValue < state.minimum) {
                    findings.push({
                        path,
                        result: {
                            path,
                            severity: 'error',
                            constraintKind: 'constraint',
                            code: 'RANGE_UNDERFLOW',
                            message: `Must be at least ${state.minimum}`,
                            source: 'bind',
                        },
                    });
                }
                if (state.maximum != null && numericValue > state.maximum) {
                    findings.push({
                        path,
                        result: {
                            path,
                            severity: 'error',
                            constraintKind: 'constraint',
                            code: 'RANGE_OVERFLOW',
                            message: `Must be at most ${state.maximum}`,
                            source: 'bind',
                        },
                    });
                }
            }
        }

        return findings;
    }

    private _allRegistryAwareItems(): Array<[string, FormItem]> {
        const items: Array<[string, FormItem]> = [];
        for (const [path, item] of this._groupItems.entries()) {
            if (item.extensions && Object.keys(item.extensions).length > 0) {
                items.push([path, item]);
            }
        }
        for (const [path, item] of this._fieldItems.entries()) {
            if (item.extensions && Object.keys(item.extensions).length > 0) {
                if (!items.find(([existing]) => existing === path)) {
                    items.push([path, item]);
                }
            }
        }
        return items;
    }

    private buildExtensionConstraintState(path: string, item: FormItem): ExtensionConstraintState {
        const diagnostics: ValidationResult[] = [];
        let pattern: RegExp | undefined;
        let maxLength: number | undefined;
        let minimum: number | undefined;
        let maximum: number | undefined;
        let displayName: string | undefined;
        const formspecVersion = this.definition.$formspec ?? this.definition.version ?? '1.0';

        for (const [name, enabled] of Object.entries(item.extensions ?? {})) {
            if (enabled === false) {
                continue;
            }
            const entry = this._registryEntries.get(name);
            if (!entry) {
                diagnostics.push({
                    path,
                    severity: 'error',
                    constraintKind: 'constraint',
                    code: 'UNRESOLVED_EXTENSION',
                    message: `Unresolved extension '${name}': no matching registry entry loaded`,
                    source: 'bind',
                });
                continue;
            }
            const requiredRange = entry.compatibility?.formspecVersion;
            if (requiredRange && !versionSatisfies(formspecVersion, requiredRange)) {
                diagnostics.push({
                    path,
                    severity: 'warning',
                    constraintKind: 'constraint',
                    code: 'EXTENSION_COMPATIBILITY_MISMATCH',
                    message: `Extension '${name}' requires formspec ${requiredRange} but definition uses ${formspecVersion}`,
                    source: 'bind',
                });
            }
            if (entry.status === 'retired') {
                diagnostics.push({
                    path,
                    severity: 'warning',
                    constraintKind: 'constraint',
                    code: 'EXTENSION_RETIRED',
                    message: `Extension '${name}' is retired and should not be used`,
                    source: 'bind',
                });
            } else if (entry.status === 'deprecated') {
                diagnostics.push({
                    path,
                    severity: 'info',
                    constraintKind: 'constraint',
                    code: 'EXTENSION_DEPRECATED',
                    message: entry.deprecationNotice || `Extension '${name}' is deprecated`,
                    source: 'bind',
                });
            }
            displayName ??= entry.metadata?.displayName;
            if (!pattern && entry.constraints?.pattern) {
                try {
                    pattern = new RegExp(entry.constraints.pattern);
                } catch {
                    pattern = undefined;
                }
            }
            if (maxLength == null && entry.constraints?.maxLength != null) {
                maxLength = entry.constraints.maxLength;
            }
            if (minimum == null && entry.constraints?.minimum != null) {
                minimum = entry.constraints.minimum;
            }
            if (maximum == null && entry.constraints?.maximum != null) {
                maximum = entry.constraints.maximum;
            }
        }

        return {
            diagnostics,
            pattern,
            maxLength,
            minimum,
            maximum,
            displayName,
        };
    }

    private applyPendingInitialExpressions(result: EvalResult): boolean {
        let changed = false;
        for (const pending of this._pendingInitialExpressions) {
            if (!isEmptyValue(this._data[pending.path])) {
                continue;
            }
            const nextValue = this.evaluateExpression(pending.expression, pending.path, this._data, result);
            if (nextValue === undefined) {
                continue;
            }
            this._data[pending.path] = cloneValue(nextValue);
            changed = true;
        }
        return changed;
    }

    private applyRelevanceDefaults(result: EvalResult): boolean {
        const previous = new Set(this._previousVisibleResult?.nonRelevant ?? []);
        const current = new Set(result.nonRelevant);
        let changed = false;

        for (const [path, bind] of Object.entries(this._bindConfigs)) {
            if (bind.default === undefined) {
                continue;
            }
            if (!previous.has(path) || current.has(path)) {
                continue;
            }
            const concretePaths = Object.keys(this.signals).filter((signalPath) => toBasePath(signalPath) === path);
            for (const concretePath of concretePaths) {
                if (!isEmptyValue(this._data[concretePath])) {
                    continue;
                }
                const nextValue = typeof bind.default === 'string' && bind.default.startsWith('=')
                    ? this.evaluateExpression(bind.default.slice(1), concretePath, this._data, result)
                    : bind.default;
                this._data[concretePath] = cloneValue(nextValue);
                changed = true;
            }
        }

        return changed;
    }

    private applyInstanceCalculates(result: EvalResult): boolean {
        let changed = false;
        for (const bind of this._instanceCalculateBinds) {
            const target = parseInstanceTarget(bind.path);
            if (!target || !bind.calculate) {
                continue;
            }
            const value = this.evaluateExpression(bind.calculate, '', this._data, result);
            const before = cloneValue(this.getInstanceData(target.instanceName, target.instancePath));
            this.writeInstanceValue(target.instanceName, target.instancePath, value, { bypassReadonly: true });
            if (!deepEqual(before, this.getInstanceData(target.instanceName, target.instancePath))) {
                changed = true;
            }
        }
        return changed;
    }

    private patchValueSignals(values: Record<string, any>): void {
        for (const [path, value] of Object.entries(values)) {
            if (this.signals[path]) {
                this.signals[path].value = cloneValue(value);
            }
        }
    }

    private patchDeltaSignals(delta: ReturnType<typeof diffEvalResults>): void {
        for (const [path, relevant] of Object.entries(delta.relevant)) {
            this.relevantSignals[path] ??= signal(true);
            this.relevantSignals[path].value = relevant;
        }
        for (const [path, required] of Object.entries(delta.required)) {
            this.requiredSignals[path] ??= signal(false);
            this.requiredSignals[path].value = required;
        }
        for (const [path, readonly] of Object.entries(delta.readonly)) {
            this.readonlySignals[path] ??= signal(false);
            this.readonlySignals[path].value = readonly || this._prePopulateReadonly.has(path);
        }
        for (const [path, results] of Object.entries(delta.validations)) {
            this.validationResults[path] ??= signal([]);
            this.validationResults[path].value = toValidationResults(results);
        }
        for (const path of delta.removedValidationPaths) {
            if (this.validationResults[path]) {
                this.validationResults[path].value = [];
            }
        }
        for (const [shapeId, results] of Object.entries(delta.shapeResults)) {
            this.shapeResults[shapeId] ??= signal([]);
            this.shapeResults[shapeId].value = toValidationResults(results);
        }
        for (const shapeId of delta.removedShapeIds) {
            if (this.shapeResults[shapeId]) {
                this.shapeResults[shapeId].value = [];
            }
        }
    }

    private patchVariableSignals(result: EvalResult): void {
        const scopedValues: Record<string, any> = {};
        for (const variableDef of this._orderedVariableDefs) {
            const visible = this.evaluateExpression(
                variableDef.expression,
                variableDef.scope === '#'
                    ? ''
                    : `${variableDef.scope}.__var`,
                this._data,
                result,
                scopedValues,
            );
            scopedValues[variableDef.key] = visible;
            if (this.variableSignals[variableDef.key]) {
                this.variableSignals[variableDef.key].value = visible;
            }
        }
    }

    private patchCalculatedSignals(): void {
        for (const path of this._orderedCalculatedPaths) {
            const bind = this._bindConfigs[path];
            if (!bind?.calculate || parseInstanceTarget(bind.path)) {
                continue;
            }
            const concretePaths = this.getConcretePathsForBasePath(path, this.signals);
            for (const concretePath of concretePaths) {
                const field = this._fieldItems.get(toBasePath(concretePath)) ?? this._fieldItems.get(path);
                const rawValue = this.evaluateExpression(bind.calculate, concretePath);
                const nextValue = field
                    ? coerceFieldValue(field, bind, this.definition, rawValue)
                    : rawValue;
                if (this.signals[concretePath]) {
                    this.signals[concretePath].value = cloneValue(nextValue);
                }
            }
        }
    }

    private syncInstanceCalculateSignals(): void {
        for (const bind of this._instanceCalculateBinds) {
            const target = parseInstanceTarget(bind.path);
            if (!target || !bind.calculate) {
                continue;
            }
            const nextValue = this.evaluateExpression(bind.calculate);
            if ((nextValue === null || nextValue === undefined)
                && this.getInstanceData(target.instanceName, target.instancePath) !== undefined) {
                continue;
            }
            this.writeInstanceValue(target.instanceName, target.instancePath, nextValue, { bypassReadonly: true });
        }
    }

    private patchDerivedMipSignals(): void {
        for (const [path, bind] of Object.entries(this._bindConfigs)) {
            const concretePaths = this.getConcretePathsForBasePath(path, this.relevantSignals);
            for (const concretePath of concretePaths) {
                if (bind.relevant !== undefined) {
                    const rawRelevant = typeof bind.relevant === 'string'
                        ? this.evaluateExpression(bind.relevant, concretePath)
                        : bind.relevant;
                    const nextRelevant = rawRelevant === null || rawRelevant === undefined ? true : !!rawRelevant;
                    this.relevantSignals[concretePath] ??= signal(true);
                    this.relevantSignals[concretePath].value = nextRelevant;
                }
                if (bind.required !== undefined) {
                    const nextRequired = typeof bind.required === 'string'
                        ? !!this.evaluateExpression(bind.required, concretePath)
                        : !!bind.required;
                    this.requiredSignals[concretePath] ??= signal(false);
                    this.requiredSignals[concretePath].value = nextRequired;
                }
                if (bind.readonly !== undefined) {
                    const nextReadonly = typeof bind.readonly === 'string'
                        ? !!this.evaluateExpression(bind.readonly, concretePath)
                        : !!bind.readonly;
                    this.readonlySignals[concretePath] ??= signal(false);
                    this.readonlySignals[concretePath].value = nextReadonly || this._prePopulateReadonly.has(concretePath);
                }
            }
        }
    }

    private patchBindValidationSignals(): void {
        for (const [path, signalRef] of Object.entries(this.validationResults)) {
            const bind = this._bindConfigs[toBasePath(path)];
            if (!bind) {
                continue;
            }
            const preserved = signalRef.value.filter((result) =>
                !(result.source === 'bind' && (result.code === 'REQUIRED' || result.code === 'CONSTRAINT_FAILED')));
            const value = this.signals[path]?.value;
            const nextResults = [...preserved];
            if ((this.requiredSignals[path]?.value ?? false) && isEmptyValue(value)) {
                nextResults.push(makeValidationResult({
                    path,
                    severity: 'error',
                    constraintKind: 'required',
                    code: 'REQUIRED',
                    message: 'Required',
                    source: 'bind',
                }));
            }
            if (bind.constraint && !isEmptyValue(value)) {
                const passed = this.evaluateExpression(bind.constraint, path);
                if (!(passed === null || passed === undefined ? true : !!passed)) {
                    nextResults.push(makeValidationResult({
                        path,
                        severity: 'error',
                        constraintKind: 'constraint',
                        code: 'CONSTRAINT_FAILED',
                        message: bind.constraintMessage || 'Invalid',
                        source: 'bind',
                    }));
                }
            }
            signalRef.value = nextResults;
        }
    }

    private getConcretePathsForBasePath<T>(basePath: string, store: Record<string, T>): string[] {
        return Object.keys(store).filter((path) => toBasePath(path) === basePath);
    }

    private normalizeExpressionForWasm(expression: string, currentItemPath = ''): string {
        let normalized = expression;
        const currentFieldName = currentItemPath
            ? splitIndexedPath(currentItemPath).at(-1)?.replace(/\[\d+\]$/, '') ?? ''
            : '';
        if (currentFieldName) {
            normalized = replaceBareCurrentFieldRefs(normalized, currentFieldName);
        }
        const repeatAliases = buildRepeatValueAliases(snapshotSignals(this.signals)).map(([path]) => path);
        repeatAliases.sort((left, right) => right.length - left.length);

        for (const alias of repeatAliases) {
            const wildcardPath = `$${toRepeatWildcardPath(alias)}`;
            const escapedAlias = escapeRegExp(alias);
            const implicitPattern = new RegExp(`(^|[^$@A-Za-z0-9_])(${escapedAlias})(?![A-Za-z0-9_\\[])`, 'g');
            normalized = normalized.replace(implicitPattern, (_match, prefix) => `${prefix}${wildcardPath}`);
            normalized = normalized.replace(
                new RegExp(`\\$${escapedAlias}(?![A-Za-z0-9_\\[])`, 'g'),
                wildcardPath,
            );
        }

        return normalized;
    }

    private getExpressionValueForPath(path: string, value: unknown): unknown {
        const bind = this._bindConfigs[toBasePath(path)];
        if (bind?.excludedValue === 'null' && this.relevantSignals[path]?.value === false) {
            return null;
        }
        return value;
    }

    private resolveRepeatPath(itemName: string): string {
        return this.repeats[itemName] ? itemName : toBasePath(itemName);
    }

    private buildOrderedVariableDefs(): OrderedVariableDef[] {
        const defs = this._variableDefs.map((variableDef) => ({
            key: `${variableDef.scope ?? '#'}:${variableDef.name}`,
            scope: variableDef.scope ?? '#',
            name: variableDef.name,
            expression: variableDef.expression,
        }));
        const graph = new Map<string, Set<string>>();
        for (const def of defs) {
            const deps = new Set<string>();
            for (const name of legacyAnalyzeFEL(def.expression).variables) {
                const sameScope = defs.find((candidate) => candidate.name === name && candidate.scope === def.scope);
                const globalScope = defs.find((candidate) => candidate.name === name && candidate.scope === '#');
                if (sameScope) {
                    deps.add(sameScope.key);
                } else if (globalScope) {
                    deps.add(globalScope.key);
                }
            }
            graph.set(def.key, deps);
        }
        return topoSortKeys(defs, graph);
    }

    private buildOrderedCalculatedPaths(): string[] {
        const defs = Object.entries(this._bindConfigs)
            .filter(([path, bind]) => !!bind.calculate && !parseInstanceTarget(path))
            .map(([path, bind]) => ({ key: path, expression: bind.calculate! }));
        const graph = new Map<string, Set<string>>();
        for (const def of defs) {
            const deps = new Set<string>();
            const parent = parentPathOf(def.key);
            for (const dep of wasmGetFELDependencies(def.expression)) {
                const resolved = resolveRelativeDependency(dep, parent, def.key);
                if (!resolved) {
                    continue;
                }
                const baseResolved = toBasePath(resolved);
                if (baseResolved !== def.key && this._bindConfigs[baseResolved]?.calculate) {
                    deps.add(baseResolved);
                }
            }
            graph.set(def.key, deps);
        }
        return topoSortKeys(defs, graph).map((entry) => entry.key);
    }

    private patchErrorSignals(): void {
        for (const [path, signalRef] of Object.entries(this.validationResults)) {
            const firstError = signalRef.value.find((result) => result.severity === 'error')?.message ?? null;
            this.errorSignals[path] ??= signal(null);
            this.errorSignals[path].value = firstError;
        }
    }

    private snapshotGroupChildren(items: FormItem[], prefix: string): Record<string, any> {
        const snapshot: Record<string, any> = {};
        for (const item of items) {
            const path = `${prefix}.${item.key}`;
            if (item.type === 'field') {
                snapshot[item.key] = cloneValue(this.signals[path]?.value);
                continue;
            }
            if (item.type === 'group') {
                if (item.repeatable) {
                    const count = this.repeats[path]?.value ?? 0;
                    const rows: Record<string, any>[] = [];
                    for (let index = 0; index < count; index += 1) {
                        rows.push(this.snapshotGroupChildren(item.children ?? [], `${path}[${index}]`));
                    }
                    snapshot[item.key] = rows;
                } else {
                    snapshot[item.key] = this.snapshotGroupChildren(item.children ?? [], path);
                }
            }
        }
        return snapshot;
    }

    private applyGroupChildrenSnapshot(items: FormItem[], prefix: string, snapshot: Record<string, any>): void {
        for (const item of items) {
            const path = `${prefix}.${item.key}`;
            if (item.type === 'field') {
                const value = cloneValue(snapshot?.[item.key]);
                this._data[path] = value;
                if (this.signals[path]) {
                    this.signals[path].value = value;
                }
                continue;
            }
            if (item.type === 'group') {
                if (item.repeatable) {
                    const rows = Array.isArray(snapshot?.[item.key]) ? snapshot[item.key] : [];
                    for (let index = 0; index < rows.length; index += 1) {
                        this.applyGroupChildrenSnapshot(item.children ?? [], `${path}[${index}]`, rows[index] ?? {});
                    }
                } else {
                    this.applyGroupChildrenSnapshot(item.children ?? [], path, snapshot?.[item.key] ?? {});
                }
            }
        }
    }

    private clearRepeatSubtree(rootRepeatPath: string): void {
        const prefix = `${rootRepeatPath}[`;
        const stores: Array<Record<string, any>> = [
            this.signals,
            this.relevantSignals,
            this.requiredSignals,
            this.readonlySignals,
            this.errorSignals,
            this.validationResults,
            this.optionSignals,
            this.optionStateSignals,
            this.repeats,
        ];

        for (const store of stores) {
            for (const key of Object.keys(store)) {
                if (key.startsWith(prefix)) {
                    delete store[key];
                }
            }
        }

        for (const key of Object.keys(this._data)) {
            if (key.startsWith(prefix)) {
                delete this._data[key];
            }
        }
    }
}

function normalizeRemoteOptions(payload: any): OptionEntry[] {
    const options = Array.isArray(payload) ? payload : Array.isArray(payload?.options) ? payload.options : null;
    if (!options) {
        throw new Error('Remote options response must be an array or { options: [...] }');
    }
    return options
        .filter((option: any) => option && typeof option === 'object' && option.value !== undefined && option.label !== undefined)
        .map((option: any) => ({
            value: String(option.value),
            label: String(option.label),
        }));
}

function makeValidationResult(
    result: Pick<ValidationResult, 'path' | 'severity' | 'constraintKind' | 'code' | 'message' | 'source'>
    & Partial<Pick<ValidationResult, 'shapeId' | 'context'>>,
): ValidationResult {
    return {
        ...result,
        path: toFelIndexedPath(result.path),
    } as ValidationResult;
}

function toValidationResult(result: EvalValidation): ValidationResult {
    return {
        ...(result as unknown as ValidationResult),
        path: toFelIndexedPath(result.path),
    };
}

function toValidationResults(results: EvalValidation[]): ValidationResult[] {
    return results.map(toValidationResult);
}

function toRuntimeMappingResult(result: {
    direction: string;
    output: any;
    rulesApplied: number;
    diagnostics: any[];
}): RuntimeMappingResult {
    return {
        direction: result.direction as MappingDirection,
        output: result.output,
        appliedRules: result.rulesApplied,
        diagnostics: (result.diagnostics ?? []) as MappingDiagnostic[],
    };
}

function emptyValueForItem(item: FormItem): any {
    if (item.type !== 'field') {
        return null;
    }
    switch (item.dataType) {
        case 'integer':
        case 'decimal':
        case 'number':
        case 'money':
        case 'date':
        case 'dateTime':
        case 'time':
            return null;
        case 'boolean':
            return false;
        case 'multiChoice':
            return [];
        default:
            return '';
    }
}

function coerceInitialValue(item: FormItem, value: any): any {
    if (item.dataType === 'boolean' && value === '') {
        return false;
    }
    if (['integer', 'decimal', 'number'].includes(item.dataType ?? '') && value === '') {
        return null;
    }
    if (item.dataType === 'money' && typeof value === 'number') {
        return { amount: value, currency: item.currency ?? '' };
    }
    return cloneValue(value);
}

function coerceFieldValue(
    item: FormItem,
    bind: EngineBindConfig | undefined,
    definition: FormDefinition,
    value: any,
): any {
    let nextValue = value;

    if (typeof nextValue === 'string' && bind?.whitespace) {
        switch (bind.whitespace) {
            case 'trim':
                nextValue = nextValue.trim();
                break;
            case 'normalize':
                nextValue = nextValue.replace(/\s+/g, ' ').trim();
                break;
            case 'remove':
                nextValue = nextValue.replace(/\s/g, '');
                break;
        }
    }

    if (typeof nextValue === 'string' && ['integer', 'decimal', 'number'].includes(item.dataType ?? '')) {
        nextValue = nextValue === '' ? null : Number(nextValue);
    }
    if (item.dataType === 'money' && typeof nextValue === 'number') {
        nextValue = {
            amount: nextValue,
            currency: item.currency ?? definition.formPresentation?.defaultCurrency ?? '',
        };
    }
    if (item.dataType === 'money' && nextValue && typeof nextValue === 'object' && typeof nextValue.amount === 'string') {
        nextValue = {
            ...nextValue,
            amount: nextValue.amount === '' ? null : Number(nextValue.amount),
        };
    }

    if (bind?.precision !== undefined && typeof nextValue === 'number' && !Number.isNaN(nextValue)) {
        const factor = 10 ** bind.precision;
        nextValue = Math.round(nextValue * factor) / factor;
    }

    return cloneValue(nextValue);
}

function validateDataType(value: any, dataType: string): boolean {
    switch (dataType) {
        case 'string':
            return typeof value === 'string';
        case 'boolean':
            return typeof value === 'boolean';
        case 'integer':
            return typeof value === 'number' && Number.isInteger(value);
        case 'decimal':
        case 'number':
            return typeof value === 'number' && !Number.isNaN(value);
        case 'money':
            return value && typeof value === 'object' && typeof value.amount === 'number';
        case 'array':
            return Array.isArray(value);
        case 'object':
            return value !== null && typeof value === 'object' && !Array.isArray(value);
        default:
            return true;
    }
}

function cloneValue<T>(value: T): T {
    if (value === null || value === undefined || typeof value !== 'object') {
        return value;
    }
    const copier = (globalThis as any).structuredClone;
    if (typeof copier === 'function') {
        return copier(value);
    }
    return JSON.parse(JSON.stringify(value));
}

function deepEqual(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) {
        return true;
    }
    if (Array.isArray(left) && Array.isArray(right)) {
        return left.length === right.length && left.every((entry, index) => deepEqual(entry, right[index]));
    }
    if (left && right && typeof left === 'object' && typeof right === 'object') {
        const leftKeys = Object.keys(left as Record<string, unknown>).sort();
        const rightKeys = Object.keys(right as Record<string, unknown>).sort();
        if (!deepEqual(leftKeys, rightKeys)) {
            return false;
        }
        return leftKeys.every((key) =>
            deepEqual((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
    }
    return false;
}

function resolveNowProvider(now: FormEngineRuntimeContext['now']): () => Date {
    if (typeof now === 'function') {
        return () => coerceDate(now());
    }
    if (now !== undefined) {
        const fixed = coerceDate(now);
        return () => new Date(fixed.getTime());
    }
    return () => new Date();
}

function coerceDate(value: RuntimeNowInput): Date {
    if (value instanceof Date) {
        return new Date(value.getTime());
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toBasePath(path: string): string {
    return wasmNormalizeIndexedPath(path).replace(/\[\*\]/g, '');
}

function parseInstanceTarget(path: string): { instanceName: string; instancePath?: string } | null {
    const explicit = path.match(/^instances\.([a-zA-Z][a-zA-Z0-9_]*)\.?(.*)$/);
    if (explicit) {
        return {
            instanceName: explicit[1],
            instancePath: explicit[2] || undefined,
        };
    }
    const felSyntax = path.match(/^@instance\((['"])([^'"]+)\1\)\.?(.*)$/);
    if (felSyntax) {
        return {
            instanceName: felSyntax[2],
            instancePath: felSyntax[3] || undefined,
        };
    }
    return null;
}

function splitIndexedPath(path: string): string[] {
    return path.match(/[^.[\]]+|\[\d+\]/g)?.map((segment) => segment.startsWith('[') ? segment : segment) ?? [];
}

function appendPath(base: string, segment: string): string {
    return segment.startsWith('[') ? `${base}${segment}` : `${base}.${segment}`;
}

function parentPathOf(path: string): string {
    if (!path) {
        return '';
    }
    const segments = path.match(/[^.[\]]+|\[\d+\]/g) ?? [];
    if (segments.length <= 1) {
        return '';
    }
    const parts = segments.slice(0, -1);
    let current = parts[0] ?? '';
    for (let index = 1; index < parts.length; index += 1) {
        current = appendPath(current, parts[index]);
    }
    return current;
}

function getAncestorBasePaths(path: string): string[] {
    const segments = splitIndexedPath(toBasePath(path));
    const result: string[] = [];
    for (let index = segments.length; index >= 1; index -= 1) {
        result.push(segments.slice(0, index).join('.'));
    }
    return result;
}

function getScopeAncestors(scopePath: string): string[] {
    const stripped = toBasePath(scopePath);
    if (!stripped) {
        return [];
    }
    const parts = stripped.split('.').filter(Boolean);
    const scopes: string[] = [];
    for (let index = 1; index <= parts.length; index += 1) {
        scopes.push(parts.slice(0, index).join('.'));
    }
    return scopes;
}

function getNestedValue(target: any, path: string): any {
    const tokens = path.match(/[^.[\]]+|\[(\d+)\]/g) ?? [];
    let current = target;
    for (const token of tokens) {
        if (current === null || current === undefined) {
            return undefined;
        }
        if (token.startsWith('[')) {
            const index = Number(token.slice(1, -1));
            current = current[index];
        } else {
            current = current[token];
        }
    }
    return current;
}

function setNestedPathValue(target: Record<string, any>, path: string, value: any): void {
    const tokens = path.match(/[^.[\]]+|\[(\d+)\]/g) ?? [];
    let current: any = target;
    for (let index = 0; index < tokens.length - 1; index += 1) {
        const token = tokens[index];
        const next = tokens[index + 1];
        if (token.startsWith('[')) {
            const arrayIndex = Number(token.slice(1, -1));
            current[arrayIndex] ??= next?.startsWith('[') ? [] : {};
            current = current[arrayIndex];
            continue;
        }
        current[token] ??= next?.startsWith('[') ? [] : {};
        current = current[token];
    }
    const last = tokens[tokens.length - 1];
    if (!last) {
        return;
    }
    if (last.startsWith('[')) {
        current[Number(last.slice(1, -1))] = value;
    } else {
        current[last] = value;
    }
}

function setExpressionContextValue(target: Record<string, any>, path: string, value: any): void {
    const tokens = path.match(/[^.[\]]+|\[(\d+)\]/g) ?? [];
    if (tokens.length === 0) {
        return;
    }

    let current: any = target;
    for (let index = 0; index < tokens.length - 1; index += 1) {
        if (current === null || current === undefined || typeof current !== 'object') {
            return;
        }

        const token = tokens[index];
        const next = tokens[index + 1];
        if (token.startsWith('[')) {
            const arrayIndex = Number(token.slice(1, -1));
            const existing = current[arrayIndex];
            if (existing !== undefined && (existing === null || typeof existing !== 'object')) {
                return;
            }
            current[arrayIndex] ??= next?.startsWith('[') ? [] : {};
            current = current[arrayIndex];
            continue;
        }

        const existing = current[token];
        if (existing !== undefined && (existing === null || typeof existing !== 'object')) {
            return;
        }
        current[token] ??= next?.startsWith('[') ? [] : {};
        current = current[token];
    }

    if (current === null || current === undefined || typeof current !== 'object') {
        return;
    }

    const last = tokens[tokens.length - 1];
    if (last.startsWith('[')) {
        current[Number(last.slice(1, -1))] = value;
    } else {
        current[last] = value;
    }
}

function setResponsePathValue(target: Record<string, any>, path: string, value: any): void {
    const tokens = path.match(/[^.[\]]+|\[(\d+)\]/g) ?? [];
    if (tokens.length === 0) {
        return;
    }

    let current: any = target;
    for (let index = 0; index < tokens.length - 1; index += 1) {
        const token = tokens[index];
        const next = tokens[index + 1];

        if (token.startsWith('[')) {
            const arrayIndex = Number(token.slice(1, -1));
            const existing = current[arrayIndex];
            if (existing !== undefined && (existing === null || typeof existing !== 'object')) {
                const fallbackPath = tokens.slice(index + 1).join('.');
                setResponsePathValue(target, fallbackPath, value);
                return;
            }
            current[arrayIndex] ??= next?.startsWith('[') ? [] : {};
            current = current[arrayIndex];
            continue;
        }

        const existing = current[token];
        if (existing !== undefined && (existing === null || typeof existing !== 'object')) {
            const fallbackPath = tokens
                .slice(0, index)
                .concat(tokens.slice(index + 1))
                .join('.');
            setResponsePathValue(target, fallbackPath, value);
            return;
        }
        current[token] ??= next?.startsWith('[') ? [] : {};
        current = current[token];
    }

    const last = tokens[tokens.length - 1];
    if (last.startsWith('[')) {
        current[Number(last.slice(1, -1))] = value;
    } else {
        current[last] = value;
    }
}

function replaceBareCurrentFieldRefs(expression: string, currentFieldName: string): string {
    if (!currentFieldName || !expression.includes('$')) {
        return expression;
    }

    let output = '';
    let quote: '"' | "'" | null = null;

    for (let index = 0; index < expression.length; index += 1) {
        const char = expression[index];
        const previous = index > 0 ? expression[index - 1] : '';
        const next = index + 1 < expression.length ? expression[index + 1] : '';

        if (quote) {
            output += char;
            if (char === '\\' && next) {
                output += next;
                index += 1;
                continue;
            }
            if (char === quote) {
                quote = null;
            }
            continue;
        }

        if (char === "'" || char === '"') {
            quote = char;
            output += char;
            continue;
        }

        if (
            char === '$'
            && !/[A-Za-z0-9_]/.test(previous)
            && !/[A-Za-z0-9_]/.test(next)
        ) {
            output += currentFieldName;
            continue;
        }

        output += char;
    }

    return output;
}

function flattenObject(value: any, prefix = '', output: Record<string, any> = {}): Record<string, any> {
    if (Array.isArray(value)) {
        value.forEach((entry, index) => {
            const path = `${prefix}[${index}]`;
            flattenObject(entry, path, output);
        });
        if (prefix) {
            output[prefix] = cloneValue(value);
        }
        return output;
    }
    if (value && typeof value === 'object') {
        for (const [key, entry] of Object.entries(value)) {
            const path = prefix ? `${prefix}.${key}` : key;
            flattenObject(entry, path, output);
        }
        if (prefix) {
            output[prefix] = cloneValue(value);
        }
        return output;
    }
    if (prefix) {
        output[prefix] = cloneValue(value);
    }
    return output;
}

function buildGroupSnapshotForPath(prefix: string, signals: Record<string, Signal<any>>): Record<string, any> {
    const snapshot: Record<string, any> = {};
    for (const [path, signalRef] of Object.entries(signals)) {
        if (!path.startsWith(`${prefix}.`)) {
            continue;
        }
        const relative = path.slice(prefix.length + 1);
        if (!relative || relative.includes('[')) {
            continue;
        }
        setNestedPathValue(snapshot, relative, cloneValue(signalRef.value));
    }
    return snapshot;
}

function buildRepeatCollection(groupPath: string, count: number, signals: Record<string, Signal<any>>): any[] {
    const rows: any[] = [];
    for (let index = 0; index < count; index += 1) {
        const prefix = `${groupPath}[${index}]`;
        const row: Record<string, any> = {};
        for (const [path, signalRef] of Object.entries(signals)) {
            if (!path.startsWith(`${prefix}.`)) {
                continue;
            }
            const relative = path.slice(prefix.length + 1);
            setResponsePathValue(row, relative, cloneValue(signalRef.value));
        }
        rows.push(row);
    }
    return rows;
}

function getRepeatAncestors(
    currentItemPath: string,
    repeats: Record<string, Signal<number>>,
): Array<{ groupPath: string; index: number; count: number }> {
    const matches = currentItemPath.match(/[^.[\]]+\[\d+\]|[^.[\]]+/g) ?? [];
    const ancestors: Array<{ groupPath: string; index: number; count: number }> = [];
    let current = '';
    for (const segment of matches) {
        const repeatMatch = segment.match(/^(.+)\[(\d+)\]$/);
        if (repeatMatch) {
            current = current ? `${current}.${repeatMatch[1]}` : repeatMatch[1];
            if (repeats[current]) {
                ancestors.push({
                    groupPath: current,
                    index: Number(repeatMatch[2]),
                    count: repeats[current].value,
                });
            }
            current = `${current}[${repeatMatch[2]}]`;
        } else {
            current = current ? `${current}.${segment}` : segment;
        }
    }
    return ancestors;
}

function isEmptyValue(value: unknown): boolean {
    return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

function safeEvaluateExpression(expression: string, context: WasmFelContext): any {
    try {
        return wasmEvalFELWithContext(expression, context);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('Unsupported FEL function:')) {
            throw error;
        }
        return null;
    }
}

function extractInlineBind(item: FormItem, path: string): EngineBindConfig | null {
    const bind: EngineBindConfig = { path };
    let used = false;
    for (const key of [
        'calculate',
        'constraint',
        'constraintMessage',
        'relevant',
        'required',
        'readonly',
        'default',
        'precision',
        'disabledDisplay',
        'whitespace',
        'nonRelevantBehavior',
        'remoteOptions',
        'excludedValue',
    ] as const) {
        if ((item as any)[key] !== undefined) {
            (bind as any)[key] = (item as any)[key];
            used = true;
        }
    }
    if ((item as any).visible !== undefined && bind.relevant === undefined) {
        bind.relevant = (item as any).visible;
        used = true;
    }
    return used ? bind : null;
}

function detectNamedCycle(graph: Map<string, Set<string>>, message: string): void {
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (node: string): void => {
        if (visited.has(node)) {
            return;
        }
        if (visiting.has(node)) {
            throw new Error(message);
        }
        visiting.add(node);
        for (const dep of graph.get(node) ?? []) {
            if (graph.has(dep)) {
                visit(dep);
            }
        }
        visiting.delete(node);
        visited.add(node);
    };

    for (const node of graph.keys()) {
        visit(node);
    }
}

function topoSortKeys<T extends { key: string }>(
    nodes: T[],
    graph: Map<string, Set<string>>,
): T[] {
    const pending = new Map(nodes.map((node) => [node.key, node]));
    const incoming = new Map<string, number>();
    for (const node of nodes) {
        incoming.set(node.key, 0);
    }
    for (const deps of graph.values()) {
        for (const dep of deps) {
            incoming.set(dep, incoming.get(dep) ?? 0);
        }
    }
    for (const [key, deps] of graph.entries()) {
        incoming.set(key, incoming.get(key) ?? 0);
        for (const dep of deps) {
            incoming.set(key, (incoming.get(key) ?? 0) + 1);
        }
    }

    const ordered: T[] = [];
    const queue: string[] = [...nodes.filter((node) => (incoming.get(node.key) ?? 0) === 0).map((node) => node.key)];
    while (queue.length > 0) {
        const key = queue.shift()!;
        const node = pending.get(key);
        if (!node) {
            continue;
        }
        pending.delete(key);
        ordered.push(node);
        for (const [otherKey, deps] of graph.entries()) {
            if (!deps.has(key)) {
                continue;
            }
            const nextIncoming = (incoming.get(otherKey) ?? 0) - 1;
            incoming.set(otherKey, nextIncoming);
            if (nextIncoming === 0) {
                queue.push(otherKey);
            }
        }
    }

    if (pending.size > 0) {
        ordered.push(...pending.values());
    }
    return ordered;
}

function snapshotSignals(signals: Record<string, Signal<any>>): Record<string, any> {
    const snapshot: Record<string, any> = {};
    for (const [path, signalRef] of Object.entries(signals)) {
        snapshot[path] = cloneValue(signalRef.value);
    }
    return snapshot;
}

function toFelIndexedPath(path: string): string {
    return path.replace(/\[(\d+)\]/g, (_match, index) => `[${Number(index) + 1}]`);
}

function buildRepeatValueAliases(valuesByPath: Record<string, any>): Array<[string, any[]]> {
    const grouped = new Map<string, Array<{ index: number; value: any }>>();
    for (const [path, value] of Object.entries(valuesByPath)) {
        const match = path.match(/^(.*)\[(\d+)\]\.([^.[\]]+)$/);
        if (!match) {
            continue;
        }
        const alias = `${match[1]}.${match[3]}`;
        const entries = grouped.get(alias) ?? [];
        entries.push({ index: Number(match[2]), value: cloneValue(value) });
        grouped.set(alias, entries);
    }
    return [...grouped.entries()].map(([path, entries]) => [
        path,
        entries.sort((left, right) => left.index - right.index).map((entry) => entry.value),
    ]);
}

function toRepeatWildcardPath(alias: string): string {
    const lastDot = alias.lastIndexOf('.');
    if (lastDot === -1) {
        return `${alias}[*]`;
    }
    return `${alias.slice(0, lastDot)}[*].${alias.slice(lastDot + 1)}`;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveRelativeDependency(dep: string, parentPath: string, selfPath: string): string | null {
    if (!dep) {
        return selfPath;
    }
    if (dep.includes('.')) {
        return dep;
    }
    return parentPath ? `${parentPath}.${dep}` : dep;
}

function collectExtensionNames(items: unknown[], names: Set<string>): void {
    for (const item of items as Array<Record<string, any>>) {
        for (const [name, enabled] of Object.entries(item?.extensions ?? {})) {
            if (enabled !== false) {
                names.add(name);
            }
        }
        if (Array.isArray(item?.children)) {
            collectExtensionNames(item.children, names);
        }
    }
}

function parseVersion(version: string): [number, number, number] {
    const parts = version.split('.').map(Number);
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function versionSatisfies(version: string, constraint: string): boolean {
    const parsedVersion = parseVersion(version);
    for (const part of constraint.trim().split(/\s+/)) {
        let operator = '==';
        let targetText = part;
        if (part.startsWith('>=')) {
            operator = '>=';
            targetText = part.slice(2);
        } else if (part.startsWith('<=')) {
            operator = '<=';
            targetText = part.slice(2);
        } else if (part.startsWith('>')) {
            operator = '>';
            targetText = part.slice(1);
        } else if (part.startsWith('<')) {
            operator = '<';
            targetText = part.slice(1);
        }
        const target = parseVersion(targetText);
        const cmp = parsedVersion[0] !== target[0]
            ? parsedVersion[0] - target[0]
            : parsedVersion[1] !== target[1]
                ? parsedVersion[1] - target[1]
                : parsedVersion[2] - target[2];
        if (operator === '>=' && cmp < 0) return false;
        if (operator === '<=' && cmp > 0) return false;
        if (operator === '>' && cmp <= 0) return false;
        if (operator === '<' && cmp >= 0) return false;
        if (operator === '==' && cmp !== 0) return false;
    }
    return true;
}

function parseRef(ref: string): { url: string; version?: string } {
    const [withoutFragment] = ref.split('#');
    const pipeIndex = withoutFragment.indexOf('|');
    if (pipeIndex === -1) {
        return { url: withoutFragment };
    }
    return {
        url: withoutFragment.slice(0, pipeIndex),
        version: withoutFragment.slice(pipeIndex + 1),
    };
}

function collectRefs(node: unknown, refs: Set<string>): void {
    if (!node || typeof node !== 'object') {
        return;
    }
    if (Array.isArray(node)) {
        for (const entry of node) {
            collectRefs(entry, refs);
        }
        return;
    }
    const object = node as Record<string, unknown>;
    if (typeof object.$ref === 'string') {
        refs.add(object.$ref);
    }
    for (const value of Object.values(object)) {
        collectRefs(value, refs);
    }
}

async function assembleDefinitionAsyncInternal(
    definition: FormDefinition,
    resolver: DefinitionResolver,
): Promise<AssemblyResult> {
    const fragments: Record<string, unknown> = {};
    const assembledFrom: AssemblyProvenance[] = [];
    const queue = new Set<string>();
    collectRefs(definition, queue);
    const seen = new Set<string>();

    while (queue.size > 0) {
        const ref = queue.values().next().value as string;
        queue.delete(ref);
        if (seen.has(ref)) {
            continue;
        }
        seen.add(ref);
        const { url, version } = parseRef(ref);
        const resolved = await resolver(url, version);
        fragments[ref] = resolved;
        assembledFrom.push({
            url,
            version: resolved.version ?? version ?? '',
        });
        collectRefs(resolved, queue);
    }

    const result = wasmAssembleDefinition(definition, fragments);
    if ((result.errors?.length ?? 0) > 0) {
        throw new Error(result.errors.join('\n'));
    }
    return {
        definition: result.definition,
        assembledFrom,
    };
}

function assembleDefinitionSyncInternal(
    definition: FormDefinition,
    resolver: Record<string, unknown> | ((url: string, version?: string) => unknown),
): AssemblyResult {
    const resolveOne = typeof resolver === 'function'
        ? resolver
        : (url: string, version?: string) => resolver[version ? `${url}|${version}` : url] ?? resolver[url];

    const fragments: Record<string, unknown> = {};
    const assembledFrom: AssemblyProvenance[] = [];
    const queue = new Set<string>();
    collectRefs(definition, queue);
    const seen = new Set<string>();

    while (queue.size > 0) {
        const ref = queue.values().next().value as string;
        queue.delete(ref);
        if (seen.has(ref)) {
            continue;
        }
        seen.add(ref);
        const { url, version } = parseRef(ref);
        const resolved = resolveOne(url, version);
        fragments[ref] = resolved;
        assembledFrom.push({
            url,
            version: (resolved as any)?.version ?? version ?? '',
        });
        collectRefs(resolved, queue);
    }

    const result = wasmAssembleDefinition(definition, fragments);
    if ((result.errors?.length ?? 0) > 0) {
        throw new Error(result.errors.join('\n'));
    }
    return {
        definition: result.definition,
        assembledFrom,
    };
}

function rewriteFELCompat(expression: string, map: RewriteMap): string {
    return legacyRewriteFEL(expression, map as any);
}

function collectRewriteFields(expression: string, map: RewriteMap): Record<string, string> {
    const rewrites: Record<string, string> = {};
    for (const fieldPath of legacyAnalyzeFEL(expression).references) {
        const next = rewriteDollarPath(fieldPath, map);
        if (next !== fieldPath) {
            rewrites[fieldPath] = next;
        }
    }
    return rewrites;
}

function collectRewriteCurrentPaths(expression: string, map: RewriteMap): Record<string, string> {
    const rewrites: Record<string, string> = {};
    for (const match of expression.matchAll(/@current\.([A-Za-z0-9_.[\]*]+)/g)) {
        const currentPath = match[1];
        const next = rewriteCurrentSegments(currentPath, map);
        if (next !== currentPath) {
            rewrites[currentPath] = next;
        }
    }
    return rewrites;
}

function collectRewriteNavigationTargets(expression: string, map: RewriteMap): Record<string, string> {
    const rewrites: Record<string, string> = {};
    for (const match of expression.matchAll(/\b(?:prev|next|parent)\(\s*['"]([^'"]+)['"]\s*\)/g)) {
        const fieldName = match[1];
        if (map.importedKeys.has(fieldName)) {
            rewrites[fieldName] = `${map.keyPrefix}${fieldName}`;
        }
    }
    return rewrites;
}

function rewriteDollarPath(path: string, map: RewriteMap): string {
    const segments = path.split('.');
    let changed = false;
    const next = segments.map((segment, index) => {
        const bracketIndex = segment.indexOf('[');
        const base = bracketIndex === -1 ? segment : segment.slice(0, bracketIndex);
        const suffix = bracketIndex === -1 ? '' : segment.slice(bracketIndex);
        if (index === 0 && base === map.fragmentRootKey && map.fragmentRootKey) {
            changed = true;
            return `${map.hostGroupKey}${suffix}`;
        }
        if (map.importedKeys.has(base)) {
            changed = true;
            return `${map.keyPrefix}${base}${suffix}`;
        }
        return segment;
    });
    return changed ? next.join('.') : path;
}

function rewriteCurrentSegments(path: string, map: RewriteMap): string {
    const segments = path.split('.');
    let changed = false;
    const next = segments.map((segment) => {
        const bracketIndex = segment.indexOf('[');
        const base = bracketIndex === -1 ? segment : segment.slice(0, bracketIndex);
        const suffix = bracketIndex === -1 ? '' : segment.slice(bracketIndex);
        if (map.importedKeys.has(base)) {
            changed = true;
            return `${map.keyPrefix}${base}${suffix}`;
        }
        return segment;
    });
    return changed ? next.join('.') : path;
}
