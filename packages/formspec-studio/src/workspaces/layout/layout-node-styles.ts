/** @filedesc Shared Tailwind class strings for layout canvas selection — left (inline-start) accent rail + subtle fill for containers and field/display leaves. */

/** Selected layout container: structural frame with inline-start rail (RTL-safe). */
export const LAYOUT_CONTAINER_SELECTED =
  'rounded-r-lg border-y border-e border-border/60 border-s-4 border-s-accent bg-accent/[0.06] shadow-sm';

/** Unselected layout container shell (dashed wireframe). */
export const LAYOUT_CONTAINER_UNSELECTED = 'rounded border border-dashed border-muted bg-surface';

/**
 * Stack (and similar) on the active layout page — solid frame so the interior does not read as
 * discardable sketch UI while the wizard step / page is the editing locus (visual review 2026-04-05).
 */
export const LAYOUT_CONTAINER_UNSELECTED_ON_ACTIVE_PAGE =
  'rounded border border-border/60 bg-surface';

/** Selected field/display card: same selection vocabulary as containers, no diffuse glow. */
export const LAYOUT_LEAF_SELECTED =
  'border-y border-e border-border/60 border-s-4 border-s-accent bg-accent/[0.06]';

/** Unselected leaf: transparent border until hover. */
export const LAYOUT_LEAF_UNSELECTED = 'border border-transparent hover:border-border/70 hover:bg-bg-default/56';
