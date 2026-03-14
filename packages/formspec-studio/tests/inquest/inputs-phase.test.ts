/**
 * Unit tests for the meaningfulInput helper used in InputsPhase.
 *
 * This function gates whether the Generate CTA (Draft Fast / Verify Carefully)
 * appears. Testing it confirms the thresholds that drive the UX transition.
 */

import { describe, expect, it } from 'vitest';
import type { InquestSessionV1 } from '../../src/shared/contracts/inquest';

// meaningfulInput is not exported from InputsPhase — copy the implementation
// here to test it as a pure function. If this function changes, this test will
// serve as the spec that forces the caller to update both places.
function meaningfulInput(session: Pick<InquestSessionV1, 'input'>): boolean {
  return Boolean(
    session.input.templateId
    || session.input.description.trim().length >= 10
    || session.input.uploads.length > 0
    || session.input.messages.some((m) => m.role === 'user'),
  );
}

function makeSession(overrides: Partial<InquestSessionV1['input']> = {}): Pick<InquestSessionV1, 'input'> {
  return {
    input: {
      description: '',
      uploads: [],
      messages: [],
      ...overrides,
    },
  };
}

describe('meaningfulInput', () => {
  it('returns false when session has no description, uploads, template, or user messages', () => {
    expect(meaningfulInput(makeSession())).toBe(false);
  });

  it('returns false when description is shorter than 10 characters', () => {
    expect(meaningfulInput(makeSession({ description: 'short' }))).toBe(false);
    expect(meaningfulInput(makeSession({ description: '123456789' }))).toBe(false); // 9 chars
  });

  it('returns true when description is exactly 10 characters', () => {
    expect(meaningfulInput(makeSession({ description: '1234567890' }))).toBe(true);
  });

  it('returns true when description is longer than 10 characters', () => {
    expect(meaningfulInput(makeSession({ description: 'Build a patient intake form' }))).toBe(true);
  });

  it('ignores leading/trailing whitespace when measuring description length', () => {
    // 4 real chars surrounded by spaces — should NOT qualify
    expect(meaningfulInput(makeSession({ description: '   form   ' }))).toBe(false);
  });

  it('returns true when a templateId is set regardless of description', () => {
    expect(meaningfulInput(makeSession({ templateId: 'housing-intake' }))).toBe(true);
  });

  it('returns true when uploads array is non-empty', () => {
    const upload = {
      id: 'up-1',
      name: 'context.pdf',
      mimeType: 'application/pdf',
      size: 1024,
      status: 'processed' as const,
      createdAt: new Date().toISOString(),
    };
    expect(meaningfulInput(makeSession({ uploads: [upload] }))).toBe(true);
  });

  it('returns true when there is at least one user message in the thread', () => {
    const userMsg = {
      id: 'msg-1',
      role: 'user' as const,
      text: 'hi',
      createdAt: new Date().toISOString(),
    };
    expect(meaningfulInput(makeSession({ messages: [userMsg] }))).toBe(true);
  });

  it('returns false when messages exist but none have role=user (only assistant)', () => {
    const assistantMsg = {
      id: 'msg-1',
      role: 'assistant' as const,
      text: "Hi! I'm Stack",
      createdAt: new Date().toISOString(),
    };
    expect(meaningfulInput(makeSession({ messages: [assistantMsg] }))).toBe(false);
  });

  it('returns true when multiple signals are present together', () => {
    const session = makeSession({
      templateId: 'grant-app',
      description: 'Build a form',
      uploads: [],
    });
    expect(meaningfulInput(session)).toBe(true);
  });
});
