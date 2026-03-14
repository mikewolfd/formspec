import type { InquestSessionV1, ConnectionResult } from 'formspec-shared';

/* ── Constants ────────────────────────────────── */

const PHASE_ORDER = ['inputs', 'review', 'refine'] as const;
const PHASE_LABELS: Record<string, string> = {
  inputs: 'Describe',
  review: 'Review',
  refine: 'Refine',
};

/* ── Formspec icon ────────────────────────────── */

export function FormspecIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <rect x="2" y="1.5" width="8" height="2" rx=".4" fill={color} />
      <rect x="2" y="5" width="8" height="2" rx=".4" fill={color} fillOpacity=".7" />
      <rect x="2" y="8.5" width="8" height="2" rx=".4" fill={color} fillOpacity=".4" />
    </svg>
  );
}

/* ── Save state indicator ─────────────────────── */

function SaveIndicator({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'idle') return null;
  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-slate-400" />
        Saving
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Saved
      </span>
    );
  }
  return <span className="text-[11px] font-medium text-red-500">Save failed</span>;
}

/* ── Phase stepper ────────────────────────────── */

function PhaseStepper({
  phase,
  phaseIndex,
  onNavigateToPhase,
}: {
  phase: InquestSessionV1['phase'];
  phaseIndex: number;
  onNavigateToPhase?: (phase: InquestSessionV1['phase']) => void;
}) {
  return (
    <nav className="flex items-center gap-0.5" aria-label="Workflow phases">
      {PHASE_ORDER.map((p, i) => {
        const isCurrent = phase === p;
        const isDone = phaseIndex > i;
        const isNavigable = isDone && !!onNavigateToPhase;

        return (
          <div key={p} className="flex items-center">
            {i > 0 && (
              <div className={`mx-1 h-px w-6 transition-colors ${isDone ? 'bg-accent/35' : 'bg-slate-200'}`} />
            )}
            <button
              type="button"
              disabled={!isNavigable}
              onClick={() => isNavigable && onNavigateToPhase(p)}
              className={[
                'flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all',
                isCurrent
                  ? 'bg-accent/10 text-accent'
                  : isDone
                    ? 'text-slate-400 hover:text-accent hover:bg-accent/5 cursor-pointer'
                    : 'text-slate-300 cursor-default',
              ].join(' ')}
            >
              <div className={[
                'flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-bold transition-all',
                isDone
                  ? 'bg-accent/15 text-accent'
                  : isCurrent
                    ? 'bg-accent text-white shadow-sm shadow-accent/30'
                    : 'border border-slate-200 text-slate-300',
              ].join(' ')}>
                {isDone ? (
                  <svg className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : i + 1}
              </div>
              <span className="tracking-wide">{PHASE_LABELS[p] ?? p}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}

/* ── Provider pill ────────────────────────────── */

function ProviderPill({ connection, label }: { connection: ConnectionResult | undefined; label: string }) {
  const isOk = connection?.ok;
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-500">
      <div className={`h-1.5 w-1.5 rounded-full transition-colors ${isOk ? 'bg-emerald-400' : connection ? 'bg-red-400' : 'bg-slate-300'}`} />
      {label}
    </div>
  );
}

/* ── Header ───────────────────────────────────── */

interface AppHeaderProps {
  phase: InquestSessionV1['phase'];
  phaseIndex: number;
  sessionTitle: string;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  connection: ConnectionResult | undefined;
  providerLabel: string;
  onNavigateToPhase?: (phase: InquestSessionV1['phase']) => void;
}

export function AppHeader({
  phase,
  phaseIndex,
  sessionTitle,
  saveState,
  connection,
  providerLabel,
  onNavigateToPhase,
}: AppHeaderProps) {
  return (
    <header className="relative flex h-[56px] shrink-0 items-center justify-between border-b border-warm-border/60 bg-white/95 px-5 backdrop-blur-sm">
      {/* Left: logo + title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-white shadow-sm">
          <FormspecIcon size={13} color="white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[14px] font-bold tracking-tight text-slate-900 leading-none">Stack</h1>
            {phase !== 'inputs' && (
              <span className="truncate max-w-[180px] text-[12px] font-medium text-slate-400 leading-none">
                · {sessionTitle}
              </span>
            )}
          </div>
          {phase === 'inputs' && (
            <div className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              Form Builder
            </div>
          )}
        </div>
      </div>

      {/* Center: phase stepper */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <PhaseStepper
          phase={phase}
          phaseIndex={phaseIndex}
          onNavigateToPhase={onNavigateToPhase}
        />
      </div>

      {/* Right: save state + provider */}
      <div className="flex items-center gap-3 shrink-0">
        <SaveIndicator state={saveState} />
        <ProviderPill connection={connection} label={providerLabel} />
      </div>
    </header>
  );
}
