/** @filedesc Pragmatic `draggable` + row `dropTarget` for editor definition tree sortables. */
import { useEffect } from 'react';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { attachClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { EDITOR_PDND_KIND, type EditorPdndSourceData } from '../editor-dnd-utils';
import { isRecord } from '../../shared/runtime-guards';

export interface UseEditorPragmaticSortableItemArgs {
  element: HTMLElement | null;
  dragHandle: Element | null;
  id: string;
  index: number;
  group: string;
  onDragSourceChange?: (active: boolean) => void;
}

export function useEditorPragmaticSortableItem(args: UseEditorPragmaticSortableItemArgs): void {
  const { element, dragHandle, id, index, group, onDragSourceChange } = args;

  useEffect(() => {
    if (!element) return;

    const initial = { initialSortGroup: group, initialSortIndex: index };

    const d = draggable({
      element,
      dragHandle: dragHandle ?? undefined,
      onDragStart: () => onDragSourceChange?.(true),
      onDrop: () => onDragSourceChange?.(false),
      getInitialData: () =>
        ({
          kind: EDITOR_PDND_KIND,
          id,
          sortGroup: group,
          sortIndex: index,
          ...initial,
        }) satisfies EditorPdndSourceData,
    });

    const dt = dropTargetForElements({
      element,
      canDrop: ({ source }) => {
        const sd = source.data;
        return isRecord(sd) && sd.kind === EDITOR_PDND_KIND;
      },
      getData: ({ input }) =>
        attachClosestEdge(
          {
            kind: EDITOR_PDND_KIND,
            id,
            sortGroup: group,
            sortIndex: index,
          },
          { element, input, allowedEdges: ['top', 'bottom'] },
        ),
    });

    return combine(d, dt);
  }, [element, dragHandle, id, index, group, onDragSourceChange]);
}
