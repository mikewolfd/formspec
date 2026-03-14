import type { AnalysisV1, InquestIssue, InquestWorkflowMode, ProposalV1 } from 'formspec-shared';
import { IssueQueue } from 'formspec-shared';

interface ReviewWorkspaceProps {
  analysis: AnalysisV1;
  proposal?: ProposalV1;
  issues: InquestIssue[];
  workflowMode: InquestWorkflowMode;
  isGenerating?: boolean;
  onGenerate(): void;
  onProceedToRefine(): void;
  onResolveIssue(issueId: string): void;
  onDeferIssue(issueId: string): void;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-green/10 text-green',
  medium: 'bg-amber/10 text-amber',
  low: 'bg-slate-100 text-slate-500',
};

const RULE_KIND_LABELS: Record<string, string> = {
  required: 'Required',
  relevant: 'Visible when',
  constraint: 'Constraint',
  calculate: 'Computed',
  readonly: 'Read-only',
};

export function ReviewWorkspace({
  analysis,
  proposal,
  issues,
  workflowMode,
  isGenerating,
  onGenerate,
  onProceedToRefine,
  onResolveIssue,
  onDeferIssue,
}: ReviewWorkspaceProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
      <div className="space-y-5">
        {/* Analysis summary */}
        <section className="rounded-2xl border border-warm-border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-brass">Analysis</div>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900">Requirements review</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{analysis.summary}</p>
            </div>
            <span className="shrink-0 rounded-full bg-warm-subtle px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-brass border border-warm-border">
              {workflowMode === 'draft-fast' ? 'Fast draft' : 'Careful'}
            </span>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* Field inventory */}
            <div>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Field inventory · {analysis.requirements.fields.length}
              </h3>
              <div className="space-y-2">
                {analysis.requirements.fields.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-warm-border p-4 text-sm text-slate-400 text-center">
                    No fields inferred yet
                  </div>
                ) : (
                  analysis.requirements.fields.map((field) => (
                    <div key={field.id} className="rounded-xl border border-warm-border bg-warm-subtle/20 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-800 text-sm">{field.label}</div>
                          <div className="mt-0.5 text-[11px] font-mono text-slate-400">
                            {field.key} · {field.dataType}
                            {field.required && <span className="ml-1.5 text-rust">required</span>}
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${CONFIDENCE_COLORS[field.confidence] ?? 'bg-slate-100 text-slate-500'}`}>
                          {field.confidence}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Logic review */}
            <div>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Logic rules · {analysis.requirements.rules.length}
              </h3>
              <div className="space-y-2">
                {analysis.requirements.rules.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-warm-border p-4 text-sm text-slate-400 text-center">
                    No conditional rules inferred yet
                  </div>
                ) : (
                  analysis.requirements.rules.map((rule) => (
                    <div key={rule.id} className="rounded-xl border border-warm-border bg-warm-subtle/20 p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="font-semibold text-slate-800 text-sm">{rule.label}</div>
                        <span className="shrink-0 rounded-full bg-warm-subtle px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-brass border border-warm-border">
                          {RULE_KIND_LABELS[rule.kind] ?? rule.kind}
                        </span>
                      </div>
                      <div className="text-[12px] text-slate-500">{rule.explanation}</div>
                      {rule.expression ? (
                        <div className="mt-2 rounded-lg bg-warm-subtle px-3 py-1.5 font-mono text-[11px] text-slate-600">
                          {rule.expression}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Proposal / action */}
        {proposal ? (
          <section className="rounded-2xl border border-teal/30 bg-teal/5 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-teal mb-1">Scaffold ready</div>
                <div className="font-semibold text-slate-800">
                  {proposal.summary.fieldCount} fields · {proposal.summary.sectionCount} sections · {proposal.summary.bindCount} binds
                </div>
                <div className="mt-0.5 text-sm text-slate-500">
                  Coverage: {Math.round(proposal.summary.coverage * 100)}%
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
                onClick={onProceedToRefine}
              >
                Open Refine →
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-warm-border bg-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-slate-800">Generate the form scaffold</div>
                <div className="mt-0.5 text-sm text-slate-500">
                  Translate the analysis into a Formspec definition
                </div>
              </div>
              <button
                type="button"
                className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all ${
                  isGenerating ? 'bg-slate-300 cursor-not-allowed' : 'bg-accent hover:bg-blue-700'
                }`}
                onClick={onGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating…
                  </span>
                ) : 'Generate scaffold'}
              </button>
            </div>
          </section>
        )}
      </div>

      <IssueQueue
        issues={issues}
        onResolve={onResolveIssue}
        onDefer={onDeferIssue}
      />
    </div>
  );
}
