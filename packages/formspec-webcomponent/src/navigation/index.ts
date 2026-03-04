export interface NavigationHost {
    querySelector(selectors: string): Element | null;
    querySelectorAll(selectors: string): NodeListOf<Element>;
}

export { normalizeFieldPath, externalPathToInternal } from './paths.js';
export { findFieldElement, revealTabsForField, focusField } from './field-focus.js';
export { goToWizardStep } from './wizard.js';
