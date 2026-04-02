/** @filedesc Screener-specific thin wrapper over ItemListEditor — flat items, no groups, key-based addressing. */
import { useMemo } from 'react';
import { useScreener } from '../../state/useScreener';
import { useProject } from '../../state/useProject';
import { ItemListEditor, type ItemListEditorConfig } from './ItemListEditor';

import type { FormItem, FormBind } from '@formspec-org/types';

export function ScreenerItemEditor() {
  const screener = useScreener();
  const project = useProject();

  const items = (screener?.items ?? []) as FormItem[];
  const allBinds = (screener?.binds ?? undefined) as FormBind[] | undefined;

  const config = useMemo<ItemListEditorConfig>(() => ({
    items,
    binds: allBinds,

    onAddField: (key, label, dataType) => {
      project.addScreenField(key, label, dataType);
    },
    onRemoveItem: (key) => project.removeScreenField(key),
    onUpdateItem: (key, changes) => project.updateScreenField(key, changes),
    onReorderItem: (key, direction) => project.reorderScreenField(key, direction),

    allowGroups: false,
    allowDisplayItems: false,
    allowCopy: false,
    allowRename: false,
    allowWrapInGroup: false,

    headerTitle: 'Screening questions',
    headerDescription: 'Select a question to edit it, or add new screening questions below.',
    emptyStateTitle: 'No screening questions',
    emptyStateDescription: 'Add questions to collect eligibility data before the respondent starts the full form.',
    addButtonLabel: '+ Add Question',
    surfaceTestId: 'screener-item-surface',
    selectionTab: 'screener',
  }), [items, allBinds, project]);

  return <ItemListEditor config={config} />;
}
