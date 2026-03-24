/** @filedesc Template string interpolator for locale {{expr}} sequences (spec §3.3.1). */

export interface InterpolationWarning {
  expression: string;
  error: string;
}

export interface InterpolateResult {
  text: string;
  warnings: InterpolationWarning[];
}

/**
 * Resolve `{{expr}}` sequences in a locale string.
 *
 * Rules (§3.3.1):
 * 1. `{{{{` → literal `{{` (escape before scanning)
 * 2. Failed parse/eval → preserve literal `{{expr}}` + warning (no crash)
 * 3. null/undefined → "", booleans → "true"/"false", numbers → default coercion
 * 5. Replacement text is NOT re-scanned for `{{`
 *
 * @param template - String potentially containing `{{expr}}` placeholders
 * @param evaluator - Evaluates a FEL expression string, returns a value
 */
export function interpolateMessage(
  template: string,
  evaluator: (expr: string) => unknown,
): InterpolateResult {
  if (!template) return { text: template, warnings: [] };

  const warnings: InterpolationWarning[] = [];

  // Rule 1: Replace {{{{ escape before scanning.
  // Spec §3.3.1 only defines {{{{ → literal {{ (no }}}} escape).
  const SENTINEL_OPEN = '\x00ESC_OPEN\x00';
  let work = template.replace(/\{\{\{\{/g, SENTINEL_OPEN);

  // Rule 5 (non-recursive): collect replacements, then splice in one pass.
  // Regex: match {{ then capture everything up to the first }}.
  // Inner content can include a single } (not }}), so: match non-} chars
  // or a single } not followed by another }.
  const pattern = /\{\{((?:[^}]|\}(?!\}))*)\}\}/g;

  const segments: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(work)) !== null) {
    // Text before this match
    segments.push(work.slice(lastIndex, match.index));

    const expr = match[1];

    // Rule 2: error recovery — catch evaluator failures
    try {
      const raw = evaluator(expr);
      segments.push(coerce(raw));
    } catch (err: unknown) {
      // Preserve the literal {{expr}} in output
      segments.push(match[0]);
      warnings.push({
        expression: expr,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last match
  segments.push(work.slice(lastIndex));

  // Restore sentinel to literal {{
  const joined = segments.join('');
  const text = joined.replace(new RegExp(SENTINEL_OPEN, 'g'), '{{');

  return { text, warnings };
}

/** Rule 3: coerce evaluation result to string. */
function coerce(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}
