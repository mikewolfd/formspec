import { signal } from '@preact/signals';
let nextToastId = 0;
export const toasts = signal([]);
export function showToast(message, type = 'info') {
    const id = nextToastId++;
    toasts.value = [...toasts.value, { id, message, type }];
    setTimeout(() => {
        toasts.value = toasts.value.map((t) => t.id === id ? { ...t, leaving: true } : t);
        setTimeout(() => {
            toasts.value = toasts.value.filter((t) => t.id !== id);
        }, 200);
    }, 3000);
}
