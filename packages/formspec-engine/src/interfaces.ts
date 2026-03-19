/** @filedesc Engine-level interfaces — abstraction layer for swappable form engine backends. */

import type { Signal } from '@preact/signals-core';
import type { FormDefinition, FormItem, ValidationResult, ValidationReport, OptionEntry } from 'formspec-types';
import type { IFelRuntime } from './fel/runtime.js';

// ── Supporting types (duplicated from index.ts for standalone use) ─────

/** Loading/error state for a field whose options are fetched from a remote URL. */
export interface RemoteOptionsState {
    loading: boolean;
    error: string | null;
}

/** Accepted input types for the engine's "now" provider. */
export type EngineNowInput = Date | string | number;

/** Runtime configuration injected into the engine. */
export interface FormEngineRuntimeContext {
    now?: (() => EngineNowInput) | EngineNowInput;
    locale?: string;
    timeZone?: string;
    seed?: string | number;
    felRuntime?: IFelRuntime;
}

/** A registry extension entry for custom data types. */
export interface RegistryEntry {
    name: string;
    category?: string;
    version?: string;
    status?: string;
    description?: string;
    compatibility?: { formspecVersion?: string; mappingDslVersion?: string };
    deprecationNotice?: string;
    baseType?: string;
    constraints?: {
        pattern?: string;
        maxLength?: number;
        [key: string]: any;
    };
    metadata?: Record<string, any>;
    [key: string]: any;
}

/** Pinned reference to a specific definition version. */
export interface PinnedResponseReference {
    definitionUrl: string;
    definitionVersion: string;
}

/** Point-in-time snapshot of engine state for debugging. */
export interface FormEngineDiagnosticsSnapshot {
    definition: { url: string; version: string; title: string };
    timestamp: string;
    structureVersion: number;
    repeats: Record<string, number>;
    values: Record<string, any>;
    mips: Record<string, { relevant: boolean; required: boolean; readonly: boolean; error: string | null }>;
    dependencies: Record<string, string[]>;
    validation: ValidationReport;
    runtimeContext: { now: string; locale?: string; timeZone?: string; seed?: string | number };
}

/** Replay event discriminated union. */
export type EngineReplayEvent =
    | { type: 'setValue'; path: string; value: any }
    | { type: 'addRepeatInstance'; path: string }
    | { type: 'removeRepeatInstance'; path: string; index: number }
    | { type: 'evaluateShape'; shapeId: string }
    | { type: 'getValidationReport'; mode?: 'continuous' | 'submit' }
    | { type: 'getResponse'; mode?: 'continuous' | 'submit' };

/** Result of applying a single replay event. */
export interface EngineReplayApplyResult {
    ok: boolean;
    event: EngineReplayEvent;
    output?: any;
    error?: string;
}

/** Aggregate result of replaying a sequence of events. */
export interface EngineReplayResult {
    applied: number;
    results: EngineReplayApplyResult[];
    errors: Array<{ index: number; event: EngineReplayEvent; error: string }>;
}

// ── IFormEngine ────────────────────────────────────────────────────────

/**
 * The complete public interface of the form engine.
 *
 * Consumers (webcomponent, test harnesses, tools) depend on this interface
 * rather than the concrete `FormEngine` class, enabling seamless backend
 * swaps (e.g. Rust/WASM).
 *
 * Implementations:
 * - `FormEngine` — current JS implementation with Preact signals
 * - (future) `RustFormEngine` — Rust/WASM backend
 */
export interface IFormEngine {
    // ── Reactive signal collections ─────────────────────────────────

    /** Field values by path. */
    readonly signals: Record<string, any>;
    /** Visibility state by path. */
    readonly relevantSignals: Record<string, Signal<boolean>>;
    /** Required state by path. */
    readonly requiredSignals: Record<string, Signal<boolean>>;
    /** Readonly state by path. */
    readonly readonlySignals: Record<string, Signal<boolean>>;
    /** First error message (or null) per field. */
    readonly errorSignals: Record<string, Signal<string | null>>;
    /** Bind-level validation results per field. */
    readonly validationResults: Record<string, Signal<ValidationResult[]>>;
    /** Shape-level validation results by shape ID. */
    readonly shapeResults: Record<string, Signal<ValidationResult[]>>;
    /** Repeat instance counts per group. */
    readonly repeats: Record<string, Signal<number>>;
    /** Resolved option lists for choice/multiChoice fields. */
    readonly optionSignals: Record<string, Signal<OptionEntry[]>>;
    /** Remote options loading/error state. */
    readonly optionStateSignals: Record<string, Signal<RemoteOptionsState>>;
    /** Computed variable values by `"scope:name"`. */
    readonly variableSignals: Record<string, Signal<any>>;
    /** Static instance data by name. */
    readonly instanceData: Record<string, any>;
    /** Version counter for instance data reactivity. */
    readonly instanceVersion: Signal<number>;
    /** Version counter for repeat structure changes. */
    readonly structureVersion: Signal<number>;

