/**
 * Unit tests for pure helper functions in useSessionLifecycle.
 *
 * These functions handle URL parsing, session creation, title inference,
 * group path extraction, and file upload summarization — all critical to
 * the session management flow.
 */

import { describe, expect, it } from 'vitest';
import type { InquestSessionV1 } from 'formspec-shared';
import {
  extractSessionId,
  collectGroupPaths,
  inferSessionTitle,
  summarizeUpload,
} from '../src/hooks/useSession';

/* ── extractSessionId ─────────────────────────── */

describe('extractSessionId', () => {
  it('extracts a UUID from a valid /inquest/session/{id} path', () => {
    expect(extractSessionId('/inquest/session/abc-123')).toBe('abc-123');
  });

  it('extracts a full UUID from a real session path', () => {
    const uuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    expect(extractSessionId(`/inquest/session/${uuid}`)).toBe(uuid);
  });

  it('returns undefined for the bare /inquest/ path', () => {
    expect(extractSessionId('/inquest/')).toBeUndefined();
  });

  it('returns undefined for unrelated paths', () => {
    expect(extractSessionId('/studio/')).toBeUndefined();
    expect(extractSessionId('/')).toBeUndefined();
    expect(extractSessionId('')).toBeUndefined();
  });

  it('does not match /inquest/session/ without an id segment', () => {
    expect(extractSessionId('/inquest/session/')).toBeUndefined();
  });

  it('stops at query params and hash fragments', () => {
    expect(extractSessionId('/inquest/session/abc?e2e=1')).toBe('abc');
    expect(extractSessionId('/inquest/session/abc#section')).toBe('abc');
  });
});

/* ── collectGroupPaths ────────────────────────── */

describe('collectGroupPaths', () => {
  it('returns empty array for empty items list', () => {
    expect(collectGroupPaths([])).toEqual([]);
  });

  it('returns empty array for items with no groups', () => {
    const items = [
      { type: 'field', key: 'name' },
      { type: 'field', key: 'email' },
    ];
    expect(collectGroupPaths(items)).toEqual([]);
  });

  it('extracts top-level group paths', () => {
    const items = [
      { type: 'group', key: 'contact' },
      { type: 'group', key: 'address' },
    ];
    expect(collectGroupPaths(items)).toEqual(['contact', 'address']);
  });

  it('extracts nested group paths with dot notation', () => {
    const items = [
      {
        type: 'group',
        key: 'person',
        children: [
          { type: 'group', key: 'address' },
          { type: 'field', key: 'name' },
        ],
      },
    ];
    expect(collectGroupPaths(items)).toEqual(['person', 'person.address']);
  });

  it('handles deeply nested groups', () => {
    const items = [
      {
        type: 'group',
        key: 'level1',
        children: [
          {
            type: 'group',
            key: 'level2',
            children: [
              { type: 'group', key: 'level3' },
            ],
          },
        ],
      },
    ];
    expect(collectGroupPaths(items)).toEqual([
      'level1',
      'level1.level2',
      'level1.level2.level3',
    ]);
  });

  it('skips items without a key property', () => {
    const items = [
      { type: 'group' }, // no key
      { type: 'group', key: 'valid' },
    ];
    expect(collectGroupPaths(items)).toEqual(['valid']);
  });

  it('handles null/undefined items gracefully', () => {
    expect(collectGroupPaths([null, undefined])).toEqual([]);
  });
});

/* ── inferSessionTitle ────────────────────────── */

describe('inferSessionTitle', () => {
  function makeSession(overrides: Partial<InquestSessionV1> = {}): InquestSessionV1 {
    return {
      version: 1,
      sessionId: 'test-id',
      title: 'Untitled Project',
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

  it('returns the template name when a recognized templateId is set', () => {
    // "housing-intake" is a known template in the template gallery
    const result = inferSessionTitle(makeSession({
      input: { description: '', uploads: [], messages: [], templateId: 'housing-intake' },
    }));
    expect(result).toBe('Housing Intake');
  });

  it('returns first line of description when no template is set', () => {
    const result = inferSessionTitle(makeSession({
      input: { description: 'Build a patient intake form\nwith insurance info', uploads: [], messages: [] },
    }));
    expect(result).toBe('Build a patient intake form');
  });

  it('truncates long descriptions to 48 characters', () => {
    const longDesc = 'A'.repeat(100);
    const result = inferSessionTitle(makeSession({
      input: { description: longDesc, uploads: [], messages: [] },
    }));
    expect(result).toHaveLength(48);
  });

  it('returns "Untitled Project" when neither template nor description exists', () => {
    expect(inferSessionTitle(makeSession())).toBe('Untitled Project');
  });

  it('returns "Untitled Project" when description is only whitespace', () => {
    const result = inferSessionTitle(makeSession({
      input: { description: '   \n  ', uploads: [], messages: [] },
    }));
    expect(result).toBe('Untitled Project');
  });

  it('prefers template name over description when both are present', () => {
    const result = inferSessionTitle(makeSession({
      input: { description: 'Custom description text', uploads: [], messages: [], templateId: 'housing-intake' },
    }));
    expect(result).toBe('Housing Intake');
  });
});

/* ── summarizeUpload ──────────────────────────── */

describe('summarizeUpload', () => {
  it('creates a summary with name, mimeType, and size from a File', async () => {
    const file = new File(['hello world'], 'test.txt', { type: 'text/plain' });
    const summary = await summarizeUpload(file);

    expect(summary.name).toBe('test.txt');
    expect(summary.mimeType).toBe('text/plain');
    expect(summary.size).toBe(11);
    expect(summary.status).toBe('processed');
    expect(summary.id).toBeTruthy();
    expect(summary.createdAt).toBeTruthy();
  });

  it('extracts excerpt from text files', async () => {
    const content = 'This is some text content';
    const file = new File([content], 'readme.txt', { type: 'text/plain' });
    const summary = await summarizeUpload(file);

    expect(summary.excerpt).toBe(content);
  });

  it('extracts excerpt from JSON files', async () => {
    const json = JSON.stringify({ key: 'value' });
    const file = new File([json], 'data.json', { type: 'application/json' });
    const summary = await summarizeUpload(file);

    expect(summary.excerpt).toBe(json);
  });

  it('truncates excerpt to 240 characters', async () => {
    const longContent = 'x'.repeat(500);
    const file = new File([longContent], 'long.txt', { type: 'text/plain' });
    const summary = await summarizeUpload(file);

    expect(summary.excerpt).toHaveLength(240);
  });

  it('does not extract excerpt from binary files', async () => {
    const file = new File([new Uint8Array([0, 1, 2])], 'image.png', { type: 'image/png' });
    const summary = await summarizeUpload(file);

    expect(summary.excerpt).toBeUndefined();
  });

  it('defaults mimeType to application/octet-stream when not provided', async () => {
    const file = new File(['data'], 'unknown', { type: '' });
    const summary = await summarizeUpload(file);

    expect(summary.mimeType).toBe('application/octet-stream');
  });

  it('generates unique IDs for each upload', async () => {
    const file1 = new File(['a'], 'a.txt', { type: 'text/plain' });
    const file2 = new File(['b'], 'b.txt', { type: 'text/plain' });
    const [s1, s2] = await Promise.all([summarizeUpload(file1), summarizeUpload(file2)]);

    expect(s1.id).not.toBe(s2.id);
  });
});
