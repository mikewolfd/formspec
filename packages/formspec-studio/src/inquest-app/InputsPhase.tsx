import { useCallback, useState } from 'react';
import { TemplateGallery } from '../features/template-gallery/TemplateGallery';
import { RecentSessions } from '../features/recent-sessions/RecentSessions';
import { InquestThread } from './InquestThread';
import { ProviderSetupPanel } from './ProviderSetupPanel';
import type {
  ConnectionResult,
  InquestSessionV1,
  InquestUploadSummary,
} from '../shared/contracts/inquest';
import { inquestTemplates } from '../shared/templates/templates';
import type { RecentSessionEntry } from '../shared/persistence/inquest-store';

/* ── Quick-start prompts ──────────────────────── */

const QUICK_STARTS = [
  {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    label: 'Patient intake',
    sublabel: 'Medical + insurance',
    prompt: 'Build a patient intake form with demographics, medical history, current medications, and insurance information.',
  },
  {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    label: 'Grant application',
    sublabel: 'Project + budget',
    prompt: 'Create a grant application with organization details, project description, goals, budget breakdown, and expected impact.',
  },
  {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    label: 'Customer survey',
    sublabel: 'NPS + feedback',
    prompt: 'Design a customer satisfaction survey with NPS rating, product feedback, open-ended comments, and demographics.',
  },
  {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    label: 'Event registration',
    sublabel: 'Sessions + dietary',
    prompt: 'Build an event registration form with attendee details, session selection, dietary requirements, and emergency contact.',
  },
];

/* ── Error banner ─────────────────────────────── */

