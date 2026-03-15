import { HelperError } from './helper-types.js';

export interface ResolvedFieldType {
  dataType: string;
  defaultWidget: string;
  constraintExpr?: string;
}

const FIELD_TYPE_MAP: Record<string, { dataType: string; defaultWidget: string; constraintExpr?: string }> = {
  text:        { dataType: 'text',       defaultWidget: 'TextInput' },
  string:      { dataType: 'string',     defaultWidget: 'TextInput' },
  integer:     { dataType: 'integer',    defaultWidget: 'NumberInput' },
  decimal:     { dataType: 'decimal',    defaultWidget: 'NumberInput' },
  number:      { dataType: 'decimal',    defaultWidget: 'NumberInput' },
  boolean:     { dataType: 'boolean',    defaultWidget: 'Toggle' },
  date:        { dataType: 'date',       defaultWidget: 'DatePicker' },
  datetime:    { dataType: 'dateTime',   defaultWidget: 'DatePicker' },
  dateTime:    { dataType: 'dateTime',   defaultWidget: 'DatePicker' },
  time:        { dataType: 'time',       defaultWidget: 'DatePicker' },
  url:         { dataType: 'uri',        defaultWidget: 'TextInput' },
  uri:         { dataType: 'uri',        defaultWidget: 'TextInput' },
  file:        { dataType: 'attachment', defaultWidget: 'FileUpload' },
  attachment:  { dataType: 'attachment', defaultWidget: 'FileUpload' },
  signature:   { dataType: 'attachment', defaultWidget: 'Signature' },
  choice:      { dataType: 'choice',     defaultWidget: 'Select' },
  multichoice: { dataType: 'multiChoice', defaultWidget: 'CheckboxGroup' },
  multiChoice: { dataType: 'multiChoice', defaultWidget: 'CheckboxGroup' },
  currency:    { dataType: 'money',      defaultWidget: 'MoneyInput' },
  money:       { dataType: 'money',      defaultWidget: 'MoneyInput' },
  rating:      { dataType: 'integer',    defaultWidget: 'Rating' },
  slider:      { dataType: 'decimal',    defaultWidget: 'Slider' },
  email:       { dataType: 'string',     defaultWidget: 'TextInput', constraintExpr: "matches($, '.*@.*')" },
  phone:       { dataType: 'string',     defaultWidget: 'TextInput', constraintExpr: "matches($, '^[+]?[0-9\\s\\-().]+$')" },
};

const WIDGET_ALIAS_MAP: Record<string, string> = {
  radio: 'RadioGroup',
  checkbox: 'CheckboxGroup',
  toggle: 'Toggle',
  select: 'Select',
  slider: 'Slider',
  rating: 'Rating',
  textarea: 'TextInput',
  file: 'FileUpload',
  signature: 'Signature',
  date: 'DatePicker',
  money: 'MoneyInput',
  number: 'NumberInput',
  text: 'TextInput',
};

const RAW_COMPONENT_NAMES = new Set([
  'RadioGroup', 'CheckboxGroup', 'Toggle', 'Select', 'Slider', 'Rating',
  'TextInput', 'FileUpload', 'Signature', 'DatePicker', 'MoneyInput', 'NumberInput',
]);

export function resolveFieldType(type: string): ResolvedFieldType {
  const entry = FIELD_TYPE_MAP[type];
  if (!entry) {
    throw new HelperError('INVALID_TYPE', `Unknown field type "${type}"`, {
      validTypes: Object.keys(FIELD_TYPE_MAP),
    });
  }
  return { ...entry };
}

export function resolveWidget(widget: string): string {
  if (WIDGET_ALIAS_MAP[widget]) return WIDGET_ALIAS_MAP[widget];
  if (RAW_COMPONENT_NAMES.has(widget)) return widget;
  throw new HelperError('INVALID_WIDGET', `Unknown widget "${widget}"`, {
    validWidgets: [...Object.keys(WIDGET_ALIAS_MAP), ...RAW_COMPONENT_NAMES],
  });
}

export function widgetHintFor(aliasOrComponent: string): string | undefined {
  if (aliasOrComponent === 'text') return undefined;
  if (WIDGET_ALIAS_MAP[aliasOrComponent]) return aliasOrComponent;
  if (RAW_COMPONENT_NAMES.has(aliasOrComponent)) {
    if (aliasOrComponent === 'TextInput') return undefined;
    const reverseEntry = Object.entries(WIDGET_ALIAS_MAP).find(([, comp]) => comp === aliasOrComponent);
    return reverseEntry ? reverseEntry[0] : aliasOrComponent.toLowerCase();
  }
  return undefined;
}

export function isTextareaWidget(widget: string): boolean {
  return widget === 'textarea';
}

export { FIELD_TYPE_MAP, WIDGET_ALIAS_MAP };
