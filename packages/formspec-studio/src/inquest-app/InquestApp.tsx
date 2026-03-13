import { useEffect, useMemo, useState } from 'react';
import { createProject, type AnyCommand, type ProjectBundle } from 'formspec-studio-core';
import { TemplateGallery } from '../features/template-gallery/TemplateGallery';
import { ProviderSetup } from '../features/provider-setup/ProviderSetup';
import { RecentSessions } from '../features/recent-sessions/RecentSessions';
import { InputInventory } from '../features/input-inventory/InputInventory';
import { ReviewWorkspace } from '../features/review-workspace/ReviewWorkspace';
import { RefineWorkspace } from '../features/refine-workspace/RefineWorkspace';
import { diagnosticsToInquestIssues, mergeIssueSets } from '../shared/authoring/diagnostics-issues';
import { InquestDraft } from '../shared/authoring/inquest-draft';
import type {
  AnalysisV1,
  ConnectionResult,
  InquestIssue,
  InquestSessionV1,
  InquestSessionTarget,
  InquestUploadSummary,
  ProposalV1,
} from '../shared/contracts/inquest';
import {
  clearProviderKey,
  listRecentInquestSessions,
  loadBootstrapProject,
  loadInquestSession,
  loadProviderPreferences,
  rememberProviderKey,
  saveHandoffPayload,
  saveInquestSession,
  saveSelectedProvider,
} from '../shared/persistence/inquest-store';
import { findProviderAdapter, inquestProviderAdapters } from '../shared/providers';
import { findInquestTemplate, inquestTemplates } from '../shared/templates/templates';
import { buildHandoffPayload } from '../shared/transport/handoff';
import { inquestPath, studioPath } from '../shared/transport/routes';

const DEFAULT_ASSISTANT_MESSAGE = {
  role: 'assistant' as const,
  text: 'What form are you building? Start from a template, describe it in plain language, or upload reference material. Inquest will turn it into a structured Formspec scaffold.',
};

function nowIso(): string {
  return new Date().toISOString();
}

