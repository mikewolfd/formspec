import { describe, it, expect } from 'vitest';
import {
  widgetConstraintToFEL,
  felToWidgetConstraint,
  isWidgetManagedConstraint,
  getWidgetConstraintProps,
  type WidgetConstraintSpec,
  type NumericConstraintValues,
  type DateConstraintValues,
} from '../src/widget-constraints.js';
import { createProject } from '../src/project.js';

describe('widgetConstraintToFEL', () => {
  it('generates min-only constraint for numeric widget', () => {
    const spec: WidgetConstraintSpec = {
      type: 'numeric',
      values: { min: 0 },
    };
    expect(widgetConstraintToFEL(spec)).toBe('$ >= 0');
  });

  it('generates max-only constraint for numeric widget', () => {
    const spec: WidgetConstraintSpec = {
      type: 'numeric',
      values: { max: 100 },
    };
    expect(widgetConstraintToFEL(spec)).toBe('$ <= 100');
  });

  it('generates min + max constraint for numeric widget', () => {
    const spec: WidgetConstraintSpec = {
      type: 'numeric',
      values: { min: 1, max: 100 },
    };
    expect(widgetConstraintToFEL(spec)).toBe('$ >= 1 and $ <= 100');
  });

  it('generates decimal min/max constraint', () => {
    const spec: WidgetConstraintSpec = {
      type: 'numeric',
      values: { min: 0.01, max: 9999.99 },
    };
    expect(widgetConstraintToFEL(spec)).toBe('$ >= 0.01 and $ <= 9999.99');
  });

  it('generates min-only constraint for date widget', () => {
    const spec: WidgetConstraintSpec = {
      type: 'date',
      values: { min: '2025-01-01' },
    };
    expect(widgetConstraintToFEL(spec)).toBe("$ >= date('2025-01-01')");
  });

  it('generates max-only constraint for date widget', () => {
    const spec: WidgetConstraintSpec = {
      type: 'date',
      values: { max: '2025-12-31' },
    };
    expect(widgetConstraintToFEL(spec)).toBe("$ <= date('2025-12-31')");
  });

  it('generates min + max constraint for date widget', () => {
    const spec: WidgetConstraintSpec = {
      type: 'date',
      values: { min: '2025-01-01', max: '2025-12-31' },
    };
    expect(widgetConstraintToFEL(spec)).toBe("$ >= date('2025-01-01') and $ <= date('2025-12-31')");
  });

  it('returns null when no constraints are set', () => {
    const spec: WidgetConstraintSpec = {
      type: 'numeric',
      values: {},
    };
    expect(widgetConstraintToFEL(spec)).toBeNull();
  });

  it('returns null for empty date values', () => {
    const spec: WidgetConstraintSpec = {
      type: 'date',
      values: {},
    };
    expect(widgetConstraintToFEL(spec)).toBeNull();
  });

  it('guards optional values: wraps in not(present($)) or ...', () => {
    const spec: WidgetConstraintSpec = {
      type: 'numeric',
      values: { min: 1 },
      optional: true,
    };
    expect(widgetConstraintToFEL(spec)).toBe('not(present($)) or $ >= 1');
  });

  it('guards optional min+max', () => {
    const spec: WidgetConstraintSpec = {
      type: 'numeric',
      values: { min: 0, max: 100 },
      optional: true,
    };
    expect(widgetConstraintToFEL(spec)).toBe('not(present($)) or ($ >= 0 and $ <= 100)');
  });
});

