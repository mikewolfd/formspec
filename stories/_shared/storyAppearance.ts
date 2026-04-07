/** Shared Storybook appearance mapping for isolated stories. */

export type StoryAppearance = 'system' | 'light' | 'dark';

export function resolveStoryAppearance(
    globals: { backgrounds?: { value?: unknown } } | undefined,
    defaultAppearance: Exclude<StoryAppearance, 'system'> = 'light',
): StoryAppearance {
    const backgroundValue = globals?.backgrounds?.value;
    if (backgroundValue === 'light') return 'light';
    if (backgroundValue === 'dark') return 'dark';
    if (backgroundValue == null) return defaultAppearance;
    return 'system';
}

export function getStoryAppearanceClass(appearance: Exclude<StoryAppearance, 'system'>): string {
    return `formspec-appearance-${appearance}`;
}

export function getStoryAppearanceWrapperClassName(appearance: StoryAppearance, baseClassName?: string): string {
    return [baseClassName, appearance === 'system' ? undefined : getStoryAppearanceClass(appearance)]
        .filter(Boolean)
        .join(' ');
}
