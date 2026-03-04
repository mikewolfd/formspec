import { computed, signal } from '@preact/signals';
export const project = signal({
    definition: null,
    component: null,
    theme: null,
    mappings: [],
    registries: [],
    changelogs: [],
});
export const engine = signal(null);
export const diagnostics = signal([]);
export const editorMode = signal('guided');
export const diagnosticCounts = computed(() => {
    const current = diagnostics.value;
    return {
        error: current.filter((d) => d.severity === 'error').length,
        warning: current.filter((d) => d.severity === 'warning').length,
        info: current.filter((d) => d.severity === 'info').length,
    };
});
export const hasBlockingErrors = computed(() => diagnosticCounts.value.error > 0);
// --- Component Document State ---
export const componentDoc = signal(null);
export const componentVersion = signal(0);
export function setComponentDoc(doc) {
    componentDoc.value = doc;
    componentVersion.value += 1;
}
// --- Command Bar ---
export const commandBarOpen = signal(false);
