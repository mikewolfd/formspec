/** @filedesc Wrapper that makes a canvas item sortable via Pragmatic DnD, fading the source during drag. */
import { cloneElement, isValidElement, useCallback, useState, type ReactElement } from 'react';
import { useEditorPragmaticSortableItem } from './useEditorPragmaticSortableItem';

interface SortableItemWrapperProps {
  id: string;
  index: number;
  group?: string;
  children: ReactElement;
}

export function SortableItemWrapper({ id, index, group, children }: SortableItemWrapperProps) {
  const [shell, setShell] = useState<HTMLDivElement | null>(null);
  const [dragHandle, setDragHandle] = useState<Element | null>(null);
  const [isDragSource, setIsDragSource] = useState(false);
  const onDragSourceChange = useCallback((active: boolean) => {
    setIsDragSource(active);
  }, []);

  useEditorPragmaticSortableItem({
    element: shell,
    dragHandle,
    id,
    index,
    group: group ?? 'root',
    onDragSourceChange,
  });

  const child = isValidElement(children)
    ? cloneElement(children, {
        dragHandleRef: (el: Element | null) => setDragHandle(el),
        isDragSource,
      } as Record<string, unknown>)
    : children;

  return (
    <div ref={setShell} className="py-0.5" style={{ opacity: isDragSource ? 0.4 : 1 }}>
      {child}
    </div>
  );
}
