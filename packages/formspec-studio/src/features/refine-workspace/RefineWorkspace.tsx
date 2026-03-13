import { useState } from 'react';
import type { Project } from 'formspec-studio-core';
import { ProjectProvider } from '../../state/ProjectContext';
import { SelectionProvider } from '../../state/useSelection';
import { ActivePageProvider } from '../../state/useActivePage';
import { CanvasTargetsProvider } from '../../state/useCanvasTargets';
import { EditorCanvas } from '../../workspaces/editor/EditorCanvas';
import { ItemProperties } from '../../workspaces/editor/ItemProperties';
import { BehaviorPreview } from '../behavior-preview/BehaviorPreview';
import { IssueQueue } from '../issue-queue/IssueQueue';
import type { InquestIssue } from '../../shared/contracts/inquest';

interface RefineWorkspaceProps {
  project: Project;
  issues: InquestIssue[];
  onResolveIssue(issueId: string): void;
  onDeferIssue(issueId: string): void;
  onApplyPrompt(prompt: string): Promise<void> | void;
  onBack(): void;
  onOpenStudio(): void;
}

export function RefineWorkspace({
  project,
  issues,
  onResolveIssue,
  onDeferIssue,
  onApplyPrompt,
  onBack,
  onOpenStudio,
}: RefineWorkspaceProps) {
  const [prompt, setPrompt] = useState('');

  return (
    <ProjectProvider project={project}>
      <SelectionProvider>
        <ActivePageProvider>
          <CanvasTargetsProvider>
            <div className="space-y-4">
              <section className="rounded-2xl border border-[#cfbf9f] bg-white/80 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-[0.24em] text-[#B7791F]">Refine</div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">Adjust the scaffold before handoff</h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-[#dbcdb2] px-3 py-2 text-sm"
                      onClick={onBack}
                    >
                      Back to review
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-[#2F6B7E] px-4 py-2 text-sm font-medium text-white"
                      onClick={onOpenStudio}
                    >
                      Open in Studio
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">Continue by chat</span>
                    <textarea
                      className="min-h-[88px] w-full rounded-md border border-[#dbcdb2] bg-white px-3 py-2 text-sm outline-none focus:border-[#2F6B7E]"
                      placeholder="Example: make requested amount required"
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      className="w-full rounded-md bg-[#1C2433] px-4 py-2 text-sm font-medium text-white"
                      onClick={async () => {
                        if (!prompt.trim()) return;
                        await onApplyPrompt(prompt);
                        setPrompt('');
                      }}
                    >
                      Apply chat edit
                    </button>
                  </div>
                </div>
              </section>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <section className="grid min-h-[720px] gap-4 rounded-2xl border border-[#cfbf9f] bg-white/80 p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-h-[420px] overflow-auto rounded-xl border border-[#dbcdb2] bg-white">
                    <EditorCanvas />
                  </div>
                  <div className="min-h-[420px] overflow-auto rounded-xl border border-[#dbcdb2] bg-white">
                    <ItemProperties showActions />
                  </div>
                  <div className="lg:col-span-2 min-h-[360px] overflow-hidden rounded-xl border border-[#dbcdb2] bg-white">
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