function extractSessionId(pathname: string): string | undefined {
  const match = pathname.match(/^\/inquest\/session\/([^/?#]+)/);
  return match?.[1];
}

function collectGroupPaths(items: any[], prefix = ''): string[] {
  const paths: string[] = [];
  for (const item of items ?? []) {
    if (item?.type !== 'group' || typeof item.key !== 'string') continue;
    const path = prefix ? `${prefix}.${item.key}` : item.key;
    paths.push(path);
    paths.push(...collectGroupPaths(item.children ?? [], path));
  }
  return paths;
}

function meaningfulInput(session: InquestSessionV1): boolean {
  return Boolean(
    session.input.templateId
    || session.input.description.trim().length >= 10
    || session.input.uploads.length > 0
    || session.input.messages.some((message) => message.role === 'user'),
  );
}

function inferSessionTitle(session: InquestSessionV1): string {
  const template = findInquestTemplate(session.input.templateId);
  if (template) return template.name;
  if (session.input.description.trim()) {
    return session.input.description.trim().split(/\n+/)[0].slice(0, 48);
  }
  return 'Untitled Inquest';
}

function createBlankSession(params: URLSearchParams, target?: InquestSessionTarget): InquestSessionV1 {
  const sessionId = crypto.randomUUID();
  return {
    version: 1,
    sessionId,
    title: 'Untitled Inquest',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    phase: 'inputs',
    mode: params.get('mode') === 'import-subform' ? 'import-subform' : 'new-project',
    workflowMode: params.get('workflowMode') === 'draft-fast' ? 'draft-fast' : 'verify-carefully',
    input: {
      description: '',
      uploads: [],
      messages: [
        {
          id: crypto.randomUUID(),
          role: DEFAULT_ASSISTANT_MESSAGE.role,
          text: DEFAULT_ASSISTANT_MESSAGE.text,
          createdAt: nowIso(),
        },
      ],
    },
    issues: [],
    target,
  };
}

function createDraftFromBundle(bundle: Partial<ProjectBundle>): InquestDraft {
  return new InquestDraft(createProject({ seed: bundle }));
}

function draftCommandBundle(draft: InquestDraft): AnyCommand[] {
  return draft.log()
    .map((entry) => entry.command)
    .filter((command) => command.type !== 'project.import');
}

function syncIssueStatuses(nextIssues: InquestIssue[], previousIssues: InquestIssue[]): InquestIssue[] {
  const previousById = new Map(previousIssues.map((issue) => [issue.id, issue]));
  return nextIssues.map((issue) => {
    const previous = previousById.get(issue.id);
    return previous ? { ...issue, status: previous.status } : issue;
  });
}

function issueBundle(
  existingIssues: InquestIssue[],
  analysis?: AnalysisV1,
  proposal?: ProposalV1,
  draft?: InquestDraft | null,
): InquestIssue[] {
  return syncIssueStatuses(
    mergeIssueSets(
      analysis?.issues ?? [],
      proposal?.issues ?? [],
      existingIssues.filter((issue) => issue.source !== 'diagnostic'),
      draft ? diagnosticsToInquestIssues(draft.diagnose()) : [],
    ),
    existingIssues,
  );
}

async function summarizeUpload(file: File): Promise<InquestUploadSummary> {
  let excerpt: string | undefined;
  if (file.type.startsWith('text/') || file.type === 'application/json') {
    excerpt = (await file.text()).slice(0, 240);
  }

  return {
    id: crypto.randomUUID(),
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    status: 'processed',
    excerpt,
    createdAt: nowIso(),
  };
}

export function InquestApp() {
  const locationPathname = typeof window !== 'undefined' ? window.location.pathname : '/inquest/';
  const locationSearch = typeof window !== 'undefined' ? window.location.search : '';
  const [session, setSession] = useState<InquestSessionV1 | null>(null);
  const [draft, setDraft] = useState<InquestDraft | null>(null);
  const [providerApiKey, setProviderApiKey] = useState('');
  const [rememberKey, setRememberKey] = useState(false);
  const [connection, setConnection] = useState<ConnectionResult | undefined>();
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    let disposed = false;

    async function load() {
      const params = new URLSearchParams(locationSearch);
      const sessionId = extractSessionId(locationPathname);
      const bootstrapId = params.get('bootstrap') ?? undefined;
      let target: InquestSessionTarget | undefined;

      if (bootstrapId) {
        const bootstrap = await loadBootstrapProject(bootstrapId);
        target = {
          projectId: bootstrapId,
          availableGroups: collectGroupPaths((bootstrap?.definition as any)?.items ?? []),
        };
      }

      const nextSession = sessionId
        ? await loadInquestSession(sessionId) ?? createBlankSession(params, target)
        : createBlankSession(params, target);

      if (target) {
        nextSession.target = {
          ...target,
          ...nextSession.target,
          groupPath: nextSession.target?.groupPath ?? target.availableGroups?.[0],
        };
        nextSession.mode = 'import-subform';
      }

      nextSession.title = inferSessionTitle(nextSession);

      if (disposed) return;
      if (!sessionId) {
        const query = params.toString();
        window.history.replaceState({}, '', inquestPath(nextSession.sessionId, query));
      }
      setSession(nextSession);

      const prefs = loadProviderPreferences();
      const selectedProviderId = nextSession.providerId ?? prefs.selectedProviderId ?? inquestProviderAdapters[0]?.id;
      setSession((current) => current ? { ...current, providerId: selectedProviderId } : current);
      setProviderApiKey(selectedProviderId ? prefs.rememberedKeys[selectedProviderId] ?? '' : '');
      setRememberKey(Boolean(selectedProviderId && prefs.rememberedKeys[selectedProviderId]));

      if (nextSession.draftBundle?.definition) {
        setDraft(createDraftFromBundle(nextSession.draftBundle));
      } else if (nextSession.proposal) {
        const nextDraft = new InquestDraft();
        nextDraft.loadProposal(nextSession.proposal);
        setDraft(nextDraft);
      }
    }

    void load();

    return () => {
      disposed = true;
    };
  }, [locationPathname, locationSearch]);

  useEffect(() => {
    if (!draft || !session) return;

    return draft.getProject().onChange(() => {
      setSession((current) => {
        if (!current) return current;
        const nextIssues = issueBundle(current.issues, current.analysis, current.proposal, draft);
        return {
          ...current,
          phase: 'refine',
          draftBundle: draft.export(),
          issues: nextIssues,
          updatedAt: nowIso(),
        };
      });
    });
  }, [draft, session?.sessionId]);

  useEffect(() => {
    if (!session) return;
    let disposed = false;
    setSaveState('saving');
    void saveInquestSession(session)
      .then(() => {
        if (!disposed) setSaveState('saved');
      })
      .catch(() => {
        if (!disposed) setSaveState('error');
      });

    return () => {
      disposed = true;
    };
  }, [session]);

  const template = useMemo(
    () => findInquestTemplate(session?.input.templateId),
    [session?.input.templateId],
  );
  const recentSessions = useMemo(() => listRecentInquestSessions(), [session?.updatedAt]);

  if (!session) {
    return (
      <div className="min-h-screen bg-[#F4EEE2] px-6 py-8 text-[#1C2433] font-ui">
        <div className="mx-auto max-w-5xl">Loading Inquest…</div>
      </div>
    );
  }

  const provider = findProviderAdapter(session.providerId) ?? inquestProviderAdapters[0];
  const analyzeDisabled = !provider || !providerApiKey.trim() || !meaningfulInput(session);

  const updateSession = (updater: (current: InquestSessionV1) => InquestSessionV1) => {
    setSession((current) => current ? updater(current) : current);
  };

  const handleCreateFreshSession = () => {
    const params = new URLSearchParams();
    window.location.assign(inquestPath(undefined, params.toString()));
  };

  const handleOpenSession = (sessionId: string) => {
    window.location.assign(inquestPath(sessionId));
  };

  const handleTestConnection = async () => {
    if (!provider) return;
    const result = await provider.testConnection({ apiKey: providerApiKey });
    setConnection(result);
    saveSelectedProvider(provider.id);
    if (result.ok && rememberKey) {
      rememberProviderKey(provider.id, providerApiKey);
    }
    if (!rememberKey) {
      clearProviderKey(provider.id);
    }
  };

  const handleAnalyze = async () => {
    if (!provider) return;
    const analysis = await provider.runAnalysis({
      session,
      template,
    });
    updateSession((current) => ({
      ...current,
      title: inferSessionTitle(current),
      phase: 'review',
      analysis,
      issues: syncIssueStatuses(analysis.issues, current.issues),
      updatedAt: nowIso(),
      input: {
        ...current.input,
        messages: [
          ...current.input.messages,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: analysis.summary,
            createdAt: nowIso(),
          },
        ],
      },
    }));
  };

  const handleGenerateProposal = async () => {
    if (!provider) return;
    const analysis = session.analysis ?? await provider.runAnalysis({ session, template });
    const proposal = await provider.runProposal({ session, template, analysis });
    const nextDraft = new InquestDraft();
    nextDraft.loadProposal(proposal);
    const nextIssues = issueBundle(session.issues, analysis, proposal, nextDraft);
    setDraft(nextDraft);
    updateSession((current) => ({
      ...current,
      phase: 'review',
      analysis,
      proposal,
      draftBundle: nextDraft.export(),
      issues: nextIssues,
      updatedAt: nowIso(),
    }));
  };

  const handleEnterRefine = () => {
    if (!draft && session.proposal) {
      const nextDraft = new InquestDraft();
      nextDraft.loadProposal(session.proposal);
      setDraft(nextDraft);
    }
    updateSession((current) => ({
      ...current,
      phase: 'refine',
      updatedAt: nowIso(),
    }));
  };

  const handleIssueStatus = (issueId: string, status: InquestIssue['status']) => {
    updateSession((current) => ({
      ...current,
      issues: current.issues.map((issue) => issue.id === issueId ? { ...issue, status } : issue),
      updatedAt: nowIso(),
    }));
  };

  const handleApplyPrompt = async (prompt: string) => {
    if (!provider || !draft) return;
    const liveBundle = draft.export();
    const liveProposal: ProposalV1 = {
      ...(session.proposal ?? {
        definition: liveBundle.definition,
        component: liveBundle.component,
        issues: [],
        trace: {},
        summary: {
          fieldCount: 0,
          sectionCount: 0,
          bindCount: 0,
          shapeCount: 0,
          variableCount: 0,
          coverage: 0,
        },
      }),
      definition: liveBundle.definition,
      component: liveBundle.component,
    };

    const patch = await provider.runEdit({
      session,
      proposal: liveProposal,
      prompt,
    });

    if (patch.commands.length > 0) {
      draft.applyCommands(patch.commands);
    }

    updateSession((current) => ({
      ...current,
      issues: syncIssueStatuses(
        mergeIssueSets(
          current.issues.filter((issue) => issue.source !== 'provider'),
          patch.issues,
          diagnosticsToInquestIssues(draft.diagnose()),
        ),
        current.issues,
      ),
      draftBundle: draft.export(),
      updatedAt: nowIso(),
    }));
  };

  const handleOpenStudio = async () => {
    if (!draft || !session.proposal) return;

    const handoffId = session.handoffId ?? crypto.randomUUID();
    const payload = buildHandoffPayload(
      { ...session, handoffId },
      draft.export(),
      draftCommandBundle(draft),
    );
    await saveHandoffPayload(payload);
    updateSession((current) => ({
      ...current,
      handoffId,
      updatedAt: nowIso(),
    }));
    window.location.assign(studioPath(`h=${encodeURIComponent(handoffId)}`));
  };

  return (
    <div data-testid="inquest-shell" className="min-h-screen bg-[#F4EEE2] px-6 py-8 text-[#1C2433] font-ui">
      <div className="mx-auto max-w-[1440px] space-y-5">
        <header className="rounded-2xl border border-[#cfbf9f] bg-white/85 px-6 py-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono uppercase tracking-[0.24em] text-[#B7791F]">The Inquest</div>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight">{session.title}</h1>
              <p className="mt-2 text-sm text-slate-600">Saved on this browser only.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#f3ead8] px-3 py-1 text-xs font-mono uppercase tracking-wide text-[#7b5b21]">
                {session.mode}
              </span>
              <span className="rounded-full bg-[#edf6f8] px-3 py-1 text-xs font-mono uppercase tracking-wide text-[#2F6B7E]">
                {session.workflowMode}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-mono uppercase tracking-wide text-slate-500">
                {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save error' : 'Saved locally'}
              </span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex rounded-full bg-[#f3ead8]/50 p-1 shadow-inner">
              {(['verify-carefully', 'draft-fast'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`relative cursor-pointer rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
                    session.workflowMode === mode
                      ? 'bg-[#1C2433] text-white shadow-md'
                      : 'text-[#1C2433]/60 hover:text-[#1C2433]'
                  }`}
                  onClick={() => updateSession((current) => ({
                    ...current,
                    workflowMode: mode,
                    updatedAt: nowIso(),
                  }))}
                >
                  {mode === 'verify-carefully' ? 'Verify carefully' : 'Draft fast'}
                </button>
              ))}
            </div>
            <div className="text-xs font-medium text-slate-500 italic">
              {session.workflowMode === 'verify-carefully'
                ? 'High-fidelity, checks constraints and types.'
                : 'Rapid prototyping, focuses on core structure.'}
            </div>
          </div>
        </header>

        {session.phase === 'inputs' ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <div className="space-y-6">
              <ProviderSetup
                adapters={inquestProviderAdapters}
                selectedProviderId={session.providerId}
                apiKey={providerApiKey}
                rememberKey={rememberKey}
                connection={connection}
                onProviderSelected={(providerId) => {
                  const prefs = loadProviderPreferences();
                  setConnection(undefined);
                  setProviderApiKey(prefs.rememberedKeys[providerId] ?? '');
                  setRememberKey(Boolean(prefs.rememberedKeys[providerId]));
                  saveSelectedProvider(providerId);
                  updateSession((current) => ({
                    ...current,
                    providerId,
                    updatedAt: nowIso(),
                  }));
                }}
                onApiKeyChange={setProviderApiKey}
                onRememberChange={setRememberKey}
                onTestConnection={handleTestConnection}
                onCredentialsCleared={() => {
                  setProviderApiKey('');
                  setRememberKey(false);
                  if (session.providerId) clearProviderKey(session.providerId);
                  setConnection(undefined);
                }}
              />

              <TemplateGallery
                templates={inquestTemplates}
                selectedTemplateId={session.input.templateId}
                mode="inquest"
                onSelect={(templateId) => {
                  updateSession((current) => ({
                    ...current,
                    title: findInquestTemplate(templateId)?.name ?? current.title,
                    input: {
                      ...current.input,
                      templateId,
                    },
                    updatedAt: nowIso(),
                  }));
                }}
              />

              <section className="rounded-2xl border border-[#cfbf9f] bg-white/90 p-6 shadow-md transition-all hover:bg-white">
                <div className="mb-6">
                  <div className="text-xs font-mono uppercase tracking-[0.24em] text-[#B7791F]">Specification</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">Describe the form and add source material</h2>
                </div>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium">Description</span>
                  <textarea
                    className="min-h-[180px] w-full rounded-md border border-[#dbcdb2] bg-white px-3 py-3 text-sm outline-none focus:border-[#2F6B7E]"
                    value={session.input.description}
                    placeholder="Describe who fills out the form, what data it collects, and any conditional logic or eligibility rules."
                    onChange={(event) => updateSession((current) => ({
                      ...current,
                      title: inferSessionTitle({
                        ...current,
                        input: { ...current.input, description: event.target.value },
                      }),
                      input: {
                        ...current.input,
                        description: event.target.value,
                      },
                      updatedAt: nowIso(),
                    }))}
                  />
                </label>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Source Material</span>
                    <div className="relative group">
                      <input
                        type="file"
                        multiple
                        className="block w-full cursor-pointer rounded-xl border border-dashed border-[#dbcdb2] bg-[#f9f4ea]/30 px-4 py-8 text-sm text-slate-500 transition-all hover:border-[#2F6B7E] hover:bg-[#edf6f8]/50"
                        onChange={async (event) => {
                          const files = Array.from(event.target.files ?? []);
                          const uploads = await Promise.all(files.map(summarizeUpload));
                          updateSession((current) => ({
                            ...current,
                            input: {
                              ...current.input,
                              uploads: [...current.input.uploads, ...uploads],
                            },
                            updatedAt: nowIso(),
                          }));
                          event.currentTarget.value = '';
                        }}
                      />
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 opacity-60 group-hover:opacity-100">
                        <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-xs font-medium">Drop files or click to upload</span>
                      </div>
                    </div>
                  </label>

                  {session.mode === 'import-subform' && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">Target Group</span>
                        <select
                          className="block w-full rounded-xl border border-[#dbcdb2] bg-white px-3 py-2.5 text-sm shadow-sm transition-all focus:ring-2 focus:ring-[#2F6B7E]/20"
                          value={session.target?.groupPath ?? ''}
                          onChange={(event) => updateSession((current) => ({
                            ...current,
                            target: {
                              ...current.target,
                              groupPath: event.target.value || undefined,
                            },
                            updatedAt: nowIso(),
                          }))}
                        >
                          <option value="">Import at root</option>
                          {(session.target?.availableGroups ?? []).map((groupPath) => (
                            <option key={groupPath} value={groupPath}>
                              {groupPath}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">Key Prefix</span>
                        <input
                          type="text"
                          className="block w-full rounded-xl border border-[#dbcdb2] bg-white px-3 py-2.5 text-sm shadow-sm transition-all focus:ring-2 focus:ring-[#2F6B7E]/20"
                          value={session.target?.keyPrefix ?? ''}
                          placeholder="subform_"
                          onChange={(event) => updateSession((current) => ({
                            ...current,
                            target: {
                              ...current.target,
                              keyPrefix: event.target.value || undefined,
                            },
                            updatedAt: nowIso(),
                          }))}
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-[#f3ead8] pt-6">
                  <div className={`text-xs font-medium transition-opacity duration-300 ${analyzeDisabled ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="flex items-center gap-2 text-[#7b5b21]">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Setup provider and description to begin analysis.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="group relative flex items-center gap-2 overflow-hidden rounded-full bg-[#1C2433] px-8 py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:bg-black disabled:scale-100 disabled:bg-slate-300 disabled:opacity-50"
                    disabled={analyzeDisabled}
                    onClick={handleAnalyze}
                  >
                    <span>Analyze Specification</span>
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <InputInventory input={session.input} template={template} />
              <RecentSessions
                sessions={recentSessions}
                onOpen={handleOpenSession}
                onStartNew={handleCreateFreshSession}
              />
            </div>
          </div>
        ) : null}

        {session.phase === 'review' && session.analysis ? (
          <ReviewWorkspace
            analysis={session.analysis}
            proposal={session.proposal}
            issues={session.issues.filter((issue) => issue.status === 'open')}
            workflowMode={session.workflowMode}
            onGenerate={handleGenerateProposal}
            onProceedToRefine={handleEnterRefine}
            onResolveIssue={(issueId) => handleIssueStatus(issueId, 'resolved')}
            onDeferIssue={(issueId) => handleIssueStatus(issueId, 'deferred')}
          />
        ) : null}

        {session.phase === 'refine' && draft ? (
          <RefineWorkspace
            project={draft.getProject()}
            issues={session.issues.filter((issue) => issue.status === 'open')}
            onResolveIssue={(issueId) => handleIssueStatus(issueId, 'resolved')}
            onDeferIssue={(issueId) => handleIssueStatus(issueId, 'deferred')}
            onApplyPrompt={handleApplyPrompt}
            onBack={() => updateSession((current) => ({
              ...current,
              phase: 'review',
              updatedAt: nowIso(),
            }))}
            onOpenStudio={handleOpenStudio}
          />
        ) : null}
      </div>
    </div>
  );
}
