import { useState } from 'react';
import type { RecentSessionEntry } from '../../shared/persistence/inquest-store';

interface RecentSessionsProps {
  sessions: RecentSessionEntry[];
  onOpen(sessionId: string): void;
  onDelete(sessionId: string): void;
  onStartNew(): void;
}

const PHASE_BADGE: Record<string, { label: string; dot: string }> = {
  inputs: { label: 'Drafting', dot: 'bg-slate-300' },
  review: { label: 'Review', dot: 'bg-amber-400' },
  refine: { label: 'Refine', dot: 'bg-emerald-400' },
};

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

export function RecentSessions({ sessions, onOpen, onDelete, onStartNew }: RecentSessionsProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-brass/70 mb-2.5">Projects</div>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg border border-warm-border bg-white px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-sm transition-all hover:border-accent/40 hover:text-accent hover:shadow-md active:scale-[0.98]"
          onClick={onStartNew}
        >
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New project
        </button>
      </div>

      <div className="h-px bg-warm-border/50 mx-4" />

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-2 h-8 w-8 rounded-full bg-warm-subtle flex items-center justify-center">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-[11px] font-medium text-slate-400">No projects yet</div>
            <div className="mt-0.5 text-[10px] text-slate-300">Start one above</div>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {sessions.map((session) => {
              const badge = PHASE_BADGE[session.phase] ?? PHASE_BADGE.inputs;
              return (
                <li key={session.sessionId}>
                  {confirmingId === session.sessionId ? (
                    <div className="rounded-lg border border-red-100 bg-red-50/60 px-3 py-2.5">
                      <div className="text-[11px] font-semibold text-red-700 mb-2">Delete this project?</div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          className="flex-1 rounded-md bg-red-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-red-600 transition-colors"
                          onClick={() => { onDelete(session.sessionId); setConfirmingId(null); }}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          className="flex-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                          onClick={() => setConfirmingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left transition-all hover:bg-white/80 hover:shadow-sm"
                        onClick={() => onOpen(session.sessionId)}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${badge.dot}`} />
                          <div className="min-w-0 flex-1 pr-4">
                            <div className="truncate text-[12px] font-semibold text-slate-700 leading-snug">{session.title}</div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="text-[10px] font-medium text-slate-400">{badge.label}</span>
                              <span className="text-[10px] text-slate-300">·</span>
                              <span className="text-[10px] text-slate-400">{relativeTime(session.updatedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-400 transition-all rounded-md hover:bg-red-50"
                        title="Delete project"
                        onClick={() => setConfirmingId(session.sessionId)}
                      >
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
