/** @filedesc Class name merge utility for shadcn adapter — lightweight clsx alternative. */

/**
 * Merge class names, filtering out falsy values.
 * Drop-in for shadcn's cn() without the clsx/tailwind-merge deps.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}
