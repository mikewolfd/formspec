import { HelperError } from './helper-types.js';

export interface ResolvedFieldType {
  dataType: string;
  defaultWidget: string;
  /** Spec-normative default widgetHint for this dataType (e.g. "textarea" for text). */
  defaultWidgetHint?: string;
  constraintExpr?: string;
}

const FIELD_TYPE_MAP: Record<string, { dataType: string; defaultWidget: string; defaultWidgetHint?: string; constraintExpr?: string }> = {
  text:        { dataType: 'text',        defaultWidget: 'TextInput',     defaultWidgetHint: 'textarea' },
  string:      { dataType: 'string',      defaultWidget: 'TextInput' },
  integer:     { dataType: 'integer',     defaultWidget: 'NumberInput' },
  decimal:     { dataType: 'decimal',     defaultWidget: 'NumberInput' },
  number:      { dataType: 'decimal',     defaultWidget: 'NumberInput' },
  boolean:     { dataType: 'boolean',     defaultWidget: 'Toggle' },
  date:        { dataType: 'date',        defaultWidget: 'DatePicker' },
  datetime:    { dataType: 'dateTime',    defaultWidget: 'DatePicker' },
  dateTime:    { dataType: 'dateTime',    defaultWidget: 'DatePicker' },
  time:        { dataType: 'time',        defaultWidget: 'DatePicker' },
  url:         { dataType: 'uri',         defaultWidget: 'TextInput' },
  uri:         { dataType: 'uri',         defaultWidget: 'TextInput' },
  file:        { dataType: 'attachment',  defaultWidget: 'FileUpload' },
  attachment:  { dataType: 'attachment',  defaultWidget: 'FileUpload' },
  signature:   { dataType: 'attachment',  defaultWidget: 'Signature' },
  choice:      { dataType: 'choice',      defaultWidget: 'Select' },
  multichoice: { dataType: 'multiChoice', defaultWidget: 'CheckboxGroup' },
  multiChoice: { dataType: 'multiChoice', defaultWidget: 'CheckboxGroup' },
  currency:    { dataType: 'money',       defaultWidget: 'MoneyInput' },
  money:       { dataType: 'money',       defaultWidget: 'MoneyInput' },
  rating:      { dataType: 'integer',     defaultWidget: 'Rating' },
  slider:      { dataType: 'decimal',     defaultWidget: 'Slider' },
  email:       { dataType: 'string',      defaultWidget: 'TextInput', constraintExpr: "matches($, '.*@.*')" },
  phone:       { dataType: 'string',      defaultWidget: 'TextInput', constraintExpr: "matches($, '^[+]?[0-9\\s\\-().]+$')" },
};

/**
 * Spec-normative Tier 1 widgetHint → Tier 3 component name.
 * Source: spec section 4.2.5.1 + widget-vocabulary.ts in formspec-layout.
 *
 * Also includes short aliases (e.g. "radio", "select") for authoring convenience.
 * All keys are lowercase or camelCase spec vocabulary -- never PascalCase.
 */
const WIDGET_ALIAS_MAP: Record<string, string> = {
  // string dataType
  textInput:      'TextInput',
  password:       'TextInput',
  color:          'TextInput',
  // text dataType
  textarea:       'TextInput',
  richText:       'TextInput',
  // integer / decimal dataType
  numberInput:    'NumberInput',
  stepper:        'NumberInput',
  // boolean dataType
  checkbox:       'CheckboxGroup',
  toggle:         'Toggle',
  yesNo:          'Toggle',
  // date / dateTime / time dataType
  datePicker:     'DatePicker',
  dateTimePicker: 'DatePicker',
  timePicker:     'DatePicker',
  dateInput:      'TextInput',
  dateTimeInput:  'TextInput',
  timeInput:      'TextInput',
  // choice dataType
  dropdown:       'Select',
  radio:          'RadioGroup',
  autocomplete:   'Select',
  segmented:      'RadioGroup',
  likert:         'RadioGroup',
  // multiChoice dataType
  checkboxGroup:  'CheckboxGroup',
  multiSelect:    'CheckboxGroup',
  // attachment dataType
  fileUpload:     'FileUpload',
  camera:         'FileUpload',
  signature:      'Signature',
  // money dataType
  moneyInput:     'MoneyInput',
  // special
  slider:         'Slider',
  rating:         'Rating',

  // ── Short authoring aliases (non-spec convenience) ──
  select:  'Select',
  file:    'FileUpload',
  date:    'DatePicker',
  money:   'MoneyInput',
  number:  'NumberInput',
  text:    'TextInput',
};

/** PascalCase Tier 3 component names — accepted as input but not shown in error messages. */
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
    validWidgets: Object.keys(WIDGET_ALIAS_MAP),
  });
}

export function widgetHintFor(aliasOrComponent: string): string | undefined {
  // "text" as a short alias doesn't carry a widgetHint (it's the TextInput default)
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
