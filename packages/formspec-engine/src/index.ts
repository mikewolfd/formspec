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
    FELRewriteOptions,
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
import {
    initWasm,
    isWasmReady,
    wasmAnalyzeFEL,
    wasmAssembleDefinition,
    wasmCollectFELRewriteTargets,
    wasmEvaluateDefinition,
    wasmEvaluateScreener,
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
    FELRewriteOptions,
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
export const tokenizeFEL = wasmTokenizeFEL;
export function analyzeFEL(expression: string): FELAnalysis {
    const raw = wasmAnalyzeFEL(expression);
    return {
        ...raw,
        errors: raw.errors.map((e: string | { message: string; line?: number; column?: number; offset?: number }) =>
            typeof e === 'string' ? { message: e, line: 1, column: 1, offset: 0 } : e,
        ),
    };
}

/** Basic tree item shape used by path traversal helpers. */
export interface TreeItemLike<T extends TreeItemLike<T> = any> {
    key: string;
    children?: T[];
}

/** Resolved mutable location of an item in a tree. */
export interface ItemLocation<T extends TreeItemLike<T>> {
    parent: T[];
    index: number;
    item: T;
}

/** Remove repeat indices/wildcards from a path segment. */
export function normalizePathSegment(segment: string): string {
    return segment.replace(/\[(?:\d+|\*)\]/g, '');
}

/** Split a dotted path into normalized (index-free) segments. */
export function splitNormalizedPath(path: string): string[] {
    if (!path) return [];
    return wasmNormalizeIndexedPath(path).split('.').filter(Boolean);
}

/** Find the mutable parent/index/item triple for a dotted tree path. */
export function itemLocationAtPath<T extends TreeItemLike<T>>(items: T[], path: string): ItemLocation<T> | undefined {
    const parts = splitNormalizedPath(path);
    if (parts.length === 0) return undefined;
    let currentItems = items;
    for (let i = 0; i < parts.length - 1; i++) {
        const found = currentItems.find(item => item.key === parts[i]);
        if (!found?.children) return undefined;
        currentItems = found.children;
    }
    const index = currentItems.findIndex(item => item.key === parts[parts.length - 1]);
    if (index < 0) return undefined;
    return { parent: currentItems, index, item: currentItems[index] };
}

function mapRewriteEntries(
    entries: string[],
    rewrite?: (value: string) => string,
): Record<string, string> | undefined {
    if (!rewrite || entries.length === 0) return undefined;
    const mapped: Record<string, string> = {};
    let changed = false;
    for (const entry of entries) {
        const next = rewrite(entry);
        if (next !== entry) {
            mapped[entry] = next;
            changed = true;
        }
    }
    return changed ? mapped : undefined;
}

function mapRewriteNavigationTargets(
    entries: Array<{ functionName: 'prev' | 'next' | 'parent'; name: string }>,
    rewrite?: (name: string, fn: 'prev' | 'next' | 'parent') => string,
): Record<string, string> | undefined {
    if (!rewrite || entries.length === 0) return undefined;
    const mapped: Record<string, string> = {};
    let changed = false;
    for (const entry of entries) {
        const next = rewrite(entry.name, entry.functionName);
        if (next !== entry.name) {
            mapped[`${entry.functionName}:${entry.name}`] = next;
            changed = true;
        }
    }
    return changed ? mapped : undefined;
}

/** Rewrite FEL references using callback options (bridges to WASM rewrite). */
export function rewriteFELReferences(expression: string, options: FELRewriteOptions): string {
    const targets = wasmCollectFELRewriteTargets(expression);
    return wasmRewriteFELReferences(expression, {
        fieldPaths: mapRewriteEntries(targets.fieldPaths, options.rewriteFieldPath),
        currentPaths: mapRewriteEntries(targets.currentPaths, options.rewriteCurrentPath),
        variables: mapRewriteEntries(targets.variables, options.rewriteVariable),
        instanceNames: mapRewriteEntries(targets.instanceNames, options.rewriteInstanceName),
        navigationTargets: mapRewriteNavigationTargets(targets.navigationTargets, options.rewriteNavigationTarget),
    });
}
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
    return new RuntimeMappingEngine(mappingDoc);
}

