/** @filedesc Definition-tree row summary and status derivation for the Editor workspace. */
import type { FormItem } from '@formspec-org/types';
import { humanizeFEL } from './authoring-helpers.js';

export interface RowSummaryEntry {
  label: string;
  value: string;
}

export interface RowStatusPill {
  text: string;
  color: 'accent' | 'logic' | 'error' | 'green' | 'amber' | 'muted';
  /** Spec-normative term for tooltip discoverability. */
  specTerm: string;
  /** When true, the pill should render a warning indicator. */
  warn?: boolean;
}

export interface ExpressionDiagnostic {
  message: string;
  suggestions?: string[];
}

export interface MissingPropertyAction {
  key: 'description' | 'hint' | 'behavior';
  label: string;
  ariaLabel: string;
}

export function summarizeExpression(expression: string): string {
  const humanized = humanizeFEL(expression).trim();
  return humanized || expression;
}

/** Display prePopulate source in tree summaries (leading @; matches inline editor). */
function formatPrePopulateRowDisplay(instance: string, path: string): string {
  const i = instance.trim();
  const p = path.trim();
  if (!i && !p) return '';
  return `@${i}${p ? `.${p}` : ''}`;
}

export function buildRowSummaries(item: FormItem, binds: Record<string, string>): RowSummaryEntry[] {
  const contentFacts: RowSummaryEntry[] = [];
  const configFacts: RowSummaryEntry[] = [];
  const optionsFacts: RowSummaryEntry[] = [];
  const behaviorFacts: RowSummaryEntry[] = [];

  if (typeof item.description === 'string' && item.description.trim()) {
    contentFacts.push({ label: 'Description', value: item.description });
  }
  if (typeof item.hint === 'string' && item.hint.trim()) {
    contentFacts.push({ label: 'Hint', value: item.hint });
  }

  if (item.type === 'field') {
    if (item.initialValue != null && String(item.initialValue).trim()) {
      configFacts.push({ label: 'Initial', value: String(item.initialValue) });
    }
    if (typeof item.precision === 'number') {
      configFacts.push({ label: 'Precision', value: String(item.precision) });
    }
    if (typeof item.currency === 'string' && item.currency.trim()) {
      configFacts.push({ label: 'Currency', value: item.currency });
    }
    if (typeof item.prefix === 'string' && item.prefix.trim()) {
      configFacts.push({ label: 'Prefix', value: item.prefix });
    }
    if (typeof item.suffix === 'string' && item.suffix.trim()) {
      configFacts.push({ label: 'Suffix', value: item.suffix });
    }
    if (typeof item.semanticType === 'string' && item.semanticType.trim()) {
      configFacts.push({ label: 'Semantic', value: item.semanticType });
    }

    const rawChoiceOptions = item.options;
    if (Array.isArray(rawChoiceOptions) && rawChoiceOptions.length > 0) {
      optionsFacts.push({
        label: 'Options',
        value: `${rawChoiceOptions.length} ${rawChoiceOptions.length === 1 ? 'choice' : 'choices'}`,
      });
    }

    if (item.prePopulate && typeof item.prePopulate === 'object') {
      const instance = typeof item.prePopulate.instance === 'string' ? item.prePopulate.instance.trim() : '';
      const prePath = typeof item.prePopulate.path === 'string' ? item.prePopulate.path.trim() : '';
      const target = formatPrePopulateRowDisplay(instance, prePath);
      optionsFacts.push({ label: 'Pre-fill', value: target || 'Configured' });
    }
  }

  if (binds.calculate?.trim()) {
    behaviorFacts.push({ label: 'Calculate', value: summarizeExpression(binds.calculate) });
  }
  if (binds.relevant?.trim()) {
    behaviorFacts.push({ label: 'Relevant', value: summarizeExpression(binds.relevant) });
  }
  if (binds.readonly?.trim() && binds.readonly.trim() !== 'true') {
    behaviorFacts.push({ label: 'Readonly', value: summarizeExpression(binds.readonly) });
  }
  if (binds.required?.trim() && binds.required.trim() !== 'true') {
    behaviorFacts.push({ label: 'Required', value: summarizeExpression(binds.required) });
  }
  if (binds.default?.trim()) {
    behaviorFacts.push({ label: 'Default', value: summarizeExpression(binds.default) });
  }
  if (binds.constraint?.trim()) {
    behaviorFacts.push({ label: 'Constraint', value: summarizeExpression(binds.constraint) });
  }
  if (binds.constraintMessage?.trim()) {
    behaviorFacts.push({ label: 'Message', value: binds.constraintMessage });
  }

  return [
    ...contentFacts.slice(0, 2),
    ...optionsFacts.slice(0, 1),
    ...behaviorFacts.slice(0, 1),
    ...configFacts.slice(
      0,
      Math.max(0, 4 - contentFacts.slice(0, 2).length - optionsFacts.slice(0, 1).length - behaviorFacts.slice(0, 1).length),
    ),
  ].slice(0, 4);
}

