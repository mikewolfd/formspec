import type { AddPickerEntry } from '../types';

export const ADD_CATALOG: AddPickerEntry[] = [
  // --- Layout ---
  { component: 'Stack', label: 'Stack', category: 'layout' },
  { component: 'Grid', label: 'Grid', category: 'layout' },
  { component: 'Page', label: 'Page', category: 'layout', promptForLabel: true },
  { component: 'Wizard', label: 'Wizard', category: 'layout' },
  { component: 'Card', label: 'Card', category: 'layout', promptForLabel: true },
  { component: 'Collapsible', label: 'Collapsible', category: 'layout', promptForLabel: true },
  { component: 'Columns', label: 'Columns', category: 'layout' },
  { component: 'Tabs', label: 'Tabs', category: 'layout' },
  { component: 'Accordion', label: 'Accordion', category: 'layout' },

  // --- Input ---
  { component: 'TextInput', label: 'Text Input', category: 'input', defaultDataType: 'string', createsDefinitionItem: true, definitionType: 'field', promptForLabel: true },
  { component: 'NumberInput', label: 'Number Input', category: 'input', defaultDataType: 'integer', createsDefinitionItem: true, definitionType: 'field', promptForLabel: true },
  { component: 'DatePicker', label: 'Date Picker', category: 'input', defaultDataType: 'date', createsDefinitionItem: true, definitionType: 'field', promptForLabel: true },
  { component: 'Select', label: 'Select', category: 'input', defaultDataType: 'choice', createsDefinitionItem: true, definitionType: 'field', promptForLabel: true },
  { component: 'RadioGroup', label: 'Radio Group', category: 'input', defaultDataType: 'choice', createsDefinitionItem: true, definitionType: 'field', promptForLabel: true },
  { component: 'CheckboxGroup', label: 'Checkbox Group', category: 'input', defaultDataType: 'multiChoice', createsDefinitionItem: true, definitionType: 'field', promptForLabel: true },
  { component: 'Toggle', label: 'Toggle', category: 'input', defaultDataType: 'boolean', createsDefinitionItem: true, definitionType: 'field', promptForLabel: true },
  { component: 'FileUpload', label: 'File Upload', category: 'input', defaultDataType: 'attachment', createsDefinitionItem: true, definitionType: 'field', promptForLabel: true },
  { component: 'MoneyInput', label: 'Money Input', category: 'input', defaultDataType: 'money', createsDefinitionItem: true, definitionType: 'field', promptForLabel: true },
  { component: 'Slider', label: 'Slider', category: 'input', defaultDataType: 'decimal', createsDefinitionItem: true, definitionType: 'field', promptForLabel: true },
  { component: 'Rating', label: 'Rating', category: 'input', defaultDataType: 'integer', createsDefinitionItem: true, definitionType: 'field', promptForLabel: true },
  { component: 'Signature', label: 'Signature', category: 'input', defaultDataType: 'attachment', createsDefinitionItem: true, definitionType: 'field', promptForLabel: true },

  // --- Display ---
  { component: 'Heading', label: 'Heading', category: 'display', createsDefinitionItem: true, definitionType: 'display', promptForLabel: true },
  { component: 'Text', label: 'Text', category: 'display', createsDefinitionItem: true, definitionType: 'display', promptForLabel: true },
  { component: 'Divider', label: 'Divider', category: 'display' },
  { component: 'Alert', label: 'Alert', category: 'display' },
  { component: 'Badge', label: 'Badge', category: 'display' },
  { component: 'ProgressBar', label: 'Progress Bar', category: 'display' },
  { component: 'Summary', label: 'Summary', category: 'display' },
  { component: 'ValidationSummary', label: 'Validation Summary', category: 'display' },
  { component: 'SubmitButton', label: 'Submit Button', category: 'display' },

  // --- Structure ---
  { component: 'Group', label: 'Group', category: 'structure', createsDefinitionItem: true, definitionType: 'group', promptForLabel: true },
  { component: 'ConditionalGroup', label: 'Conditional Group', category: 'structure' },
  { component: 'Spacer', label: 'Spacer', category: 'structure' },
  { component: 'DataTable', label: 'Data Table', category: 'structure' },
];

export function getCatalogByCategory(): Record<string, AddPickerEntry[]> {
  const result: Record<string, AddPickerEntry[]> = { layout: [], input: [], display: [], structure: [] };
  for (const entry of ADD_CATALOG) {
    result[entry.category].push(entry);
  }
  return result;
}