// ---------------------------------------------------------------------------
// RuntimeMappingEngine — thin WASM wrapper + TS adapter post-processing
// ---------------------------------------------------------------------------

interface MappingCSVConfig { delimiter?: string; quote?: string; header?: boolean; lineEnding?: 'crlf' | 'lf'; }

function mappingSerializeCSV(output: Record<string, unknown>, config: MappingCSVConfig): string {
    const delim = config.delimiter ?? ',';
    const quote = config.quote ?? '"';
    const includeHeader = config.header !== false;
    const le = config.lineEnding === 'lf' ? '\n' : '\r\n';
    const keys = Object.keys(output).filter(k => {
        const v = output[k];
        return v === null || v === undefined || typeof v !== 'object';
    });
    if (keys.length === 0) return '';
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const q = (val: unknown): string => {
        const str = val == null ? '' : String(val);
        if (str.includes(delim) || str.includes(quote) || str.includes('\n') || str.includes('\r')) {
            return quote + str.replace(new RegExp(esc(quote), 'g'), quote + quote) + quote;
        }
        return str;
    };
    const rows: string[] = [];
    if (includeHeader) rows.push(keys.map(k => q(k)).join(delim));
    rows.push(keys.map(k => q(output[k])).join(delim));
    return rows.join(le);
}

interface MappingXMLConfig { rootElement?: string; declaration?: boolean; indent?: number; cdata?: string[]; }
type MappingXMLTree = { attributes: Record<string, string>; children: Map<string, MappingXMLTree>; text?: string };

function mappingBuildXMLTree(obj: Record<string, unknown>): MappingXMLTree {
    const node: MappingXMLTree = { attributes: {}, children: new Map() };
    for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith('@')) {
            node.attributes[key.slice(1)] = value == null ? '' : String(value);
        } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            node.children.set(key, mappingBuildXMLTree(value as Record<string, unknown>));
        } else {
            const child: MappingXMLTree = { attributes: {}, children: new Map() };
            child.text = value == null ? '' : String(value);
            node.children.set(key, child);
        }
    }
    return node;
}