/** Category-keyed summaries: one representative entry per task category. */
export type CategorySummaries = Record<string, string>;

export function buildCategorySummaries(item: FormItem, binds: Record<string, string>): CategorySummaries {
  if (item.type === 'display') {
    return {
      Visibility: binds.relevant?.trim() ? summarizeExpression(binds.relevant) : 'Always',
      Description: typeof item.description === 'string' && item.description.trim() ? item.description : '\u2014',
    };
  }

  // Visibility
  const visibility = binds.relevant?.trim() ? summarizeExpression(binds.relevant) : 'Always';

  // Validation: count required + constraint
  let validationCount = 0;
  if (binds.required?.trim()) validationCount++;
  if (binds.constraint?.trim()) validationCount++;
  const validation = validationCount === 0
    ? '\u2014'
    : `${validationCount} ${validationCount === 1 ? 'rule' : 'rules'}`;

  // Value: pick the most relevant source
  let value = '\u2014';
  if (binds.calculate?.trim()) {
    value = 'formula';
  } else if (item.initialValue != null && String(item.initialValue).trim()) {
    value = String(item.initialValue);
  } else if (item.prePopulate && typeof item.prePopulate === 'object') {
    value = 'pre-fill';
  } else if (binds.readonly?.trim()) {
    value = 'locked';
  } else if (binds.default?.trim()) {
    value = summarizeExpression(binds.default);
  }

  // Format: currency + precision
  const formatParts: string[] = [];
  if (typeof item.currency === 'string' && item.currency.trim()) {
    formatParts.push(item.currency.trim());
  }
  if (typeof item.precision === 'number') {
    formatParts.push(`${item.precision}dp`);
  }
  const format = formatParts.length > 0 ? formatParts.join(' ') : '\u2014';

  const result: CategorySummaries = { Visibility: visibility, Validation: validation, Value: value, Format: format };

  // Options slot for choice fields
  const rawChoiceOptions = item.options;
  if (Array.isArray(rawChoiceOptions) && rawChoiceOptions.length > 0) {
    result.Options = `${rawChoiceOptions.length} ${rawChoiceOptions.length === 1 ? 'choice' : 'choices'}`;
  } else if (['choice', 'multiChoice', 'select', 'select1'].includes(String(item.dataType ?? ''))) {
    result.Options = '\u2014';
  }

  return result;
}

export function buildExpressionDiagnostics(
  binds: Record<string, string>,
  definitionKeys: string[],
): Record<string, ExpressionDiagnostic | null> {
  const result: Record<string, ExpressionDiagnostic | null> = {};
  const keySet = new Set(definitionKeys);

  for (const [bindName, expression] of Object.entries(binds)) {
    if (!expression || !expression.trim()) {
      result[bindName] = null;
      continue;
    }

    // Extract $-prefixed tokens, strip leading $ and trailing dot-paths
    const tokens = expression.split(/\s+/).filter((t) => t.startsWith('$'));
    const refs = tokens.map((t) => {
      const withoutDollar = t.slice(1);
      // Take only the root key (before first dot)
      const dotIdx = withoutDollar.indexOf('.');
      return dotIdx >= 0 ? withoutDollar.slice(0, dotIdx) : withoutDollar;
    }).filter((r) => r.length > 0);

    const undefined_refs = refs.filter((r) => !keySet.has(r));
    const unique_undefined = [...new Set(undefined_refs)];

    if (unique_undefined.length === 0) {
      result[bindName] = null;
    } else {
      const suggestions: string[] = [];
      for (const ref of unique_undefined) {
        for (const key of definitionKeys) {
          if (key.includes(ref) || ref.includes(key)) {
            if (!suggestions.includes(key)) suggestions.push(key);
          }
        }
      }
      result[bindName] = {
        message: `Undefined reference${unique_undefined.length > 1 ? 's' : ''}: ${unique_undefined.join(', ')}`,
        suggestions,
      };
    }
  }

  return result;
}

