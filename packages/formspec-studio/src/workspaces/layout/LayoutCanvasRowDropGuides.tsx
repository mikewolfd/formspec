/** @filedesc Accent insertion bar on the top or bottom edge of a layout row when it is the active list drop target. */
import { useLayoutCanvasRowDropEdge } from './LayoutCanvasDragFeedbackContext';
import { LAYOUT_CANVAS_ROW_INSERT_BAR_BASE } from './layout-canvas-drag-chrome';

export function LayoutCanvasRowDropGuides({
  sortableGroup,
  sortableIndex,
}: {
  sortableGroup: string;
  sortableIndex: number;
}) {
  const edge = useLayoutCanvasRowDropEdge(sortableGroup, sortableIndex);
  if (!edge) return null;
  return (
    <>
      {edge === 'top' ? <div className={`${LAYOUT_CANVAS_ROW_INSERT_BAR_BASE} -top-1`} aria-hidden /> : null}
      {edge === 'bottom' ? <div className={`${LAYOUT_CANVAS_ROW_INSERT_BAR_BASE} -bottom-1`} aria-hidden /> : null}
    </>
  );
}
