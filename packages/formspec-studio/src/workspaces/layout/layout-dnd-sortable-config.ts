/** @filedesc Shared @dnd-kit layout DnD options — sortable transition timing and feedback mode to avoid React/DOM races. */

import type { FeedbackType } from '@dnd-kit/dom';

/**
 * Skip Feedback-plugin reparenting/cloning of the drag source. That DOM surgery races React’s commit
 * phase when the component tree re-orders after drop (NotFoundError on removeChild).
 */
export const LAYOUT_DND_FEEDBACK_NONE: FeedbackType = 'none';

/**
 * Default sortable transition in @dnd-kit/dom is 300ms; a shorter settle reduces the “fly to wrong
 * place then snap” feeling when React re-hydrates the tree after cross-container moves.
 */
export const LAYOUT_SORTABLE_TRANSITION = {
  duration: 160,
  easing: 'cubic-bezier(0.2, 0.85, 0.25, 1)',
  idle: false,
} as const;
