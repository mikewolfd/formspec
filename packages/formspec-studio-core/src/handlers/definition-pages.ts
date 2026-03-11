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
import { registerHandler } from '../handler-registry.js';
import { resolveItemLocation } from './helpers.js';

/** Monotonically increasing counter used to generate unique page keys. */
let pageCounter = 0;

/**
 * Generate a unique, deterministic page key.
 *
 * Keys take the form `page_1`, `page_2`, etc. The counter is module-scoped and
 * never resets within a process lifetime, ensuring uniqueness even if pages are
 * deleted and re-added.
 *
 * @returns A new page key string.
 */
function generatePageKey(): string {
  return `page_${++pageCounter}`;
}

/**
 * **definition.setDefinitionProperty** -- Set or delete a top-level property on
 * the form definition.
 *
 * Writable properties include: `name`, `description`, `url`, `version`, `status`,
 * `date`, `derivedFrom`, `versionAlgorithm`, `nonRelevantBehavior`, among others.
 *
 * Setting a value to `null` or `undefined` removes the property from the definition.
 * Does not trigger a component-tree rebuild since these are metadata-only changes.
 *
 * @param payload.property - The definition property name.
 * @param payload.value - The new value, or `null`/`undefined` to delete.
 */
registerHandler('definition.setDefinitionProperty', (state, payload) => {
  const { property, value } = payload as { property: string; value: unknown };

  if (value === null || value === undefined) {
    delete (state.definition as any)[property];
  } else {
    (state.definition as any)[property] = value;
  }

  return { rebuildComponentTree: false };
});

/**
 * **definition.setFormPresentation** -- Set a property on the definition's
 * `formPresentation` object.
 *
 * Manages form-level presentation settings such as `labelPosition`, `density`,
 * `defaultCurrency`, wizard configuration, and -- critically -- page mode.
 *
 * Special handling for the `pages` property:
 * - `value === true`: Enables page mode. If no pages exist yet, creates an
 *   initial empty page. Triggers a component-tree rebuild.
 * - `value === false`: Disables page mode by removing the `pages` array
 *   entirely, flattening the form back to a single-page layout. Triggers a
 *   component-tree rebuild.
 *
 * For all other properties, `null`/`undefined` deletes the property.
 *
 * @param payload.property - The formPresentation property to set.
 * @param payload.value - The new value (see special `pages` behavior above).
 */
registerHandler('definition.setFormPresentation', (state, payload) => {
  const { property, value } = payload as { property: string; value: unknown };

  if (!state.definition.formPresentation) {
    state.definition.formPresentation = {};
  }

  if (property === 'pages' && value === true) {
    // Enable pages — create initial page if none exist
    if (!state.definition.formPresentation.pages) {
      state.definition.formPresentation.pages = [
        { key: generatePageKey(), title: '' },
      ];
    }
    return { rebuildComponentTree: true };
  }

  if (property === 'pages' && value === false) {
    // Disable pages — remove pages array
    delete state.definition.formPresentation.pages;
    return { rebuildComponentTree: true };
  }

  if (value === null || value === undefined) {
    delete state.definition.formPresentation[property];
  } else {
    state.definition.formPresentation[property] = value;
  }

  return { rebuildComponentTree: false };
});

/**
 * **definition.addPage** -- Append or insert a new page into the wizard page list.
 *
 * Only valid when page mode is enabled (i.e. `formPresentation.pages` exists).
 * Each page is assigned a stable auto-generated key and an optional title.
 * Triggers a component-tree rebuild so the UI reflects the new page.
 *
 * @param payload.title - Human-readable page title; defaults to `''`.
 * @param payload.insertIndex - Position to splice into the pages array; omit to append.
 * @throws {Error} If page mode is not enabled.
 */
registerHandler('definition.addPage', (state, payload) => {
  const p = payload as { title?: string; insertIndex?: number };
  const fp = state.definition.formPresentation;
  if (!fp?.pages) throw new Error('Pages are not enabled');

  const page = { key: generatePageKey(), title: p.title ?? '' };

  if (p.insertIndex !== undefined) {
    fp.pages.splice(p.insertIndex, 0, page);
  } else {
    fp.pages.push(page);
  }

  return { rebuildComponentTree: true };
});

/**
 * **definition.deletePage** -- Remove a page from the wizard page list by its key.
 *
 * The last remaining page cannot be deleted -- at least one page must exist when
 * page mode is active. Items that were assigned to the deleted page become orphans
 * and should be reassigned by the consumer (the handler itself only removes the
 * page descriptor). Triggers a component-tree rebuild.
 *
 * @param payload.pageKey - The stable key of the page to remove.
 * @throws {Error} If page mode is not enabled.
 * @throws {Error} If attempting to delete the sole remaining page.
 */
registerHandler('definition.deletePage', (state, payload) => {
  const { pageKey } = payload as { pageKey: string };
  const fp = state.definition.formPresentation;
  if (!fp?.pages) throw new Error('Pages are not enabled');

  if (fp.pages.length <= 1) {
    throw new Error('Cannot delete the last page');
  }

  fp.pages = fp.pages.filter((p: any) => p.key !== pageKey);

  return { rebuildComponentTree: true };
});

/**
 * **definition.reorderPage** -- Move a page one position up or down within the
 * ordered page list.
 *
 * If the page is already at the boundary (first page moved up, or last page moved
 * down), this is a no-op and does not trigger a rebuild.
 *
 * @param payload.pageKey - The stable key of the page to move.
 * @param payload.direction - `'up'` to move toward the beginning, `'down'` toward the end.
 * @throws {Error} If page mode is not enabled.
 * @throws {Error} If no page matches the given `pageKey`.
 */
registerHandler('definition.reorderPage', (state, payload) => {
  const { pageKey, direction } = payload as { pageKey: string; direction: 'up' | 'down' };
  const fp = state.definition.formPresentation;
  if (!fp?.pages) throw new Error('Pages are not enabled');

  const idx = fp.pages.findIndex((p: any) => p.key === pageKey);
  if (idx === -1) throw new Error(`Page not found: ${pageKey}`);

  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= fp.pages.length) return { rebuildComponentTree: false };

  [fp.pages[idx], fp.pages[targetIdx]] = [fp.pages[targetIdx], fp.pages[idx]];
  return { rebuildComponentTree: true };
});

/**
 * **definition.setGroupRef** -- Set or clear a `$ref` (and optional `keyPrefix`)
 * on a group item for modular composition.
 *
 * When `ref` is a non-null string, the group item becomes a reference to an external
 * definition fragment (identified by URI). The optional `keyPrefix` allows the
 * referenced items' keys to be namespaced to avoid collisions.
 *
 * When `ref` is `null`, the reference is removed and the group becomes a standalone
 * inline group again (both `$ref` and `keyPrefix` are deleted).
 *
 * Triggers a component-tree rebuild because the group's content changes.
 *
 * @param payload.path - Dot-separated path to the group item in the item tree.
 * @param payload.ref - URI string for the referenced definition, or `null` to clear.
 * @param payload.keyPrefix - Optional key prefix for the referenced items.
 * @throws {Error} If no item exists at the given path.
 */
registerHandler('definition.setGroupRef', (state, payload) => {
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
});
