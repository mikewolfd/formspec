/** @filedesc Walk a Formspec response `data` tree and apply values to a FormEngine (repeats + leaf paths). */
import type { IFormEngine } from '@formspec-org/engine/render';

/**
 * Apply a response `data` object to the engine after `definition` is loaded. Skips paths with no
 * writable signal (e.g. top-level screener keys) and recurses into repeat groups and object groups.
 */
export function applyResponseDataToEngine(engine: IFormEngine, data: Record<string, any>, prefix = ''): void {
    for (const [key, value] of Object.entries(data)) {
        const path = prefix ? `${prefix}.${key}` : key;

        const sig = engine.signals[path];
        if (sig && Object.getOwnPropertyDescriptor(Object.getPrototypeOf(sig), 'value')?.set) {
            engine.setValue(path, value);
        } else if (Array.isArray(value)) {
            const currentCount = engine.repeats[path]?.value ?? 0;
            for (let i = currentCount; i < value.length; i++) {
                engine.addRepeatInstance(path);
            }
            for (let i = 0; i < value.length; i++) {
                if (value[i] != null && typeof value[i] === 'object') {
                    applyResponseDataToEngine(engine, value[i], `${path}[${i}]`);
                }
            }
        } else if (value !== null && typeof value === 'object') {
            applyResponseDataToEngine(engine, value, path);
        }
    }
}
