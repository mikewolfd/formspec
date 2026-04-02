/** @filedesc Shared hook for drag-to-resize with snapping and min/max clamping. */
import { useCallback, useRef, useState } from 'react';

export interface UseResizeHandleOptions {
  /** Drag axis. */
  axis: 'x' | 'y';
  /** Minimum allowed value. */
  min: number;
  /** Maximum allowed value. */
  max: number;
  /** Snap to multiples of this value (e.g. 1 for integers). Omit for no snapping. */
  snap?: number;
  /** The current value of the property being resized — drag starts from this, not from min. */
  initialValue: number;
  /**
   * Pixels per logical unit. When set, raw pixel delta is divided by this value before
   * being added to initialValue. Use this for column-span resize where 1 unit = 1 span
   * and the pixel width of a span varies with container width.
   * E.g. pixelsPerUnit = containerWidth / numColumns.
   */
  pixelsPerUnit?: number;
  /** Called whenever the dragged value changes. */
  onResize: (value: number) => void;
}

/**
 * Snap a raw float to the nearest multiple of `snap`, then clamp to [min, max].
 * Exported for unit testing of the pure math.
 */
export function snapAndClamp(raw: number, min: number, max: number, snap?: number): number {
  let value = raw;
  if (snap !== undefined && snap > 0) {
    value = Math.round(raw / snap) * snap;
  }
  return Math.min(max, Math.max(min, value));
}

/**
 * Pointer-event-based resize handle hook.
 *
 * Returns `{ handleProps, isDragging }`.
 * Spread `handleProps` onto the handle element.
 * The hook stops propagation on pointerdown to prevent dnd-kit reorder drags.
 */
export function useResizeHandle(options: UseResizeHandleOptions) {
  const { axis, min, max, snap, initialValue, pixelsPerUnit, onResize } = options;
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef<{ pos: number; value: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Stop propagation so dnd-kit doesn't start a reorder drag
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      startRef.current = {
        pos: axis === 'x' ? e.clientX : e.clientY,
        value: initialValue,
      };
    },
    [axis, initialValue],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current) return;
      const currentPos = axis === 'x' ? e.clientX : e.clientY;
      const pixelDelta = currentPos - startRef.current.pos;
      const unitDelta = pixelsPerUnit && pixelsPerUnit > 0 ? pixelDelta / pixelsPerUnit : pixelDelta;
      const rawValue = startRef.current.value + unitDelta;
      const snapped = snapAndClamp(rawValue, min, max, snap);
      onResize(snapped);
    },
    [axis, min, max, snap, pixelsPerUnit, onResize],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);
      startRef.current = null;
    },
    [],
  );

  // onPointerCancel: same cleanup as onPointerUp — fires when pointer is interrupted
  // (e.g. browser context menu, touch cancelled). releasePointerCapture may throw if
  // capture was never set, so guard with isDragging state.
  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      setIsDragging(false);
      startRef.current = null;
    },
    [],
  );

  const handleProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };

  return { handleProps, isDragging };
}
