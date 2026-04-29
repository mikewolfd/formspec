/** @filedesc Warns users before closing/reloading when the project has unsaved changes. */
import { useEffect } from 'react';
import { Project } from '@formspec-org/studio-core';

export function UnloadGuard({ project }: { project: Project }) {
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!project.isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [project]);

  return null;
}
