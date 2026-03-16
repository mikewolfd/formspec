import React from 'react';
import { useChatSession, useChatState } from '../state/ChatContext.js';
import type { Issue } from 'formspec-chat';

const severityStyles: Record<string, string> = {
  error: 'bg-error/10 text-error border-error/20',
  warning: 'bg-amber/10 text-amber border-amber/20',
  info: 'bg-accent/10 text-accent border-accent/20',
};

/**
 * Displays the persistent issue queue — unresolved items, contradictions,
 * and low-confidence elements. Each issue can be resolved or deferred.
 */
export function IssuePanel() {
  const session = useChatSession();
  const state = useChatState();

  const openIssues = state.issues.filter(i => i.status === 'open');

  if (openIssues.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted px-4">
        No issues found.
      </div>
    );
  }

  return (
    <div className="overflow-y-auto px-4 py-4">
      <ul className="space-y-3" role="list">
        {openIssues.map(issue => (
          <IssueItem
            key={issue.id}
            issue={issue}
            onResolve={() => session.resolveIssue(issue.id)}
            onDefer={() => session.deferIssue(issue.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function IssueItem({
  issue,
  onResolve,
  onDefer,
}: {
  issue: Issue;
  onResolve: () => void;
  onDefer: () => void;
}) {
  return (
    <li className="rounded-lg border border-border bg-surface p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded border ${
                severityStyles[issue.severity] ?? severityStyles.info
              }`}
            >
              {issue.severity}
            </span>
            <span className="text-sm font-medium text-ink">{issue.title}</span>
          </div>
          <p className="text-xs text-muted mt-1">{issue.description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onResolve}
          className="px-2 py-1 text-[11px] rounded border border-border text-muted hover:text-ink hover:border-accent transition-colors"
        >
          Resolve
        </button>
        <button
          onClick={onDefer}
          className="px-2 py-1 text-[11px] rounded border border-border text-muted hover:text-ink hover:border-accent transition-colors"
        >
          Defer
        </button>
      </div>
    </li>
  );
}
