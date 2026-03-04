import { describe, expect, it } from 'vitest';
import type { FormspecDefinition } from 'formspec-engine';
import { applyNumericConstraint } from '../semantic-constraints';

function baseDef(): FormspecDefinition {
  return {
    $formspec: '1.0',
    url: 'https://example.gov/forms/test',
    version: '1.0.0',
    status: 'draft',
    title: 'Test',
    items: [
      { key: 'amount', type: 'field', label: 'Amount', dataType: 'decimal' },
    ],
  } as FormspecDefinition;
}

function getBinds(def: FormspecDefinition): Record<string, unknown>[] {
  return ((def as Record<string, unknown>).binds as Record<string, unknown>[]) ?? [];
}

describe('applyNumericConstraint', () => {
  it('adds a min constraint to an empty definition', () => {
    const def = baseDef();
    applyNumericConstraint(def, 'amount', 'min', 1);
    const binds = getBinds(def);
    expect(binds).toHaveLength(1);
    expect(binds[0].path).toBe('amount');
    expect(binds[0].constraint).toBe('not present($) or $ >= 1');
    expect(binds[0].constraintMessage).toBe('Value must be at least 1.');
  });

  it('adds a max constraint', () => {
    const def = baseDef();
    applyNumericConstraint(def, 'amount', 'max', 100);
    const binds = getBinds(def);
    expect(binds[0].constraint).toBe('not present($) or $ <= 100');
    expect(binds[0].constraintMessage).toBe('Value must be at most 100.');
  });

  it('adds a step constraint', () => {
    const def = baseDef();
    applyNumericConstraint(def, 'amount', 'step', 0.01);
    const binds = getBinds(def);
    expect(binds[0].constraint).toContain('abs(($ / 0.01) - round($ / 0.01))');
    expect(binds[0].constraintMessage).toBe('Value must use step 0.01.');
  });

  it('merges with existing constraint using AND', () => {
    const def = baseDef();
    applyNumericConstraint(def, 'amount', 'min', 1);
    applyNumericConstraint(def, 'amount', 'max', 100);
    const binds = getBinds(def);
    expect(binds).toHaveLength(1);
    expect(binds[0].constraint).toContain('$ >= 1');
    expect(binds[0].constraint).toContain('$ <= 100');
    expect(binds[0].constraint).toContain(' and ');
  });

  it('does not duplicate identical constraints', () => {
    const def = baseDef();
    applyNumericConstraint(def, 'amount', 'min', 1);
    applyNumericConstraint(def, 'amount', 'min', 1);
    const binds = getBinds(def);
    expect(binds).toHaveLength(1);
    expect(binds[0].constraint).toBe('not present($) or $ >= 1');
  });

  it('ignores NaN values', () => {
    const def = baseDef();
    applyNumericConstraint(def, 'amount', 'min', NaN);
    expect(getBinds(def)).toHaveLength(0);
  });

  it('adds separate bind for different paths', () => {
    const def = baseDef();
    applyNumericConstraint(def, 'amount', 'min', 0);
    applyNumericConstraint(def, 'quantity', 'max', 10);
    const binds = getBinds(def);
    expect(binds).toHaveLength(2);
    expect(binds[0].path).toBe('amount');
    expect(binds[1].path).toBe('quantity');
  });
});
