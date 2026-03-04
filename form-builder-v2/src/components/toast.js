import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { toasts } from '../state/toast';
export function ToastContainer() {
    const items = toasts.value;
    if (items.length === 0)
        return null;
    return (_jsx("div", { class: "toast-container", children: items.map((toast) => (_jsxs("div", { class: `toast ${toast.type}${toast.leaving ? ' leaving' : ''}`, children: [_jsx("span", { class: "toast-icon", children: toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ' }), toast.message] }, toast.id))) }));
}
