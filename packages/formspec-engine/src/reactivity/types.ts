/** @filedesc Framework-agnostic reactive primitives for FormEngine (decoupled from WASM and UI libs). */

/**
 * Writable reactive cell with a single `.value` — implemented by Preact signals or a custom runtime.
 */
export interface EngineSignal<T> {
    get value(): T;
    set value(next: T);
}

/**
 * Pluggable batching + signal factory so FormEngine does not import `@preact/signals-core` directly.
 */
export interface EngineReactiveRuntime {
    signal<T>(initial: T): EngineSignal<T>;
    batch<T>(fn: () => T): T;
}
