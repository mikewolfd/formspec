/**
 * Unit tests for useInquestOps hook.
 *
 * Tests the state machine behaviors of the core AI operations hook:
 * - handleAnalyze early-return guards (empty input vs template-only)
 * - Error handling when providers fail
 * - Error dismiss behavior
 *
 * Uses renderHook to test hook logic in isolation, with a controlled
 * mock provider to deterministically control success/failure.
 */

import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useInquestOps } from '../../src/inquest-app/hooks/useInquestOps';
import type {
  InquestProviderAdapter,
  InquestSessionV1,
  InquestTemplate,
} from '../../src/shared/contracts/inquest';
import { buildAnalysis, buildProposal } from '../../src/shared/providers';

/* ── Fixtures ────────────────────────────────────── */

function makeSession(overrides: Partial<InquestSessionV1> = {}): InquestSessionV1 {
  return {
    version: 1,
    sessionId: 'sess-1',
    title: 'Test Session',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phase: 'inputs',
    mode: 'new-project',
    workflowMode: 'verify-carefully',
    input: {
      description: '',
      uploads: [],
      messages: [],
      templateId: undefined,
    },
    issues: [],
    ...overrides,
  };
}

function makeProvider(overrides: Partial<InquestProviderAdapter> = {}): InquestProviderAdapter {
  return {
    id: 'mock',
    label: 'Mock',
    capabilities: { chat: true, images: false, pdf: false, structuredOutput: true, streaming: false },
    testConnection: vi.fn().mockResolvedValue({ ok: true, message: 'OK' }),
    runAnalysis: vi.fn().mockImplementation(async (input) => buildAnalysis(input)),
    runProposal: vi.fn().mockImplementation(async (input) => buildProposal(input)),
    runEdit: vi.fn().mockResolvedValue({ commands: [], issues: [], explanation: '' }),
    ...overrides,
  };
}

/* ── Tests ───────────────────────────────────────── */

describe('useInquestOps — handleAnalyze early-return guard', () => {
  it('does NOT call the provider when description is empty and no template is selected', async () => {
    const provider = makeProvider();
    const session = makeSession({ input: { description: '', uploads: [], messages: [] } });
    const updateSession = vi.fn();
    const setDraft = vi.fn();

    const { result } = renderHook(() =>
      useInquestOps(session, null, setDraft, provider, undefined, updateSession),
    );

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(provider.runAnalysis).not.toHaveBeenCalled();
    expect(updateSession).not.toHaveBeenCalled();
  });

  it('DOES call the provider when description is empty but a template is selected', async () => {
    const provider = makeProvider();
    const template: InquestTemplate = {
      id: 'housing-intake',
      name: 'Housing Intake',
      description: 'Test template',
      seedAnalysis: { fields: [{ key: 'name', label: 'Name', dataType: 'string', required: true, sourceIds: ['template'] }], sections: [], rules: [], repeats: [], routes: [] },
    };
    const session = makeSession({
      input: { description: '', uploads: [], messages: [], templateId: 'housing-intake' },
    });
    const updateSession = vi.fn();
    const setDraft = vi.fn();

    const { result } = renderHook(() =>
      useInquestOps(session, null, setDraft, provider, template, updateSession),
    );

    await act(async () => {
      await result.current.handleAnalyze();
    });

    // Provider should be called with the session and template
    expect(provider.runAnalysis).toHaveBeenCalledOnce();
    // Session should transition to review phase
    expect(updateSession).toHaveBeenCalled();
    const updaterFn = updateSession.mock.calls[0][0];
    const nextSession = updaterFn(session);
    expect(nextSession.phase).toBe('review');
    expect(nextSession.analysis).toBeDefined();
  });

  it('DOES call the provider when description is non-empty (normal flow)', async () => {
    const provider = makeProvider();
    const session = makeSession({
      input: {
        description: 'Build a patient intake form with demographics and medical history',
        uploads: [],
        messages: [],
      },
    });
    const updateSession = vi.fn();
    const setDraft = vi.fn();

    const { result } = renderHook(() =>
      useInquestOps(session, null, setDraft, provider, undefined, updateSession),
    );

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(provider.runAnalysis).toHaveBeenCalledOnce();
  });
});

