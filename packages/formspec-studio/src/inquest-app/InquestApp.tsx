import { useEffect, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { createProject, type AnyCommand, type ProjectBundle } from 'formspec-studio-core';
import { TemplateGallery } from '../features/template-gallery/TemplateGallery';
import { ProviderSetup } from '../features/provider-setup/ProviderSetup';
import { RecentSessions } from '../features/recent-sessions/RecentSessions';
import { InputInventory } from '../features/input-inventory/InputInventory';
import { ReviewWorkspace } from '../features/review-workspace/ReviewWorkspace';
import { RefineWorkspace } from '../features/refine-workspace/RefineWorkspace';
import { InquestThread } from './InquestThread';
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
  deleteInquestSession,
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
  text: 'Hello! I am your Stack Assistant. I can help you build powerful, accessible forms for Formspec. What are we building today? You can describe a form from scratch, or I can suggest a template to get us started.',
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
  return 'Untitled Project';
}

function createBlankSession(params: URLSearchParams, target?: InquestSessionTarget): InquestSessionV1 {
  const sessionId = crypto.randomUUID();
  return {
    version: 1,
    sessionId,
    title: 'Untitled Project',
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
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hasContinued, setHasContinued] = useState(false);


  const updateSession = (updater: (current: InquestSessionV1) => InquestSessionV1) => {
    setSession((current) => current ? updater(current) : current);
  };

  const chat = useChat({
    initialMessages: useMemo(() => session?.input.messages.map(m => ({
      id: m.id,
      role: m.role,
      content: m.text,
    })) ?? [], [session?.sessionId]),
    onFinish: (message: any) => {
      updateSession((current: any) => ({
        ...current,
        input: {
          ...current.input,
          messages: [
            ...current.input.messages,
            { id: message.id, role: 'assistant', text: message.content, createdAt: nowIso() }
          ]
        },
        updatedAt: nowIso()
      }));
    },
    fetch: async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      const { streamChat } = await import('../shared/providers/ai-sdk-provider');
      const providerId = session?.providerId ?? 'gemini';
      const result = await streamChat(providerId, providerApiKey, body.messages);
      return result.toTextStreamResponse();
    }
  });

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

      if (selectedProviderId && prefs.rememberedKeys[selectedProviderId]) {
        setHasContinued(true);
      }

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
      <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900 font-ui flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
          <div className="text-sm font-medium text-slate-500 tracking-wide uppercase">Initializing Stack Assistant…</div>
        </div>
      </div>
    );
  }

  const provider = findProviderAdapter(session.providerId) ?? inquestProviderAdapters[0];

  const handleCreateFreshSession = () => {
    const params = new URLSearchParams();
    window.location.assign(inquestPath(undefined, params.toString()));
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteInquestSession(sessionId);
    // Force refresh the list since recentSessions memo depends on session update
    updateSession((current) => ({ ...current, updatedAt: nowIso() }));
  };

  const handleOpenSession = (sessionId: string) => {
    window.location.assign(inquestPath(sessionId));
  };

  const handleTestConnection = async () => {
    if (!provider) return;
    setIsTesting(true);
    try {
      const result = await provider.testConnection({ apiKey: providerApiKey });
      setConnection(result);
      saveSelectedProvider(provider.id);
      if (result.ok && rememberKey) {
        rememberProviderKey(provider.id, providerApiKey);
      }
      if (!rememberKey) {
        clearProviderKey(provider.id);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const isSetupRequired = !session.providerId || !providerApiKey || !connection?.ok || !hasContinued;

  const handleAnalyze = async (text?: string) => {
    if (!provider) return;
    const description = text ?? session.input.description;
    if (!description.trim()) return;

    // Start chat stream if we have user text
    if (text) {
      await chat.append({ role: 'user', content: text });
    }

    const analysis = await provider.runAnalysis({
      session: {
        ...session,
        input: {
          ...session.input,
          description,
        }
      },
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

  const handleChatNew = async (text: string) => {
    // Save user message to session for persistence
    updateSession((current) => ({
      ...current,
      input: {
        ...current.input,
        description: text,
        messages: [
          ...current.input.messages,
          { id: crypto.randomUUID(), role: 'user' as const, text, createdAt: nowIso() },
        ],
      },
      updatedAt: nowIso(),
    }));

    // Chat + analyze in one shot
    await handleAnalyze(text);
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
    <div data-testid="stack-assistant" className="min-h-screen bg-white text-slate-900 font-ui flex flex-col">
      <header className="flex h-[60px] items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-sm">
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <rect x="2" y="1.5" width="8" height="2" rx=".4" fill="white" />
              <rect x="2" y="5" width="8" height="2" rx=".4" fill="white" fillOpacity=".7" />
              <rect x="2" y="8.5" width="8" height="2" rx=".4" fill="white" fillOpacity=".4" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">Stack Builder</h1>
            <div className="mt-1 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Formspec AI Assistant
            </div>
          </div>
        </div>

      </header>

        {session.phase === 'inputs' && (
          <main className="flex flex-1 overflow-hidden">
            {/* Left Sidebar: Navigation & History */}
            <aside className="w-[280px] border-r border-slate-200 bg-slate-50/50 flex flex-col shrink-0">
              <div className="flex-1 overflow-y-auto p-4">
                 <RecentSessions
                    sessions={recentSessions}
                    onOpen={handleOpenSession}
                    onDelete={handleDeleteSession}
                    onStartNew={handleCreateFreshSession}
                  />
              </div>
              <div className="px-4 py-6 border-t border-slate-200">
                 <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Model Status</div>
                 <div className="flex items-center gap-2 rounded-lg bg-white p-3 border border-slate-100 shadow-sm">
                   <div className={`h-2 w-2 rounded-full ${connection?.ok ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                   <div className="flex-1 min-w-0">
                     <div className="truncate text-xs font-bold text-slate-800">
                       {session.providerId ? findProviderAdapter(session.providerId)?.label : 'No Provider'}
                     </div>
                     <div className="text-[10px] text-slate-400">
                       {connection?.ok ? 'Intelligence Active' : 'Offline'}
                     </div>
                   </div>
                 </div>
              </div>
            </aside>

            {/* Center: Chat Interface */}
            <section className="relative flex flex-1 flex-col bg-white">
              {isSetupRequired ? (
                <>
                  <div className="flex-1 overflow-y-auto p-8 flex justify-center">
                    <div className="w-full max-w-3xl">
                      <div className="mt-12 flex flex-col items-center">
                        <div className="mb-8 text-center">
                          <div className="h-16 w-16 mx-auto mb-6 flex items-center justify-center rounded-2xl bg-accent/10 text-accent">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.25-2.25"/>
                            </svg>
                          </div>
                          <h2 className="text-2xl font-bold text-slate-900">Setup Intelligence</h2>
                          <p className="mt-2 text-slate-500 max-w-md mx-auto">
                            To start building with <strong>Stack</strong>, you need to connect an AI provider. Your keys stay on this browser and are never sent to our servers.
                          </p>
                        </div>

                        <div className="w-full max-w-md">
                          <ProviderSetup
                            adapters={inquestProviderAdapters}
                            selectedProviderId={session.providerId}
                            apiKey={providerApiKey}
                            rememberKey={rememberKey}
                            connection={connection}
                            isTesting={isTesting}
                            onContinue={() => setHasContinued(true)}
                            onProviderSelected={(providerId) => {
                              setHasContinued(false);
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
                            onApiKeyChange={(val) => {
                              setHasContinued(false);
                              setProviderApiKey(val);
                            }}
                            onRememberChange={setRememberKey}
                            onTestConnection={handleTestConnection}
                            onCredentialsCleared={() => {
                              setProviderApiKey('');
                              setRememberKey(false);
                              if (session.providerId) clearProviderKey(session.providerId);
                              setConnection(undefined);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <InquestThread
                  chat={chat}
                  disabled={isSetupRequired}
                  onNew={handleChatNew}
                  afterMessages={
                    <>
                      {meaningfulInput(session) && (
                        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/50 p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                          <div className="text-center mb-8">
                            <h3 className="text-lg font-bold text-slate-900">Ready to build your form?</h3>
                            <p className="mt-2 text-sm text-slate-500">I have enough information to generate a scaffold. How should we proceed?</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <button
                              onClick={() => {
                                updateSession(c => ({ ...c, workflowMode: 'draft-fast' }));
                                void handleGenerateProposal();
                              }}
                              className="group flex flex-col items-center gap-4 rounded-[24px] bg-white p-6 border-2 border-transparent hover:border-accent hover:shadow-xl transition-all"
                            >
                              <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                                </svg>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-slate-900">Draft Fast</div>
                                <div className="mt-1 text-xs text-slate-400">Optimize for speed to first scaffold</div>
                              </div>
                            </button>

                            <button
                              onClick={() => {
                                updateSession(c => ({ ...c, workflowMode: 'verify-carefully' }));
                                void handleAnalyze();
                              }}
                              className="group flex flex-col items-center gap-4 rounded-[24px] bg-white p-6 border-2 border-transparent hover:border-emerald-500 hover:shadow-xl transition-all"
                            >
                              <div className="h-12 w-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-slate-900">Verify Carefully</div>
                                <div className="mt-1 text-xs text-slate-400">Deep semantic analysis & compliance</div>
                              </div>
                            </button>
                          </div>
                        </div>
                      )}

                      {(showFullGallery || (session.input.messages.length === 1 && !meaningfulInput(session))) && (
                        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                          <div className="mb-6 flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <div className="h-px w-8 bg-slate-100" />
                               <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
                                 {showFullGallery ? 'Full Blueprint Library' : 'Quick Start Blueprints'}
                               </span>
                               <div className="h-px w-8 bg-slate-100" />
                             </div>
                             {showFullGallery && (
                               <button
                                 onClick={() => setShowFullGallery(false)}
                                 className="text-[10px] font-bold text-accent hover:underline uppercase tracking-widest"
                               >
                                 Dismiss
                               </button>
                             )}
                          </div>
                          <TemplateGallery
                            templates={showFullGallery ? inquestTemplates : inquestTemplates.slice(0, 3)}
                            selectedTemplateId={session.input.templateId}
                            mode="inquest"
                            onSelect={(templateId) => {
                              setShowFullGallery(false);
                              updateSession((current) => ({
                                ...current,
                                title: findInquestTemplate(templateId)?.name ?? current.title,
                                input: { ...current.input, templateId },
                                updatedAt: nowIso(),
                              }));
                            }}
                          />
                        </div>
                      )}
                    </>
                  }
                  belowComposer={
                    <div className="mt-3 flex items-center justify-between px-2 text-[12px] font-medium text-slate-400">
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600 transition-colors">
                          <input type="file" className="hidden" multiple onChange={async (e) => {
                            const files = Array.from(e.target.files ?? []);
                            const uploads = await Promise.all(files.map(summarizeUpload));
                            updateSession((current) => ({
                              ...current,
                              input: { ...current.input, uploads: [...current.input.uploads, ...uploads] },
                              updatedAt: nowIso(),
                            }));
                          }} />
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          <span>Add context</span>
                        </label>

                        <button
                          onClick={() => setShowFullGallery(!showFullGallery)}
                          className={`flex items-center gap-1.5 transition-colors ${showFullGallery ? 'text-accent' : 'hover:text-slate-600'}`}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span>Blueprints</span>
                        </button>
                      </div>
                      <span>Press Enter to send</span>
                    </div>
                  }
                />
              )}
            </section>

            {/* Right Sidebar: Context & Templates */}
            <aside className="w-[320px] border-l border-slate-200 bg-slate-50/50 flex flex-col shrink-0">
               <div className="flex-1 overflow-y-auto p-4 space-y-6">
                 <InputInventory input={session.input} template={template} />
               </div>
            </aside>
          </main>
        )}

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
  );
}
