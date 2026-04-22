/** @filedesc Bidirectional conversion between widget constraint properties and FEL bind constraint expressions. */

export interface NumericConstraintValues {
  min?: number | null;
  max?: number | null;
  step?: number | null;
}

export interface DateConstraintValues {
  min?: string | null;
  max?: string | null;
}

export interface WidgetConstraintState {
  type: 'numeric' | 'date' | 'none';
  numericValues: NumericConstraintValues;
  dateValues: DateConstraintValues;
  isManaged: boolean;
  hasCustomConstraint: boolean;
  component: string | null;
}

export interface WidgetConstraintSpec {
  type: 'numeric' | 'date';
  values: NumericConstraintValues | DateConstraintValues;
  optional?: boolean;
}

export interface WidgetConstraintProp {
  key: string;
  type: 'number' | 'date';
  label: string;
}

const NUMERIC_WIDGET_PROPS: WidgetConstraintProp[] = [
  { key: 'min', type: 'number', label: 'Min' },
  { key: 'max', type: 'number', label: 'Max' },
  { key: 'step', type: 'number', label: 'Step' },
];

const DATE_WIDGET_PROPS: WidgetConstraintProp[] = [
  { key: 'min', type: 'date', label: 'Min Date' },
  { key: 'max', type: 'date', label: 'Max Date' },
];

const WIDGET_CONSTRAINT_MAP: Record<string, WidgetConstraintProp[]> = {
  NumberInput: NUMERIC_WIDGET_PROPS,
  MoneyInput: NUMERIC_WIDGET_PROPS,
  Slider: NUMERIC_WIDGET_PROPS,
  DatePicker: DATE_WIDGET_PROPS,
};

const NUMERIC_RE = /^\$\s*(>=|<=)\s*(-?\d+(?:\.\d+)?)$/;
const NUMERIC_RANGE_RE = /^\$\s*>=\s*(-?\d+(?:\.\d+)?)\s+and\s+\$\s*<=\s*(-?\d+(?:\.\d+)?)$/;
const DATE_SINGLE_RE = /^\$\s*(>=|<=)\s*date\('(\d{4}-\d{2}-\d{2})'\)$/;
const DATE_RANGE_RE = /^\$\s*>=\s*date\('(\d{4}-\d{2}-\d{2})'\)\s+and\s+\$\s*<=\s*date\('(\d{4}-\d{2}-\d{2})'\)$/;
const GUARD_PREFIX_RE = /^not\(present\(\$\)\)\s+or\s+/;

function stripOptionalGuard(expr: string): string {
  return expr.replace(GUARD_PREFIX_RE, '').replace(/^\(/, '').replace(/\)$/, '');
}

export function widgetConstraintToFEL(spec: WidgetConstraintSpec): string | null {
  const { type, values, optional } = spec;
  let range: string | null = null;

  if (type === 'numeric') {
    const v = values as NumericConstraintValues;
    const parts: string[] = [];
    if (v.min !== undefined) parts.push('$ >= ' + v.min);
    if (v.max !== undefined) parts.push('$ <= ' + v.max);
    if (parts.length === 0) return null;
    range = parts.join(' and ');
  } else {
    const v = values as DateConstraintValues;
    const parts: string[] = [];
    if (v.min) parts.push("$ >= date('" + v.min + "')");
    if (v.max) parts.push("$ <= date('" + v.max + "')");
    if (parts.length === 0) return null;
    range = parts.join(' and ');
  }

  if (optional) {
    const needsParens = range.includes(' and ');
    return 'not(present($)) or ' + (needsParens ? '(' + range + ')' : range);
  }
  return range;
}

export function felToWidgetConstraint(expr: string): WidgetConstraintSpec | null {
  if (!expr || !expr.trim()) return null;

  let stripped = expr.trim();
  let optional = false;

  const guardMatch = stripped.match(GUARD_PREFIX_RE);
  if (guardMatch) {
    optional = true;
    stripped = stripOptionalGuard(stripped);
  }

  const numRangeMatch = stripped.match(NUMERIC_RANGE_RE);
  if (numRangeMatch) {
    return { type: 'numeric', values: { min: Number(numRangeMatch[1]), max: Number(numRangeMatch[2]) }, optional };
  }

  const numSingleMatch = stripped.match(NUMERIC_RE);
  if (numSingleMatch) {
    const op = numSingleMatch[1];
    const val = Number(numSingleMatch[2]);
    if (op === '>=') {
      return { type: 'numeric', values: { min: val }, optional };
    }
    return { type: 'numeric', values: { max: val }, optional };
  }

  const dateRangeMatch = stripped.match(DATE_RANGE_RE);
  if (dateRangeMatch) {
    return { type: 'date', values: { min: dateRangeMatch[1], max: dateRangeMatch[2] }, optional };
  }

  const dateSingleMatch = stripped.match(DATE_SINGLE_RE);
  if (dateSingleMatch) {
    const op = dateSingleMatch[1];
    const val = dateSingleMatch[2];
    if (op === '>=') {
      return { type: 'date', values: { min: val }, optional };
    }
    return { type: 'date', values: { max: val }, optional };
  }

  return null;
}

export function isWidgetManagedConstraint(expr: string): boolean {
  return felToWidgetConstraint(expr) !== null;
}

export function getWidgetConstraintProps(component: string): WidgetConstraintProp[] {
  return WIDGET_CONSTRAINT_MAP[component] ?? [];
}
