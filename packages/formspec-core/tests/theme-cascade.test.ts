import { describe, it, expect } from 'vitest';
import { resolveThemeCascade } from '../src/index.js';
import type { ThemeState } from '../src/index.js';

describe('resolveThemeCascade', () => {
  it('returns defaults when no selectors or item overrides exist', () => {
    const theme: ThemeState = {
      defaults: { labelPosition: 'top', widget: 'text-input' },
    };
    const result = resolveThemeCascade(theme, 'name', 'field');
    expect(result.labelPosition).toEqual({ value: 'top', source: 'default' });
    expect(result.widget).toEqual({ value: 'text-input', source: 'default' });
  });

  it('selector overrides default, provenance says selector', () => {
    const theme: ThemeState = {
      defaults: { widget: 'text-input' },
      selectors: [
        { match: { type: 'field', dataType: 'money' }, apply: { widget: 'moneyInput' } },
      ],
    };
    const result = resolveThemeCascade(theme, 'amount', 'field', 'money');
    expect(result.widget).toEqual({
      value: 'moneyInput',
      source: 'selector',
      sourceDetail: 'selector #1: field + money',
    });
  });

  it('item override wins over selector, provenance says item-override', () => {
    const theme: ThemeState = {
      defaults: { widget: 'text-input' },
      selectors: [
        { match: { type: 'field' }, apply: { widget: 'custom-widget' } },
      ],
      items: {
        name: { widget: 'fancy-input' },
      },
    };
    const result = resolveThemeCascade(theme, 'name', 'field');
    expect(result.widget).toEqual({
      value: 'fancy-input',
      source: 'item-override',
    });
  });

  it('multiple selectors merge in order', () => {
    const theme: ThemeState = {
      selectors: [
        { match: { type: 'field' }, apply: { widget: 'base-widget', cssClass: 'field-base' } },
        { match: { dataType: 'money' }, apply: { widget: 'moneyInput' } },
      ],
    };
    const result = resolveThemeCascade(theme, 'amount', 'field', 'money');
    expect(result.widget?.value).toBe('moneyInput');
    expect(result.cssClass?.value).toBe('field-base');
  });

  it('unmatched selectors are skipped', () => {
    const theme: ThemeState = {
      defaults: { widget: 'text-input' },
      selectors: [
        { match: { type: 'group' }, apply: { widget: 'group-widget' } },
      ],
    };
    const result = resolveThemeCascade(theme, 'name', 'field');
    expect(result.widget).toEqual({ value: 'text-input', source: 'default' });
  });

  it('empty theme returns empty record', () => {
    const result = resolveThemeCascade({}, 'name', 'field');
    expect(result).toEqual({});
  });

  it('formPresentation provides baseline at form-default level', () => {
    const theme: ThemeState = {};
    const result = resolveThemeCascade(theme, 'name', 'field', undefined, {
      formPresentation: { labelPosition: 'start' },
    });
    expect(result.labelPosition).toEqual({ value: 'start', source: 'form-default' });
  });

  it('item presentation hints override formPresentation at item-hint level', () => {
    const theme: ThemeState = {};
    const result = resolveThemeCascade(theme, 'name', 'field', undefined, {
      formPresentation: { labelPosition: 'start' },
      itemPresentation: { widgetHint: 'textarea' },
    });
    expect(result.labelPosition).toEqual({ value: 'start', source: 'form-default' });
    expect(result.widgetHint).toEqual({ value: 'textarea', source: 'item-hint' });
  });

  it('theme defaults override formPresentation', () => {
    const theme: ThemeState = {
      defaults: { labelPosition: 'top' },
    };
    const result = resolveThemeCascade(theme, 'name', 'field', undefined, {
      formPresentation: { labelPosition: 'start' },
    });
    expect(result.labelPosition).toEqual({ value: 'top', source: 'default' });
  });

  it('full 5-level cascade: form-default < item-hint < default < selector < item-override', () => {
    const theme: ThemeState = {
      defaults: { labelPosition: 'top' },
      selectors: [
        { match: { type: 'field' }, apply: { labelPosition: 'hidden' } },
      ],
      items: {
        name: { widget: 'fancy' },
      },
    };
    const result = resolveThemeCascade(theme, 'name', 'field', undefined, {
      formPresentation: { labelPosition: 'start' },
      itemPresentation: { widgetHint: 'textarea' },
    });
    expect(result.labelPosition).toEqual({ value: 'hidden', source: 'selector', sourceDetail: 'selector #1: field' });
    expect(result.widget).toEqual({ value: 'fancy', source: 'item-override' });
    expect(result.widgetHint).toEqual({ value: 'textarea', source: 'item-hint' });
  });

  it('item-hint properties not overridden by theme persist', () => {
    const theme: ThemeState = { defaults: { labelPosition: 'top' } };
    const result = resolveThemeCascade(theme, 'name', 'field', undefined, {
      itemPresentation: { widgetHint: 'slider' },
    });
    expect(result.widgetHint).toEqual({ value: 'slider', source: 'item-hint' });
    expect(result.labelPosition).toEqual({ value: 'top', source: 'default' });
  });
});
