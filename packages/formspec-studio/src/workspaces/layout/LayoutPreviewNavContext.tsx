/** @filedesc Shares layout live-preview sync: wizard/tab step + DevTools-style field highlight. */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type LayoutPreviewNavContextValue = {
  /** Zero-based index matching Layout step nav / Page order; null when not multi-page. */
  previewPageIndex: number | null;
  setPreviewPageIndex: (index: number | null) => void;
  /** Definition field path matching `data-name` on `.formspec-field` / `.formspec-fieldset` in the preview. */
  highlightFieldPath: string | null;
  setHighlightFieldPath: (path: string | null) => void;
};

const LayoutPreviewNavContext = createContext<LayoutPreviewNavContextValue | null>(null);

const noop = () => {};

export function LayoutPreviewNavProvider({ children }: { children: ReactNode }) {
  const [previewPageIndex, setPreviewPageIndex] = useState<number | null>(null);
  const [highlightFieldPath, setHighlightFieldPath] = useState<string | null>(null);
  const value = useMemo(
    () => ({
      previewPageIndex,
      setPreviewPageIndex,
      highlightFieldPath,
      setHighlightFieldPath,
    }),
    [previewPageIndex, highlightFieldPath],
  );
  return (
    <LayoutPreviewNavContext.Provider value={value}>
      {children}
    </LayoutPreviewNavContext.Provider>
  );
}

export function useLayoutPreviewNav(): LayoutPreviewNavContextValue {
  const v = useContext(LayoutPreviewNavContext);
  if (!v) {
    return {
      previewPageIndex: null,
      setPreviewPageIndex: noop,
      highlightFieldPath: null,
      setHighlightFieldPath: noop,
    };
  }
  return v;
}
