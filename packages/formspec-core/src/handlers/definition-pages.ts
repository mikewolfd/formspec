/**
 * Page, form-presentation, definition-property, and group-ref command handlers.
 *
 * Pages define the wizard / multi-step form structure. When page mode is enabled
 * the definition's `formPresentation.pages` array contains an ordered list of page
 * descriptors, each with a stable `key` and a user-facing `title`. Items are
 * assigned to pages, giving the form a paginated navigation flow.
 *
 * This module also houses the general-purpose `definition.setDefinitionProperty`
 * handler for top-level definition metadata, `definition.setFormPresentation` for
 * presentation-level settings, and `definition.setGroupRef` for modular composition
 * via `$ref` on group items.
 *
 * @module definition-pages
 */
import type { CommandHandler } from '../types.js';
import { resolveItemLocation } from './helpers.js';

export const definitionPagesHandlers: Record<string, CommandHandler> = {

  'definition.setDefinitionProperty': (state, payload) => {
    const { property, value } = payload as { property: string; value: unknown };

    if (value === null || value === undefined) {
      delete (state.definition as any)[property];
    } else {
      (state.definition as any)[property] = value;
    }

    return { rebuildComponentTree: false };
  },

  'definition.setFormPresentation': (state, payload) => {
    const { property, value } = payload as { property: string; value: unknown };

    if (!state.definition.formPresentation) {
      state.definition.formPresentation = {};
    }

    if (value === null || value === undefined) {
      delete state.definition.formPresentation[property];
    } else {
      state.definition.formPresentation[property] = value;
    }

    return { rebuildComponentTree: false };
  },

  'definition.setGroupRef': (state, payload) => {
    const { path, ref, keyPrefix } = payload as { path: string; ref: string | null; keyPrefix?: string };
    const loc = resolveItemLocation(state, path);
    if (!loc) throw new Error(`Item not found: ${path}`);

    if (ref === null) {
      delete (loc.item as any).$ref;
      delete (loc.item as any).keyPrefix;
    } else {
      (loc.item as any).$ref = ref;
      if (keyPrefix) (loc.item as any).keyPrefix = keyPrefix;
    }

    return { rebuildComponentTree: true };
  },
};
