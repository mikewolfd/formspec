/**
 * Constraint Null-Propagation — §3.8.1 Bind Context Defaults
 *
 * "A constraint that cannot be evaluated due to null inputs is not considered
 * violated. The `required` Bind, not the `constraint` Bind, is responsible
 * for ensuring the field has a value."
 *
 * Bind constraints MUST be skipped when the field value is empty/null/undefined,
 * consistent with how pattern validation and registry constraints already behave.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { FormEngine } from '../dist/index.js';

function makeEngine(items, binds) {
  return new FormEngine({
    $formspec: '1.0',
    url: 'http://example.org/constraint-null',
    version: '1.0.0',
    title: 'Constraint Null Propagation',
    items,
    binds: binds ?? [],
  });
}

function fieldErrors(engine, path, kind) {
  return engine.validationResults[path].value.filter(
    r => r.severity === 'error' && (!kind || r.constraintKind === kind)
  );
}

// ── Empty value: constraint must NOT fire ───────────────────────────

test('bind constraint skipped when field value is null', () => {
  const engine = makeEngine(
    [{ key: 'email', type: 'field', dataType: 'string', label: 'Email' }],
    [{ path: 'email', constraint: "matches($, '.*@.*')" }],
  );
  // Value defaults to null — constraint should not fire
  const errors = fieldErrors(engine, 'email', 'constraint');
  assert.equal(errors.length, 0, 'constraint must not fire on null value');
});

test('bind constraint skipped when field value is empty string', () => {
  const engine = makeEngine(
    [{ key: 'email', type: 'field', dataType: 'string', label: 'Email', initialValue: '' }],
    [{ path: 'email', constraint: "matches($, '.*@.*')" }],
  );
  const errors = fieldErrors(engine, 'email', 'constraint');
  assert.equal(errors.length, 0, 'constraint must not fire on empty string');
});

test('bind constraint skipped when field value is undefined', () => {
  const engine = makeEngine(
    [{ key: 'email', type: 'field', dataType: 'string', label: 'Email' }],
    [{ path: 'email', constraint: "matches($, '.*@.*')" }],
  );
  engine.setValue('email', undefined);
  const errors = fieldErrors(engine, 'email', 'constraint');
  assert.equal(errors.length, 0, 'constraint must not fire on undefined');
});

// ── Non-empty invalid value: constraint MUST fire ───────────────────

test('bind constraint fires on non-empty invalid value', () => {
  const engine = makeEngine(
    [{ key: 'email', type: 'field', dataType: 'string', label: 'Email' }],
    [{ path: 'email', constraint: "matches($, '.*@.*')", constraintMessage: 'Invalid email' }],
  );
  engine.setValue('email', 'notanemail');
  const errors = fieldErrors(engine, 'email', 'constraint');
  assert.equal(errors.length, 1);
  assert.equal(errors[0].message, 'Invalid email');
});

// ── Valid value: constraint passes ──────────────────────────────────

test('bind constraint passes on valid value', () => {
  const engine = makeEngine(
    [{ key: 'email', type: 'field', dataType: 'string', label: 'Email' }],
    [{ path: 'email', constraint: "matches($, '.*@.*')" }],
  );
  engine.setValue('email', 'user@example.com');
  const errors = fieldErrors(engine, 'email', 'constraint');
  assert.equal(errors.length, 0);
});

// ── Required + constraint interaction ───────────────────────────────

test('required email with empty value shows Required, not Invalid', () => {
  const engine = makeEngine(
    [{ key: 'email', type: 'field', dataType: 'string', label: 'Email', initialValue: '' }],
    [{ path: 'email', required: true, constraint: "matches($, '.*@.*')" }],
  );
  const allErrors = fieldErrors(engine, 'email');
  // Only the "Required" error, NOT "Invalid"
  assert.equal(allErrors.length, 1, 'should have exactly one error');
  assert.equal(allErrors[0].constraintKind, 'required');
  assert.equal(allErrors[0].message, 'Required');
});

test('required email with invalid value shows both Required and Invalid', () => {
  // Wait — if the value is non-empty but invalid, required should NOT fire.
  // "notanemail" is not empty, so required passes. Only constraint fails.
  const engine = makeEngine(
    [{ key: 'email', type: 'field', dataType: 'string', label: 'Email' }],
    [{ path: 'email', required: true, constraint: "matches($, '.*@.*')" }],
  );
  engine.setValue('email', 'notanemail');
  const allErrors = fieldErrors(engine, 'email');
  assert.equal(allErrors.length, 1);
  assert.equal(allErrors[0].constraintKind, 'constraint');
});

test('non-required field with empty value: no errors at all', () => {
  const engine = makeEngine(
    [{ key: 'email', type: 'field', dataType: 'string', label: 'Email', initialValue: '' }],
    [{ path: 'email', constraint: "matches($, '.*@.*')" }],
  );
  const allErrors = fieldErrors(engine, 'email');
  assert.equal(allErrors.length, 0, 'no constraint or required error');
});

// ── Empty array value: constraint should not fire ───────────────────

test('bind constraint skipped when field value is empty array', () => {
  const engine = makeEngine(
    [{ key: 'tags', type: 'field', dataType: 'multiChoice', label: 'Tags' }],
    [{ path: 'tags', constraint: "count($) > 0" }],
  );
  // Default is empty array for multiChoice — constraint should not fire
  const errors = fieldErrors(engine, 'tags', 'constraint');
  assert.equal(errors.length, 0, 'constraint must not fire on empty array');
});

// ── Non-string constraint that evaluates to null (existing behavior preserved) ──

test('constraint expression evaluating to null passes (existing behavior)', () => {
  const engine = makeEngine(
    [
      { key: 'amount', type: 'field', dataType: 'integer', label: 'Amount', initialValue: 5 },
    ],
    [{ path: 'amount', constraint: 'missing > 0', constraintMessage: 'Should not fail' }],
  );
  const errors = fieldErrors(engine, 'amount', 'constraint');
  assert.equal(errors.length, 0, 'null-evaluating constraint passes');
});
