import { describe, it, expect } from 'vitest';
import { RawProject, createRawProject } from '../src/index.js';

describe('RawProject', () => {
  it('is exported as RawProject class', () => {
    const raw = createRawProject();
    expect(raw).toBeInstanceOf(RawProject);
  });

  describe('dispatch with array (atomic multi-command)', () => {
    it('executes multiple commands atomically with single undo entry', () => {
      const raw = createRawProject();
      raw.dispatch([
        { type: 'definition.addItem', payload: { type: 'field', key: 'a' } },
        { type: 'definition.addItem', payload: { type: 'field', key: 'b' } },
      ]);
      expect(raw.state.definition.items).toHaveLength(2);
      raw.undo();
      expect(raw.state.definition.items).toHaveLength(0);
    });

    it('rolls back all commands if any throws — no partial commit', () => {
      const raw = createRawProject();
      raw.dispatch({ type: 'definition.addItem', payload: { type: 'field', key: 'existing', label: 'Original' } });

      expect(() => raw.dispatch([
        { type: 'definition.setItemProperty', payload: { path: 'existing', property: 'label', value: 'Modified' } },
        { type: 'definition.deleteItem', payload: { path: 'nonexistent' } },
      ])).toThrow();

      expect(raw.state.definition.items).toHaveLength(1);
      expect(raw.state.definition.items[0].key).toBe('existing');
      expect(raw.state.definition.items[0].label).toBe('Original');
    });

    it('runs middleware once for array dispatch', () => {
      let callCount = 0;
      const raw = createRawProject({
        middleware: [(_state, _cmd, next) => {
          callCount++;
          return next(_cmd);
        }],
      });
      raw.dispatch([
        { type: 'definition.addItem', payload: { type: 'field', key: 'a' } },
        { type: 'definition.addItem', payload: { type: 'field', key: 'b' } },
      ]);
      expect(callCount).toBe(1);
    });

    it('notifies listeners once for array dispatch', () => {
      let notifyCount = 0;
      const raw = createRawProject();
      raw.onChange(() => { notifyCount++; });
      raw.dispatch([
        { type: 'definition.addItem', payload: { type: 'field', key: 'a' } },
        { type: 'definition.addItem', payload: { type: 'field', key: 'b' } },
      ]);
      expect(notifyCount).toBe(1);
    });
  });

  describe('batchWithRebuild', () => {
    it('executes phase1, rebuilds component tree, then executes phase2', () => {
      const raw = createRawProject();
      const results = raw.batchWithRebuild(
        [{ type: 'definition.addItem', payload: { type: 'field', key: 'email', label: 'Email' } }],
        [{ type: 'component.setFieldWidget', payload: { fieldKey: 'email', widget: 'TextInput' } }],
      );
      expect(results).toHaveLength(2);
      expect(raw.state.definition.items).toHaveLength(1);
    });

    it('produces a single undo entry', () => {
      const raw = createRawProject();
      raw.batchWithRebuild(
        [{ type: 'definition.addItem', payload: { type: 'field', key: 'f1' } }],
        [{ type: 'component.setFieldWidget', payload: { fieldKey: 'f1', widget: 'TextInput' } }],
      );
      raw.undo();
      expect(raw.state.definition.items).toHaveLength(0);
    });

    it('notifies listeners once', () => {
      let notifyCount = 0;
      const raw = createRawProject();
      raw.onChange(() => { notifyCount++; });
      raw.batchWithRebuild(
        [{ type: 'definition.addItem', payload: { type: 'field', key: 'f1' } }],
        [{ type: 'component.setFieldWidget', payload: { fieldKey: 'f1', widget: 'TextInput' } }],
      );
      expect(notifyCount).toBe(1);
    });
  });

  describe('clearRedo', () => {
    it('clears the redo stack', () => {
      const raw = createRawProject();
      raw.dispatch({ type: 'definition.addItem', payload: { type: 'field', key: 'f' } });
      raw.undo();
      expect(raw.canRedo).toBe(true);
      raw.clearRedo();
      expect(raw.canRedo).toBe(false);
    });
  });
});
