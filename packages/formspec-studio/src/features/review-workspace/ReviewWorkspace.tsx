import type { AnalysisV1, InquestIssue, InquestWorkflowMode, ProposalV1 } from '../../shared/contracts/inquest';
import { IssueQueue } from '../issue-queue/IssueQueue';

interface ReviewWorkspaceProps {
  analysis: AnalysisV1;
  proposal?: ProposalV1;
  issues: InquestIssue[];
  workflowMode: InquestWorkflowMode;
  onGenerate(): void;
  onProceedToRefine(): void;
  onResolveIssue(issueId: string): void;
  onDeferIssue(issueId: string): void;
}

export function ReviewWorkspace({
  analysis,
  proposal,
  issues,
  workflowMode,
  onGenerate,
  onProceedToRefine,
  onResolveIssue,
  onDeferIssue,
}: ReviewWorkspaceProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <section className="rounded-2xl border border-warm-border bg-white/80 p-5 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.24em] text-brass">Review</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Analysis and proposal</h2>
            <p className="mt-2 text-sm text-slate-600">{analysis.summary}</p>
          </div>
          <span className="rounded-full bg-[#f3ead8] px-3 py-1 text-xs font-mono uppercase tracking-wide text-[#7b5b21]">
            {workflowMode}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Field inventory</h3>
            <div className="space-y-2">
              {analysis.requirements.fields.map((field) => (
                <div key={field.id} className="rounded-xl border border-[#dbcdb2] bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{field.label}</div>
                      <div className="mt-1 text-xs font-mono text-slate-500">
                        {field.key} · {field.dataType}
                      </div>
                    </div>
                    <span className="rounded-full bg-[#eef4e9] px-2 py-0.5 text-[11px] font-mono uppercase tracking-wide text-[#4d7a3a]">
                      {field.confidence}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Logic review</h3>
            <div className="space-y-2">
              {analysis.requirements.rules.length === 0 ? (
                <div className="rounded-xl border border-[#dbcdb2] bg-white p-3 text-sm text-slate-600">
                  No conditional or validation rules were inferred yet.
                </div>
              ) : null}
              {analysis.requirements.rules.map((rule) => (
                <div key={rule.id} className="rounded-xl border border-[#dbcdb2] bg-white p-3">
                  <div className="font-semibold">{rule.label}</div>
                  <div className="mt-1 text-sm text-slate-600">{rule.explanation}</div>
                  {rule.expression ? (
                    <div className="mt-2 rounded-md bg-[#f5efe4] px-2 py-1 font-mono text-xs text-slate-700">
                      {rule.expression}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        {proposal ? (
          <div className="mt-5 rounded-2xl border border-[#c5d8de] bg-[#edf6f8] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Proposal scaffold ready</div>
                <div className="mt-1 text-sm text-slate-600">
                  {proposal.summary.fieldCount} fields · {proposal.summary.sectionCount} sections · {proposal.summary.bindCount} binds
                </div>
              </div>
              <button
                type="button"
                className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
                onClick={onProceedToRefine}
              >
                Open refine workspace
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <button
              type="button"
              className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
              onClick={onGenerate}
            >
              Generate proposal
            </button>
          </div>
        )}
      </section>

      <IssueQueue
        issues={issues}
        onResolve={onResolveIssue}
        onDefer={onDeferIssue}
      />
    </div>
  );
}
