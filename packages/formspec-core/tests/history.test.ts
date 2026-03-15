import { describe, it, expect } from 'vitest';
import { createRawProject } from '../src/index.js';

describe('undo/redo', () => {
  it('undoes the last dispatch', () => {
    const project = createRawProject();
    project.dispatch({ type: 'definition.setFormTitle', payload: { title: 'First' } });
    project.dispatch({ type: 'definition.setFormTitle', payload: { title: 'Second' } });

    expect(project.definition.title).toBe('Second');

    const undone = project.undo();
    expect(undone).toBe(true);
    expect(project.definition.title).toBe('First');
  });

  it('redoes after undo', () => {
    const project = createRawProject();
    project.dispatch({ type: 'definition.setFormTitle', payload: { title: 'Changed' } });
    project.undo();

    expect(project.definition.title).toBe('');

    const redone = project.redo();
    expect(redone).toBe(true);
    expect(project.definition.title).toBe('Changed');
  });

  it('returns false when nothing to undo', () => {
    const project = createRawProject();
    expect(project.undo()).toBe(false);
    expect(project.canUndo).toBe(false);
  });

  it('returns false when nothing to redo', () => {
    const project = createRawProject();
    expect(project.redo()).toBe(false);
    expect(project.canRedo).toBe(false);
  });

  it('clears redo stack on new dispatch', () => {
    const project = createRawProject();
    project.dispatch({ type: 'definition.setFormTitle', payload: { title: 'A' } });
    project.dispatch({ type: 'definition.setFormTitle', payload: { title: 'B' } });
    project.undo(); // back to 'A'

    // New dispatch should clear redo
    project.dispatch({ type: 'definition.setFormTitle', payload: { title: 'C' } });
    expect(project.canRedo).toBe(false);
    expect(project.definition.title).toBe('C');
  });

  it('exposes canUndo/canRedo flags', () => {
    const project = createRawProject();
    expect(project.canUndo).toBe(false);
    expect(project.canRedo).toBe(false);

    project.dispatch({ type: 'definition.setFormTitle', payload: { title: 'X' } });
    expect(project.canUndo).toBe(true);
    expect(project.canRedo).toBe(false);

    project.undo();
    expect(project.canUndo).toBe(false);
    expect(project.canRedo).toBe(true);
  });

  it('respects maxHistoryDepth', () => {
    const project = createRawProject({ maxHistoryDepth: 2 });

    project.dispatch({ type: 'definition.setFormTitle', payload: { title: 'A' } });
    project.dispatch({ type: 'definition.setFormTitle', payload: { title: 'B' } });
    project.dispatch({ type: 'definition.setFormTitle', payload: { title: 'C' } });

    // Only 2 undos should be possible
    expect(project.undo()).toBe(true); // C → B
    expect(project.undo()).toBe(true); // B → A
    expect(project.undo()).toBe(false); // can't go further
    expect(project.definition.title).toBe('A');
  });

  it('records commands in the log', () => {
    const project = createRawProject();
    project.dispatch({ type: 'definition.setFormTitle', payload: { title: 'Test' } });

    expect(project.log).toHaveLength(1);
    expect(project.log[0].command.type).toBe('definition.setFormTitle');
    expect(project.log[0].timestamp).toBeTypeOf('number');
  });
});
