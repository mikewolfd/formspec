import test from 'node:test';
import assert from 'node:assert/strict';
import { FormEngine } from '../dist/index.js';

/**
 * Registry extension constraints: when a field declares an extension
 * (e.g. `"x-formspec-email": true`) and matching registry entries are
 * provided, the engine should enforce the registry's constraints
 * (pattern, maxLength) at the validation level.
 */

const emailRegistryEntry = {
  name: 'x-formspec-email',
  category: 'dataType',
  version: '1.0.0',
  status: 'stable',
  baseType: 'string',
  constraints: {
    pattern: '^[a-zA-Z0-9.!#$%&\'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$',
    maxLength: 254,
  },
  metadata: {
    inputMode: 'email',
    autocomplete: 'email',
    displayName: 'Email address',
  },
};

function createEmailEngine(registryEntries) {
  return new FormEngine({
    $formspec: '1.0',
    url: 'http://example.org/registry-test',
    version: '1.0.0',
    title: 'Registry Constraint Test',
    items: [
      {
        key: 'email',
        type: 'field',
        dataType: 'string',
        label: 'Email',
        extensions: { 'x-formspec-email': true },
      },
    ],
  }, undefined, registryEntries);
}

test('registry pattern constraint rejects invalid email', () => {
  const engine = createEmailEngine([emailRegistryEntry]);
  engine.setValue('email', 'not-an-email');

  const report = engine.getValidationReport({ mode: 'continuous' });
  const err = report.results.find(r => r.code === 'PATTERN_MISMATCH');
  assert.ok(err, 'Expected PATTERN_MISMATCH error for invalid email');
  assert.equal(err.path, 'email');
});

test('registry pattern constraint accepts valid email', () => {
  const engine = createEmailEngine([emailRegistryEntry]);
  engine.setValue('email', 'user@example.com');

  const report = engine.getValidationReport({ mode: 'continuous' });
  const err = report.results.find(r => r.code === 'PATTERN_MISMATCH');
  assert.equal(err, undefined, 'Should not have pattern error for valid email');
});

test('registry pattern constraint is null-propagating (empty value = no error)', () => {
  const engine = createEmailEngine([emailRegistryEntry]);
  // leave email empty (null)

  const report = engine.getValidationReport({ mode: 'continuous' });
  const err = report.results.find(r => r.code === 'PATTERN_MISMATCH');
  assert.equal(err, undefined, 'Empty optional field should not trigger pattern error');
});

test('registry maxLength constraint rejects too-long value', () => {
  const engine = createEmailEngine([emailRegistryEntry]);
  engine.setValue('email', 'a'.repeat(255));

  const report = engine.getValidationReport({ mode: 'continuous' });
  const err = report.results.find(r => r.code === 'MAX_LENGTH_EXCEEDED');
  assert.ok(err, 'Expected MAX_LENGTH_EXCEEDED error');
  assert.equal(err.path, 'email');
});

test('registry maxLength constraint accepts value at limit', () => {
  const engine = createEmailEngine([emailRegistryEntry]);
  // 254 chars is exactly at the limit
  const localPart = 'a'.repeat(63);
  const domain = 'b'.repeat(63) + '.' + 'c'.repeat(63) + '.com';
  const email = localPart + '@' + domain;
  // Just use a string that's exactly 254 chars for maxLength test
  engine.setValue('email', 'x'.repeat(254));

  const report = engine.getValidationReport({ mode: 'continuous' });
  const err = report.results.find(r => r.code === 'MAX_LENGTH_EXCEEDED');
  assert.equal(err, undefined, 'Value at maxLength limit should be accepted');
});

test('disabled extension (false) does not enforce constraints', () => {
  const engine = new FormEngine({
    $formspec: '1.0',
    url: 'http://example.org/registry-test',
    version: '1.0.0',
    title: 'Disabled Extension Test',
    items: [
      {
        key: 'email',
        type: 'field',
        dataType: 'string',
        label: 'Email',
        extensions: { 'x-formspec-email': false },
      },
    ],
  }, undefined, [emailRegistryEntry]);

  engine.setValue('email', 'not-an-email');
  const report = engine.getValidationReport({ mode: 'continuous' });
  const err = report.results.find(r => r.code === 'PATTERN_MISMATCH');
  assert.equal(err, undefined, 'Disabled extension should not enforce constraints');
});

