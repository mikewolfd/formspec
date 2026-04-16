/** @filedesc React context for live layout-canvas drag feedback — pointer position + active row/container drop indicator. */
import { createContext, useContext, type ReactNode } from 'react';
import { layoutCanvasDropNodeRefMatches } from './layout-canvas-drag-chrome';
import type { LayoutCanvasDropIndicator } from './layout-pdnd';

export type LayoutCanvasDragPointer = { clientX: number; clientY: number };

export type LayoutCanvasDragFeedbackState = {
  pointer: LayoutCanvasDragPointer | null;
  indicator: LayoutCanvasDropIndicator | null;
};

const LayoutCanvasDragFeedbackContext = createContext<LayoutCanvasDragFeedbackState | null>(null);

export function LayoutCanvasDragFeedbackProvider({
  value,
  children,
}: {
  value: LayoutCanvasDragFeedbackState;
  children: ReactNode;
}) {
  return <LayoutCanvasDragFeedbackContext.Provider value={value}>{children}</LayoutCanvasDragFeedbackContext.Provider>;
}

/** When the innermost drop target is this row, which edge shows the insertion bar. */
export function useLayoutCanvasRowDropEdge(sortableGroup: string, sortableIndex: number): 'top' | 'bottom' | null {
  const ctx = useContext(LayoutCanvasDragFeedbackContext);
  const ind = ctx?.indicator;
  if (!ind || ind.mode !== 'row') return null;
  if (ind.sortGroup !== sortableGroup || ind.sortableIndex !== sortableIndex) return null;
  return ind.edge;
}

/** True when the pointer’s innermost target is this container’s `container-drop` zone. */
export function useLayoutCanvasContainerDropTargetActive(nodeRef: { nodeId?: string; bind?: string } | null): boolean {
  const ctx = useContext(LayoutCanvasDragFeedbackContext);
  if (!nodeRef || !ctx?.indicator || ctx.indicator.mode !== 'container') return false;
  return layoutCanvasDropNodeRefMatches(nodeRef, ctx.indicator.nodeRef);
}

/** Pointer during an active layout drag — for positioning the floating preview chip. */
export function useLayoutCanvasDragPointer(): LayoutCanvasDragPointer | null {
  return useContext(LayoutCanvasDragFeedbackContext)?.pointer ?? null;
}
