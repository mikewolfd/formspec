import { describe, it, expect, beforeEach } from 'vitest';
import { SourceTraceManager } from '../src/source-trace.js';
import type { SourceTrace } from '../src/types.js';

describe('SourceTraceManager', () => {
  let manager: SourceTraceManager;

  const trace1: SourceTrace = {
    elementPath: 'name',
    sourceType: 'message',
    sourceId: 'msg-1',
    description: 'From your first message',
    timestamp: 1000,
  };

  const trace2: SourceTrace = {
    elementPath: 'address.street',
    sourceType: 'message',
    sourceId: 'msg-2',
    description: 'From your message about address',
    timestamp: 2000,
  };

  const trace3: SourceTrace = {
    elementPath: 'name',
    sourceType: 'upload',
    sourceId: 'upload-1',
    description: 'Extracted from uploaded PDF',
    timestamp: 3000,
  };

  const templateTrace: SourceTrace = {
    elementPath: 'income',
    sourceType: 'template',
    sourceId: 'tmpl-housing',
    description: 'From housing intake template',
    timestamp: 500,
  };

  beforeEach(() => {
    manager = new SourceTraceManager();
  });

  describe('addTrace', () => {
    it('adds a trace and retrieves it', () => {
      manager.addTrace(trace1);
      expect(manager.getAllTraces()).toEqual([trace1]);
    });

    it('adds multiple traces', () => {
      manager.addTrace(trace1);
      manager.addTrace(trace2);
      expect(manager.getAllTraces()).toHaveLength(2);
    });

    it('allows multiple traces for the same element path', () => {
      manager.addTrace(trace1);
      manager.addTrace(trace3); // same elementPath 'name', different source
      const traces = manager.getTracesForElement('name');
      expect(traces).toHaveLength(2);
      expect(traces[0].sourceType).toBe('message');
      expect(traces[1].sourceType).toBe('upload');
    });
  });

  describe('getTracesForElement', () => {
    it('returns empty array for unknown path', () => {
      expect(manager.getTracesForElement('nonexistent')).toEqual([]);
    });

    it('returns only traces matching the element path', () => {
      manager.addTrace(trace1);
      manager.addTrace(trace2);
      manager.addTrace(trace3);

      const nameTraces = manager.getTracesForElement('name');
      expect(nameTraces).toHaveLength(2);
      expect(nameTraces.every(t => t.elementPath === 'name')).toBe(true);

      const addrTraces = manager.getTracesForElement('address.street');
      expect(addrTraces).toHaveLength(1);
      expect(addrTraces[0].sourceId).toBe('msg-2');
    });
  });

  describe('getTracesForSource', () => {
    it('returns traces originating from a specific source', () => {
      manager.addTrace(trace1);
      manager.addTrace(trace2);
      manager.addTrace(trace3);

      const msg1Traces = manager.getTracesForSource('msg-1');
      expect(msg1Traces).toHaveLength(1);
      expect(msg1Traces[0].elementPath).toBe('name');
    });

    it('returns empty array for unknown source', () => {
      expect(manager.getTracesForSource('unknown')).toEqual([]);
    });
  });

  describe('removeTracesForElement', () => {
    it('removes all traces for a given element path', () => {
      manager.addTrace(trace1);
      manager.addTrace(trace2);
      manager.addTrace(trace3);

      manager.removeTracesForElement('name');
      expect(manager.getAllTraces()).toHaveLength(1);
      expect(manager.getAllTraces()[0].elementPath).toBe('address.street');
    });

    it('is a no-op for unknown paths', () => {
      manager.addTrace(trace1);
      manager.removeTracesForElement('nonexistent');
      expect(manager.getAllTraces()).toHaveLength(1);
    });
  });

  describe('addTraces (bulk)', () => {
    it('adds multiple traces at once', () => {
      manager.addTraces([trace1, trace2, templateTrace]);
      expect(manager.getAllTraces()).toHaveLength(3);
    });
  });

  describe('clear', () => {
    it('removes all traces', () => {
      manager.addTrace(trace1);
      manager.addTrace(trace2);
      manager.clear();
      expect(manager.getAllTraces()).toEqual([]);
    });
  });

  describe('JSON round-trip', () => {
    it('serializes to JSON and restores', () => {
      manager.addTrace(trace1);
      manager.addTrace(trace2);
      manager.addTrace(templateTrace);

      const json = manager.toJSON();
      const restored = SourceTraceManager.fromJSON(json);

      expect(restored.getAllTraces()).toEqual(manager.getAllTraces());
      expect(restored.getTracesForElement('name')).toEqual(
        manager.getTracesForElement('name'),
      );
    });

    it('round-trips an empty manager', () => {
      const json = manager.toJSON();
      const restored = SourceTraceManager.fromJSON(json);
      expect(restored.getAllTraces()).toEqual([]);
    });
  });
});
