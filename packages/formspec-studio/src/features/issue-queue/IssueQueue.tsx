import type { InquestIssue } from '../../shared/contracts/inquest';

interface IssueQueueProps {
  issues: InquestIssue[];
  onResolve(issueId: string): void;
  onDefer(issueId: string): void;
  onFocus?(issueId: string): void;
}

export function IssueQueue({ issues, onResolve, onDefer, onFocus }: IssueQueueProps) {
  return (
    <section className="rounded-2xl border border-warm-border bg-white/80 p-5 shadow-sm">
      <div className="mb-4">
        <div className="text-xs font-mono uppercase tracking-[0.24em] text-brass">Issue Queue</div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Open issues</h2>
      </div>

      {issues.length === 0 ? (
        <p className="text-sm text-slate-600">No open issues.</p>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <article key={issue.id} className="rounded-xl border border-[#dbcdb2] bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{issue.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{issue.message}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-[#f3ead8] px-2 py-0.5 text-[11px] font-mono uppercase tracking-wide text-[#7b5b21]">
                    {issue.severity}
                  </span>
                  {issue.blocking ? (
                    <span className="rounded-full bg-[#f5d7d2] px-2 py-0.5 text-[11px] font-mono uppercase tracking-wide text-rust">
                      Blocking
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {onFocus ? (
                  <button
                    type="button"
                    className="rounded-md border border-[#dbcdb2] px-3 py-1.5 text-sm"
                    onClick={() => onFocus(issue.id)}
                  >
                    Focus
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-md bg-teal px-3 py-1.5 text-sm font-medium text-white"
                  onClick={() => onResolve(issue.id)}
                >
                  Resolve
                </button>
                <button
                  type="button"
                  className="rounded-md border border-[#dbcdb2] px-3 py-1.5 text-sm"
                  onClick={() => onDefer(issue.id)}
                >
                  Defer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
