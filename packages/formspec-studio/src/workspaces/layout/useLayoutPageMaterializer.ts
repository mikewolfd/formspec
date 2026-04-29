import { useCallback, useRef, useEffect } from 'react';
import { Project } from '@formspec-org/studio-core';

export function useLayoutPageMaterializer(
  project: Project,
  pageNavItems: Array<{ id: string; title: string; groupPath?: string; pageId?: string }>,
  activePageId: string | null,
  setActivePageId: (id: string) => void,
) {
  const materialized = useRef<boolean>(false);

  useEffect(() => {
    materialized.current = false;
  }, [pageNavItems]);

  const materializePagedLayout = useCallback(() => {
    const pageIdMap = new Map<string, string>();
    if (materialized.current) return pageIdMap;

    const syntheticPages = pageNavItems.filter((page) => !page.pageId && page.groupPath);
    if (syntheticPages.length === 0) {
      materialized.current = true;
      return pageIdMap;
    }

    for (const page of syntheticPages) {
      const result = project.addPage(page.title, undefined, page.id);
      const createdPageId = result.createdId!;
      project.placeOnPage(page.groupPath!, createdPageId);
      pageIdMap.set(page.id, createdPageId);
    }

    materialized.current = true;
    return pageIdMap;
  }, [pageNavItems, project]);

  const syncActivePageAfterMaterialize = useCallback(
    (pageIdMap: Map<string, string>) => {
      if (!activePageId || pageIdMap.size === 0) return;
      const mapped = pageIdMap.get(activePageId);
      if (mapped && mapped !== activePageId) {
        setActivePageId(mapped);
      }
    },
    [activePageId, setActivePageId],
  );

  const resolvePageNavToComponentId = useCallback(
    (navId: string, pageIdMap: Map<string, string>) => {
      const entry = pageNavItems.find((p) => p.id === navId);
      if (!entry) return null;
      return entry.pageId ?? pageIdMap.get(entry.id) ?? entry.id;
    },
    [pageNavItems],
  );

  return {
    materializePagedLayout,
    syncActivePageAfterMaterialize,
    resolvePageNavToComponentId,
  };
}
