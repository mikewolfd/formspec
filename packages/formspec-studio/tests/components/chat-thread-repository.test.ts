/** @filedesc Tests for the dependency-inverted chat-thread repository adapter. */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ChatSessionState } from '@formspec-org/chat';
import {
  LocalChatThreadRepository,
  clearAllLocalChatThreadScopes,
  createLocalChatThreadRepository,
} from '../../src/components/chat/chat-thread-repository.js';

function makeState(id: string, updatedAt: number): ChatSessionState {
  return {
    id,
    messages: [{
      id: `m-${id}`,
      role: 'user',
      content: `hello-${id}`,
      timestamp: updatedAt,
    }],
    projectSnapshot: { definition: null },
    traces: [],
    issues: [],
    createdAt: updatedAt - 1000,
    updatedAt,
  };
}

beforeEach(() => {
  clearAllLocalChatThreadScopes(localStorage);
});

afterEach(() => {
  clearAllLocalChatThreadScopes(localStorage);
});

describe('LocalChatThreadRepository', () => {
  it('scopes list/load results by projectScope', async () => {
    const repo = createLocalChatThreadRepository(localStorage);
    await repo.saveThread(makeState('a', 1), { projectScope: 'one' });
    await repo.saveThread(makeState('b', 2), { projectScope: 'two' });

    const one = await repo.listThreads({ projectScope: 'one' });
    const two = await repo.listThreads({ projectScope: 'two' });
    expect(one.items.map((item) => item.id)).toEqual(['a']);
    expect(two.items.map((item) => item.id)).toEqual(['b']);
  });

  it('stores versioned session envelopes in localStorage', async () => {
    const repo = createLocalChatThreadRepository(localStorage);
    await repo.saveThread(makeState('abc', 11), { projectScope: 'version' });

    const keys = Object.keys(localStorage);
    const sessionKey = keys.find((key) => key.includes('scope:version:formspec-chat:session:abc'));
    expect(sessionKey).toBeDefined();
    const raw = localStorage.getItem(sessionKey!);
    expect(raw).toContain('"schemaVersion":1');
    expect(raw).toContain('"state"');
  });

  it('enforces bounded retention by dropping oldest threads', async () => {
    const repo = new LocalChatThreadRepository(localStorage, { maxThreads: 2 });
    await repo.saveThread(makeState('oldest', 10), { projectScope: 'retention' });
    await repo.saveThread(makeState('middle', 20), { projectScope: 'retention' });
    await repo.saveThread(makeState('newest', 30), { projectScope: 'retention' });

    const listed = await repo.listThreads({ projectScope: 'retention' });
    expect(listed.items.map((item) => item.id)).toEqual(['newest', 'middle']);
  });

  it('checks expectedRevision when provided', async () => {
    const repo = createLocalChatThreadRepository(localStorage);
    const first = makeState('rev', 100);
    const saved = await repo.saveThread(first, { projectScope: 'rev' });
    await expect(repo.saveThread(makeState('rev', 200), {
      projectScope: 'rev',
      expectedRevision: saved.revision,
    })).resolves.toBeDefined();

    await expect(repo.saveThread(makeState('rev', 300), {
      projectScope: 'rev',
      expectedRevision: 'stale-revision',
    })).rejects.toThrow(/revision conflict/i);
  });
});
