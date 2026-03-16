import type { Issue, IssueStatus } from './types.js';

let nextId = 1;

/**
 * Persistent issue queue — tracks problems, contradictions, and
 * low-confidence elements in the generated form.
 */
export class IssueQueue {
  private issues: Issue[] = [];

  addIssue(input: Omit<Issue, 'id' | 'status'>): Issue {
    const issue: Issue = { ...input, id: `issue-${nextId++}`, status: 'open' };
    this.issues.push(issue);
    return issue;
  }

  resolveIssue(id: string, resolvedBy?: string): void {
    const issue = this.findOrThrow(id);
    if (issue.status === 'resolved') {
      throw new Error(`Issue ${id} is already resolved`);
    }
    issue.status = 'resolved';
    issue.resolvedBy = resolvedBy;
  }

  deferIssue(id: string): void {
    const issue = this.findOrThrow(id);
    issue.status = 'deferred';
  }

  reopenIssue(id: string): void {
    const issue = this.findOrThrow(id);
    if (issue.status === 'open') {
      throw new Error(`Issue ${id} is already open`);
    }
    issue.status = 'open';
    issue.resolvedBy = undefined;
  }

  getOpenIssues(): Issue[] {
    return this.issues.filter(i => i.status === 'open');
  }

  getAllIssues(): Issue[] {
    return [...this.issues];
  }

  getIssuesByElement(path: string): Issue[] {
    return this.issues.filter(i => i.elementPath === path);
  }

  getIssueCount(): { open: number; resolved: number; deferred: number } {
    const counts = { open: 0, resolved: 0, deferred: 0 };
    for (const i of this.issues) counts[i.status]++;
    return counts;
  }

  removeIssuesForElement(path: string): void {
    this.issues = this.issues.filter(i => i.elementPath !== path);
  }

  toJSON(): Issue[] {
    return this.issues.map(i => ({ ...i }));
  }

  static fromJSON(data: Issue[]): IssueQueue {
    const queue = new IssueQueue();
    queue.issues = data.map(i => ({ ...i }));
    return queue;
  }

  private findOrThrow(id: string): Issue {
    const issue = this.issues.find(i => i.id === id);
    if (!issue) throw new Error(`Issue not found: ${id}`);
    return issue;
  }
}
