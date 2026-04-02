/** @filedesc Context for current Layout workspace mode (layout vs theme) — lets Shell hide right sidebar in Theme mode. */
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { type LayoutMode } from './LayoutThemeToggle';

interface LayoutModeState {
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
}

const LayoutModeContext = createContext<LayoutModeState | null>(null);

export function LayoutModeProvider({ children }: { children: ReactNode }) {
  const [layoutMode, setLayoutModeSt] = useState<LayoutMode>('layout');
  const setLayoutMode = useCallback((mode: LayoutMode) => setLayoutModeSt(mode), []);
  const value = useMemo(() => ({ layoutMode, setLayoutMode }), [layoutMode, setLayoutMode]);
  return <LayoutModeContext.Provider value={value}>{children}</LayoutModeContext.Provider>;
}

export function useLayoutMode(): LayoutModeState {
  const ctx = useContext(LayoutModeContext);
  if (!ctx) throw new Error('useLayoutMode must be used within a LayoutModeProvider');
  return ctx;
}

export function useOptionalLayoutMode(): LayoutModeState | null {
  return useContext(LayoutModeContext);
}
