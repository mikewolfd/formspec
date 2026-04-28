import { StudioWorkspaceModals, type StudioWorkspaceModalsProps } from './StudioWorkspaceModals';

export type ShellDialogsProps = Omit<
  StudioWorkspaceModalsProps,
  'importOnBeforeLoad' | 'importOnSuccess' | 'onImportClosed'
>;

export function ShellDialogs(props: ShellDialogsProps) {
  return <StudioWorkspaceModals {...props} />;
}
