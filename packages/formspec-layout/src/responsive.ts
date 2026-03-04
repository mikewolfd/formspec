/**
 * Merge responsive breakpoint overrides onto a component descriptor.
 *
 * If the component has a `responsive` map and the given breakpoint name
 * appears as a key, shallow-merges those overrides onto a copy of the
 * descriptor. Returns the original descriptor unchanged when no overrides
 * apply.
 *
 * @param comp             - Component descriptor that may contain a `responsive` map.
 * @param activeBreakpoint - Currently active breakpoint name, or `null` if none match.
 * @returns A (possibly new) component descriptor with breakpoint overrides applied.
 */
export function resolveResponsiveProps(comp: any, activeBreakpoint: string | null): any {
    if (!comp.responsive || !activeBreakpoint) return comp;
    const overrides = comp.responsive[activeBreakpoint];
    if (!overrides) return comp;
    return { ...comp, ...overrides };
}
