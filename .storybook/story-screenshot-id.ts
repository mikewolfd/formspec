/** @filedesc Normalizes Storybook story id to the basename used for screenshot + DOM snapshot files (matches Playwright). */

/**
 * Story ids use `group--story` (double hyphen). Playwright's screenshot naming collapses
 * consecutive hyphens in the filename, so we must use the same normalization everywhere.
 */
export function storyScreenshotBaseId(storyId: string): string {
    return storyId.replace(/[^a-zA-Z0-9-]+/g, '_').replace(/-+/g, '-');
}