describe('felToWidgetConstraint', () => {
  it('parses numeric min-only constraint', () => {
    const result = felToWidgetConstraint('$ >= 0');
    expect(result).toMatchObject({ type: 'numeric', values: { min: 0 } });
    expect(result!.optional).toBeFalsy();
  });

  it('parses numeric max-only constraint', () => {
    const result = felToWidgetConstraint('$ <= 100');
    expect(result).toMatchObject({ type: 'numeric', values: { max: 100 } });
  });

  it('parses numeric min+max constraint', () => {
    const result = felToWidgetConstraint('$ >= 1 and $ <= 100');
    expect(result).toMatchObject({ type: 'numeric', values: { min: 1, max: 100 } });
  });

  it('parses decimal min+max constraint', () => {
    const result = felToWidgetConstraint('$ >= 0.01 and $ <= 9999.99');
    expect(result).toMatchObject({ type: 'numeric', values: { min: 0.01, max: 9999.99 } });
  });

  it('parses date min-only constraint', () => {
    const result = felToWidgetConstraint("$ >= date('2025-01-01')");
    expect(result).toMatchObject({ type: 'date', values: { min: '2025-01-01' } });
  });

  it('parses date max-only constraint', () => {
    const result = felToWidgetConstraint("$ <= date('2025-12-31')");
    expect(result).toMatchObject({ type: 'date', values: { max: '2025-12-31' } });
  });

  it('parses date min+max constraint', () => {
    const result = felToWidgetConstraint("$ >= date('2025-01-01') and $ <= date('2025-12-31')");
    expect(result).toMatchObject({ type: 'date', values: { min: '2025-01-01', max: '2025-12-31' } });
  });

  it('parses guarded optional numeric constraint', () => {
    const result = felToWidgetConstraint('not(present($)) or $ >= 1');
    expect(result).toEqual({ type: 'numeric', values: { min: 1 }, optional: true });
  });

  it('parses guarded optional min+max constraint', () => {
    const result = felToWidgetConstraint('not(present($)) or ($ >= 0 and $ <= 100)');
    expect(result).toEqual({ type: 'numeric', values: { min: 0, max: 100 }, optional: true });
  });

  it('returns null for unparseable FEL', () => {
    expect(felToWidgetConstraint('matches($, ".*@.*")')).toBeNull();
  });

  it('returns null for complex constraint with extra conditions', () => {
    expect(felToWidgetConstraint('$ >= 1 and $ <= 100 and $ != 50')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(felToWidgetConstraint('')).toBeNull();
  });

  it('returns null for strict inequality $ > 0', () => {
    expect(felToWidgetConstraint('$ > 0')).toBeNull();
  });

  it('returns null for strict inequality $ < 100', () => {
    expect(felToWidgetConstraint('$ < 100')).toBeNull();
  });

  it('parses negative min', () => {
    const result = felToWidgetConstraint('$ >= -10');
    expect(result).toMatchObject({ type: 'numeric', values: { min: -10 } });
  });

  it('parses negative range', () => {
    const result = felToWidgetConstraint('$ >= -100 and $ <= 50');
    expect(result).toMatchObject({ type: 'numeric', values: { min: -100, max: 50 } });
  });
});

describe('isWidgetManagedConstraint', () => {
  it('returns true for widget-generated numeric constraint', () => {
    expect(isWidgetManagedConstraint('$ >= 1 and $ <= 100')).toBe(true);
  });

  it('returns true for widget-generated date constraint', () => {
    expect(isWidgetManagedConstraint("$ >= date('2025-01-01')")).toBe(true);
  });

  it('returns true for optional guarded constraint', () => {
    expect(isWidgetManagedConstraint('not(present($)) or $ >= 0')).toBe(true);
  });

  it('returns false for custom constraint', () => {
    expect(isWidgetManagedConstraint("matches($, '.*@.*')")).toBe(false);
  });

  it('returns false for complex custom constraint', () => {
    expect(isWidgetManagedConstraint('$ >= 1 and foo > 10')).toBe(false);
  });
});

describe('getWidgetConstraintProps', () => {
  it('returns min/max/step for NumberInput', () => {
    const props = getWidgetConstraintProps('NumberInput');
    expect(props).toEqual([
      { key: 'min', type: 'number', label: 'Min' },
      { key: 'max', type: 'number', label: 'Max' },
      { key: 'step', type: 'number', label: 'Step' },
    ]);
  });

  it('returns min/max/step for MoneyInput', () => {
    const props = getWidgetConstraintProps('MoneyInput');
    expect(props).toEqual([
      { key: 'min', type: 'number', label: 'Min' },
      { key: 'max', type: 'number', label: 'Max' },
      { key: 'step', type: 'number', label: 'Step' },
    ]);
  });

  it('returns min/max/step for Slider', () => {
    const props = getWidgetConstraintProps('Slider');
    expect(props).toEqual([
      { key: 'min', type: 'number', label: 'Min' },
      { key: 'max', type: 'number', label: 'Max' },
      { key: 'step', type: 'number', label: 'Step' },
    ]);
  });

  it('returns minDate/maxDate for DatePicker', () => {
    const props = getWidgetConstraintProps('DatePicker');
    expect(props).toEqual([
      { key: 'min', type: 'date', label: 'Min Date' },
      { key: 'max', type: 'date', label: 'Max Date' },
    ]);
  });

  it('returns empty for widgets without constraints', () => {
    expect(getWidgetConstraintProps('TextInput')).toEqual([]);
    expect(getWidgetConstraintProps('Toggle')).toEqual([]);
    expect(getWidgetConstraintProps('Select')).toEqual([]);
  });

  it('returns empty for unknown widget', () => {
    expect(getWidgetConstraintProps('Unknown')).toEqual([]);
  });
});

describe('Project.setWidgetConstraints (integration)', () => {
  it('sets min on a NumberInput field and creates bind constraint', () => {
    const project = createProject();
    project.addField('age', 'Age', 'integer');
    project.setWidgetConstraints('age', { min: 0 });
    const bind = project.bindFor('age');
    expect(bind?.constraint).toBe('$ >= 0');
    const comp = project.componentFor('age');
    expect(comp?.min).toBe(0);
  });

  it('sets max on a NumberInput field and creates bind constraint', () => {
    const project = createProject();
    project.addField('score', 'Score', 'integer');
    project.setWidgetConstraints('score', { max: 100 });
    const bind = project.bindFor('score');
    expect(bind?.constraint).toBe('$ <= 100');
    const comp = project.componentFor('score');
    expect(comp?.max).toBe(100);
  });

  it('sets min+max on a NumberInput field', () => {
    const project = createProject();
    project.addField('qty', 'Quantity', 'integer');
    project.setWidgetConstraints('qty', { min: 1, max: 99 });
    const bind = project.bindFor('qty');
    expect(bind?.constraint).toBe('$ >= 1 and $ <= 99');
    const comp = project.componentFor('qty');
    expect(comp?.min).toBe(1);
    expect(comp?.max).toBe(99);
  });

  it('sets min+max+step on a MoneyInput field', () => {
    const project = createProject();
    project.addField('budget', 'Budget', 'money');
    project.setWidgetConstraints('budget', { min: 0, max: 1000000, step: 0.01 });
    const bind = project.bindFor('budget');
    expect(bind?.constraint).toBe('$ >= 0 and $ <= 1000000');
    const comp = project.componentFor('budget');
    expect(comp?.min).toBe(0);
    expect(comp?.max).toBe(1000000);
    expect(comp?.step).toBe(0.01);
  });

  it('updates constraint when adding max to existing min', () => {
    const project = createProject();
    project.addField('age', 'Age', 'integer');
    project.setWidgetConstraints('age', { min: 0 });
    expect(project.bindFor('age')?.constraint).toBe('$ >= 0');
    project.setWidgetConstraints('age', { max: 120 });
    const bind = project.bindFor('age');
    expect(bind?.constraint).toBe('$ >= 0 and $ <= 120');
    const comp = project.componentFor('age');
    expect(comp?.min).toBe(0);
    expect(comp?.max).toBe(120);
  });

  it('clears bind constraint when min and max are both cleared', () => {
    const project = createProject();
    project.addField('age', 'Age', 'integer');
    project.setWidgetConstraints('age', { min: 0, max: 100 });
    expect(project.bindFor('age')?.constraint).toBe('$ >= 0 and $ <= 100');
    // Clear by setting to null — this removes both component props and the bind
    project.setWidgetConstraints('age', { min: null, max: null });
    const bind = project.bindFor('age');
    expect(bind?.constraint).toBeUndefined();
    const comp = project.componentFor('age');
    expect(comp?.min).toBeUndefined();
    expect(comp?.max).toBeUndefined();
  });

  it('preserves custom constraint when setting widget props on numeric field', () => {
    const project = createProject();
    project.addField('age', 'Age', 'integer');
    project.updateItem('age', { constraint: "matches($, '.*@.*')" });
    project.setWidgetConstraints('age', { min: 0 });
    expect(project.bindFor('age')?.constraint).toBe("matches($, '.*@.*')");
  });

  it('returns correct constraint state via getWidgetConstraints', () => {
    const project = createProject();
    project.addField('age', 'Age', 'integer');
    project.setWidgetConstraints('age', { min: 0, max: 120 });
    const state = project.getWidgetConstraints('age');
    expect(state.numericValues).toMatchObject({ min: 0, max: 120 });
    expect(state.type).toBe('numeric');
    expect(state.isManaged).toBe(true);
    expect(state.hasCustomConstraint).toBe(false);
    expect(state.component).toBe('NumberInput');
  });

  it('detects custom constraint via getWidgetConstraints', () => {
    const project = createProject();
    project.addField('age', 'Age', 'integer');
    project.updateItem('age', { constraint: "matches($, '.*@.*')" });
    const state = project.getWidgetConstraints('age');
    expect(state.hasCustomConstraint).toBe(true);
    expect(state.isManaged).toBe(false);
  });

  it('returns empty values for widget without constraint props', () => {
    const project = createProject();
    project.addField('name', 'Name', 'text');
    const state = project.getWidgetConstraints('name');
    expect(state.type).toBe('none');
    expect(state.component).toBe('TextInput');
  });

  it('throws PATH_NOT_FOUND for nonexistent path', () => {
    const project = createProject();
    expect(() => project.setWidgetConstraints('nope', { min: 0 })).toThrow();
  });
});
