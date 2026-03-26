/** @filedesc Shared utilities for adapter implementations. */
import type { FieldBehavior, AdapterContext, ResolvedPresentationBlock } from '@formspec/webcomponent';

/**
 * Create an HTML element with attributes in one call.
 * Convenience helper for adapter render functions.
 */
export function el(tag: string, attrs?: Record<string, string>): HTMLElement {
    const element = document.createElement(tag);
    if (attrs) {
        for (const [key, value] of Object.entries(attrs)) {
            if (key === 'class') {
                element.className = value;
            } else {
                element.setAttribute(key, value);
            }
        }
    }
    return element;
}

/**
 * Apply cascade-resolved cssClass from the behavior's presentation to a root element.
 * Adapters MUST call this (or equivalent) to honor the theme spec's union-merge semantics.
 */
export function applyCascadeClasses(root: HTMLElement, presentation: ResolvedPresentationBlock): void {
    if (!presentation.cssClass) return;
    const classes = Array.isArray(presentation.cssClass)
        ? presentation.cssClass
        : [presentation.cssClass];
    for (const cls of classes) {
        if (cls) root.classList.add(...cls.split(/\s+/).filter(Boolean));
    }
}

/**
 * Apply cascade-resolved accessibility attributes from the behavior's presentation.
 * Adapters MUST call this to honor spec §9.2 (themes must not reduce accessibility).
 */
export function applyCascadeAccessibility(root: HTMLElement, presentation: ResolvedPresentationBlock): void {
    if (!presentation.accessibility) return;
    const a = presentation.accessibility;
    if (a.role) root.setAttribute('role', a.role);
    if (a.description) root.setAttribute('aria-description', a.description);
    if (a.liveRegion) root.setAttribute('aria-live', a.liveRegion);
}