export function buildStatusPills(
  binds: Record<string, string>,
  item: FormItem,
  diagnostics?: Record<string, ExpressionDiagnostic | null>,
): RowStatusPill[] {
  const pills: RowStatusPill[] = [];
  const w = (specTerm: string): boolean | undefined =>
    diagnostics?.[specTerm] ? true : undefined;

  if (binds.required) pills.push({ text: 'must fill', color: 'accent', specTerm: 'required', ...(w('required') && { warn: true }) });
  if (binds.relevant) pills.push({ text: 'shows if', color: 'logic', specTerm: 'relevant', ...(w('relevant') && { warn: true }) });
  if (binds.calculate) pills.push({ text: 'formula', color: 'green', specTerm: 'calculate', ...(w('calculate') && { warn: true }) });
  if (binds.default) pills.push({ text: 'resets to', color: 'green', specTerm: 'default', ...(w('default') && { warn: true }) });
  if (item.prePopulate) pills.push({ text: 'linked', color: 'amber', specTerm: 'prePopulate' });
  if (binds.constraint) pills.push({ text: 'validates', color: 'error', specTerm: 'constraint', ...(w('constraint') && { warn: true }) });
  if (binds.readonly) pills.push({ text: 'locked', color: 'muted', specTerm: 'readonly', ...(w('readonly') && { warn: true }) });
  return pills;
}

export interface Advisory {
  message: string;
  actions: Array<{ label: string }>;
}

export function buildAdvisories(binds: Record<string, string>, item: FormItem): Advisory[] {
  const advisories: Advisory[] = [];

  const hasRequired = Boolean(binds.required);
  const hasReadonly = Boolean(binds.readonly);
  const hasCalculate = Boolean(binds.calculate);
  const hasInitialValue = item.initialValue != null && String(item.initialValue).trim() !== '';
  const hasPrePopulate = Boolean(item.prePopulate);

  // Pattern 3: required + readonly + calculate — redundant mandatory rule
  if (hasRequired && hasReadonly && hasCalculate) {
    advisories.push({
      message: 'This field has a formula that auto-locks it. The mandatory rule is redundant.',
      actions: [{ label: 'Remove mandatory rule' }],
    });
  }

  // Pattern 1: required + readonly WITHOUT any value source (calculate, initialValue, prePopulate)
  if (hasRequired && hasReadonly && !hasCalculate && !hasInitialValue && !hasPrePopulate) {
    advisories.push({
      message: 'This field must be filled but is locked with no value source. Add a formula, initial value, or pre-fill to resolve.',
      actions: [
        { label: 'Add formula' },
        { label: 'Add initial value' },
        { label: 'Add pre-fill' },
      ],
    });
  }

  // Pattern 2: prePopulate + calculate — formula replaces pre-fill
  if (hasPrePopulate && hasCalculate) {
    advisories.push({
      message: 'The formula runs immediately and replaces the starting value from pre-fill.',
      actions: [
        { label: 'Remove pre-fill' },
        { label: 'Remove formula' },
      ],
    });
  }

  return advisories;
}

export function buildMissingPropertyActions(
  item: FormItem,
  binds: Record<string, string>,
  itemLabel: string,
): MissingPropertyAction[] {
  const actions: MissingPropertyAction[] = [];

  const hasBehavior = Boolean(
    binds.required?.trim()
      || binds.relevant?.trim()
      || binds.calculate?.trim()
      || binds.default?.trim()
      || binds.readonly?.trim()
      || binds.constraint?.trim()
      || binds.constraintMessage?.trim(),
  );

  if (!hasBehavior && item.type !== 'display') {
    actions.push({
      key: 'behavior',
      label: '+ Add behavior',
      ariaLabel: `Add behavior to ${itemLabel}`,
    });
  }

  if (item.type === 'group') {
    if (!item.description?.trim()) {
      actions.unshift({
        key: 'description',
        label: '+ Add description',
        ariaLabel: `Add description to ${itemLabel}`,
      });
    }

    if (!item.hint?.trim()) {
      actions.splice(item.description?.trim() ? 1 : 0, 0, {
        key: 'hint',
        label: '+ Add hint',
        ariaLabel: `Add hint to ${itemLabel}`,
      });
    }
  }

  return actions;
}
