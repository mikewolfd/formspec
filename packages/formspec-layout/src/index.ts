/**
 * formspec-layout — Pure layout planning utilities for Formspec.
 *
 * Core planning and theme cascade resolution delegate to Rust via WASM.
 * Utility functions (responsive merging, parameter interpolation, default
 * component mapping, widget resolution) remain in TypeScript.
 *
 * @module
 */

// Theme cascade — WASM bridge (Rust formspec-theme)
export {
    resolvePresentation,
    resolveToken,
} from './wasm-bridge.js';

// Theme cascade — TS-only (widget resolution with predicate, tailwind-merge)
export {
    resolveWidget,
    setTailwindMerge,
} from './theme-resolver.js';

// Theme types (unchanged — re-exported from theme-resolver.ts)
export type {
    ThemeDocument,
    PresentationBlock,
    ItemDescriptor,
    AccessibilityBlock,
    ThemeSelector,
    SelectorMatch,
    Tier1Hints,
    FormspecDataType,
    Page,
    Region,
    LayoutHints,
    StyleHints,
} from './theme-resolver.js';

// Responsive breakpoint merging (TS utility, used directly by webcomponent renderer)
export { resolveResponsiveProps } from './responsive.js';

// Parameter interpolation (TS utility, used by webcomponent for custom component expansion)
export { interpolateParams } from './params.js';

// Default component mapping (TS utility, used by webcomponent renderer)
export { getDefaultComponent } from './defaults.js';

// Widget vocabulary — canonical source of truth for widget ↔ component mappings
export {
    widgetTokenToComponent,
    KNOWN_COMPONENT_TYPES,
    SPEC_WIDGET_TO_COMPONENT,
    COMPONENT_TO_HINT,
    COMPATIBILITY_MATRIX,
} from './widget-vocabulary.js';

// Layout planner — WASM bridge (Rust formspec-plan)
export {
    planComponentTree,
    planDefinitionFallback,
    planThemePages,
    planUnboundRequired,
    resetNodeIdCounter,
} from './wasm-bridge.js';

// Types
export type { LayoutNode, PlanContext } from './types.js';
