/**
 * Unit tests for pure logic functions in useSessionLifecycle and related modules.
 *
 * These functions have no UI dependencies — test them directly without React
 * rendering. This is the most reliable layer for verifying business logic.
 */

import { describe, expect, it } from 'vitest';
import { syncIssueStatuses, issueBundle } from '../../src/inquest-app/hooks/useSessionLifecycle';
import type { InquestIssue, AnalysisV1, ProposalV1 } from '../../src/shared/contracts/inquest';

/* ── Test fixtures ──────────────────────────────── */

function makeIssue(overrides: Partial<InquestIssue> = {}): InquestIssue {
  return {
    id: 'issue-1',
    title: 'Test issue',
    message: 'A test issue',
    severity: 'warning',
    source: 'analysis',
    status: 'open',
    blocking: false,
    confidence: 'medium',
    ...overrides,
  };
}

function makeAnalysis(overrides: Partial<AnalysisV1> = {}): AnalysisV1 {
  return {
    summary: 'Test analysis',
    requirements: { fields: [], sections: [], rules: [], repeats: [], routes: [] },
    issues: [],
    trace: {},
    ...overrides,
  };
}

function makeProposal(overrides: Partial<ProposalV1> = {}): ProposalV1 {
  return {
    definition: {},
    issues: [],
    trace: {},
    summary: { fieldCount: 0, sectionCount: 0, bindCount: 0, shapeCount: 0, variableCount: 0, coverage: 0 },
    ...overrides,
  };
}

/* ── syncIssueStatuses ──────────────────────────── */

describe('syncIssueStatuses', () => {
  it('preserves the status from the previous issues when IDs match', () => {
    const nextIssues = [makeIssue({ id: 'a', status: 'open' })];
    const previousIssues = [makeIssue({ id: 'a', status: 'resolved' })];

    const result = syncIssueStatuses(nextIssues, previousIssues);

    expect(result[0].status).toBe('resolved');
  });

  it('keeps the status from the next issue when there is no previous match', () => {
    const nextIssues = [makeIssue({ id: 'new-issue', status: 'open' })];
    const previousIssues = [makeIssue({ id: 'different-id', status: 'deferred' })];

    const result = syncIssueStatuses(nextIssues, previousIssues);

    expect(result[0].status).toBe('open');
  });

  it('preserves all other fields from the next issue when syncing status', () => {
    const nextIssues = [makeIssue({ id: 'a', title: 'Updated title', severity: 'error' })];
    const previousIssues = [makeIssue({ id: 'a', title: 'Old title', severity: 'warning', status: 'deferred' })];

    const result = syncIssueStatuses(nextIssues, previousIssues);

    expect(result[0].title).toBe('Updated title');
    expect(result[0].severity).toBe('error');
    expect(result[0].status).toBe('deferred');
  });

  it('returns empty array when next issues is empty', () => {
    const result = syncIssueStatuses([], [makeIssue({ id: 'a', status: 'resolved' })]);
    expect(result).toHaveLength(0);
  });

  it('handles multiple issues, preserving each matched status independently', () => {
    const nextIssues = [
      makeIssue({ id: 'a', status: 'open' }),
      makeIssue({ id: 'b', status: 'open' }),
      makeIssue({ id: 'c', status: 'open' }),
    ];
    const previousIssues = [
      makeIssue({ id: 'a', status: 'resolved' }),
      makeIssue({ id: 'b', status: 'deferred' }),
      // 'c' not in previous — keeps 'open'
    ];

    const result = syncIssueStatuses(nextIssues, previousIssues);

    expect(result[0].status).toBe('resolved');
    expect(result[1].status).toBe('deferred');
    expect(result[2].status).toBe('open');
  });

  it('handles deferred status being preserved across updates', () => {
    const issue = makeIssue({ id: 'a', status: 'open' });
    const deferred = makeIssue({ id: 'a', status: 'deferred' });

    // First sync: user defers the issue
    const after = syncIssueStatuses([issue], [deferred]);
    expect(after[0].status).toBe('deferred');

    // Second sync: same issue comes in next round — deferred is preserved
    const again = syncIssueStatuses([issue], after);
    expect(again[0].status).toBe('deferred');
  });
});

/* ── issueBundle ──────────────────────────────────── */

describe('issueBundle', () => {
  it('returns empty array when no analysis, proposal, existing issues, or draft provided', () => {
    const result = issueBundle([], undefined, undefined, null);
    expect(result).toHaveLength(0);
  });

  it('includes issues from analysis', () => {
    const analysisIssue = makeIssue({ id: 'analysis-1', source: 'analysis' });
    const analysis = makeAnalysis({ issues: [analysisIssue] });

    const result = issueBundle([], analysis, undefined, null);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('analysis-1');
  });

  it('includes issues from proposal', () => {
    const proposalIssue = makeIssue({ id: 'proposal-1', source: 'proposal' });
    const proposal = makeProposal({ issues: [proposalIssue] });

    const result = issueBundle([], undefined, proposal, null);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('proposal-1');
  });

  it('merges analysis and proposal issues, deduplicating by id', () => {
    const sharedIssue = makeIssue({ id: 'shared', source: 'analysis' });
    const proposalVersionOfShared = makeIssue({ id: 'shared', source: 'proposal', severity: 'error' });
    const uniqueProposalIssue = makeIssue({ id: 'unique', source: 'proposal' });

    const analysis = makeAnalysis({ issues: [sharedIssue] });
    const proposal = makeProposal({ issues: [proposalVersionOfShared, uniqueProposalIssue] });

    const result = issueBundle([], analysis, proposal, null);

    // IDs should be unique
    const ids = result.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('excludes existing diagnostic issues (they are regenerated from draft)', () => {
    const diagnosticIssue = makeIssue({ id: 'diag-1', source: 'diagnostic' });
    const analysisIssue = makeIssue({ id: 'analysis-1', source: 'analysis' });

    const analysis = makeAnalysis({ issues: [analysisIssue] });

    // Diagnostic issue in existing issues should not be re-included (it gets regenerated from draft)
    const result = issueBundle([diagnosticIssue], analysis, undefined, null);

    const ids = result.map((i) => i.id);
    expect(ids).not.toContain('diag-1');
  });

  it('preserves status of existing issues when they appear in the merged result', () => {
    const existingIssue = makeIssue({ id: 'analysis-1', source: 'analysis', status: 'deferred' });
    const nextAnalysisIssue = makeIssue({ id: 'analysis-1', source: 'analysis', status: 'open' });

    const analysis = makeAnalysis({ issues: [nextAnalysisIssue] });

    const result = issueBundle([existingIssue], analysis, undefined, null);

    const found = result.find((i) => i.id === 'analysis-1');
    expect(found?.status).toBe('deferred');
  });

  it('includes non-diagnostic existing issues that are not in analysis/proposal', () => {
    const handoffIssue = makeIssue({ id: 'handoff-1', source: 'handoff' });

    const result = issueBundle([handoffIssue], undefined, undefined, null);

    expect(result.find((i) => i.id === 'handoff-1')).toBeDefined();
  });
});