export function OperationErrorBanner({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-red-700">Something went wrong</div>
          <div className="mt-0.5 text-[11px] text-red-600 leading-relaxed">{error}</div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
          aria-label="Dismiss error"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── Generate CTA ─────────────────────────────── */

function GenerateCTA({ isAnalyzing, onDraftFast, onVerifyCarefully }: {
  isAnalyzing: boolean;
  onDraftFast: () => void;
  onVerifyCarefully: () => void;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/[0.04] to-accent/[0.02] p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-accent">Ready to generate</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onDraftFast}
            disabled={isAnalyzing}
            className="group flex flex-col gap-3 rounded-xl border-2 border-transparent bg-white p-4 text-left shadow-sm transition-all hover:border-slate-800 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white transition-transform group-hover:scale-105 group-disabled:scale-100">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-[13px] text-slate-900">Draft Fast</div>
              <div className="mt-0.5 text-[11px] leading-snug text-slate-400">Skip analysis, go straight to scaffold</div>
            </div>
          </button>

          <button
            type="button"
            onClick={onVerifyCarefully}
            disabled={isAnalyzing}
            className="group flex flex-col gap-3 rounded-xl border-2 border-transparent bg-white p-4 text-left shadow-sm transition-all hover:border-emerald-500 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white transition-transform group-hover:scale-105 group-disabled:scale-100">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-[13px] text-slate-900">Verify Carefully</div>
              <div className="mt-0.5 text-[11px] leading-snug text-slate-400">Deep semantic analysis first</div>
            </div>
          </button>
        </div>

        {isAnalyzing && (
          <div className="mt-3.5 flex items-center gap-2 text-[11px] font-medium text-slate-400">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-accent" />
            Working on it…
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Welcome hero ─────────────────────────────── */

function WelcomeHero({ isAnalyzing, onQuickStart, onToggleGallery }: {
  isAnalyzing: boolean;
  onQuickStart: (text: string) => void;
  onToggleGallery: () => void;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="h-px flex-1 bg-warm-border/60" />
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Quick starts</span>
        <div className="h-px flex-1 bg-warm-border/60" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {QUICK_STARTS.map(({ icon, label, sublabel, prompt }) => (
          <button
            key={label}
            type="button"
            disabled={isAnalyzing}
            onClick={() => onQuickStart(prompt)}
            className="group flex items-center gap-3 rounded-xl border border-warm-border bg-white px-3.5 py-3 text-left transition-all hover:border-accent/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warm-subtle text-slate-500 transition-colors group-hover:bg-accent/10 group-hover:text-accent">
              {icon}
            </div>
            <div>
              <div className="text-[12px] font-semibold text-slate-700 leading-tight">{label}</div>
              <div className="mt-0.5 text-[10px] text-slate-400">{sublabel}</div>
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onToggleGallery}
        className="mt-3 flex w-full items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400 transition-colors hover:text-accent"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        Browse all blueprints
      </button>
    </div>
  );
}

/* ── Template section ─────────────────────────── */

function TemplateSection({ selectedTemplateId, onToggleFull, onSelect }: {
  selectedTemplateId: string | undefined;
  onToggleFull: () => void;
  onSelect: (templateId: string) => void;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-px w-6 bg-warm-border/60" />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-brass/70">Blueprint library</span>
        </div>
        <button
          type="button"
          onClick={onToggleFull}
          className="text-[10px] font-semibold text-slate-400 transition-colors hover:text-accent"
        >
          Dismiss
        </button>
      </div>
      <TemplateGallery
        templates={inquestTemplates}
        selectedTemplateId={selectedTemplateId}
        mode="inquest"
        onSelect={onSelect}
      />
    </div>
  );
}

/* ── Upload chips ─────────────────────────────── */

function UploadChips({ uploads, onRemove }: { uploads: InquestUploadSummary[]; onRemove: (id: string) => void }) {
  if (uploads.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5 px-1">
      {uploads.map((u) => (
        <div
          key={u.id}
          className="flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/[0.06] pl-2.5 pr-1.5 py-1 text-[11px] font-medium text-accent"
        >
          <svg className="h-3 w-3 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          <span className="max-w-[130px] truncate">{u.name}</span>
          <button
            type="button"
            onClick={() => onRemove(u.id)}
            className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-accent/15 hover:text-accent"
            aria-label={`Remove ${u.name}`}
          >
            <svg className="h-2.5 w-2.5 text-accent/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

/* ── Composer toolbar ─────────────────────────── */

function ComposerToolbar({ showFullGallery, onFileUpload, onToggleGallery }: {
  showFullGallery: boolean;
  onFileUpload: (files: FileList | null) => void;
  onToggleGallery: () => void;
}) {
  return (
    <div className="mt-2.5 flex items-center justify-between px-1">
      <div className="flex gap-4">
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-600">
          <input type="file" className="hidden" multiple onChange={(e) => onFileUpload(e.target.files)} />
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          Add context
        </label>

        <button
          type="button"
          onClick={onToggleGallery}
          className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${showFullGallery ? 'text-accent' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Blueprints
        </button>
      </div>
      <span className="text-[10px] font-medium text-slate-300">Enter to send</span>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────── */

function meaningfulInput(session: InquestSessionV1): boolean {
  return Boolean(
    session.input.templateId
    || session.input.description.trim().length >= 10
    || session.input.uploads.length > 0
    || session.input.messages.some((m) => m.role === 'user'),
  );
}

/* ── Inputs phase ─────────────────────────────── */

export interface InputsPhaseProps {
  session: InquestSessionV1;
  isAnalyzing: boolean;
  operationError: string | null;
  recentSessions: RecentSessionEntry[];

  // Provider
  isSetupRequired: boolean;
  providerApiKey: string;
  rememberKey: boolean;
  connection: ConnectionResult | undefined;
  isTesting: boolean;

  // Callbacks
  onChatNew: (text: string) => Promise<void>;
  onDraftFast: () => void;
  onVerifyCarefully: () => void;
  onTemplateSelect: (templateId: string) => void;
  onFileUpload: (files: FileList | null) => void;
  onRemoveUpload: (id: string) => void;
  onDismissError: () => void;
  onOpenSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onCreateFreshSession: () => void;

  // Provider callbacks
  onProviderContinue: () => void;
  onProviderSelected: (id: string) => void;
  onApiKeyChange: (val: string) => void;
  onRememberChange: (val: boolean) => void;
  onTestConnection: () => void;
  onCredentialsCleared: () => void;
}

export function InputsPhase({
  session,
  isAnalyzing,
  operationError,
  recentSessions,
  isSetupRequired,
  providerApiKey,
  rememberKey,
  connection,
  isTesting,
  onChatNew,
  onDraftFast,
  onVerifyCarefully,
  onTemplateSelect,
  onFileUpload,
  onRemoveUpload,
  onDismissError,
  onOpenSession,
  onDeleteSession,
  onCreateFreshSession,
  onProviderContinue,
  onProviderSelected,
  onApiKeyChange,
  onRememberChange,
  onTestConnection,
  onCredentialsCleared,
}: InputsPhaseProps) {
  const [showFullGallery, setShowFullGallery] = useState(false);
  const handleToggleGallery = useCallback(() => setShowFullGallery((v) => !v), []);

  const isWelcomeState = session.input.messages.length === 1 && !meaningfulInput(session);
  const hasMeaningfulInput = !isWelcomeState && !operationError && meaningfulInput(session);

  return (
    <main className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[240px] shrink-0 border-r border-warm-border/60 bg-warm-subtle/40 overflow-hidden">
        <RecentSessions
          sessions={recentSessions}
          onOpen={onOpenSession}
          onDelete={onDeleteSession}
          onStartNew={onCreateFreshSession}
        />
      </aside>

      {/* Main area */}
      <section className="relative flex flex-1 flex-col bg-white overflow-hidden">
        {isSetupRequired ? (
          <ProviderSetupPanel
            session={session}
            providerApiKey={providerApiKey}
            rememberKey={rememberKey}
            connection={connection}
            isTesting={isTesting}
            onContinue={onProviderContinue}
            onProviderSelected={onProviderSelected}
            onApiKeyChange={onApiKeyChange}
            onRememberChange={onRememberChange}
            onTestConnection={onTestConnection}
            onCredentialsCleared={onCredentialsCleared}
          />
        ) : (
          <InquestThread
            messages={session.input.messages}
            isRunning={isAnalyzing}
            onNew={onChatNew}
            afterMessages={
              <>
                {operationError && (
                  <OperationErrorBanner error={operationError} onDismiss={onDismissError} />
                )}
                {hasMeaningfulInput && (
                  <GenerateCTA
                    isAnalyzing={isAnalyzing}
                    onDraftFast={onDraftFast}
                    onVerifyCarefully={onVerifyCarefully}
                  />
                )}
                {showFullGallery && (
                  <TemplateSection
                    selectedTemplateId={session.input.templateId}
                    onToggleFull={handleToggleGallery}
                    onSelect={onTemplateSelect}
                  />
                )}
                {!showFullGallery && isWelcomeState && (
                  <WelcomeHero
                    isAnalyzing={isAnalyzing}
                    onQuickStart={(text) => void onChatNew(text)}
                    onToggleGallery={handleToggleGallery}
                  />
                )}
              </>
            }
            belowComposer={
              <>
                <UploadChips uploads={session.input.uploads} onRemove={onRemoveUpload} />
                <ComposerToolbar
                  showFullGallery={showFullGallery}
                  onFileUpload={onFileUpload}
                  onToggleGallery={handleToggleGallery}
                />
              </>
            }
          />
        )}
      </section>
    </main>
  );
}
