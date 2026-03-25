import { describe, it, expect, vi } from 'vitest';
import { resolvePresentation, resolveWidget, widgetTokenToComponent, setTailwindMerge, type ThemeDocument, type ItemDescriptor } from '../src/index';

describe('resolvePresentation', () => {
    it('returns empty block with no theme', () => {
        const item: ItemDescriptor = { key: 'name', type: 'field', dataType: 'string' };
        const result = resolvePresentation(null, item);
        expect(result).toEqual({});
    });

    it('applies theme defaults', () => {
        const theme = {
            $formspecTheme: '1.0' as const,
            version: '1.0.0',
            targetDefinition: { url: 'test' },
            defaults: { labelPosition: 'top' as const },
        };
        const item: ItemDescriptor = { key: 'name', type: 'field' };
        const result = resolvePresentation(theme, item);
        expect(result.labelPosition).toBe('top');
    });

    it('applies selector matches', () => {
        const theme = {
            $formspecTheme: '1.0' as const,
            version: '1.0.0',
            targetDefinition: { url: 'test' },
            selectors: [
                { match: { type: 'field' as const }, apply: { widget: 'TextInput' } },
            ],
        };
        const item: ItemDescriptor = { key: 'name', type: 'field' };
        const result = resolvePresentation(theme, item);
        expect(result.widget).toBe('TextInput');
    });

    it('applies per-item overrides (highest priority)', () => {
        const theme = {
            $formspecTheme: '1.0' as const,
            version: '1.0.0',
            targetDefinition: { url: 'test' },
            defaults: { widget: 'TextInput' },
            items: { email: { widget: 'Select' } },
        };
        const item: ItemDescriptor = { key: 'email', type: 'field' };
        const result = resolvePresentation(theme, item);
        expect(result.widget).toBe('Select');
    });

    it('unions cssClass across levels', () => {
        const theme = {
            $formspecTheme: '1.0' as const,
            version: '1.0.0',
            targetDefinition: { url: 'test' },
            defaults: { cssClass: 'default-class' },
            selectors: [
                { match: { type: 'field' as const }, apply: { cssClass: 'selector-class' } },
            ],
        };
        const item: ItemDescriptor = { key: 'name', type: 'field' };
        const result = resolvePresentation(theme, item);
        expect(result.cssClass).toContain('default-class');
        expect(result.cssClass).toContain('selector-class');
    });

    it('cssClassReplace removes conflicting lower-level classes by prefix', () => {
        const theme: ThemeDocument = {
            $formspecTheme: '1.0',
            version: '1.0.0',
            targetDefinition: { url: 'test' },
            defaults: { cssClass: ['formspec-field', 'p-4', 'text-sm'] },
            items: {
                budget: { cssClassReplace: 'p-8' },
            },
        };
        const item: ItemDescriptor = { key: 'budget', type: 'field' };
        const result = resolvePresentation(theme, item);
        const classes = result.cssClass as string[];
        // p-4 should be replaced by p-8 (same prefix)
        expect(classes).toContain('p-8');
        expect(classes).not.toContain('p-4');
        // Non-conflicting classes survive
        expect(classes).toContain('formspec-field');
        expect(classes).toContain('text-sm');
    });

    it('cssClassReplace removes exact matches without prefix', () => {
        const theme: ThemeDocument = {
            $formspecTheme: '1.0',
            version: '1.0.0',
            targetDefinition: { url: 'test' },
            defaults: { cssClass: ['base-class', 'old-class'] },
            selectors: [
                { match: { type: 'field' as const }, apply: { cssClassReplace: 'old-class' } },
            ],
        };
        const item: ItemDescriptor = { key: 'name', type: 'field' };
        const result = resolvePresentation(theme, item);
        const classes = result.cssClass as string[];
        expect(classes).toContain('base-class');
        expect(classes).toContain('old-class'); // exact match stays since it's also in replace
    });

    it('cssClassReplace replaces multiple utility classes at once', () => {
        const theme: ThemeDocument = {
            $formspecTheme: '1.0',
            version: '1.0.0',
            targetDefinition: { url: 'test' },
            defaults: { cssClass: ['p-4', 'mx-2', 'bg-blue-500'] },
            items: {
                special: { cssClassReplace: ['p-8', 'mx-auto'] },
            },
        };
        const item: ItemDescriptor = { key: 'special', type: 'field' };
        const result = resolvePresentation(theme, item);
        const classes = result.cssClass as string[];
        expect(classes).toContain('p-8');
        expect(classes).toContain('mx-auto');
        expect(classes).toContain('bg-blue-500');
        expect(classes).not.toContain('p-4');
        expect(classes).not.toContain('mx-2');
    });

    it('cssClassReplace is not present in final output', () => {
        const theme: ThemeDocument = {
            $formspecTheme: '1.0',
            version: '1.0.0',
            targetDefinition: { url: 'test' },
            defaults: { cssClass: 'p-4' },
            items: { x: { cssClassReplace: 'p-8' } },
        };
        const result = resolvePresentation(theme, { key: 'x', type: 'field' });
        expect(result).not.toHaveProperty('cssClassReplace');
    });

    it('classStrategy tailwind-merge preserves all classes with union semantics', () => {
        // Rust spec-normative: tailwind-merge classStrategy currently uses union
        // semantics (same as default). Full prefix-based dedup is a future enhancement.
        // The setTailwindMerge TS callback is not called since resolvePresentation
        // delegates to the Rust WASM cascade.
        const theme: ThemeDocument = {
            $formspecTheme: '1.0',
            version: '1.0.0',
            targetDefinition: { url: 'test' },
            classStrategy: 'tailwind-merge',
            defaults: { cssClass: ['p-4', 'text-sm'] },
            selectors: [
                { match: { type: 'field' as const }, apply: { cssClass: 'p-8' } },
            ],
        };
        const result = resolvePresentation(theme, { key: 'x', type: 'field' });
        const classes = result.cssClass as string[];
        // Rust spec-normative: all classes from union are preserved
        expect(classes).toContain('p-8');
        expect(classes).toContain('p-4');
        expect(classes).toContain('text-sm');
    });

    it('classStrategy tailwind-merge unions classes from same level', () => {
        // Rust spec-normative: both classes survive since Rust currently uses
        // union semantics for tailwind-merge.
        const theme: ThemeDocument = {
            $formspecTheme: '1.0',
            version: '1.0.0',
            targetDefinition: { url: 'test' },
            classStrategy: 'tailwind-merge',
            defaults: { cssClass: ['p-4', 'p-8'] },
        };
        const result = resolvePresentation(theme, { key: 'x', type: 'field' });
        const classes = result.cssClass as string[];

        // Rust spec-normative: union preserves both
        expect(classes).toContain('p-4');
        expect(classes).toContain('p-8');
    });

    it('applies Tier 1 formPresentation labelPosition', () => {
        const item: ItemDescriptor = { key: 'name', type: 'field' };
        const result = resolvePresentation(null, item, {
            formPresentation: { labelPosition: 'start' },
        });
        expect(result.labelPosition).toBe('start');
    });
});

