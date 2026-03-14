import { useState } from 'react';
import type { Project } from 'formspec-studio-core';
import { ProjectProvider } from '../../state/ProjectContext';
import { SelectionProvider } from '../../state/useSelection';
import { ActivePageProvider } from '../../state/useActivePage';
import { CanvasTargetsProvider } from '../../state/useCanvasTargets';
import { EditorCanvas } from '../../workspaces/editor/EditorCanvas';
import { ItemProperties } from '../../workspaces/editor/ItemProperties';
import { BehaviorPreview } from '../behavior-preview/BehaviorPreview';
import { IssueQueue } from 'formspec-shared';
import type { RefineSlotProps } from 'formspec-shared';

export function RefineWorkspace({
  project,
  issues,
  onResolveIssue,
  onDeferIssue,
  onApplyPrompt,
  onBack,
  onOpenStudio,
}: RefineSlotProps) {
  const [prompt, setPrompt] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = async () => {
    if (!prompt.trim() || isApplying) return;
    setIsApplying(true);
    try {
      await onApplyPrompt(prompt);
      setPrompt('');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <ProjectProvider project={project}>
      <SelectionProvider>
        <ActivePageProvider>
          <CanvasTargetsProvider>
            <div className="space-y-5">
              {/* Header bar */}
              <section className="rounded-2xl border border-warm-border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-brass">Refine</div>
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Adjust before handoff</h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-warm-border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-warm-subtle transition-colors"
                      onClick={onBack}
                    >
                      ← Review
                    </button>
                    <button
                      type="button"
                      className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
                      onClick={onOpenStudio}
                    >
                      Open in Studio →
                    </button>
                  </div>
                </div>

                {/* Chat-style prompt composer */}
                <div className="relative">
                  <textarea
                    className="w-full resize-none rounded-2xl border border-warm-border bg-warm-subtle/30 px-5 py-4 pr-14 text-[14px] leading-relaxed outline-none transition-all focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Describe a change… e.g. make the amount field required, add a signature section"
                    rows={2}
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void handleApply();
                      }
                    }}
                    disabled={isApplying}
                  />
                  <button
                    type="button"
                    className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md transition-all hover:scale-105 hover:bg-black disabled:scale-100 disabled:opacity-20"
                    onClick={handleApply}
                    disabled={!prompt.trim() || isApplying}
                    title="Apply edit (Enter)"
                  >
                    {isApplying ? (
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="mt-2 px-1 text-[11px] text-slate-400">
                  Press <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px]">Enter</kbd> to apply · <kbd className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px]">Shift+Enter</kbd> for new line
                </div>
              </section>

              {/* Editor + issues */}
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                <section className="grid min-h-[680px] gap-4 rounded-2xl border border-warm-border bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="min-h-[380px] overflow-auto rounded-xl border border-warm-border/70 bg-white">
                    <EditorCanvas />
                  </div>
                  <div className="min-h-[380px] overflow-auto rounded-xl border border-warm-border/70 bg-white">
                    <ItemProperties showActions />
                  </div>
                  <div className="lg:col-span-2 min-h-[320px] overflow-hidden rounded-xl border border-warm-border/70 bg-white">
                    <BehaviorPreview />
                  </div>
                </section>

                <IssueQueue
                  issues={issues}
                  onResolve={onResolveIssue}
                  onDefer={onDeferIssue}
                />
              </div>
            </div>
          </CanvasTargetsProvider>
        </ActivePageProvider>
      </SelectionProvider>
    </ProjectProvider>
  );
}
