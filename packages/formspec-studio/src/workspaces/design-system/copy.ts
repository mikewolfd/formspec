/**
 * @filedesc Spec-term-to-UI-copy mapping — vocabulary rule enforcement for the Design surface.
 *
 * Rule: never use "token", "cascade", "selector", "variant", "hint", "bind",
 * "layout document", or "design system" in user-facing copy. This module maps
 * spec terms with normative force to their plain-language UI equivalents.
 */

/** Spec term → UI copy. Lookup returns the user-facing label. */
const COPY_MAP: ReadonlyMap<string, string> = new Map([
  // Widget stays as-is
  ['widget', 'Widget'],

  // formPresentation.pageMode values
  ['pageMode:wizard', 'Wizard'],
  ['pageMode:tabbed', 'Tabbed'],
  ['pageMode:scroll', 'Single page'],

  // Spec concepts → plain language
  ['token', 'Style value'],
  ['cascade', 'Style priority'],
  ['selector', 'Style rule'],
  ['variant', 'Style option'],
  ['hint', 'Suggestion'],
  ['widgetHint', 'Suggested widget'],
  ['bind', 'Data connection'],
  ['shape', 'Cross-field rule'],
  ['layoutDocument', 'Page layout'],
  ['designSystem', 'Brand & Style'],
  ['breakpoint', 'Screen size'],
  ['formPresentation', 'Form appearance'],
  ['fieldDefault', 'Default style'],
  ['fieldRule', 'Conditional style'],
  ['themeDocument', 'Style settings'],
  ['componentDocument', 'Widget settings'],
  ['relevant', 'Skip condition'],
  ['when', 'Show/hide condition'],

  // Validation
  ['validationReport', 'Results'],
  ['evidence', 'Source documents'],
]);

/**
 * Get the user-facing copy for a spec term.
 * Returns the original term if no mapping exists.
 */
export function uiCopy(specTerm: string): string {
  return COPY_MAP.get(specTerm) ?? specTerm;
}

/**
 * Check whether a term is forbidden in UI copy.
 * Returns the recommended replacement if forbidden, null if allowed.
 */
export function checkVocabulary(term: string): string | null {
  const FORBIDDEN = new Set([
    'token', 'cascade', 'selector', 'variant', 'hint',
    'bind', 'layout document', 'design system',
  ]);
  const lower = term.toLowerCase();
  if (FORBIDDEN.has(lower)) {
    return COPY_MAP.get(lower) ?? null;
  }
  return null;
}
