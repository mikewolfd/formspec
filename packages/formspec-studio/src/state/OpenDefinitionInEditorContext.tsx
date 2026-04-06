/** @filedesc Opens the Editor workspace and selects a definition item — canonical home for description, hint, and binds. */
import { createContext, useContext, type ReactNode } from 'react';

export type DefinitionEditorItemKind = 'field' | 'group' | 'display';

const OpenDefinitionInEditorContext = createContext<
  (defPath: string, kind: DefinitionEditorItemKind) => void
>(() => {});

export function OpenDefinitionInEditorProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: (defPath: string, kind: DefinitionEditorItemKind) => void;
}) {
  return (
    <OpenDefinitionInEditorContext.Provider value={value}>
      {children}
    </OpenDefinitionInEditorContext.Provider>
  );
}

export function useOpenDefinitionInEditor(): (
  defPath: string,
  kind: DefinitionEditorItemKind,
) => void {
  return useContext(OpenDefinitionInEditorContext);
}
