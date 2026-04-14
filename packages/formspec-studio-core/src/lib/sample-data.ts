/** @filedesc Sample response generation and definition pruning for preview helpers. */
import { createFormEngine, type FormspecDefinition, type IFormEngine } from '@formspec-org/engine/render';
import type { FormItem } from '../types.js';

/** Default sample values by data type. Uses today's date for date/dateTime. */
export function sampleValues(): Record<string, unknown> {
  const today = new Date().toISOString().slice(0, 10);
  return {
    string: 'Sample text',
    text: 'Sample paragraph text',
    integer: 42,
    decimal: 3.14,
    boolean: true,
    date: today,
    time: '09:00:00',
    dateTime: `${today}T09:00:00Z`,
    uri: 'https://example.com',
    attachment: 'sample-file.pdf',
    money: { amount: 100, currency: 'USD' },
    multiChoice: ['option1'],
  };
}

/** Generate a context-aware sample value for a field. */
export function sampleValueForField(item: FormItem, fieldIndex: number): unknown {
  const dt = item.dataType ?? 'string';
  const key = item.key.toLowerCase();
  const options = item.options;

  if (dt === 'choice' || dt === 'multiChoice') {
    if (options?.length) {
      return dt === 'multiChoice' ? [options[0].value] : options[0].value;
    }
    return dt === 'multiChoice' ? ['option1'] : 'option1';
  }

  if (dt === 'string' || dt === 'text') {
    if (key.includes('email')) return 'sample@example.com';
    if (key.includes('phone') || key.includes('tel')) return '+1-555-0100';
    if (key.includes('name') && key.includes('first')) return 'Jane';
    if (key.includes('name') && key.includes('last')) return 'Doe';
    if (key.includes('name')) return 'Jane Doe';
  }

  if (dt === 'integer' || dt === 'decimal') {
    const min = typeof item.min === 'number' ? item.min : undefined;
    const max = typeof item.max === 'number' ? item.max : undefined;
    const baseValue = dt === 'integer' ? 10 + fieldIndex : parseFloat((1.5 + fieldIndex * 0.7).toFixed(2));
    if (min !== undefined && max !== undefined) {
      return dt === 'integer' ? Math.round((min + max) / 2) : parseFloat(((min + max) / 2).toFixed(2));
    }
    if (min !== undefined && baseValue < min) return min;
    if (max !== undefined && baseValue > max) return max;
    return baseValue;
  }

  return sampleValues()[dt] ?? 'Sample text';
}

/**
 * Load sample data into a FormEngine and strip fields whose
 * show_when/relevant condition evaluates to false.
 */
export function filterByRelevance(
  definition: unknown,
  data: Record<string, unknown>,
): Record<string, unknown> {
  let engine: IFormEngine;
  try {
    engine = createFormEngine(definition as FormspecDefinition);
  } catch {
    return data;
  }

  for (const [path, value] of Object.entries(data)) {
    if (value !== undefined) {
      engine.setValue(path, value);
    }
  }

  const filtered: Record<string, unknown> = {};
  for (const [path, value] of Object.entries(data)) {
    if (engine.isPathRelevant(path)) {
      filtered[path] = value;
    }
  }
  return filtered;
}

/** Recursively prune null values, empty arrays, and empty objects from a value. */
export function pruneObject(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) {
    if (value.length === 0) return undefined;
    const pruned = value.map((v) => pruneObject(v)).filter((v) => v !== undefined);
    return pruned.length === 0 ? undefined : pruned;
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    let hasKeys = false;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const pruned = pruneObject(v);
      if (pruned !== undefined) {
        result[k] = pruned;
        hasKeys = true;
      }
    }
    return hasKeys ? result : undefined;
  }
  return value;
}
