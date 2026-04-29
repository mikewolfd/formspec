/** @filedesc Manages shell panel visibility: command palette, import dialog, settings dialogs, chat panel, preview companion. */
import { useState, useEffect } from 'react';

export const PREVIEW_PERSIST_KEY = 'formspec-studio:show-preview:v1';

export interface ShellPanelsState {
  showPalette: boolean;
  setShowPalette: (show: boolean) => void;
  showImport: boolean;
  setShowImport: (show: boolean) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showAppSettings: boolean;
  setShowAppSettings: (show: boolean) => void;
  /** Assistant chat panel open state (right rail in Shell). */
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  /** Live preview companion panel (right rail, persists across tabs). */
  showPreview: boolean;
  setShowPreview: (open: boolean) => void;
}

/** Read the persisted preview-companion visibility flag (false in non-browser envs). */
export function readPreviewVisibility(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PREVIEW_PERSIST_KEY) === '1';
}

/** Write the persisted preview-companion visibility flag. */
export function writePreviewVisibility(open: boolean): void {
  if (typeof window === 'undefined') return;
  if (open) localStorage.setItem(PREVIEW_PERSIST_KEY, '1');
  else localStorage.removeItem(PREVIEW_PERSIST_KEY);
}

/** @deprecated Use writePreviewVisibility. Retained as alias to avoid churn during the rename. */
export const persistPreview = writePreviewVisibility;

export function useShellPanels(): ShellPanelsState {
  const [showPalette, setShowPalette] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [showPreview, setShowPreviewState] = useState(readPreviewVisibility);

  const setShowPreview = (open: boolean) => {
    setShowPreviewState(open);
    writePreviewVisibility(open);
  };

  useEffect(() => {
    const onOpenSettings = () => setShowSettings(true);
    const onOpenAppSettings = () => setShowAppSettings(true);
    const onTogglePreview = (e: Event) => {
      const detail = (e as CustomEvent<{ open?: boolean }>).detail;
      setShowPreview(detail?.open ?? true);
    };
    window.addEventListener('formspec:open-settings', onOpenSettings);
    window.addEventListener('formspec:open-app-settings', onOpenAppSettings);
    window.addEventListener('formspec:toggle-preview-companion', onTogglePreview);
    return () => {
      window.removeEventListener('formspec:open-settings', onOpenSettings);
      window.removeEventListener('formspec:open-app-settings', onOpenAppSettings);
      window.removeEventListener('formspec:toggle-preview-companion', onTogglePreview);
    };
  }, []);

  return {
    showPalette,
    setShowPalette,
    showImport,
    setShowImport,
    showSettings,
    setShowSettings,
    showAppSettings,
    setShowAppSettings,
    assistantOpen,
    setAssistantOpen,
    showPreview,
    setShowPreview,
  };
}
