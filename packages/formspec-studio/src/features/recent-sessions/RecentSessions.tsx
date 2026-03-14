import { useState } from 'react';
import type { RecentSessionEntry } from '../../shared/persistence/inquest-store';

interface RecentSessionsProps {
  sessions: RecentSessionEntry[];
  onOpen(sessionId: string): void;
  onDelete(sessionId: string): void;
  onStartNew(): void;
}

const PHASE_BADGE: Record<string, { label: string; className: string }> = {
  inputs: { label: 'Drafting', className: 'text-slate-400 bg-slate-50 border-slate-200' },
  review: { label: 'Review', className: 'text-amber-600 bg-amber-50 border-amber-200' },
  refine: { label: 'Refine', className: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
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
    <section className="rounded-xl border border-warm-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-brass">History</div>
          <h2 className="mt-1 text-base font-bold text-slate-900">Recent Projects</h2>
        </div>
        <button
          type="button"
          className="group flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-black"
          onClick={onStartNew}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Project</span>
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-warm-border py-8 text-center">
          <div className="text-[11px] text-slate-400">No projects yet</div>
          <div className="mt-1 text-[10px] text-slate-300">Start one above</div>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {sessions.map((session) => (
            <li key={session.sessionId}>
              {confirmingId === session.sessionId ? (
                <div className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/50 p-2.5">
                  <span className="text-[12px] font-medium text-red-600">Delete this project?</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      className="rounded-md bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-600 transition-colors"
                      onClick={() => {
                        onDelete(session.sessionId);
                        setConfirmingId(null);
                      }}
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-red-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-white transition-colors"
                      onClick={() => setConfirmingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group relative flex items-center gap-1.5">
                  <button
                    type="button"
                    className="flex-1 min-w-0 flex items-center justify-between rounded-lg border border-warm-border/60 bg-warm-subtle/20 p-2.5 text-left transition-all hover:border-accent hover:bg-white hover:shadow-sm"
                    onClick={() => onOpen(session.sessionId)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-800">{session.title}</div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`rounded-full border px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${(PHASE_BADGE[session.phase] ?? PHASE_BADGE.inputs).className}`}>
                          {(PHASE_BADGE[session.phase] ?? PHASE_BADGE.inputs).label}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">{relativeTime(session.updatedAt)}</span>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
                    title="Delete project"
                    onClick={() => setConfirmingId(session.sessionId)}
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
