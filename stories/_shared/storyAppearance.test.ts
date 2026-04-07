// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
    getStoryAppearanceClass,
    getStoryAppearanceWrapperClassName,
    resolveStoryAppearance,
} from './storyAppearance';

describe('resolveStoryAppearance', () => {
    it('forces light mode when Storybook backgrounds selects light', () => {
        expect(resolveStoryAppearance({ backgrounds: { value: 'light' } })).toBe('light');
    });

    it('forces dark mode when Storybook backgrounds selects dark', () => {
        expect(resolveStoryAppearance({ backgrounds: { value: 'dark' } })).toBe('dark');
    });

    it('defaults missing backgrounds to light so the preview matches Storybook canvas defaults', () => {
        expect(resolveStoryAppearance(undefined)).toBe('light');
    });

    it('allows a custom default appearance and still falls back to system for unknown backgrounds', () => {
        expect(resolveStoryAppearance(undefined, 'dark')).toBe('dark');
        expect(resolveStoryAppearance({ backgrounds: { value: 'paper' } })).toBe('system');
    });
});

describe('appearance class helpers', () => {
    it('maps appearance to a stable wrapper class', () => {
        expect(getStoryAppearanceClass('light')).toBe('formspec-appearance-light');
        expect(getStoryAppearanceClass('dark')).toBe('formspec-appearance-dark');
    });

    it('merges wrapper classes without losing the base class and skips forced classes for system mode', () => {
        expect(getStoryAppearanceWrapperClassName('dark', 'isolated-story-root')).toBe(
            'isolated-story-root formspec-appearance-dark',
        );
        expect(getStoryAppearanceWrapperClassName('system', 'isolated-story-root')).toBe('isolated-story-root');
    });
});
