import { describe, it, expect, vi } from 'vitest';
import { createProject } from '../src/index.js';

describe('batch', () => {
  it('applies multiple commands as one atomic operation', () => {
    const project = createProject();

    const results = project.batch([
      { type: 'definition.setFormTitle', payload: { title: 'Batch Form' } },
      { type: 'definition.setFormTitle', payload: { title: 'Final Title' } },
    ]);

    expect(project.definition.title).toBe('Final Title');
    expect(results).toHaveLength(2);
    expect(results[0].rebuildComponentTree).toBe(false);
  });

  it('undoes an entire batch as one step', () => {
    const project = createProject();
    project.dispatch({ type: 'definition.setFormTitle', payload: { title: 'Before' } });

    project.batch([
      { type: 'definition.setFormTitle', payload: { title: 'Batch 1' } },
      { type: 'definition.setFormTitle', payload: { title: 'Batch 2' } },
    ]);

    expect(project.definition.title).toBe('Batch 2');
    project.undo();
    expect(project.definition.title).toBe('Before');
  });

  it('fires a single onChange notification', () => {
    const project = createProject();
    const listener = vi.fn();
    project.onChange(listener);

    project.batch([
      { type: 'definition.setFormTitle', payload: { title: 'A' } },
      { type: 'definition.setFormTitle', payload: { title: 'B' } },
    ]);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][1].source).toBe('batch');
  });
});

describe('onChange', () => {
  it('notifies listeners after dispatch', () => {
    const project = createProject();
    const listener = vi.fn();
    project.onChange(listener);

    project.dispatch({ type: 'definition.setFormTitle', payload: { title: 'Hello' } });

    expect(listener).toHaveBeenCalledTimes(1);
    const [state, event] = listener.mock.calls[0];
    expect(state.definition.title).toBe('Hello');
    expect(event.source).toBe('dispatch');
    expect(event.command.type).toBe('definition.setFormTitle');
  });

  it('returns an unsubscribe function', () => {
    const project = createProject();
    const listener = vi.fn();
    const unsubscribe = project.onChange(listener);

    project.dispatch({ type: 'definition.setFormTitle', payload: { title: 'A' } });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    project.dispatch({ type: 'definition.setFormTitle', payload: { title: 'B' } });
    expect(listener).toHaveBeenCalledTimes(1); // no additional call
  });

  it('notifies on undo/redo', () => {
    const project = createProject();
    const listener = vi.fn();

    project.dispatch({ type: 'definition.setFormTitle', payload: { title: 'X' } });
    project.onChange(listener);

    project.undo();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][1].source).toBe('undo');

    project.redo();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1][1].source).toBe('redo');
  });
});
