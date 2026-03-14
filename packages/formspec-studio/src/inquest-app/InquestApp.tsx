import { type ReactNode, useEffect, useMemo, useState } from 'react';
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

/* ── Module-level helpers ─────────────────────── */

const DEFAULT_ASSISTANT_MESSAGE = {
  role: 'assistant' as const,
  text: 'Hello! I am your Stack Assistant. I can help you build powerful, accessible forms for Formspec. What are we building today? You can describe a form from scratch, or I can suggest a template to get us started.',
};

const PHASE_ORDER = ['inputs', 'review', 'refine'] as const;

function nowIso(): string {
  return new Date().toISOString();
}

function extractSessionId(pathname: string): string | undefined {
  return pathname.match(/^\/inquest\/session\/([^/?#]+)/)?.[1];
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
    || session.input.messages.some((m) => m.role === 'user'),
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

/* ── Extracted presentational components ─────── */

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#fdfcfa] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
            <svg width="28" height="28" viewBox="0 0 12 12" fill="none">
              <rect x="2" y="1.5" width="8" height="2" rx=".4" fill="currentColor" />
              <rect x="2" y="5" width="8" height="2" rx=".4" fill="currentColor" fillOpacity=".7" />
              <rect x="2" y="8.5" width="8" height="2" rx=".4" fill="currentColor" fillOpacity=".4" />
            </svg>
          </div>
          <div className="absolute -inset-2 animate-ping rounded-3xl border border-accent/20" />
        </div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          Initializing Stack Assistant…
        </div>
      </div>
    </div>
  );
}

interface AppHeaderProps {
  phase: InquestSessionV1['phase'];
  phaseIndex: number;
  sessionTitle: string;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  connection: ConnectionResult | undefined;
  providerLabel: string;
}

function AppHeader({ phase, phaseIndex, sessionTitle, saveState, connection, providerLabel }: AppHeaderProps) {
  return (
    <header className="relative flex h-[60px] shrink-0 items-center justify-between border-b border-warm-border bg-white px-6 shadow-sm">
      {/* Logo + title */}
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
          {phase === 'inputs' ? (
            <div className="mt-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
              Formspec AI Assistant
            </div>
          ) : (
            <div className="mt-0.5 max-w-[200px] truncate text-[11px] font-medium text-slate-500">
              {sessionTitle}
            </div>
          )}
        </div>
      </div>

      {/* Phase stepper — centered */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
        {PHASE_ORDER.map((p, i) => {
          const isCurrent = phase === p;
          const isDone = phaseIndex > i;
          return (
            <div key={p} className="flex items-center gap-1">
              {i > 0 && (
                <div className={`w-5 h-px transition-colors ${isDone ? 'bg-accent/25' : 'bg-slate-200'}`} />
              )}
              <div className={[
                'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all',
                isCurrent ? 'bg-accent/8 text-accent' : isDone ? 'text-slate-400' : 'text-slate-300',
              ].join(' ')}>
                <div className={[
                  'flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold transition-all',
                  isDone
                    ? 'bg-slate-200 text-slate-500'
                    : isCurrent
                      ? 'bg-accent text-white'
                      : 'border border-slate-200 text-slate-300',
                ].join(' ')}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span className="capitalize tracking-wide">{p}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right: save state + provider status */}
      <div className="flex items-center gap-3">
        {saveState === 'saving' && (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-slate-400" />
            Saving…
          </span>
        )}
        {saveState === 'saved' && (
          <span className="text-[11px] font-medium text-emerald-500">Saved</span>
        )}
        {saveState === 'error' && (
          <span className="text-[11px] font-medium text-red-500">Save failed</span>
        )}

        <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
          <div className={`h-1.5 w-1.5 rounded-full transition-colors ${connection?.ok ? 'bg-emerald-400' : 'bg-slate-300'}`} />
          {providerLabel}
        </div>
      </div>
    </header>
  );
}

interface ProviderSetupViewProps {
  session: InquestSessionV1;
  providerApiKey: string;
  rememberKey: boolean;
  connection: ConnectionResult | undefined;
  isTesting: boolean;
  onContinue: () => void;
  onProviderSelected: (providerId: string) => void;
  onApiKeyChange: (val: string) => void;
  onRememberChange: (val: boolean) => void;
  onTestConnection: () => void;
  onCredentialsCleared: () => void;
}

function ProviderSetupView({
  session,
  providerApiKey,
  rememberKey,
  connection,
  isTesting,
  onContinue,
  onProviderSelected,
  onApiKeyChange,
  onRememberChange,
  onTestConnection,
  onCredentialsCleared,
}: ProviderSetupViewProps) {
  return (
    <div className="flex-1 overflow-y-auto p-8 flex justify-center">
      <div className="w-full max-w-3xl">
        <div className="mt-12 flex flex-col items-center">
          <div className="mb-8 text-center">
            <div className="h-16 w-16 mx-auto mb-5 flex items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3m-3-3l-2.25-2.25" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Connect Intelligence</h2>
            <p className="mt-2 text-[14px] text-slate-500 max-w-md mx-auto">
              To start building with <strong>Stack</strong>, connect an AI provider.
              Your keys stay in this browser and are never sent to our servers.
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
              onContinue={onContinue}
              onProviderSelected={onProviderSelected}
              onApiKeyChange={onApiKeyChange}
              onRememberChange={onRememberChange}
              onTestConnection={onTestConnection}
              onCredentialsCleared={onCredentialsCleared}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface GenerateCTAProps {
  isAnalyzing: boolean;
  onDraftFast: () => void;
  onVerifyCarefully: () => void;
}

function GenerateCTA({ isAnalyzing, onDraftFast, onVerifyCarefully }: GenerateCTAProps) {
  return (
    <div className="mt-8 rounded-3xl border border-warm-border bg-warm-subtle/40 p-7 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-6 text-center">
        <div className="text-[10px] font-bold uppercase tracking-widest text-brass mb-2">Ready to build</div>
        <h3 className="text-[17px] font-bold text-slate-900">Generate your form scaffold</h3>
        <p className="mt-1.5 text-[13px] text-slate-500">Choose how to proceed:</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onDraftFast}
          disabled={isAnalyzing}
          className="group flex flex-col items-center gap-3.5 rounded-2xl bg-white p-5 border-2 border-transparent hover:border-accent hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="h-11 w-11 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div className="text-center">
            <div className="font-bold text-[14px] text-slate-900">Draft Fast</div>
            <div className="mt-0.5 text-[12px] text-slate-400 leading-snug">Optimize for speed</div>
          </div>
        </button>

        <button
          onClick={onVerifyCarefully}
          disabled={isAnalyzing}
          className="group flex flex-col items-center gap-3.5 rounded-2xl bg-white p-5 border-2 border-transparent hover:border-emerald-500 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="h-11 w-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="text-center">
            <div className="font-bold text-[14px] text-slate-900">Verify Carefully</div>
            <div className="mt-0.5 text-[12px] text-slate-400 leading-snug">Deep semantic analysis</div>
          </div>
        </button>
      </div>

      {isAnalyzing && (
        <div className="mt-4 flex items-center justify-center gap-2 text-[12px] font-medium text-slate-400">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-slate-400" />
          Working on it…
        </div>
      )}
    </div>
  );
}

interface TemplateSectionProps {
  showFull: boolean;
  selectedTemplateId: string | undefined;
  onToggleFull: () => void;
  onSelect: (templateId: string) => void;
}

function TemplateSection({ showFull, selectedTemplateId, onToggleFull, onSelect }: TemplateSectionProps) {
  return (
    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-px w-8 bg-warm-border" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brass/70">
            {showFull ? 'Full Blueprint Library' : 'Quick Start Blueprints'}
          </span>
          <div className="h-px w-8 bg-warm-border" />
        </div>
        {showFull && (
          <button
            onClick={onToggleFull}
            className="text-[10px] font-bold text-accent hover:underline uppercase tracking-widest"
          >
            Dismiss
          </button>
        )}
      </div>
      <TemplateGallery
        templates={showFull ? inquestTemplates : inquestTemplates.slice(0, 3)}
        selectedTemplateId={selectedTemplateId}
        mode="inquest"
        onSelect={onSelect}
      />
    </div>
  );
}

/* ── Main orchestrator ────────────────────────── */

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
  const [providerReady, setProviderReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const updateSession = (updater: (current: InquestSessionV1) => InquestSessionV1) => {
    setSession((current) => current ? updater(current) : current);
  };

  // Load or create session on mount
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
        window.history.replaceState({}, '', inquestPath(nextSession.sessionId, params.toString()));
      }
      setSession(nextSession);

      const prefs = loadProviderPreferences();
      const selectedProviderId = nextSession.providerId ?? prefs.selectedProviderId ?? inquestProviderAdapters[0]?.id;
      setSession((current) => current ? { ...current, providerId: selectedProviderId } : current);
      setProviderApiKey(selectedProviderId ? prefs.rememberedKeys[selectedProviderId] ?? '' : '');
      setRememberKey(Boolean(selectedProviderId && prefs.rememberedKeys[selectedProviderId]));

      if (selectedProviderId && prefs.rememberedKeys[selectedProviderId]) {
        setProviderReady(true);
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
    return () => { disposed = true; };
  }, [locationPathname, locationSearch]);

  // Sync draft changes back to session
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

  // Persist session on every change
  useEffect(() => {
    if (!session) return;
    let disposed = false;
    setSaveState('saving');
    void saveInquestSession(session)
      .then(() => { if (!disposed) setSaveState('saved'); })
      .catch(() => { if (!disposed) setSaveState('error'); });
    return () => { disposed = true; };
  }, [session]);

  const template = useMemo(
    () => findInquestTemplate(session?.input.templateId),
    [session?.input.templateId],
  );
  const recentSessions = useMemo(() => listRecentInquestSessions(), [session?.updatedAt]);

  if (!session) return <LoadingScreen />;

  const provider = findProviderAdapter(session.providerId) ?? inquestProviderAdapters[0];
  const phaseIndex = PHASE_ORDER.indexOf(session.phase);
  const isSetupRequired = !session.providerId || !providerApiKey || !providerReady;

  /* ── Event handlers ── */

  const handleCreateFreshSession = () => {
    window.location.assign(inquestPath(undefined, new URLSearchParams().toString()));
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteInquestSession(sessionId);
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
      if (result.ok && rememberKey) rememberProviderKey(provider.id, providerApiKey);
      if (!rememberKey) clearProviderKey(provider.id);
    } finally {
      setIsTesting(false);
    }
  };

  const handleProviderSelected = (providerId: string) => {
    setProviderReady(false);
    const prefs = loadProviderPreferences();
    setConnection(undefined);
    setProviderApiKey(prefs.rememberedKeys[providerId] ?? '');
    setRememberKey(Boolean(prefs.rememberedKeys[providerId]));
    saveSelectedProvider(providerId);
    updateSession((current) => ({ ...current, providerId, updatedAt: nowIso() }));
  };

  const handleCredentialsCleared = () => {
    setProviderApiKey('');
    setRememberKey(false);
    if (session.providerId) clearProviderKey(session.providerId);
    setConnection(undefined);
  };

  const handleAnalyze = async (text?: string) => {
    if (!provider) return;
    const description = text ?? session.input.description;
    if (!description.trim()) return;

    setIsAnalyzing(true);
    try {
      const analysis = await provider.runAnalysis({
        session: { ...session, input: { ...session.input, description } },
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
            { id: crypto.randomUUID(), role: 'assistant' as const, text: analysis.summary, createdAt: nowIso() },
          ],
        },
      }));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChatNew = async (text: string) => {
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
    await handleAnalyze(text);
  };

  const handleGenerateProposal = async () => {
    if (!provider) return;
    setIsAnalyzing(true);
    try {
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
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEnterRefine = () => {
    if (!draft && session.proposal) {
      const nextDraft = new InquestDraft();
      nextDraft.loadProposal(session.proposal);
      setDraft(nextDraft);
    }
    updateSession((current) => ({ ...current, phase: 'refine', updatedAt: nowIso() }));
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
        summary: { fieldCount: 0, sectionCount: 0, bindCount: 0, shapeCount: 0, variableCount: 0, coverage: 0 },
      }),
      definition: liveBundle.definition,
      component: liveBundle.component,
    };

    const patch = await provider.runEdit({ session, proposal: liveProposal, prompt });

    if (patch.commands.length > 0) draft.applyCommands(patch.commands);

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
    const payload = buildHandoffPayload({ ...session, handoffId }, draft.export(), draftCommandBundle(draft));
    await saveHandoffPayload(payload);
    updateSession((current) => ({ ...current, handoffId, updatedAt: nowIso() }));
    window.location.assign(studioPath(`h=${encodeURIComponent(handoffId)}`));
  };

  /* ── Render ── */

  const afterMessages: ReactNode = (
    <>
      {meaningfulInput(session) && (
        <GenerateCTA
          isAnalyzing={isAnalyzing}
          onDraftFast={() => {
            updateSession((c) => ({ ...c, workflowMode: 'draft-fast' }));
            void handleGenerateProposal();
          }}
          onVerifyCarefully={() => {
            updateSession((c) => ({ ...c, workflowMode: 'verify-carefully' }));
            void handleAnalyze();
          }}
        />
      )}

      {(showFullGallery || (session.input.messages.length === 1 && !meaningfulInput(session))) && (
        <TemplateSection
          showFull={showFullGallery}
          selectedTemplateId={session.input.templateId}
          onToggleFull={() => setShowFullGallery((v) => !v)}
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
      )}
    </>
  );

  const belowComposer: ReactNode = (
    <div className="mt-3 flex items-center justify-between px-1 text-[12px] font-medium text-slate-400">
      <div className="flex gap-4">
        <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-600 transition-colors">
          <input
            type="file"
            className="hidden"
            multiple
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              const uploads = await Promise.all(files.map(summarizeUpload));
              updateSession((current) => ({
                ...current,
                input: { ...current.input, uploads: [...current.input.uploads, ...uploads] },
                updatedAt: nowIso(),
              }));
            }}
          />
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <span>Add context</span>
          {session.input.uploads.length > 0 && (
            <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent">
              {session.input.uploads.length}
            </span>
          )}
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
      <span>Enter to send</span>
    </div>
  );

  return (
    <div data-testid="stack-assistant" className="min-h-screen bg-[#fdfcfa] text-slate-900 font-ui flex flex-col">
      <AppHeader
        phase={session.phase}
        phaseIndex={phaseIndex}
        sessionTitle={session.title}
        saveState={saveState}
        connection={connection}
        providerLabel={provider?.label ?? 'No model'}
      />

      {/* ── Inputs phase ── */}
      {session.phase === 'inputs' && (
        <main className="flex flex-1 overflow-hidden">
          {/* Left sidebar: history */}
          <aside className="w-[280px] border-r border-warm-border bg-warm-subtle/30 flex flex-col shrink-0">
            <div className="flex-1 overflow-y-auto p-4">
              <RecentSessions
                sessions={recentSessions}
                onOpen={handleOpenSession}
                onDelete={handleDeleteSession}
                onStartNew={handleCreateFreshSession}
              />
            </div>
          </aside>

          {/* Center: chat or provider setup */}
          <section className="relative flex flex-1 flex-col bg-white overflow-hidden">
            {isSetupRequired ? (
              <ProviderSetupView
                session={session}
                providerApiKey={providerApiKey}
                rememberKey={rememberKey}
                connection={connection}
                isTesting={isTesting}
                onContinue={() => setProviderReady(true)}
                onProviderSelected={handleProviderSelected}
                onApiKeyChange={(val) => { setProviderReady(false); setProviderApiKey(val); }}
                onRememberChange={setRememberKey}
                onTestConnection={handleTestConnection}
                onCredentialsCleared={handleCredentialsCleared}
              />
            ) : (
              <InquestThread
                messages={session.input.messages}
                isRunning={isAnalyzing}
                onNew={handleChatNew}
                afterMessages={afterMessages}
                belowComposer={belowComposer}
              />
            )}
          </section>

          {/* Right sidebar: context panel */}
          <aside className="w-[320px] border-l border-warm-border bg-warm-subtle/30 flex flex-col shrink-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <InputInventory input={session.input} template={template} />
            </div>
          </aside>
        </main>
      )}

      {/* ── Review phase ── */}
      {session.phase === 'review' && session.analysis ? (
        <main className="flex-1 overflow-y-auto p-6">
          <ReviewWorkspace
            analysis={session.analysis}
            proposal={session.proposal}
            issues={session.issues.filter((issue) => issue.status === 'open')}
            workflowMode={session.workflowMode}
            onGenerate={handleGenerateProposal}
            onProceedToRefine={handleEnterRefine}
            onResolveIssue={(issueId) => handleIssueStatus(issueId, 'resolved')}
            onDeferIssue={(issueId) => handleIssueStatus(issueId, 'deferred')}
            isGenerating={isAnalyzing}
          />
        </main>
      ) : null}

      {/* ── Refine phase ── */}
      {session.phase === 'refine' && draft ? (
        <main className="flex-1 overflow-y-auto p-6">
          <RefineWorkspace
            project={draft.getProject()}
            issues={session.issues.filter((issue) => issue.status === 'open')}
            onResolveIssue={(issueId) => handleIssueStatus(issueId, 'resolved')}
            onDeferIssue={(issueId) => handleIssueStatus(issueId, 'deferred')}
            onApplyPrompt={handleApplyPrompt}
            onBack={() => updateSession((current) => ({ ...current, phase: 'review', updatedAt: nowIso() }))}
            onOpenStudio={handleOpenStudio}
          />
        </main>
      ) : null}
    </div>
  );
}
