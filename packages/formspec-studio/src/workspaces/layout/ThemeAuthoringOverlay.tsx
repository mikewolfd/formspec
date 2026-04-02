/** @filedesc Transparent click-capture overlay for Theme mode — resolves data-bind at click point to select fields. */
import { useRef, useCallback } from 'react';

interface ThemeAuthoringOverlayProps {
  onFieldSelect: (itemKey: string, position: { x: number; y: number }) => void;
  selectedItemKey?: string | null;
}

/** Walk up the DOM from `el` looking for the first element with data-bind attribute. */
function findDataBind(el: Element | null): string | null {
  let current = el;
  while (current && current !== document.body) {
    if (current instanceof HTMLElement && current.dataset.bind) {
      return current.dataset.bind;
    }
    current = current.parentElement;
  }
  return null;
}

export function ThemeAuthoringOverlay({ onFieldSelect, selectedItemKey }: ThemeAuthoringOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const overlay = overlayRef.current;
    if (!overlay) return;

    // Temporarily hide overlay so elementFromPoint can reach the element beneath
    overlay.style.pointerEvents = 'none';
    const target = document.elementFromPoint(clientX, clientY);
    overlay.style.pointerEvents = 'all';

    const itemKey = findDataBind(target);
    if (itemKey) {
      onFieldSelect(itemKey, { x: clientX, y: clientY });
    }
    // If no data-bind found: no-op (containers not selectable per OBJ-12-03)
  }, [onFieldSelect]);

  return (
    <div
      ref={overlayRef}
      data-testid="theme-authoring-overlay"
      data-selected-key={selectedItemKey ?? undefined}
      onClick={handleClick}
      className="absolute inset-0 z-10 cursor-crosshair"
      style={{ pointerEvents: 'all', background: 'transparent' }}
    />
  );
}
