/** @filedesc Canonical Tailwind + pure helpers for layout-canvas drag affordances — insertion bar, drop-target emphasis, floating preview offset. */
import { LAYOUT_DRAG_SOURCE_STYLE } from './layout-node-styles';

/** Offset from cursor for the floating drag preview so the finger does not cover the chip. */
export const LAYOUT_CANVAS_DRAG_OVERLAY_POINTER_OFFSET_PX = 14;

/** `fixed` overlay `style` left/top from pointer client coordinates (undefined when pointer unknown). */
export function layoutCanvasDragOverlayPositionStyle(
  pointer: { clientX: number; clientY: number } | null | undefined,
): { left: number; top: number } | undefined {
  if (!pointer) return undefined;
  const o = LAYOUT_CANVAS_DRAG_OVERLAY_POINTER_OFFSET_PX;
  return { left: pointer.clientX + o, top: pointer.clientY + o };
}

/** Positioning root required wherever row insertion guides render (`absolute` bars). */
export const LAYOUT_CANVAS_DROP_GUIDE_HOST = 'relative';

/** Shared horizontal insertion marker (top/bottom placement uses `-top-1` / `-bottom-1`). */
export const LAYOUT_CANVAS_ROW_INSERT_BAR_BASE =
  'pointer-events-none absolute left-3 right-3 z-[6] h-1 rounded-full bg-accent shadow-[0_0_12px_rgba(59,130,246,0.55)] dark:shadow-[0_0_12px_rgba(96,165,250,0.4)]';

/** When the active Pragmatic target is this container’s `container-drop` zone (collapsible header, etc.). */
export const LAYOUT_CANVAS_CONTAINER_DROP_ACTIVE =
  'ring-2 ring-accent/55 ring-offset-2 ring-offset-background z-[1]';

/** Empty-container placeholder while it is the active `container-drop` target. */
export const LAYOUT_CANVAS_EMPTY_CONTAINER_DROP_ACTIVE =
  'border-accent/50 bg-accent/[0.07] ring-2 ring-accent/50 ring-offset-2 ring-offset-background';

export type LayoutCanvasNodeRef = { nodeId?: string; bind?: string };

/**
 * Whether `self` denotes the same layout node as `target` (nodeId wins when set, else bind).
 * Used for drop-indicator identity so header, shell, and placeholder stay consistent.
 */
export function layoutCanvasDropNodeRefMatches(self: LayoutCanvasNodeRef, target: LayoutCanvasNodeRef): boolean {
  if (self.nodeId != null && target.nodeId === self.nodeId) return true;
  if (self.bind != null && target.bind === self.bind) return true;
  return false;
}

/** Composes layout container shell classes: positioning root, drag source, active container-drop ring, then selection frame. */
export function layoutCanvasContainerShellClassName(parts: {
  selectionShell: string;
  isDragSource: boolean;
  containerDropActive: boolean;
}): string {
  const { selectionShell, isDragSource, containerDropActive } = parts;
  return [
    LAYOUT_CANVAS_DROP_GUIDE_HOST,
    'transition-all duration-200',
    isDragSource ? LAYOUT_DRAG_SOURCE_STYLE : '',
    containerDropActive ? LAYOUT_CANVAS_CONTAINER_DROP_ACTIVE : '',
    selectionShell,
  ]
    .filter(Boolean)
    .join(' ');
}
