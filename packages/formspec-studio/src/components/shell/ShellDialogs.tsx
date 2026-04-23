import React from 'react';
import { CommandPalette } from '../CommandPalette';
import { ImportDialog } from '../ImportDialog';
import { SettingsDialog } from '../SettingsDialog';
import { AppSettingsDialog } from '../AppSettingsDialog';

interface ShellDialogsProps {
  showPalette: boolean;
  setShowPalette: (show: boolean) => void;
  showImport: boolean;
  setShowImport: (show: boolean) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showAppSettings: boolean;
  setShowAppSettings: (show: boolean) => void;
}

export function ShellDialogs({
  showPalette,
  setShowPalette,
  showImport,
  setShowImport,
  showSettings,
  setShowSettings,
  showAppSettings,
  setShowAppSettings,
}: ShellDialogsProps) {
  return (
    <>
      <CommandPalette open={showPalette} onClose={() => setShowPalette(false)} />
      <ImportDialog open={showImport} onClose={() => setShowImport(false)} />
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
      <AppSettingsDialog open={showAppSettings} onClose={() => setShowAppSettings(false)} />
    </>
  );
}