describe('useInquestOps — handleAnalyze error handling', () => {
  it('sets operationError when the provider throws', async () => {
    const provider = makeProvider({
      runAnalysis: vi.fn().mockRejectedValue(new Error('Network timeout')),
    });
    const session = makeSession({
      input: {
        description: 'Build a complex intake form with many fields',
        uploads: [],
        messages: [],
      },
    });
    const updateSession = vi.fn();
    const setDraft = vi.fn();

    const { result } = renderHook(() =>
      useInquestOps(session, null, setDraft, provider, undefined, updateSession),
    );

    expect(result.current.operationError).toBeNull();

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(result.current.operationError).toBe('Network timeout');
    // Session should NOT transition (error case)
    expect(updateSession).not.toHaveBeenCalled();
  });

  it('shows a fallback error message when the thrown value is not an Error instance', async () => {
    const provider = makeProvider({
      runAnalysis: vi.fn().mockRejectedValue('string-error'),
    });
    const session = makeSession({
      input: { description: 'Build a grant application form for nonprofits', uploads: [], messages: [] },
    });
    const updateSession = vi.fn();
    const setDraft = vi.fn();

    const { result } = renderHook(() =>
      useInquestOps(session, null, setDraft, provider, undefined, updateSession),
    );

    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(result.current.operationError).toBe('Analysis failed. Please try again.');
  });

  it('resets isAnalyzing to false after analysis completes', async () => {
    const provider = makeProvider({
      runAnalysis: vi.fn().mockImplementation(async (input) => {
        await new Promise((r) => setTimeout(r, 10));
        return buildAnalysis(input);
      }),
    });
    const session = makeSession({
      input: { description: 'Build an event registration form', uploads: [], messages: [] },
    });
    const updateSession = vi.fn();
    const setDraft = vi.fn();

    const { result } = renderHook(() =>
      useInquestOps(session, null, setDraft, provider, undefined, updateSession),
    );

    expect(result.current.isAnalyzing).toBe(false);

    // After the full async cycle completes, isAnalyzing resets to false
    await act(async () => {
      await result.current.handleAnalyze();
    });

    expect(result.current.isAnalyzing).toBe(false);
    // And the session was updated (analysis ran)
    expect(updateSession).toHaveBeenCalled();
  });

  it('clears a previous error when analysis is retried and succeeds', async () => {
    const provider = makeProvider({
      runAnalysis: vi.fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockImplementationOnce(async (input) => buildAnalysis(input)),
    });
    const session = makeSession({
      input: { description: 'Build a customer survey with NPS and feedback', uploads: [], messages: [] },
    });
    const updateSession = vi.fn();
    const setDraft = vi.fn();

    const { result } = renderHook(() =>
      useInquestOps(session, null, setDraft, provider, undefined, updateSession),
    );

    // First attempt fails
    await act(async () => { await result.current.handleAnalyze(); });
    expect(result.current.operationError).toBe('First attempt failed');

    // Second attempt succeeds — error should be cleared
    await act(async () => { await result.current.handleAnalyze(); });
    expect(result.current.operationError).toBeNull();
  });
});

describe('useInquestOps — clearOperationError', () => {
  it('clears the operation error when called', async () => {
    const provider = makeProvider({
      runAnalysis: vi.fn().mockRejectedValue(new Error('Boom')),
    });
    const session = makeSession({
      input: { description: 'Build a screening questionnaire for eligibility', uploads: [], messages: [] },
    });
    const updateSession = vi.fn();
    const setDraft = vi.fn();

    const { result } = renderHook(() =>
      useInquestOps(session, null, setDraft, provider, undefined, updateSession),
    );

    await act(async () => { await result.current.handleAnalyze(); });
    expect(result.current.operationError).toBe('Boom');

    act(() => { result.current.clearOperationError(); });
    expect(result.current.operationError).toBeNull();
  });
});
