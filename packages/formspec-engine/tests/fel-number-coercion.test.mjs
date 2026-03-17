/**
 * U7: number("") returns 0 instead of null
 *
 * JavaScript Number("") === 0, but FEL number() should treat empty strings
 * as unparseable and return null, consistent with null propagation semantics.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { FormEngine } from '../dist/index.js';

function engineWithCalc(calculate, dataType = 'decimal') {
  return new FormEngine({
    $formspec: '1.0',
    url: 'http://example.org/number-test',
    version: '1.0.0',
    title: 'Number Coercion',
    items: [{ key: 'result', type: 'field', dataType, label: 'Result' }],
    binds: [{ path: 'result', calculate }],
  });
}

function engineWithInput(calculate) {
  return new FormEngine({
    $formspec: '1.0',
    url: 'http://example.org/number-input',
    version: '1.0.0',
    title: 'Number Input',
    items: [
      { key: 'input', type: 'field', dataType: 'string', label: 'Input' },
      { key: 'result', type: 'field', dataType: 'decimal', label: 'Result' },
    ],
    binds: [{ path: 'result', calculate }],
  });
}

// ---------------------------------------------------------------------------
// Core bug: empty string
// ---------------------------------------------------------------------------

test('number("") returns null, not 0', () => {
  const e = engineWithCalc("number('')");
  assert.equal(e.signals.result.value, null);
});

// ---------------------------------------------------------------------------
// Whitespace-only strings
// ---------------------------------------------------------------------------

test('number("  ") returns null for whitespace-only string', () => {
  const e = engineWithCalc("number('  ')");
  assert.equal(e.signals.result.value, null);
});

// ---------------------------------------------------------------------------
// Null / undefined propagation
// ---------------------------------------------------------------------------

test('number(null) returns null', () => {
  const e = engineWithCalc('number(null)');
  assert.equal(e.signals.result.value, null);
});

test('number of unset field returns null', () => {
  const e = engineWithInput('number($input)');
  // $input is unset → null, number(null) → null
  assert.equal(e.signals.result.value, null);
});

// ---------------------------------------------------------------------------
// Valid numeric strings
// ---------------------------------------------------------------------------

test('number("42") returns 42', () => {
  const e = engineWithCalc("number('42')");
  assert.equal(e.signals.result.value, 42);
});

test('number("3.14") returns 3.14', () => {
  const e = engineWithCalc("number('3.14')");
  assert.equal(e.signals.result.value, 3.14);
});

test('number("-7") returns -7', () => {
  const e = engineWithCalc("number('-7')");
  assert.equal(e.signals.result.value, -7);
});

test('number(" 42 ") trims whitespace and returns 42', () => {
  const e = engineWithCalc("number(' 42 ')");
  assert.equal(e.signals.result.value, 42);
});

// ---------------------------------------------------------------------------
// Non-parseable strings
// ---------------------------------------------------------------------------

test('number("abc") returns null', () => {
  const e = engineWithCalc("number('abc')");
  assert.equal(e.signals.result.value, null);
});

test('number("12abc") returns null', () => {
  const e = engineWithCalc("number('12abc')");
  assert.equal(e.signals.result.value, null);
});

// ---------------------------------------------------------------------------
// Passthrough for numbers
// ---------------------------------------------------------------------------

test('number(42) returns 42', () => {
  const e = engineWithCalc('number(42)');
  assert.equal(e.signals.result.value, 42);
});

test('number(0) returns 0', () => {
  const e = engineWithCalc('number(0)');
  assert.equal(e.signals.result.value, 0);
});

// ---------------------------------------------------------------------------
// Boolean coercion
// ---------------------------------------------------------------------------

test('number(true) returns 1', () => {
  const e = engineWithCalc('number(true)');
  assert.equal(e.signals.result.value, 1);
});

test('number(false) returns 0', () => {
  const e = engineWithCalc('number(false)');
  assert.equal(e.signals.result.value, 0);
});

// ---------------------------------------------------------------------------
// Dynamic: field value changes empty -> numeric
// ---------------------------------------------------------------------------

test('number() reactively updates when input changes from empty to numeric', () => {
  const e = engineWithInput('number($input)');

  // Initially unset → null
  assert.equal(e.signals.result.value, null);

  // Set to empty string → null (the bug)
  e.setValue('input', '');
  assert.equal(e.signals.result.value, null, 'empty string should produce null');

  // Set to numeric string → number
  e.setValue('input', '99');
  assert.equal(e.signals.result.value, 99);

  // Back to empty → null again
  e.setValue('input', '');
  assert.equal(e.signals.result.value, null);
});