test('no registry entries = no extension enforcement', () => {
  const engine = createEmailEngine(undefined);
  engine.setValue('email', 'not-an-email');

  const report = engine.getValidationReport({ mode: 'continuous' });
  const err = report.results.find(r => r.code === 'PATTERN_MISMATCH');
  assert.equal(err, undefined, 'Without registry, extension constraints should not be enforced');
});

// ── Numeric range constraints (minimum / maximum) ────────────────────

const percentageRegistryEntry = {
  name: 'x-formspec-percentage',
  category: 'dataType',
  version: '1.0.0',
  status: 'stable',
  baseType: 'decimal',
  constraints: {
    minimum: 0,
    maximum: 100,
  },
  metadata: {
    suffix: '%',
    precision: 2,
    displayName: 'Percentage',
  },
};

function createPercentageEngine(registryEntries) {
  return new FormEngine({
    $formspec: '1.0',
    url: 'http://example.org/registry-range-test',
    version: '1.0.0',
    title: 'Registry Range Test',
    items: [
      {
        key: 'rate',
        type: 'field',
        dataType: 'decimal',
        label: 'Rate',
        extensions: { 'x-formspec-percentage': true },
      },
    ],
  }, undefined, registryEntries);
}

test('registry minimum constraint rejects value below minimum', () => {
  const engine = createPercentageEngine([percentageRegistryEntry]);
  engine.setValue('rate', -5);

  const report = engine.getValidationReport({ mode: 'continuous' });
  const err = report.results.find(r => r.code === 'RANGE_UNDERFLOW');
  assert.ok(err, 'Expected RANGE_UNDERFLOW error for value below minimum');
  assert.equal(err.path, 'rate');
});

test('registry maximum constraint rejects value above maximum', () => {
  const engine = createPercentageEngine([percentageRegistryEntry]);
  engine.setValue('rate', 150);

  const report = engine.getValidationReport({ mode: 'continuous' });
  const err = report.results.find(r => r.code === 'RANGE_OVERFLOW');
  assert.ok(err, 'Expected RANGE_OVERFLOW error for value above maximum');
  assert.equal(err.path, 'rate');
});

test('registry range constraints accept value within range', () => {
  const engine = createPercentageEngine([percentageRegistryEntry]);
  engine.setValue('rate', 50);

  const report = engine.getValidationReport({ mode: 'continuous' });
  const rangeErr = report.results.find(r => r.code === 'RANGE_UNDERFLOW' || r.code === 'RANGE_OVERFLOW');
  assert.equal(rangeErr, undefined, 'Value within range should not trigger range errors');
});

test('registry range constraints accept boundary values', () => {
  const engine = createPercentageEngine([percentageRegistryEntry]);
  engine.setValue('rate', 0);

  let report = engine.getValidationReport({ mode: 'continuous' });
  let err = report.results.find(r => r.code === 'RANGE_UNDERFLOW' || r.code === 'RANGE_OVERFLOW');
  assert.equal(err, undefined, 'Value at minimum boundary should be accepted');

  engine.setValue('rate', 100);
  report = engine.getValidationReport({ mode: 'continuous' });
  err = report.results.find(r => r.code === 'RANGE_UNDERFLOW' || r.code === 'RANGE_OVERFLOW');
  assert.equal(err, undefined, 'Value at maximum boundary should be accepted');
});

test('registry range constraints are null-propagating', () => {
  const engine = createPercentageEngine([percentageRegistryEntry]);
  // leave null

  const report = engine.getValidationReport({ mode: 'continuous' });
  const err = report.results.find(r => r.code === 'RANGE_UNDERFLOW' || r.code === 'RANGE_OVERFLOW');
  assert.equal(err, undefined, 'Empty optional field should not trigger range errors');
});
