/** @filedesc Verifies UnloadGuard prompts only when project is dirty and cleans up on unmount. */
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { createProject } from '@formspec-org/studio-core';
import { UnloadGuard } from '../../src/components/UnloadGuard';

function fireBeforeUnload(): Event {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event;
}

describe('UnloadGuard', () => {
  it('does not prevent unload when the project is clean', () => {
    const project = createProject();
    render(<UnloadGuard project={project} />);

    const event = fireBeforeUnload();

    expect(project.isDirty).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it('prevents unload when the project has unsaved mutations', () => {
    const project = createProject();
    project.addField('newField', 'New field', 'string');

    render(<UnloadGuard project={project} />);

    const event = fireBeforeUnload();

    expect(project.isDirty).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it('stops prompting after markClean()', () => {
    const project = createProject();
    project.addField('newField', 'New field', 'string');
    render(<UnloadGuard project={project} />);

    expect(fireBeforeUnload().defaultPrevented).toBe(true);

    project.markClean();

    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });

  it('removes the handler on unmount', () => {
    const project = createProject();
    project.addField('newField', 'New field', 'string');
    const { unmount } = render(<UnloadGuard project={project} />);

    expect(fireBeforeUnload().defaultPrevented).toBe(true);

    unmount();

    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });
});
