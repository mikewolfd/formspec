/** @filedesc DnD wrapper for the DefinitionTreeEditor — Pragmatic monitor reorders definition.items. */
import { useCallback, useEffect, type ReactNode } from 'react';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useProject } from '../../state/useProject';
import { useSelection } from '../../state/useSelection';
import type { FormItem } from '@formspec-org/types';
import { EDITOR_PDND_KIND, mapEditorPragmaticDrop } from './editor-dnd-utils';
import { isRecord } from '../shared/runtime-guards';

const EDITOR_TAB = 'editor';

interface EditorDndProviderProps {
  items: FormItem[];
  children: ReactNode;
}

export function EditorDndProvider({ items, children }: EditorDndProviderProps) {
  const project = useProject();
  const { select, selectedKeys } = useSelection();

  const onDragStart = useCallback(
    (payload: Parameters<NonNullable<Parameters<typeof monitorForElements>[0]['onDragStart']>>[0]) => {
      const d = payload.source.data;
      const sourceId = isRecord(d) && 'id' in d ? String(d.id ?? '') : '';
      if (!sourceId) return;
      if (!selectedKeys.has(sourceId)) {
        select(sourceId, 'field', { tab: EDITOR_TAB });
      }
    },
    [selectedKeys, select],
  );

  const onDrop = useCallback(
    (payload: Parameters<NonNullable<Parameters<typeof monitorForElements>[0]['onDrop']>>[0]) => {
      const mapped = mapEditorPragmaticDrop(items, {
        source: payload.source,
        location: payload.location,
      });
      if (!mapped) return;
      project.moveItem(mapped.sourcePath, mapped.parentPath, mapped.targetIndex);
    },
    [items, project],
  );

  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => {
        const d = source.data;
        return isRecord(d) && d.kind === EDITOR_PDND_KIND;
      },
      onDragStart,
      onDrop,
    });
  }, [onDragStart, onDrop]);

  return <>{children}</>;
}
