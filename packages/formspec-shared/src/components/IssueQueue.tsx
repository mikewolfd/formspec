import type { InquestIssue } from '../contracts/inquest';

interface IssueQueueProps {
  issues: InquestIssue[];
  onResolve(issueId: string): void;
  onDefer(issueId: string): void;
  onFocus?(issueId: string): void;
}

const SEVERITY_STYLES: Record<string, string> = {
  error: 'bg-red-50 text-rust border-red-100',
  warning: 'bg-amber/10 text-amber border-amber/20',
  info: 'bg-accent/10 text-accent border-accent/20',
};

export function IssueQueue({ issues, onResolve, onDefer, onFocus }: IssueQueueProps) {
  return (
    <section className="rounded-2xl border border-warm-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-brass">Issues</div>
          <h2 className="mt-1 text-base font-bold text-slate-900">Open issues</h2>
        </div>
        {issues.length > 0 && (
          <span className="rounded-full bg-warm-subtle px-2.5 py-0.5 text-[11px] font-bold text-brass border border-warm-border">
            {issues.length}
          </span>
        )}
      </div>

      {issues.length === 0 ? (
        <div className="rounded-xl border border-dashed border-warm-border py-8 text-center">
          <div className="text-2xl mb-2">✓</div>
          <div className="text-[12px] font-medium text-slate-500">No open issues</div>
          <div className="mt-0.5 text-[11px] text-slate-400">Looking good!</div>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <article key={issue.id} className="rounded-xl border border-warm-border bg-warm-subtle/20 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-800 text-sm">{issue.title}</div>
                  <div className="mt-1 text-[12px] text-slate-500 leading-relaxed">{issue.message}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${SEVERITY_STYLES[issue.severity] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {issue.severity}
                  </span>
                  {issue.blocking ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rust border border-red-100">
                      Blocking
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {onFocus ? (
                  <button
                    type="button"
                    className="rounded-lg border border-warm-border px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-warm-subtle transition-colors"
                    onClick={() => onFocus(issue.id)}
                  >
                    Focus
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-lg bg-teal px-2.5 py-1 text-[11px] font-bold text-white hover:bg-teal/90 transition-colors"
                  onClick={() => onResolve(issue.id)}
                >
                  Resolve
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-warm-border px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-warm-subtle transition-colors"
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
