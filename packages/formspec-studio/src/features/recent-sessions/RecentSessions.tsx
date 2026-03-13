import type { RecentSessionEntry } from '../../shared/persistence/inquest-store';

interface RecentSessionsProps {
  sessions: RecentSessionEntry[];
  onOpen(sessionId: string): void;
  onStartNew(): void;
}

export function RecentSessions({ sessions, onOpen, onStartNew }: RecentSessionsProps) {
  return (
    <section className="rounded-2xl border border-[#cfbf9f] bg-white/80 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.24em] text-[#B7791F]">Recent Inquests</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Resume on this browser</h2>
        </div>
        <button
          type="button"
          className="rounded-md bg-[#1C2433] px-3 py-2 text-sm font-medium text-white"
          onClick={onStartNew}
        >
          Start New Inquest
        </button>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-slate-600">No local Inquest sessions yet.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <button
              key={session.sessionId}
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-[#dbcdb2] bg-white px-4 py-3 text-left"
              onClick={() => onOpen(session.sessionId)}
            >
              <div>
                <div className="font-medium">{session.title}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {session.phase} · saved {new Date(session.updatedAt).toLocaleString()}
                </div>
              </div>
              <span className="rounded-full bg-[#f3ead8] px-2 py-1 text-[11px] font-mono uppercase tracking-wide text-[#7b5b21]">
                {session.phase}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
