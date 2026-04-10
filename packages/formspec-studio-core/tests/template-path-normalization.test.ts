import { describe, it, expect } from 'vitest';
import { createProject } from '../src/project.js';
import { HelperError } from '../src/helper-types.js';
import { previewForm } from '../src/evaluation-helpers.js';

describe('addValidation template path normalization', () => {
  it('normalizes template path to wildcard when target traverses a repeatable group', () => {
    const project = createProject();
    project.addGroup('expenses', 'Expenses');
    project.addField('expenses.receipt_available', 'Receipt Available', 'boolean');
    project.makeRepeatable('expenses');

    project.addValidation('expenses.receipt_available', '$expenses.receipt_available = true', 'Receipt required');

    const shapes = project.definition.shapes ?? [];
    const shape = shapes[shapes.length - 1];
    expect(shape.target).toBe('expenses[*].receipt_available');
  });

  it('does not normalize path for non-repeatable group', () => {
    const project = createProject();
    project.addGroup('contact', 'Contact');
    project.addField('contact.email', 'Email', 'email');

    project.addValidation('contact.email', '$contact.email != ""', 'Required');

    const shapes = project.definition.shapes ?? [];
    const shape = shapes[shapes.length - 1];
    expect(shape.target).toBe('contact.email');
  });

  it('does not modify top-level field target', () => {
    const project = createProject();
    project.addField('name', 'Name', 'text');

    project.addValidation('name', '$name != ""', 'Required');

    const shapes = project.definition.shapes ?? [];
    const shape = shapes[shapes.length - 1];
    expect(shape.target).toBe('name');
  });

  it('does not modify explicit wildcard paths', () => {
    const project = createProject();
    project.addGroup('items', 'Items');
    project.addField('items.qty', 'Qty', 'integer');
    project.makeRepeatable('items');

    project.addValidation('items[*].qty', '$items[*].qty > 0', 'Must be positive');

    const shapes = project.definition.shapes ?? [];
    const shape = shapes[shapes.length - 1];
    expect(shape.target).toBe('items[*].qty');
  });

  it('normalizes nested repeatable groups', () => {
    const project = createProject();
    project.addGroup('sections', 'Sections');
    project.addGroup('sections.items', 'Items');
    project.addField('sections.items.amount', 'Amount', 'decimal');
    project.makeRepeatable('sections');
    project.makeRepeatable('sections.items');

    project.addValidation('sections.items.amount', '$sections.items.amount > 0', 'Positive');

    const shapes = project.definition.shapes ?? [];
    const shape = shapes[shapes.length - 1];
    expect(shape.target).toBe('sections[*].items[*].amount');
  });

  it('does not modify the global wildcard target', () => {
    const project = createProject();
    project.addField('a', 'A', 'integer');

    project.addValidation('*', '$a > 0', 'Positive');

    const shapes = project.definition.shapes ?? [];
    const shape = shapes[shapes.length - 1];
    expect(shape.target).toBe('*');
  });

  it('does not modify the form-level target #', () => {
    const project = createProject();
    project.addField('a', 'A', 'integer');

    project.addValidation('#', '$a > 0', 'Positive');

    const shapes = project.definition.shapes ?? [];
    const shape = shapes[shapes.length - 1];
    expect(shape.target).toBe('#');
  });

  it('shape on repeatable group field does not produce false positives in preview', () => {
    const project = createProject();
    project.addGroup('expenses', 'Expenses');
    project.addField('expenses.receipt', 'Has Receipt', 'boolean');
    project.makeRepeatable('expenses', { min: 1 });

    // Rule that should only fire when receipt is false
    project.addValidation('expenses.receipt', '$expenses.receipt = true', 'Receipt required');

    // Preview with no data -- repeatable group has 0 instances by default
    // so the shape should evaluate to zero results (no instances to check),
    // NOT produce a false positive on a ghost path
    const preview = previewForm(project);
    // No validation error should appear for the template path
    expect(preview.validationState['expenses.receipt']).toBeUndefined();
  });

  it('normalizes only the repeatable ancestor, not non-repeatable ones', () => {
    const project = createProject();
    project.addGroup('outer', 'Outer');
    project.makeRepeatable('outer');
    project.addGroup('outer.inner', 'Inner'); // not repeatable
    project.addField('outer.inner.val', 'Val', 'integer');

    project.addValidation('outer.inner.val', '$outer.inner.val > 0', 'Positive');

    const shapes = project.definition.shapes ?? [];
    const shape = shapes[shapes.length - 1];
    expect(shape.target).toBe('outer[*].inner.val');
  });
});