function mappingEscapeXML(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function mappingRenderElement(
    name: string, node: MappingXMLTree, depth: number, indentSize: number,
    cdataPaths: Set<string>, elementPath: string, lines: string[],
): void {
    const indent = indentSize > 0 ? ' '.repeat(depth * indentSize) : '';
    const childIndent = indentSize > 0 ? ' '.repeat((depth + 1) * indentSize) : '';
    let attrStr = '';
    for (const [an, av] of Object.entries(node.attributes)) attrStr += ` ${an}="${mappingEscapeXML(av)}"`;
    const hasChildren = node.children.size > 0;
    const hasText = node.text !== undefined;
    if (!hasChildren && !hasText) { lines.push(`${indent}<${name}${attrStr}/>`); return; }
    if (hasText && !hasChildren) {
        const tc = cdataPaths.has(elementPath) ? `<![CDATA[${node.text}]]>` : mappingEscapeXML(node.text!);
        lines.push(`${indent}<${name}${attrStr}>${tc}</${name}>`); return;
    }
    lines.push(`${indent}<${name}${attrStr}>`);
    if (hasText) {
        const tc = cdataPaths.has(elementPath) ? `<![CDATA[${node.text}]]>` : mappingEscapeXML(node.text!);
        lines.push(`${childIndent}${tc}`);
    }
    for (const [cn, cnode] of node.children) {
        mappingRenderElement(cn, cnode, depth + 1, indentSize, cdataPaths, elementPath ? `${elementPath}.${cn}` : cn, lines);
    }
    lines.push(`${indent}</${name}>`);
}

function mappingSerializeXML(output: Record<string, unknown>, config: MappingXMLConfig): string {
    const root = config.rootElement ?? 'root';
    const decl = config.declaration !== false;
    const indentSize = config.indent ?? 2;
    const cdataPaths = new Set(config.cdata ?? []);
    const tree = mappingBuildXMLTree(output);
    const lines: string[] = [];
    if (decl) lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    mappingRenderElement(root, tree, 0, indentSize, cdataPaths, '', lines);
    return lines.join(indentSize > 0 ? '\n' : '');
}

function mappingOmitNulls(obj: any): void {
    if (obj == null || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { for (const item of obj) mappingOmitNulls(item); return; }
    for (const key of Object.keys(obj)) {
        if (obj[key] === null || obj[key] === undefined) delete obj[key];
        else if (typeof obj[key] === 'object') mappingOmitNulls(obj[key]);
    }
}

function mappingSortKeysDeep(obj: any): void {
    if (obj == null || typeof obj !== 'object') return;
    if (Array.isArray(obj)) { for (const item of obj) mappingSortKeysDeep(item); return; }
    const keys = Object.keys(obj).sort();
    const entries = keys.map(k => [k, obj[k]] as const);
    for (const key of Object.keys(obj)) delete obj[key];
    for (const [key, value] of entries) { obj[key] = value; if (typeof value === 'object') mappingSortKeysDeep(value); }
}

export class RuntimeMappingEngine implements IRuntimeMappingEngine {
    private readonly doc: any;

    constructor(mappingDocument: any) {
        this.doc = mappingDocument || {};
    }

    public forward(source: any): RuntimeMappingResult {
        return this.execute('forward', source ?? {});
    }

    public reverse(source: any): RuntimeMappingResult {
        return this.execute('reverse', source ?? {});
    }

    private execute(direction: MappingDirection, source: any): RuntimeMappingResult {
        // Delegate to WASM for core rule evaluation
        let wasmResult: { direction: string; output: any; rulesApplied: number; diagnostics: any[] };
        try {
            wasmResult = wasmExecuteMappingDoc(this.doc, source, direction);
        } catch (e) {
            // WASM parser errors (e.g. unknown transform) become diagnostics
            return {
                direction,
                output: {},
                appliedRules: 0,
                diagnostics: [{
                    ruleIndex: -1,
                    errorCode: 'COERCE_FAILURE',
                    message: String(e).replace(/^Error:\s*/, ''),
                }],
            };
        }
        let output = wasmResult.output;
        const diagnostics: MappingDiagnostic[] = wasmResult.diagnostics.map((d: any) => ({
            ruleIndex: d.ruleIndex,
            sourcePath: d.sourcePath ?? undefined,
            targetPath: d.targetPath ?? undefined,
            errorCode: d.errorCode ?? 'COERCE_FAILURE',
            message: d.message,
        }));
        const appliedRules = wasmResult.rulesApplied;

        // If direction was blocked, return early (WASM already set INVALID_DOCUMENT diagnostic)
        if (diagnostics.some(d => d.errorCode === 'INVALID_DOCUMENT')) {
            return { direction, output, appliedRules, diagnostics };
        }

        // ── Adapter post-processing (TS-only — formatting, not evaluation) ──

        const jsonAdapter = this.doc.adapters?.json;
        if (jsonAdapter) {
            if (jsonAdapter.nullHandling === 'omit') mappingOmitNulls(output);
            if (jsonAdapter.sortKeys) mappingSortKeysDeep(output);
        }

        const csvAdapter = (this.doc.adapters as any)?.csv;
        const isCsv = csvAdapter || (this.doc.targetSchema as any)?.format === 'csv';
        if (isCsv) {
            const rules = Array.isArray(this.doc.rules) ? this.doc.rules : [];
            let hasAdapterError = false;
            for (const rule of rules) {
                const tp = direction === 'forward' ? rule.targetPath : (rule.sourcePath ?? rule.targetPath);
                if (tp && /[.\[\]]/.test(tp)) {
                    diagnostics.push({ ruleIndex: rules.indexOf(rule), sourcePath: rule.sourcePath, targetPath: rule.targetPath, errorCode: 'ADAPTER_FAILURE', message: `targetPath "${tp}" is not a simple identifier (CSV requires flat keys)` });
                    hasAdapterError = true;
                }
            }
            if (hasAdapterError) {
                return { direction, output: '' as any, appliedRules, diagnostics };
            }
            return { direction, output: mappingSerializeCSV(output, csvAdapter ?? {}) as any, appliedRules, diagnostics };
        }

        const xmlAdapter = (this.doc.adapters as any)?.xml;
        const isXml = xmlAdapter || (this.doc.targetSchema as any)?.format === 'xml';
        if (isXml) {
            return { direction, output: mappingSerializeXML(output, xmlAdapter ?? {}) as any, appliedRules, diagnostics };
        }

        return { direction, output, appliedRules, diagnostics };
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
    const targets = wasmCollectFELRewriteTargets(expression);
    const { fragmentRootKey, hostGroupKey, importedKeys, keyPrefix } = map;

    // Build fieldPaths rewrite map
    const fieldPaths: Record<string, string> | undefined = targets.fieldPaths.length > 0
        ? (() => {
            const m: Record<string, string> = {};
            let changed = false;
            for (const path of targets.fieldPaths) {
                const segments = path.split('.');
                const root = segments[0].replace(/\[(?:\d+|\*)\]/g, '');
                if (root === fragmentRootKey || (!fragmentRootKey && importedKeys.has(root))) {
                    // Replace root with hostGroupKey, prefix remaining imported segments.
                    // When fragmentRootKey is empty (no fragment selection), multi-segment
                    // paths whose root is an imported key also need rewriting.
                    const rewritten = [hostGroupKey + segments[0].slice(root.length),
                        ...segments.slice(1).map(seg => {
                            const bare = seg.replace(/\[(?:\d+|\*)\]/g, '');
                            return importedKeys.has(bare) ? keyPrefix + bare + seg.slice(bare.length) : seg;
                        })].join('.');
                    m[path] = rewritten;
                    changed = true;
                } else if (segments.length === 1 && importedKeys.has(root)) {
                    // Single-segment imported key — prefix it
                    m[path] = keyPrefix + root + segments[0].slice(root.length);
                    changed = true;
                }
            }
            return changed ? m : undefined;
        })()
        : undefined;

    // Build currentPaths rewrite map — prefix imported segments
    const currentPaths: Record<string, string> | undefined = targets.currentPaths.length > 0
        ? (() => {
            const m: Record<string, string> = {};
            let changed = false;
            for (const path of targets.currentPaths) {
                const segments = path.split('.');
                const rewritten = segments.map(seg => {
                    const bare = seg.replace(/\[(?:\d+|\*)\]/g, '');
                    return importedKeys.has(bare) ? keyPrefix + bare + seg.slice(bare.length) : seg;
                }).join('.');
                if (rewritten !== path) {
                    m[path] = rewritten;
                    changed = true;
                }
            }
            return changed ? m : undefined;
        })()
        : undefined;

    // Build navigation targets rewrite map — prefix imported names
    const navigationTargets: Record<string, string> | undefined = targets.navigationTargets.length > 0
        ? (() => {
            const m: Record<string, string> = {};
            let changed = false;
            for (const entry of targets.navigationTargets) {
                if (importedKeys.has(entry.name)) {
                    m[`${entry.functionName}:${entry.name}`] = keyPrefix + entry.name;
                    changed = true;
                }
            }
            return changed ? m : undefined;
        })()
        : undefined;

    return wasmRewriteFELReferences(expression, { fieldPaths, currentPaths, navigationTargets });
}

export function assembleDefinitionSync(
    definition: FormDefinition,
    resolver: Record<string, unknown> | ((url: string, version?: string) => unknown),
): AssemblyResult {
    return assembleDefinitionSyncInternal(definition, resolver);
}

export async function assembleDefinition(
    definition: FormDefinition,
    resolver: DefinitionResolver,
): Promise<AssemblyResult> {
    return assembleDefinitionAsyncInternal(definition, resolver);
}

type EngineBindConfig = FormspecBind & {
    precision?: number;
    disabledDisplay?: 'hidden' | 'protected';
};

type RuntimeNowInput = Date | string | number;

interface FieldRecord {
    path: string;
    item: FormItem;
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
    private readonly _instanceCalculateBinds: EngineBindConfig[] = [];
    private readonly _displaySignalPaths = new Set<string>();
    private readonly _prePopulateReadonly = new Set<string>();
    private readonly _calculatedFields = new Set<string>();
    private readonly _registryEntries = new Map<string, RegistryEntry>();
    private _registryDocuments: unknown[] = [];
    private readonly _remoteOptionsTasks: Array<Promise<void>> = [];
    private readonly _instanceSourceTasks: Array<Promise<void>> = [];
    private readonly _variableDefs: FormspecVariable[];
    private readonly _variableSignalKeys = new Map<string, string[]>();
    private readonly _externalValidation: ValidationResult[] = [];

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
            this._registryDocuments = [{ entries: registryEntries }];
        }

        this.resolveOptionSets();
        this.initializeOptionSignals();
        this.initializeInstances();
        this.initializeBindConfigs(this.definition.items);
        this.collectInstanceCalculateBinds();
        this.validateInstanceCalculateTargets();
        this.validateVariableCycles();
        this.validateCalculateCycles();
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
            // compileExpression is a public API — propagate errors (unlike internal evaluation).
            return wasmEvalFELWithContext(
                this.normalizeExpressionForWasm(expression, currentItemName),
                this.buildExpressionContext(currentItemName),
            );
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

        // Strip source from cardinality results (spec does not require it)
        const finalResults = results.map((result) => {
            if (result.constraintKind === 'cardinality') {
                const { source: _source, ...rest } = result as any;
                return rest as ValidationResult;
            }
            return result;
        });

        const counts = { error: 0, warning: 0, info: 0 };
        for (const result of finalResults) {
            counts[result.severity as keyof typeof counts] += 1;
        }

        return {
            $formspecValidationReport: '1.0' as const,
            valid: counts.error === 0,
            results: finalResults,
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
            $formspecResponse: '1.0',
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

    public dispose(): void {
        // No-op — WASM-backed engine has no subscriptions to teardown.
    }

    public setRegistryEntries(entries: any[]): void {
        this._registryEntries.clear();
        for (const entry of entries) {
            if (entry?.name) {
                this._registryEntries.set(entry.name, entry);
            }
        }
        this._registryDocuments = [{ entries }];
        this._evaluate();
    }

    public evaluateScreener(
        answers: Record<string, any>,
    ): { target: string; label?: string; extensions?: Record<string, any> } | null {
        return wasmEvaluateScreener(this.definition, answers);
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
                if (inlineBind.calculate && !parseInstanceTarget(path)) {
                    this._calculatedFields.add(path);
                }
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
            for (const name of wasmAnalyzeFEL(variableDef.expression).variables) {
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
        const hasExpressionInitial = typeof item.initialValue === 'string' && item.initialValue.startsWith('=');
        const initial = this.resolveInitialFieldValue(path, item);
        this.signals[path] = signal(cloneValue(initial));
        if (!hasExpressionInitial) {
            this._data[path] = cloneValue(initial);
        }
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
        replaceSelfRef = false,
    ): any {
        return safeEvaluateExpression(
            this.normalizeExpressionForWasm(expression, currentItemPath, replaceSelfRef),
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
            setExpressionContextValue(fields, path, toWasmContextValue(this.getExpressionValueForPath(path, value)));
        }

        const scopePath = parentPathOf(currentItemPath);
        if (scopePath) {
            const prefixA = `${scopePath}.`;
            const prefixB = `${scopePath}[`;
            for (const [path, value] of Object.entries(rawFields)) {
                if (path.startsWith(prefixA)) {
                    setExpressionContextValue(fields, path.slice(prefixA.length), toWasmContextValue(value));
                } else if (path.startsWith(prefixB)) {
                    setExpressionContextValue(fields, path.slice(scopePath.length + 1), toWasmContextValue(value));
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
            variables: Object.fromEntries(
                Object.entries(this.getVisibleVariableEntries(currentItemPath, scopedVariableOverrides))
                    .map(([key, value]) => [key, toWasmContextValue(value)]),
            ),
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
            previousNonRelevant: this._fullResult?.nonRelevant,
            instances: this.instanceData,
            registryDocuments: this._registryDocuments,
        }) as EvalResult;
        const evalResult = this.withExtraValidations(baseResult);

        // Apply TS-side fixups that WASM can't handle:
        // 1. Instance calculate write-back (binds targeting @instance(...) paths)
        this.applyInstanceCalculates(evalResult);
        const visibleResult = this.filterContinuousShapeResults(evalResult);
        const delta = diffEvalResults(this._previousVisibleResult, visibleResult);

        batch(() => {
            this.patchValueSignals(evalResult.values);
            this.patchDeltaSignals(delta);
            this.syncInstanceCalculateSignals();
            this.patchErrorSignals();
            this._evaluationVersion.value += 1;
        });

        this._previousVisibleResult = visibleResult;
        this._fullResult = evalResult;
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
            previousNonRelevant: this._fullResult?.nonRelevant,
            instances: this.instanceData,
            registryDocuments: this._registryDocuments,
        }) as EvalResult);
    }

    private withExtraValidations(result: EvalResult): EvalResult {
        // WASM now produces complete extension and shape validations.
        // Filter only WASM-produced cardinality (TS owns repeat counts via signals).
        const validations: EvalValidation[] = result.validations
            .filter((validation) => validation.constraintKind !== 'cardinality')
            .map((validation) => (
                validation.code === 'REQUIRED' && validation.source === 'bind'
                    ? { ...validation, message: 'Required' }
                    : validation
            ));
        const nonRelevant = new Set(result.nonRelevant.map(toBasePath));

        // TS-authoritative cardinality from repeat signals
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
                const basePath = toBasePath(path);
                const normalizedValue = normalizeWasmValue(value);
                const item = this._fieldItems.get(basePath);
                const hasExpressionInitial = typeof item?.initialValue === 'string' && item.initialValue.startsWith('=');
                if (!this._calculatedFields.has(basePath)
                    && hasExpressionInitial
                    && !(path in this._data)) {
                    this._data[path] = cloneValue(normalizedValue);
                } else if (!this._calculatedFields.has(basePath)
                    && this._bindConfigs[basePath]?.default !== undefined
                    && path in this._data
                    && isEmptyValue(this._data[path])
                    && !deepEqual(this._data[path], normalizedValue)) {
                    this._data[path] = cloneValue(normalizedValue);
                }
                let rawValue: any;
                if (!this._calculatedFields.has(basePath) && path in this._data) {
                    // For user-entered fields, prefer _data over WASM value. Whitespace
                    // transforms (trim/normalize) are applied at setValue time via coerceFieldValue,
                    // so _data already stores the transformed value. Signals reflect _data.
                    rawValue = this._data[path];
                } else {
                    rawValue = value;
                }
                this.signals[path].value = normalizeWasmValue(rawValue);
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
        for (const [name, value] of Object.entries(delta.variables)) {
            const signalKeys = this._variableSignalKeys.get(name) ?? [name];
            for (const key of signalKeys) {
                this.variableSignals[key] ??= signal(undefined);
                this.variableSignals[key].value = normalizeWasmValue(value);
            }
        }
        for (const name of delta.removedVariables) {
            const signalKeys = this._variableSignalKeys.get(name) ?? [name];
            for (const key of signalKeys) {
                if (this.variableSignals[key]) {
                    this.variableSignals[key].value = undefined;
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

    private getConcretePathsForBasePath<T>(basePath: string, store: Record<string, T>): string[] {
        return Object.keys(store).filter((path) => toBasePath(path) === basePath);
    }

    private normalizeExpressionForWasm(expression: string, currentItemPath = '', replaceSelfRef = false): string {
        let normalized = expression;
        const currentFieldName = currentItemPath
            ? splitIndexedPath(currentItemPath).at(-1)?.replace(/\[\d+\]$/, '') ?? ''
            : '';
        // Only replace bare $ (self-reference) for constraint expressions,
        // not for calculate/relevant/etc. where $ is a predicate variable in countWhere/sumWhere.
        if (replaceSelfRef && currentFieldName) {
            normalized = replaceBareCurrentFieldRefs(normalized, currentFieldName);
        }

        // Resolve $group.field qualified refs to sibling refs when inside a repeat context.
        // E.g., for path "line_items[0].total", "$line_items.qty" becomes just "qty".
        const repeatAncestors = getRepeatAncestors(currentItemPath, this.repeats);
        if (repeatAncestors.length > 0) {
            normalized = resolveQualifiedGroupRefs(normalized, currentItemPath, repeatAncestors);
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
        $formspecValidationResult: '1.0',
        ...result,
        path: toFelIndexedPath(result.path),
    } as ValidationResult;
}

function toValidationResult(result: EvalValidation): ValidationResult {
    return {
        ...(result as unknown as ValidationResult),
        $formspecValidationResult: '1.0',
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
        if (nextValue === '') {
            nextValue = null;
        } else {
            const parsed = Number(nextValue);
            // Keep the original string if it can't be parsed — allows WASM to detect TYPE_MISMATCH
            nextValue = Number.isNaN(parsed) ? nextValue : parsed;
        }
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

function normalizeWasmValue<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((entry) => normalizeWasmValue(entry)) as T;
    }
    if (value && typeof value === 'object') {
        const record = value as Record<string, any>;
        if (record.$type === 'money' && 'amount' in record && 'currency' in record) {
            return {
                amount: normalizeWasmValue(record.amount),
                currency: normalizeWasmValue(record.currency),
            } as T;
        }
        return Object.fromEntries(
            Object.entries(record)
                .filter(([key]) => key !== '$type')
                .map(([key, entry]) => [key, normalizeWasmValue(entry)]),
        ) as T;
    }
    return cloneValue(value);
}

function toWasmContextValue<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((entry) => toWasmContextValue(entry)) as T;
    }
    if (value && typeof value === 'object') {
        const record = value as Record<string, any>;
        if (!('$type' in record) && 'amount' in record && 'currency' in record) {
            return {
                $type: 'money',
                amount: toWasmContextValue(record.amount),
                currency: toWasmContextValue(record.currency),
            } as T;
        }
        return Object.fromEntries(
            Object.entries(record).map(([key, entry]) => [key, toWasmContextValue(entry)]),
        ) as T;
    }
    return cloneValue(value);
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
            output += '$' + currentFieldName;
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
    } catch {
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


/**
 * Resolve $group.field qualified refs to sibling refs within repeat context.
 *
 * When evaluating an expression for a field inside a repeat group (e.g., line_items[0].total),
 * a reference like $line_items.qty should resolve to the sibling field "qty" in the same
 * instance, not to a wildcard collecting all instances.
 *
 * For nested repeats (e.g., orders[0].items[0].line_total), $items.qty resolves to the
 * innermost sibling, and $orders.discount_pct resolves to the enclosing group's concrete path.
 */
function resolveQualifiedGroupRefs(
    expression: string,
    currentItemPath: string,
    repeatAncestors: Array<{ groupPath: string; index: number; count: number }>,
): string {
    let result = expression;

    // Build a map of group name -> concrete prefix for each repeat ancestor.
    // Process longest names first to avoid partial matches.
    const groupReplacements: Array<{ groupName: string; concretePrefix: string; isInnermost: boolean }> = [];
    for (let index = 0; index < repeatAncestors.length; index += 1) {
        const ancestor = repeatAncestors[index];
        const groupPath = ancestor.groupPath;
        // Extract the group name (last segment of the groupPath, without any indices)
        const groupName = groupPath.includes('.')
            ? groupPath.split('.').at(-1)!
            : groupPath;
        const concretePrefix = `${groupPath}[${ancestor.index}]`;
        groupReplacements.push({
            groupName,
            concretePrefix,
            isInnermost: index === repeatAncestors.length - 1,
        });
    }

    // Sort longest group names first to prevent partial matches
    groupReplacements.sort((a, b) => b.groupName.length - a.groupName.length);

    for (const { groupName, concretePrefix, isInnermost } of groupReplacements) {
        const escapedGroupName = escapeRegExp(groupName);
        // Match $groupName.fieldName — the qualified ref pattern
        const pattern = new RegExp(
            `\\$${escapedGroupName}\\.([A-Za-z_][A-Za-z0-9_]*)`,
            'g',
        );
        result = result.replace(pattern, (_match, fieldName) => {
            if (isInnermost) {
                // For the innermost repeat scope, resolve to bare sibling ref
                // (buildExpressionContext already adds siblings as short names)
                return fieldName;
            }
            // For outer repeat scopes, resolve to the FEL-indexed path.
            // FEL uses 1-based indexing; the concretePrefix uses 0-based.
            return toFelIndexedPath(concretePrefix) + '.' + fieldName;
        });
    }

    return result;
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

function parseRef(ref: string): { url: string; version?: string; fragment?: string } {
    let remainder = ref;
    let fragment: string | undefined;
    const hashIdx = remainder.indexOf('#');
    if (hashIdx !== -1) {
        fragment = remainder.slice(hashIdx + 1);
        remainder = remainder.slice(0, hashIdx);
    }
    const pipeIndex = remainder.indexOf('|');
    if (pipeIndex === -1) {
        return { url: remainder, fragment };
    }
    return {
        url: remainder.slice(0, pipeIndex),
        version: remainder.slice(pipeIndex + 1),
        fragment,
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

async function collectResolvedFragmentsAsync(
    definition: FormDefinition,
    resolver: DefinitionResolver,
): Promise<Record<string, unknown>> {
    const fragments: Record<string, unknown> = {};
    const visiting = new Set<string>();

    const visit = async (node: unknown): Promise<void> => {
        const refs = new Set<string>();
        collectRefs(node, refs);
        for (const refUri of refs) {
            const { url, version } = parseRef(refUri);
            const cacheKey = version ? `${url}|${version}` : url;
            if (cacheKey in fragments || visiting.has(cacheKey)) {
                continue;
            }
            visiting.add(cacheKey);
            const resolved = cloneValue(await resolver(url, version));
            fragments[cacheKey] = resolved;
            if (!(url in fragments)) {
                fragments[url] = resolved;
            }
            await visit(resolved);
            visiting.delete(cacheKey);
        }
    };

    await visit(definition);
    return fragments;
}

function collectResolvedFragmentsSync(
    definition: FormDefinition,
    resolver: (url: string, version?: string) => unknown,
): Record<string, unknown> {
    const fragments: Record<string, unknown> = {};
    const visiting = new Set<string>();

    const visit = (node: unknown): void => {
        const refs = new Set<string>();
        collectRefs(node, refs);
        for (const refUri of refs) {
            const { url, version } = parseRef(refUri);
            const cacheKey = version ? `${url}|${version}` : url;
            if (cacheKey in fragments || visiting.has(cacheKey)) {
                continue;
            }
            visiting.add(cacheKey);
            const resolved = cloneValue(resolver(url, version));
            fragments[cacheKey] = resolved;
            if (!(url in fragments)) {
                fragments[url] = resolved;
            }
            visit(resolved);
            visiting.delete(cacheKey);
        }
    };

    visit(definition);
    return fragments;
}

async function assembleDefinitionAsyncInternal(
    definition: FormDefinition,
    resolver: DefinitionResolver,
): Promise<AssemblyResult> {
    const fragments = await collectResolvedFragmentsAsync(definition, resolver);
    const result = wasmAssembleDefinition(cloneValue(definition), fragments);
    if (result.errors?.length) {
        throw new Error(result.errors.join('\n'));
    }
    return {
        definition: result.definition,
        assembledFrom: result.assembledFrom ?? [],
    };
}

function assembleDefinitionSyncInternal(
    definition: FormDefinition,
    resolver: Record<string, unknown> | ((url: string, version?: string) => unknown),
): AssemblyResult {
    const resolveOne = typeof resolver === 'function'
        ? resolver
        : (url: string, version?: string) => resolver[version ? `${url}|${version}` : url] ?? resolver[url];
    const fragments = collectResolvedFragmentsSync(definition, resolveOne);
    const result = wasmAssembleDefinition(cloneValue(definition), fragments);
    if (result.errors?.length) {
        throw new Error(result.errors.join('\n'));
    }
    return {
        definition: result.definition,
        assembledFrom: result.assembledFrom ?? [],
    };
}
