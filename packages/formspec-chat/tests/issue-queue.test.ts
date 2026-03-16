import { describe, it, expect, beforeEach } from 'vitest';
import { IssueQueue } from '../src/issue-queue.js';
import type { Issue } from '../src/types.js';

describe('IssueQueue', () => {
  let queue: IssueQueue;

  beforeEach(() => {
    queue = new IssueQueue();
  });

  describe('addIssue', () => {
    it('adds an issue with generated id and open status', () => {
      const issue = queue.addIssue({
        severity: 'error',
        category: 'missing-config',
        title: 'Missing email validation',
        description: 'The email field has no format constraint.',
        elementPath: 'email',
        sourceIds: ['msg-1'],
      });

      expect(issue.id).toBeTruthy();
      expect(issue.status).toBe('open');
      expect(issue.title).toBe('Missing email validation');
    });

    it('assigns unique IDs to each issue', () => {
      const a = queue.addIssue({
        severity: 'warning',
        category: 'low-confidence',
        title: 'Issue A',
        description: 'A',
        sourceIds: [],
      });
      const b = queue.addIssue({
        severity: 'info',
        category: 'low-confidence',
        title: 'Issue B',
        description: 'B',
        sourceIds: [],
      });
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('resolveIssue', () => {
    it('marks an issue as resolved', () => {
      const issue = queue.addIssue({
        severity: 'error',
        category: 'contradiction',
        title: 'Conflicting sources',
        description: 'Upload and message disagree on field type.',
        sourceIds: ['msg-1', 'upload-1'],
      });

      queue.resolveIssue(issue.id, 'msg-5');

      const resolved = queue.getAllIssues().find(i => i.id === issue.id)!;
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolvedBy).toBe('msg-5');
    });

    it('throws on unknown issue id', () => {
      expect(() => queue.resolveIssue('nonexistent')).toThrow();
    });

    it('throws when resolving already resolved issue', () => {
      const issue = queue.addIssue({
        severity: 'warning',
        category: 'low-confidence',
        title: 'Test',
        description: 'Test',
        sourceIds: [],
      });
      queue.resolveIssue(issue.id);
      expect(() => queue.resolveIssue(issue.id)).toThrow();
    });
  });

  describe('deferIssue', () => {
    it('marks an issue as deferred', () => {
      const issue = queue.addIssue({
        severity: 'info',
        category: 'low-confidence',
        title: 'AI uncertain about field type',
        description: 'Could be text or number.',
        elementPath: 'amount',
        sourceIds: ['msg-2'],
      });

      queue.deferIssue(issue.id);

      const deferred = queue.getAllIssues().find(i => i.id === issue.id)!;
      expect(deferred.status).toBe('deferred');
    });

    it('throws on unknown issue id', () => {
      expect(() => queue.deferIssue('nonexistent')).toThrow();
    });
  });

  describe('reopenIssue', () => {
    it('reopens a resolved issue', () => {
      const issue = queue.addIssue({
        severity: 'error',
        category: 'validation',
        title: 'Test',
        description: 'Test',
        sourceIds: [],
      });
      queue.resolveIssue(issue.id);
      queue.reopenIssue(issue.id);

      const reopened = queue.getAllIssues().find(i => i.id === issue.id)!;
      expect(reopened.status).toBe('open');
      expect(reopened.resolvedBy).toBeUndefined();
    });

    it('reopens a deferred issue', () => {
      const issue = queue.addIssue({
        severity: 'warning',
        category: 'low-confidence',
        title: 'Test',
        description: 'Test',
        sourceIds: [],
      });
      queue.deferIssue(issue.id);
      queue.reopenIssue(issue.id);

      expect(queue.getAllIssues().find(i => i.id === issue.id)!.status).toBe('open');
    });

    it('throws when reopening already open issue', () => {
      const issue = queue.addIssue({
        severity: 'info',
        category: 'low-confidence',
        title: 'Test',
        description: 'Test',
        sourceIds: [],
      });
      expect(() => queue.reopenIssue(issue.id)).toThrow();
    });
  });

  describe('filtering', () => {
    let errorIssue: Issue;
    let warningIssue: Issue;
    let infoIssue: Issue;

    beforeEach(() => {
      errorIssue = queue.addIssue({
        severity: 'error',
        category: 'missing-config',
        title: 'Error issue',
        description: 'An error',
        elementPath: 'field_a',
        sourceIds: ['msg-1'],
      });
      warningIssue = queue.addIssue({
        severity: 'warning',
        category: 'contradiction',
        title: 'Warning issue',
        description: 'A warning',
        elementPath: 'field_b',
        sourceIds: ['msg-2'],
      });
      infoIssue = queue.addIssue({
        severity: 'info',
        category: 'low-confidence',
        title: 'Info issue',
        description: 'An info',
        sourceIds: [],
      });
    });

    it('getOpenIssues returns only open issues', () => {
      queue.resolveIssue(errorIssue.id);
      const open = queue.getOpenIssues();
      expect(open).toHaveLength(2);
      expect(open.every(i => i.status === 'open')).toBe(true);
    });

    it('getIssuesByElement returns issues for a specific path', () => {
      const issues = queue.getIssuesByElement('field_a');
      expect(issues).toHaveLength(1);
      expect(issues[0].title).toBe('Error issue');
    });

    it('getIssuesByElement returns empty for unknown path', () => {
      expect(queue.getIssuesByElement('unknown')).toEqual([]);
    });
  });

  describe('getIssueCount', () => {
    it('returns correct counts by status', () => {
      const a = queue.addIssue({
        severity: 'error',
        category: 'missing-config',
        title: 'A',
        description: 'A',
        sourceIds: [],
      });
      const b = queue.addIssue({
        severity: 'warning',
        category: 'low-confidence',
        title: 'B',
        description: 'B',
        sourceIds: [],
      });
      queue.addIssue({
        severity: 'info',
        category: 'low-confidence',
        title: 'C',
        description: 'C',
        sourceIds: [],
      });

      queue.resolveIssue(a.id);
      queue.deferIssue(b.id);

      expect(queue.getIssueCount()).toEqual({
        open: 1,
        resolved: 1,
        deferred: 1,
      });
    });

    it('returns all zeros for empty queue', () => {
      expect(queue.getIssueCount()).toEqual({
        open: 0,
        resolved: 0,
        deferred: 0,
      });
    });
  });

  describe('removeIssuesForElement', () => {
    it('removes all issues linked to an element path', () => {
      queue.addIssue({
        severity: 'error',
        category: 'missing-config',
        title: 'A',
        description: 'A',
        elementPath: 'name',
        sourceIds: [],
      });
      queue.addIssue({
        severity: 'warning',
        category: 'low-confidence',
        title: 'B',
        description: 'B',
        elementPath: 'email',
        sourceIds: [],
      });

      queue.removeIssuesForElement('name');
      expect(queue.getAllIssues()).toHaveLength(1);
      expect(queue.getAllIssues()[0].elementPath).toBe('email');
    });
  });

  describe('JSON round-trip', () => {
    it('serializes and restores full state', () => {
      const issue = queue.addIssue({
        severity: 'error',
        category: 'contradiction',
        title: 'Conflict',
        description: 'Two sources disagree.',
        elementPath: 'income',
        sourceIds: ['msg-1', 'upload-1'],
      });
      queue.addIssue({
        severity: 'info',
        category: 'low-confidence',
        title: 'Uncertain',
        description: 'AI not sure.',
        sourceIds: ['msg-3'],
      });
      queue.resolveIssue(issue.id, 'msg-5');

      const json = queue.toJSON();
      const restored = IssueQueue.fromJSON(json);

      expect(restored.getAllIssues()).toEqual(queue.getAllIssues());
      expect(restored.getIssueCount()).toEqual(queue.getIssueCount());
    });

    it('round-trips an empty queue', () => {
      const json = queue.toJSON();
      const restored = IssueQueue.fromJSON(json);
      expect(restored.getAllIssues()).toEqual([]);
    });
  });
});