describe('addValidation constraint FEL rewriting for repeat wildcards', () => {
  it('rewrites target self-reference to $ when target gets [*]', () => {
    const project = createProject();
    project.addGroup('expenses', 'Expenses');
    project.addField('expenses.receipt', 'Receipt', 'boolean');
    project.makeRepeatable('expenses');

    project.addValidation('expenses.receipt', '$expenses.receipt = true', 'Receipt required');

    const shapes = project.definition.shapes ?? [];
    const shape = shapes[shapes.length - 1] as Record<string, unknown>;
    expect(shape.target).toBe('expenses[*].receipt');
    expect(shape.constraint).toBe('$ = true');
  });

  it('rewrites same-row sibling references to row-relative form', () => {
    const project = createProject();
    project.addGroup('categories', 'Categories');
    project.addField('categories.personnel_costs', 'Personnel', 'decimal');
    project.addField('categories.row_total', 'Total', 'decimal');
    project.makeRepeatable('categories');

    project.addValidation(
      'categories.personnel_costs',
      '$categories.row_total = 0 or ($categories.personnel_costs / $categories.row_total) <= 0.50',
      'Personnel costs must be at most 50% of row total',
    );

    const shapes = project.definition.shapes ?? [];
    const shape = shapes[shapes.length - 1] as Record<string, unknown>;
    expect(shape.target).toBe('categories[*].personnel_costs');
    expect(shape.constraint).toBe('$row_total = 0 or ($ / $row_total) <= 0.50');
  });

  it('preserves explicit collection/global references', () => {
    const project = createProject();
    project.addField('grand_total', 'Grand Total', 'decimal');
    project.addGroup('categories', 'Categories');
    project.addField('categories.personnel_costs', 'Personnel', 'decimal');
    project.addField('categories.row_total', 'Total', 'decimal');
    project.makeRepeatable('categories');

    project.addValidation(
      'categories.personnel_costs',
      'sum($categories[*].row_total) > 0 and $categories.personnel_costs <= $grand_total',
      'Costs must not exceed grand total',
    );

    const shapes = project.definition.shapes ?? [];
    const shape = shapes[shapes.length - 1] as Record<string, unknown>;
    expect(shape.target).toBe('categories[*].personnel_costs');
    // sum($categories[*].row_total) stays as-is (already explicit collection syntax)
    // $categories.personnel_costs -> $ (target self)
    // $grand_total stays as-is (outside repeat scope)
    expect(shape.constraint).toBe('sum($categories[*].row_total) > 0 and $ <= $grand_total');
  });

  it('does not rewrite when target was not normalized', () => {
    const project = createProject();
    project.addGroup('contact', 'Contact'); // not repeatable
    project.addField('contact.email', 'Email', 'email');

    project.addValidation('contact.email', '$contact.email != ""', 'Required');

    const shapes = project.definition.shapes ?? [];
    const shape = shapes[shapes.length - 1] as Record<string, unknown>;
    // No normalization, so constraint stays verbatim
    expect(shape.constraint).toBe('$contact.email != ""');
  });

  it('rewrites message interpolation templates', () => {
    const project = createProject();
    project.addGroup('items', 'Items');
    project.addField('items.qty', 'Qty', 'integer');
    project.addField('items.name', 'Name', 'string');
    project.makeRepeatable('items');

    project.addValidation(
      'items.qty',
      '$items.qty > 0',
      '{{$items.name}} must have a positive quantity',
    );

    const shapes = project.definition.shapes ?? [];
    const shape = shapes[shapes.length - 1] as Record<string, unknown>;
    expect(shape.constraint).toBe('$ > 0');
    expect(shape.message).toBe('{{$name}} must have a positive quantity');
  });

  it('rewrites activeWhen option', () => {
    const project = createProject();
    project.addGroup('items', 'Items');
    project.addField('items.qty', 'Qty', 'integer');
    project.addField('items.active', 'Active', 'boolean');
    project.makeRepeatable('items');

    project.addValidation(
      'items.qty',
      '$items.qty > 0',
      'Qty required when active',
      { activeWhen: '$items.active = true' },
    );

    const shapes = project.definition.shapes ?? [];
    const shape = shapes[shapes.length - 1] as Record<string, unknown>;
    expect(shape.constraint).toBe('$ > 0');
    expect(shape.activeWhen).toBe('$active = true');
  });

  it('handles nested repeatable groups', () => {
    const project = createProject();
    project.addGroup('sections', 'Sections');
    project.addGroup('sections.items', 'Items');
    project.addField('sections.items.amount', 'Amount', 'decimal');
    project.addField('sections.items.tax', 'Tax', 'decimal');
    project.makeRepeatable('sections');
    project.makeRepeatable('sections.items');

    project.addValidation(
      'sections.items.amount',
      '$sections.items.amount > $sections.items.tax',
      'Amount must exceed tax',
    );

    const shapes = project.definition.shapes ?? [];
    const shape = shapes[shapes.length - 1] as Record<string, unknown>;
    expect(shape.target).toBe('sections[*].items[*].amount');
    // Both are same-row in innermost repeat scope
    expect(shape.constraint).toBe('$ > $tax');
  });
});
