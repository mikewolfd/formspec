import { describe, it, expect, beforeEach } from 'vitest';
import { SessionStore } from '../src/session-store.js';
import type { ChatSessionState, StorageBackend } from '../src/types.js';

/** In-memory storage backend for testing. */
class MemoryStorage implements StorageBackend {
  private data = new Map<string, string>();
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  setItem(key: string, value: string): void { this.data.set(key, value); }
  removeItem(key: string): void { this.data.delete(key); }
}

function makeSession(id: string, overrides?: Partial<ChatSessionState>): ChatSessionState {
  return {
    id,
    messages: [
      { id: 'msg-1', role: 'user', content: 'Hello', timestamp: 1000 },
    ],
    projectSnapshot: {
      definition: { $formspec: '1.0', url: `urn:test:${id}`, version: '0.1.0', status: 'draft', title: 'Test', items: [] } as any,
      component: {} as any,
      theme: {} as any,
      mapping: {} as any,
    },
    traces: [],
    issues: [],
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  };
}

describe('SessionStore', () => {
  let storage: MemoryStorage;
  let store: SessionStore;

  beforeEach(() => {
    storage = new MemoryStorage();
    store = new SessionStore(storage);
  });

  describe('save and load', () => {
    it('saves a session and loads it back', () => {
      const session = makeSession('sess-1');
      store.save(session);

      const loaded = store.load('sess-1');
      expect(loaded).toEqual(session);
    });

    it('returns null for unknown session ID', () => {
      expect(store.load('nonexistent')).toBeNull();
    });

    it('overwrites on save with same ID', () => {
      const session = makeSession('sess-1');
      store.save(session);

      const updated = { ...session, updatedAt: 9999 };
      store.save(updated);

      const loaded = store.load('sess-1');
      expect(loaded!.updatedAt).toBe(9999);
    });
  });

  describe('delete', () => {
    it('removes a saved session', () => {
      store.save(makeSession('sess-1'));
      store.delete('sess-1');
      expect(store.load('sess-1')).toBeNull();
    });

    it('is a no-op for unknown session', () => {
      expect(() => store.delete('nonexistent')).not.toThrow();
    });
  });

  describe('list', () => {
    it('returns empty array when no sessions exist', () => {
      expect(store.list()).toEqual([]);
    });

    it('returns summaries of all saved sessions', () => {
      store.save(makeSession('sess-1', { createdAt: 1000, updatedAt: 2000 }));
      store.save(makeSession('sess-2', { createdAt: 3000, updatedAt: 4000 }));

      const summaries = store.list();
      expect(summaries).toHaveLength(2);
    });

    it('returns summaries sorted by updatedAt descending (most recent first)', () => {
      store.save(makeSession('old', { updatedAt: 1000 }));
      store.save(makeSession('new', { updatedAt: 5000 }));

      const summaries = store.list();
      expect(summaries[0].id).toBe('new');
      expect(summaries[1].id).toBe('old');
    });

    it('includes preview from first user message', () => {
      const session = makeSession('sess-1', {
        messages: [
          { id: 'msg-1', role: 'user', content: 'I need a patient intake form', timestamp: 1000 },
          { id: 'msg-2', role: 'assistant', content: 'Sure!', timestamp: 2000 },
        ],
      });
      store.save(session);

      const summaries = store.list();
      expect(summaries[0].preview).toContain('patient intake');
    });

    it('truncates long preview text', () => {
      const longContent = 'A'.repeat(500);
      const session = makeSession('sess-1', {
        messages: [
          { id: 'msg-1', role: 'user', content: longContent, timestamp: 1000 },
        ],
      });
      store.save(session);

      const summaries = store.list();
      expect(summaries[0].preview.length).toBeLessThanOrEqual(103); // 100 + "..."
    });

    it('includes message count and template ID', () => {
      const session = makeSession('sess-1', {
        messages: [
          { id: 'm1', role: 'user', content: 'hi', timestamp: 1 },
          { id: 'm2', role: 'assistant', content: 'hello', timestamp: 2 },
          { id: 'm3', role: 'user', content: 'more', timestamp: 3 },
        ],
        templateId: 'housing-intake',
      });
      store.save(session);

      const summary = store.list()[0];
      expect(summary.messageCount).toBe(3);
      expect(summary.templateId).toBe('housing-intake');
    });
  });

  describe('data integrity', () => {
    it('sessions survive JSON round-trip (no reference sharing)', () => {
      const session = makeSession('sess-1');
      store.save(session);

      // Mutate the original
      session.messages.push({ id: 'new', role: 'user', content: 'mutated', timestamp: 999 });

      const loaded = store.load('sess-1');
      expect(loaded!.messages).toHaveLength(1); // not mutated
    });
  });
});
