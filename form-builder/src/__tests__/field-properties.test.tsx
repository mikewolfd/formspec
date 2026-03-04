import { beforeEach, describe, expect, test } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { resetState } from './setup';
import { FieldProperties } from '../components/properties/field-properties';
import { findItemByKey, setDefinition, createEmptyDefinition } from '../state/definition';
import { project, selectedMappingIndex } from '../state/project';
import type { FormspecItem } from 'formspec-engine';

const baseItem: FormspecItem = {
  key: 'testField',
  type: 'field',
  label: 'Test Field',
  dataType: 'string',
} as FormspecItem;

describe('FieldProperties', () => {
  beforeEach(() => {
    resetState();
  });

  test('renders section title Identity', () => {
    render(<FieldProperties item={baseItem} />);
    expect(screen.getByText('Identity')).toBeTruthy();
  });

  test('renders section title Data', () => {
    render(<FieldProperties item={baseItem} />);
    expect(screen.getByText('Data')).toBeTruthy();
  });

  test('renders section title Behavior', () => {
    render(<FieldProperties item={baseItem} />);
    expect(screen.getByText('Behavior')).toBeTruthy();
  });

  test('renders section title Validation', () => {
    render(<FieldProperties item={baseItem} />);
    expect(screen.getByText('Validation')).toBeTruthy();
  });

  test('renders Key label', () => {
    render(<FieldProperties item={baseItem} />);
    expect(screen.getByText('Key')).toBeTruthy();
  });

  test('renders Label label', () => {
    render(<FieldProperties item={baseItem} />);
    expect(screen.getByText('Label')).toBeTruthy();
  });

  test('renders Key input with item key value', () => {
    render(<FieldProperties item={baseItem} />);
    const inputs = document.querySelectorAll('input');
    const keyInput = Array.from(inputs).find((el) => el.value === 'testField');
    expect(keyInput).toBeTruthy();
  });

  test('renders Label input with item label value', () => {
    render(<FieldProperties item={baseItem} />);
    const inputs = document.querySelectorAll('input');
    const labelInput = Array.from(inputs).find((el) => el.value === 'Test Field');
    expect(labelInput).toBeTruthy();
  });

  test('renders Data Type select with item dataType value', () => {
    render(<FieldProperties item={baseItem} />);
    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.value).toBe('string');
  });

  test('renders all schema data type options', () => {
    render(<FieldProperties item={baseItem} />);
    const select = document.querySelector('select') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    const expected = [
      'string',
      'text',
      'integer',
      'decimal',
      'boolean',
      'date',
      'dateTime',
      'time',
      'choice',
      'multiChoice',
      'money',
      'uri',
      'attachment',
    ];
    expect(options).toEqual(expected);
  });

  test('renders Placeholder label', () => {
    render(<FieldProperties item={baseItem} />);
    expect(screen.getByText('Placeholder')).toBeTruthy();
  });

  test('renders Required label', () => {
    render(<FieldProperties item={baseItem} />);
    expect(screen.getByText('Required')).toBeTruthy();
  });

  test('renders Read Only label', () => {
    render(<FieldProperties item={baseItem} />);
    expect(screen.getByText('Read Only')).toBeTruthy();
  });

  test('renders Calculate label', () => {
    render(<FieldProperties item={baseItem} />);
    expect(screen.getByText('Calculate')).toBeTruthy();
  });

  test('renders Relevant label', () => {
    render(<FieldProperties item={baseItem} />);
    expect(screen.getByText('Relevant')).toBeTruthy();
  });

  test('renders Constraint label', () => {
    render(<FieldProperties item={baseItem} />);
    expect(screen.getByText('Constraint')).toBeTruthy();
  });

  test('renders Message label', () => {
    render(<FieldProperties item={baseItem} />);
    expect(screen.getByText('Message')).toBeTruthy();
  });

  // Options editor — only visible for choice / multiChoice
  test('does not show Options section for string dataType', () => {
    render(<FieldProperties item={baseItem} />);
    const optionsSections = document.querySelectorAll('.options-editor');
    expect(optionsSections.length).toBe(0);
  });

  test('shows Options section for choice dataType', () => {
    const choiceItem: FormspecItem = {
      key: 'choiceField',
      type: 'field',
      label: 'Pick One',
      dataType: 'choice',
    } as FormspecItem;
    render(<FieldProperties item={choiceItem} />);
    expect(document.querySelector('.options-editor')).toBeTruthy();
    expect(screen.getByText('Options')).toBeTruthy();
  });

  test('shows Options section for multiChoice dataType', () => {
    const multiItem: FormspecItem = {
      key: 'multiField',
      type: 'field',
      label: 'Pick Many',
      dataType: 'multiChoice',
    } as FormspecItem;
    render(<FieldProperties item={multiItem} />);
    expect(document.querySelector('.options-editor')).toBeTruthy();
    expect(screen.getByText('Options')).toBeTruthy();
  });

  test('renders existing options as editable rows', () => {
    const choiceItem = {
      key: 'choiceField',
      type: 'field',
      label: 'Pick One',
      dataType: 'choice',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
    } as unknown as FormspecItem;
    render(<FieldProperties item={choiceItem} />);
    const valueInputs = screen.getAllByRole('textbox', { name: /Option \d+ value/ });
    expect(valueInputs.length).toBe(2);
    expect((valueInputs[0] as HTMLInputElement).value).toBe('yes');
    expect((valueInputs[1] as HTMLInputElement).value).toBe('no');
    const labelInputs = screen.getAllByRole('textbox', { name: /Option \d+ label/ });
    expect((labelInputs[0] as HTMLInputElement).value).toBe('Yes');
    expect((labelInputs[1] as HTMLInputElement).value).toBe('No');
  });

  test('shows Add Option button for choice field', () => {
    const choiceItem: FormspecItem = {
      key: 'choiceField',
      type: 'field',
      label: 'Pick One',
      dataType: 'choice',
    } as FormspecItem;
    render(<FieldProperties item={choiceItem} />);
    expect(screen.getByText('+ Add Option')).toBeTruthy();
  });

  test('clicking Add Option adds an option to definition', () => {
    const def = createEmptyDefinition();
    const choiceItem = {
      key: 'choiceField',
      type: 'field',
      label: 'Pick One',
      dataType: 'choice',
    };
    def.items = [choiceItem as FormspecItem];
    setDefinition(def);

    render(<FieldProperties item={choiceItem as FormspecItem} />);
    const addBtn = screen.getByText('+ Add Option');
    fireEvent.click(addBtn);

    const { item } = findItemByKey('choiceField')!;
    const opts = (item as any).options as { value: string; label?: string }[];
    expect(opts).toBeTruthy();
    expect(opts.length).toBe(1);
  });

  test('clicking Remove button removes the option from definition', () => {
    const def = createEmptyDefinition();
    const choiceItem = {
      key: 'choiceField',
      type: 'field',
      label: 'Pick One',
      dataType: 'choice',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
    };
    def.items = [choiceItem as unknown as FormspecItem];
    setDefinition(def);

    render(<FieldProperties item={choiceItem as unknown as FormspecItem} />);
    const removeBtns = screen.getAllByRole('button', { name: /Remove option/ });
    expect(removeBtns.length).toBe(2);
    fireEvent.click(removeBtns[0]);

    const { item } = findItemByKey('choiceField')!;
    const opts = (item as any).options as { value: string; label?: string }[];
    expect(opts.length).toBe(1);
    expect(opts[0].value).toBe('no');
  });

  test('editing option value input updates definition', () => {
    const def = createEmptyDefinition();
    const choiceItem = {
      key: 'choiceField',
      type: 'field',
      label: 'Pick One',
      dataType: 'choice',
      options: [{ value: 'old', label: 'Old Label' }],
    };
    def.items = [choiceItem as unknown as FormspecItem];
    setDefinition(def);

    render(<FieldProperties item={choiceItem as unknown as FormspecItem} />);
    const valueInput = screen.getByRole('textbox', { name: 'Option 1 value' }) as HTMLInputElement;
    fireEvent.input(valueInput, { target: { value: 'new' } });

    const { item } = findItemByKey('choiceField')!;
    const opts = (item as any).options as { value: string; label?: string }[];
    expect(opts[0].value).toBe('new');
  });

  test('FEL autocomplete suggests $ variables and inserts selection', () => {
    const def = createEmptyDefinition();
    def.items = [
      {
        key: 'targetField',
        type: 'field',
        label: 'Target',
        dataType: 'string',
      } as FormspecItem,
      {
        key: 'organizationName',
        type: 'field',
        label: 'Organization',
        dataType: 'string',
      } as FormspecItem,
    ];
    setDefinition(def);
    const selected = findItemByKey('targetField')!.item;

    render(<FieldProperties item={selected} />);

    const relevantLabel = screen.getByText('Relevant');
    const relevantRow = relevantLabel.closest('.property-row') as HTMLElement;
    const relevantInput = relevantRow.querySelector('.fel-input-wrap input') as HTMLInputElement;

    relevantInput.focus();
    relevantInput.value = '$org';
    relevantInput.setSelectionRange(4, 4);
    fireEvent.input(relevantInput, { target: { value: '$org' } });

    const option = screen.getByText('$organizationName').closest('[role="option"]') as HTMLElement;
    fireEvent.mouseDown(option);

    const { item } = findItemByKey('targetField')!;
    expect((item as Record<string, unknown>).relevant).toBe('$organizationName');
  });

  test('FEL autocomplete suggests @ functions and inserts call syntax', () => {
    const def = createEmptyDefinition();
    def.items = [
      {
        key: 'targetField',
        type: 'field',
        label: 'Target',
        dataType: 'string',
      } as FormspecItem,
    ];
    setDefinition(def);
    const selected = findItemByKey('targetField')!.item;

    render(<FieldProperties item={selected} />);

    const relevantLabel = screen.getByText('Relevant');
    const relevantRow = relevantLabel.closest('.property-row') as HTMLElement;
    const relevantInput = relevantRow.querySelector('.fel-input-wrap input') as HTMLInputElement;

    relevantInput.focus();
    relevantInput.value = '@su';
    relevantInput.setSelectionRange(3, 3);
    fireEvent.input(relevantInput, { target: { value: '@su' } });

    const option = screen.getByText('@sum').closest('[role="option"]') as HTMLElement;
    fireEvent.mouseDown(option);

    const { item } = findItemByKey('targetField')!;
    expect((item as Record<string, unknown>).relevant).toBe('sum()');
  });

  test('FEL autocomplete supports keyboard selection for function suggestions', () => {
    const def = createEmptyDefinition();
    def.items = [
      {
        key: 'targetField',
        type: 'field',
        label: 'Target',
        dataType: 'string',
      } as FormspecItem,
    ];
    setDefinition(def);
    const selected = findItemByKey('targetField')!.item;

    render(<FieldProperties item={selected} />);

    const relevantLabel = screen.getByText('Relevant');
    const relevantRow = relevantLabel.closest('.property-row') as HTMLElement;
    const relevantInput = relevantRow.querySelector('.fel-input-wrap input') as HTMLInputElement;

    relevantInput.focus();
    relevantInput.value = '@su';
    relevantInput.setSelectionRange(3, 3);
    fireEvent.input(relevantInput, { target: { value: '@su' } });

    fireEvent.keyDown(relevantInput, { key: 'ArrowDown' });
    fireEvent.keyDown(relevantInput, { key: 'Enter' });

    const { item } = findItemByKey('targetField')!;
    expect((item as Record<string, unknown>).relevant).toBe('sum()');
  });

  test('FEL autocomplete prioritizes prefix variable matches', () => {
    const def = createEmptyDefinition();
    def.items = [
      {
        key: 'targetField',
        type: 'field',
        label: 'Target',
        dataType: 'string',
      } as FormspecItem,
      {
        key: 'fullName',
        type: 'field',
        label: 'Full Name',
        dataType: 'string',
      } as FormspecItem,
      {
        key: 'notes',
        type: 'field',
        label: 'Notes',
        dataType: 'text',
      } as FormspecItem,
    ];
    setDefinition(def);
    const selected = findItemByKey('targetField')!.item;

    render(<FieldProperties item={selected} />);

    const relevantLabel = screen.getByText('Relevant');
    const relevantRow = relevantLabel.closest('.property-row') as HTMLElement;
    const relevantInput = relevantRow.querySelector('.fel-input-wrap input') as HTMLInputElement;

    relevantInput.focus();
    relevantInput.value = '$f';
    relevantInput.setSelectionRange(2, 2);
    fireEvent.input(relevantInput, { target: { value: '$f' } });

    const options = Array.from(relevantRow.querySelectorAll('[role="option"]'));
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].textContent).toContain('$fullName');
  });

  test('adds a mapping rule for selected field via inline mappings section', () => {
    const def = createEmptyDefinition();
    const field = {
      key: 'totalBudget',
      type: 'field',
      label: 'Total Budget',
      dataType: 'decimal',
    } as FormspecItem;
    def.items = [field];
    setDefinition(def);

    project.value = {
      ...project.value,
      mappings: [
        {
          $formspecMapping: '1.0',
          version: '1.0.0',
          definitionRef: def.url,
          definitionVersion: `>=${def.version} <1.0.0`,
          targetSchema: { format: 'json' },
          rules: [],
          title: 'Primary Mapping',
        },
      ],
    };
    selectedMappingIndex.value = 0;

    render(<FieldProperties item={field} />);

    fireEvent.input(screen.getByPlaceholderText(/target path/), {
      target: { value: 'payload.total_budget' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Rule' }));

    const rules = (project.value.mappings[0] as any).rules as any[];
    expect(rules.length).toBe(1);
    expect(rules[0].sourcePath).toBe('totalBudget');
    expect(rules[0].targetPath).toBe('payload.total_budget');
    expect(screen.getByText(/totalBudget → payload\.total_budget/)).toBeTruthy();
  });

  test('edits and removes a field mapping rule inline', () => {
    const def = createEmptyDefinition();
    const field = {
      key: 'totalBudget',
      type: 'field',
      label: 'Total Budget',
      dataType: 'decimal',
    } as FormspecItem;
    def.items = [field];
    setDefinition(def);

    project.value = {
      ...project.value,
      mappings: [
        {
          $formspecMapping: '1.0',
          version: '1.0.0',
          definitionRef: def.url,
          definitionVersion: `>=${def.version} <1.0.0`,
          targetSchema: { format: 'json' },
          rules: [{ sourcePath: 'totalBudget', targetPath: 'payload.total_budget', transform: 'preserve' }],
          title: 'Primary Mapping',
        },
      ],
    };
    selectedMappingIndex.value = 0;

    render(<FieldProperties item={field} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const editTarget = screen.getByDisplayValue('payload.total_budget') as HTMLInputElement;
    fireEvent.input(editTarget, { target: { value: 'payload.amount' } });
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    fireEvent.change(selects[selects.length - 1], { target: { value: 'coerce' } });
    const priorityInput = screen.getByDisplayValue('0') as HTMLInputElement;
    fireEvent.input(priorityInput, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    let rules = (project.value.mappings[0] as any).rules as any[];
    expect(rules[0].targetPath).toBe('payload.amount');
    expect(rules[0].transform).toBe('coerce');
    expect(rules[0].priority).toBe(3);

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    rules = (project.value.mappings[0] as any).rules as any[];
    expect(rules).toHaveLength(0);
  });

  test('reorders field mapping rules with up/down controls', () => {
    const def = createEmptyDefinition();
    const field = {
      key: 'totalBudget',
      type: 'field',
      label: 'Total Budget',
      dataType: 'decimal',
    } as FormspecItem;
    def.items = [field];
    setDefinition(def);

    project.value = {
      ...project.value,
      mappings: [
        {
          $formspecMapping: '1.0',
          version: '1.0.0',
          definitionRef: def.url,
          definitionVersion: `>=${def.version} <1.0.0`,
          targetSchema: { format: 'json' },
          rules: [
            { sourcePath: 'totalBudget', targetPath: 'payload.first', transform: 'preserve' },
            { sourcePath: 'totalBudget', targetPath: 'payload.second', transform: 'preserve' },
          ],
          title: 'Primary Mapping',
        },
      ],
    };
    selectedMappingIndex.value = 0;

    render(<FieldProperties item={field} />);

    const downButtons = screen.getAllByRole('button', { name: '↓' });
    fireEvent.click(downButtons[0]);

    let rules = (project.value.mappings[0] as any).rules as any[];
    expect(rules[0].targetPath).toBe('payload.second');
    expect(rules[1].targetPath).toBe('payload.first');

    const upButtons = screen.getAllByRole('button', { name: '↑' });
    fireEvent.click(upButtons[1]);
    rules = (project.value.mappings[0] as any).rules as any[];
    expect(rules[0].targetPath).toBe('payload.first');
  });

  test('reorders field mapping rules via drag and drop', () => {
    const def = createEmptyDefinition();
    const field = {
      key: 'totalBudget',
      type: 'field',
      label: 'Total Budget',
      dataType: 'decimal',
    } as FormspecItem;
    def.items = [field];
    setDefinition(def);

    project.value = {
      ...project.value,
      mappings: [
        {
          $formspecMapping: '1.0',
          version: '1.0.0',
          definitionRef: def.url,
          definitionVersion: `>=${def.version} <1.0.0`,
          targetSchema: { format: 'json' },
          rules: [
            { sourcePath: 'totalBudget', targetPath: 'payload.first', transform: 'preserve' },
            { sourcePath: 'totalBudget', targetPath: 'payload.second', transform: 'preserve' },
          ],
          title: 'Primary Mapping',
        },
      ],
    };
    selectedMappingIndex.value = 0;

    render(<FieldProperties item={field} />);

    const rows = document.querySelectorAll('.properties-inline-card');
    const dataTransfer = {
      payload: '',
      setData: (_type: string, value: string) => {
        dataTransfer.payload = value;
      },
      getData: () => dataTransfer.payload,
    };

    fireEvent.dragStart(rows[0], { dataTransfer });
    fireEvent.drop(rows[1], { dataTransfer });

    const rules = (project.value.mappings[0] as any).rules as any[];
    expect(rules[0].targetPath).toBe('payload.second');
  });
});
