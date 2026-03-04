import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { useEffect, useRef } from 'preact/hooks';
import { FormspecRender } from 'formspec-webcomponent';
import { assembledDefinition, definitionVersion } from '../state/definition';
import { engine, componentDoc, componentVersion } from '../state/project';
import { selectedPath } from '../state/selection';
import { findPathByBind } from '../logic/component-tree';
// Define the custom element globally if not already defined
if (!customElements.get('formspec-render')) {
    customElements.define('formspec-render', FormspecRender);
}
export function Preview() {
    const iframeRef = useRef(null);
    const renderRef = useRef(null);
    const hasEngine = engine.value !== null;
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe)
            return;
        const setupIframe = () => {
            const doc = iframe.contentDocument;
            const win = iframe.contentWindow;
            if (!doc || !win)
                return;
            // Clear and initialize iframe document
            doc.open();
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { 
                            margin: 0; 
                            padding: 24px; 
                            background: white; 
                            font-family: 'Inter', -apple-system, sans-serif;
                            display: flex;
                            justify-content: center;
                            min-height: 100vh;
                        }
                        formspec-render {
                            width: 100%;
                            max-width: 680px;
                            display: block;
                        }
                        /* Styles for the selection highlights */
                        .preview-highlight { 
                            outline: 2px solid #8b5cf6 !important; 
                            outline-offset: 4px !important; 
                            border-radius: 4px !important; 
                            transition: outline 0.2s !important; 
                        }
                        .preview-highlight-fade { 
                            outline-color: transparent !important; 
                        }
                    </style>
                </head>
                <body></body>
                </html>
            `);
            doc.close();
            // Register the custom element in the iframe's window scope
            // We use the same class from the parent window. 
            // Most modern browsers handle this if they are same-origin.
            if (!win.customElements.get('formspec-render')) {
                try {
                    win.customElements.define('formspec-render', class extends win.HTMLElement {
                        constructor() {
                            super();
                            // We create the actual implementation from the parent class
                            // but we wrap it to avoid HTMLElement cross-window issues
                            const impl = new FormspecRender();
                            this.attachShadow({ mode: 'open' });
                            this.shadowRoot.appendChild(impl);
                            this._impl = impl;
                        }
                        // Delegate properties to the implementation
                        get definition() { return this._impl.definition; }
                        set definition(v) { this._impl.definition = v; }
                        get componentDocument() { return this._impl.componentDocument; }
                        set componentDocument(v) { this._impl.componentDocument = v; }
                        get themeDocument() { return this._impl.themeDocument; }
                        set themeDocument(v) { this._impl.themeDocument = v; }
                        get shadowRoot() { return this._impl.shadowRoot; }
                    });
                }
                catch (e) {
                    console.error("Failed to define formspec-render in iframe", e);
                    // Fallback: just try to define it directly
                    win.customElements.define('formspec-render', FormspecRender);
                }
            }
            // Create and append the render element
            const el = doc.createElement('formspec-render');
            doc.body.appendChild(el);
            renderRef.current = el;
            // Handle clicks for selection
            const handleClick = (event) => {
                const path = event.composedPath();
                for (const node of path) {
                    if (node instanceof HTMLElement && (node.dataset.name || node.dataset.bind)) {
                        const bindKey = node.dataset.name || node.dataset.bind || '';
                        // Map back to tree path if possible
                        const docState = componentDoc.value;
                        if (docState) {
                            // Strip indices for template matching
                            const normalizedBind = bindKey.replace(/\[\d+\]/g, '');
                            const treePath = findPathByBind(docState.tree, normalizedBind);
                            if (treePath !== null) {
                                selectedPath.value = treePath;
                                return;
                            }
                        }
                        selectedPath.value = bindKey;
                        break;
                    }
                }
            };
            // Listen on the element itself (bubbles from shadow DOM)
            el.addEventListener('click', handleClick);
            // Sync initial state
            if (componentDoc.value)
                el.componentDocument = structuredClone(componentDoc.value);
            if (assembledDefinition.value)
                el.definition = structuredClone(assembledDefinition.value);
        };
        if (iframe.contentDocument?.readyState === 'complete') {
            setupIframe();
        }
        else {
            iframe.onload = setupIframe;
        }
        return () => {
            renderRef.current = null;
        };
    }, []);
    // Sync component document (Correct dependencies to prevent focus loss)
    useEffect(() => {
        if (!renderRef.current)
            return;
        const docValue = componentDoc.value;
        renderRef.current.componentDocument = docValue ? structuredClone(docValue) : null;
    }, [componentVersion.value]);
    // Debounced definition sync (Correct dependencies to prevent focus loss)
    useEffect(() => {
        if (!renderRef.current)
            return;
        const def = assembledDefinition.value;
        const timer = setTimeout(() => {
            if (renderRef.current) {
                try {
                    renderRef.current.definition = structuredClone(def);
                }
                catch (_e) { /* definition may be invalid */ }
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [definitionVersion.value]);
    /* Highlight logic moved into a separate effect to avoid re-running on every render */
    useEffect(() => {
        const path = selectedPath.value;
        const renderEl = renderRef.current;
        if (!path || !renderEl)
            return;
        // Note: Because we used a wrapper class in the iframe, 
        // renderEl.shadowRoot is the iframe-element's shadow root, 
        // which contains the actual FormspecRender implementation.
        // We need the ACTUAL shadow root of the implementation.
        const actualRender = renderEl._impl || renderEl;
        const shadow = actualRender.shadowRoot;
        if (!shadow)
            return;
        // Inject highlight styles if not already present
        if (!shadow.querySelector('#preview-highlight-styles')) {
            const style = document.createElement('style');
            style.id = 'preview-highlight-styles';
            style.textContent = `
                .preview-highlight { 
                    outline: 2px solid #8b5cf6 !important; 
                    outline-offset: 4px !important; 
                    border-radius: 4px !important; 
                    transition: outline 0.2s !important; 
                }
                .preview-highlight-fade { 
                    outline-color: transparent !important; 
                }
            `;
            shadow.appendChild(style);
        }
        const targetEl = shadow.querySelector(`[data-name="${path}"]`) ||
            shadow.querySelector(`[data-name="${path.split('.').pop()}"]`) ||
            shadow.querySelector(`[data-name]`);
        if (!targetEl || !(targetEl instanceof HTMLElement))
            return;
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        targetEl.classList.add('preview-highlight');
        const fadeTimer = setTimeout(() => targetEl.classList.add('preview-highlight-fade'), 1000);
        const removeTimer = setTimeout(() => {
            targetEl.classList.remove('preview-highlight', 'preview-highlight-fade');
        }, 1500);
        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
            targetEl.classList.remove('preview-highlight', 'preview-highlight-fade');
        };
    }, [selectedPath.value]);
    return (_jsxs("div", { class: "preview-panel", children: [_jsxs("div", { class: "preview-header", children: [_jsx("span", { class: "preview-header-title", children: "Live Preview" }), _jsx("div", { class: "preview-meta-badge", children: "Isolated" })] }), _jsx("div", { class: "preview-viewport", children: _jsxs("div", { class: "preview-container", children: [_jsx("iframe", { ref: iframeRef, class: "preview-iframe", title: "Form Preview" }), !hasEngine && (_jsx("div", { class: "preview-error", children: "Fix definition errors to see preview" }))] }) })] }));
}