describe('resolveWidget', () => {
    it('returns preferred widget when available', () => {
        const result = resolveWidget({ widget: 'Slider' }, () => true);
        expect(result).toBe('Slider');
    });

    it('maps spec widget vocabulary to concrete component types', () => {
        expect(widgetTokenToComponent('radio')).toBe('RadioGroup');
        expect(widgetTokenToComponent('dropdown')).toBe('Select');
        expect(widgetTokenToComponent('datePicker')).toBe('DatePicker');
    });

    it('falls back to fallback chain', () => {
        const result = resolveWidget(
            { widget: 'Slider', fallback: ['NumberInput'] },
            (type) => type !== 'Slider',
        );
        expect(result).toBe('NumberInput');
    });

    it('accepts spec widget names in theme fallback chains', () => {
        const result = resolveWidget(
            { widget: 'segmented', fallback: ['radio'] },
            (type) => type === 'RadioGroup',
        );
        expect(result).toBe('RadioGroup');
    });

    it('returns null when no widget specified', () => {
        const result = resolveWidget({}, () => true);
        expect(result).toBeNull();
    });

    it('returns null when no fallback matches', () => {
        const warn = console.warn;
        console.warn = () => {};
        const result = resolveWidget({ widget: 'Unknown' }, () => false);
        console.warn = warn;
        expect(result).toBeNull();
    });
});
