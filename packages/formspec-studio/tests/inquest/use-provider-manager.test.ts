/**
 * Unit tests for useProviderManager hook.
 *
 * Tests the provider key management and connection logic:
 * - isSetupRequired gate (controls whether setup panel blocks the chat UI)
 * - handleCredentialsCleared resets state
 * - handleProviderSelected switches provider, clears connection
 *
 * All tests use a mock adapter to avoid real API calls.
 */

import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProviderManager } from '../../src/inquest-app/hooks/useProviderManager';
import type { InquestProviderAdapter, InquestSessionV1 } from '../../src/shared/contracts/inquest';

/* ── Fixtures ────────────────────────────────────── */

beforeEach(() => {
  localStorage.clear();
});

function makeSession(overrides: Partial<InquestSessionV1> = {}): InquestSessionV1 {
  return {
    version: 1,
    sessionId: 'sess-1',
    title: 'Test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phase: 'inputs',
    mode: 'new-project',
    workflowMode: 'verify-carefully',
    input: { description: '', uploads: [], messages: [] },
    issues: [],
    ...overrides,
  };
}

function makeAdapter(id: string, overrides: Partial<InquestProviderAdapter> = {}): InquestProviderAdapter {
  return {
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    capabilities: { chat: true, images: false, pdf: false, structuredOutput: true, streaming: false },
    testConnection: vi.fn().mockResolvedValue({ ok: true, message: `${id} connected` }),
    runAnalysis: vi.fn(),
    runProposal: vi.fn(),
    runEdit: vi.fn(),
    ...overrides,
  };
}

/* ── Tests ───────────────────────────────────────── */

describe('useProviderManager — isSetupRequired', () => {
  it('is true when session has no providerId', () => {
    const session = makeSession({ providerId: undefined });
    const adapters = [makeAdapter('gemini')];

    const { result } = renderHook(() => useProviderManager(session, adapters));

    expect(result.current.isSetupRequired).toBe(true);
  });

  it('is true when providerId is set but no API key has been entered', () => {
    const session = makeSession({ providerId: 'gemini' });
    const adapters = [makeAdapter('gemini')];

    const { result } = renderHook(() => useProviderManager(session, adapters));

    // No key stored, providerApiKey defaults to ''
    expect(result.current.providerApiKey).toBe('');
    expect(result.current.isSetupRequired).toBe(true);
  });

  it('is true when API key is set but provider is not yet marked ready', () => {
    const session = makeSession({ providerId: 'gemini' });
    const adapters = [makeAdapter('gemini')];

    const { result } = renderHook(() => useProviderManager(session, adapters));

    act(() => { result.current.setProviderApiKey('my-key'); });

    // Key is set but providerReady is still false (user hasn't tested or continued)
    expect(result.current.providerApiKey).toBe('my-key');
    expect(result.current.isSetupRequired).toBe(true);
  });

  it('is false when providerId, API key, and providerReady are all set', () => {
    const session = makeSession({ providerId: 'gemini' });
    const adapters = [makeAdapter('gemini')];

    const { result } = renderHook(() => useProviderManager(session, adapters));

    act(() => {
      result.current.setProviderApiKey('my-api-key');
      result.current.setProviderReady(true);
    });

    expect(result.current.isSetupRequired).toBe(false);
  });
});

describe('useProviderManager — handleTestConnection', () => {
  it('calls the adapter testConnection and reflects the result', async () => {
    const adapter = makeAdapter('gemini', {
      testConnection: vi.fn().mockResolvedValue({ ok: true, message: 'Connected!' }),
    });
    const session = makeSession({ providerId: 'gemini' });

    const { result } = renderHook(() => useProviderManager(session, [adapter]));

    act(() => { result.current.setProviderApiKey('test-key'); });

    await act(async () => {
      await result.current.handleTestConnection();
    });

    expect(adapter.testConnection).toHaveBeenCalledWith({ apiKey: 'test-key' });
    expect(result.current.connection?.ok).toBe(true);
    expect(result.current.connection?.message).toBe('Connected!');
  });

  it('shows failed connection result when adapter returns ok: false', async () => {
    const adapter = makeAdapter('gemini', {
      testConnection: vi.fn().mockResolvedValue({ ok: false, message: 'Invalid API key' }),
    });
    const session = makeSession({ providerId: 'gemini' });

    const { result } = renderHook(() => useProviderManager(session, [adapter]));

    act(() => { result.current.setProviderApiKey('bad-key'); });

    await act(async () => {
      await result.current.handleTestConnection();
    });

    expect(result.current.connection?.ok).toBe(false);
    expect(result.current.connection?.message).toBe('Invalid API key');
  });

  it('does nothing when session has no providerId', async () => {
    const adapter = makeAdapter('gemini');
    const session = makeSession({ providerId: undefined });

    const { result } = renderHook(() => useProviderManager(session, [adapter]));

    await act(async () => {
      await result.current.handleTestConnection();
    });

    expect(adapter.testConnection).not.toHaveBeenCalled();
  });
});

describe('useProviderManager — handleCredentialsCleared', () => {
  it('resets API key, rememberKey, and connection when credentials are cleared', async () => {
    const adapter = makeAdapter('gemini');
    const session = makeSession({ providerId: 'gemini' });

    const { result } = renderHook(() => useProviderManager(session, [adapter]));

    // Set up state
    act(() => {
      result.current.setProviderApiKey('some-key');
      result.current.setRememberKey(true);
    });

    // Test connection to get a connection result
    await act(async () => {
      await result.current.handleTestConnection();
    });

    expect(result.current.connection).toBeDefined();
    expect(result.current.providerApiKey).toBe('some-key');

    // Now clear credentials
    act(() => {
      result.current.handleCredentialsCleared('gemini');
    });

    expect(result.current.providerApiKey).toBe('');
    expect(result.current.rememberKey).toBe(false);
    expect(result.current.connection).toBeUndefined();
  });
});

describe('useProviderManager — handleProviderSelected', () => {
  it('clears connection and resets providerReady when switching providers', () => {
    const adapters = [makeAdapter('gemini'), makeAdapter('openai')];
    const session = makeSession({ providerId: 'gemini' });
    const updateSession = vi.fn();

    const { result } = renderHook(() => useProviderManager(session, adapters));

    // Simulate being connected with gemini
    act(() => {
      result.current.setProviderApiKey('gemini-key');
      result.current.setProviderReady(true);
    });

    expect(result.current.isSetupRequired).toBe(false);

    // Switch to openai
    act(() => {
      result.current.handleProviderSelected('openai', updateSession);
    });

    // After switching, setup is required again (new provider needs its own key)
    expect(result.current.isSetupRequired).toBe(true);
    expect(result.current.connection).toBeUndefined();
    expect(result.current.providerReady).toBe(false);
  });

  it('updates the session with the new providerId', () => {
    const adapters = [makeAdapter('gemini'), makeAdapter('openai')];
    const session = makeSession({ providerId: 'gemini' });
    const updateSession = vi.fn();

    const { result } = renderHook(() => useProviderManager(session, adapters));

    act(() => {
      result.current.handleProviderSelected('openai', updateSession);
    });

    expect(updateSession).toHaveBeenCalledOnce();
    const updaterFn = updateSession.mock.calls[0][0];
    const nextSession = updaterFn(session);
    expect(nextSession.providerId).toBe('openai');
  });
});