    // ── Metadata ────────────────────────────────────────────────────

    /** The loaded form definition. */
    readonly definition: FormDefinition;
    /** Dependency graph: field → upstream paths. */
    readonly dependencies: Record<string, string[]>;
    /** The pluggable FEL runtime. */
    readonly felRuntime: IFelRuntime;

    // ── Runtime configuration ───────────────────────────────────────

    setRuntimeContext(context: FormEngineRuntimeContext): void;

    // ── Options ─────────────────────────────────────────────────────

    getOptions(path: string): OptionEntry[];
    getOptionsSignal(path: string): Signal<OptionEntry[]> | undefined;
    getOptionsState(path: string): RemoteOptionsState;
    getOptionsStateSignal(path: string): Signal<RemoteOptionsState> | undefined;
    waitForRemoteOptions(): Promise<void>;
    waitForInstanceSources(): Promise<void>;

    // ── Instance data ───────────────────────────────────────────────

    setInstanceValue(name: string, path: string | undefined, value: any): void;
    getInstanceData(name: string, path?: string): any;
    getDisabledDisplay(path: string): 'hidden' | 'protected';

    // ── Variables ───────────────────────────────────────────────────

    getVariableValue(name: string, scopePath: string): any;

    // ── Repeat groups ───────────────────────────────────────────────

    addRepeatInstance(itemName: string): number | undefined;
    removeRepeatInstance(itemName: string, index: number): void;

    // ── Expression compilation ──────────────────────────────────────

    compileExpression(expression: string, currentItemName?: string): () => any;

    // ── State mutation ──────────────────────────────────────────────

    setValue(name: string, value: any): void;

    // ── Validation & response ───────────────────────────────────────

    getValidationReport(options?: { mode?: 'continuous' | 'submit' }): ValidationReport;
    evaluateShape(shapeId: string): ValidationResult[];
    isPathRelevant(path: string): boolean;
    getResponse(meta?: {
        id?: string;
        author?: { id: string; name?: string };
        subject?: { id: string; type?: string };
        mode?: 'continuous' | 'submit';
    }): any;

    // ── Diagnostics & replay ────────────────────────────────────────

    getDiagnosticsSnapshot(options?: { mode?: 'continuous' | 'submit' }): FormEngineDiagnosticsSnapshot;
    applyReplayEvent(event: EngineReplayEvent): EngineReplayApplyResult;
    replay(events: EngineReplayEvent[], options?: { stopOnError?: boolean }): EngineReplayResult;

    // ── Definition & labels ─────────────────────────────────────────

    getDefinition(): FormDefinition;
    setLabelContext(context: string | null): void;
    getLabel(item: FormItem): string;

    // ── Screener & migration ────────────────────────────────────────

    evaluateScreener(answers: Record<string, any>): { target: string; label?: string; extensions?: Record<string, any> } | null;
    migrateResponse(responseData: Record<string, any>, fromVersion: string): Record<string, any>;
}

// ── IRuntimeMappingEngine ──────────────────────────────────────────────

/** Direction of a mapping operation. */
export type MappingDirection = 'forward' | 'reverse';

/** A diagnostic emitted during mapping rule execution. */
export interface MappingDiagnostic {
    ruleIndex: number;
    sourcePath?: string;
    targetPath?: string;
    errorCode: 'COERCE_FAILURE' | 'UNMAPPED_VALUE' | 'FEL_RUNTIME' | 'PATH_NOT_FOUND' | 'INVALID_DOCUMENT' | 'ADAPTER_FAILURE';
    message: string;
}

/** Result of a mapping operation. */
export interface RuntimeMappingResult {
    direction: MappingDirection;
    output: any;
    appliedRules: number;
    diagnostics: MappingDiagnostic[];
}

/**
 * Pluggable bidirectional mapping engine interface.
 *
 * Implementations:
 * - `RuntimeMappingEngine` — current JS implementation
 * - (future) Rust/WASM backend
 */
export interface IRuntimeMappingEngine {
    forward(source: any): RuntimeMappingResult;
    reverse(source: any): RuntimeMappingResult;
}
