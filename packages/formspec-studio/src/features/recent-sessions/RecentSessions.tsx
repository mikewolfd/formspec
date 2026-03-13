import type { RecentSessionEntry } from '../../shared/persistence/inquest-store';

interface RecentSessionsProps {
  sessions: RecentSessionEntry[];
  onOpen(sessionId: string): void;
  onDelete(sessionId: string): void;
  onStartNew(): void;
}

export function RecentSessions({ sessions, onOpen, onDelete, onStartNew }: RecentSessionsProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Memory</div>
          <h2 className="mt-1 text-base font-bold text-slate-900">Recent Projects</h2>
        </div>
        <button
          type="button"
          className="group flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:bg-slate-900 hover:text-white"
          onClick={onStartNew}
        >
          <span>Create New</span>
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-[11px] text-slate-400">
          No recent projects
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => (
            <li key={session.sessionId} className="group relative flex items-center gap-2">
              <button
                type="button"
                className="flex-1 min-w-0 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/30 p-3 text-left transition-all hover:border-accent hover:bg-white hover:shadow-md"
                onClick={() => onOpen(session.sessionId)}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-slate-800 transition-colors group-hover:text-slate-900">{session.title}</div>
                  <div className="mt-1 text-[10px] font-medium text-slate-400 uppercase">
                     {new Date(session.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="ml-2 h-1.5 w-1.5 rounded-full bg-slate-200 transition-colors group-hover:bg-accent" />
              </button>
              
              <button
                type="button"
                className="absolute -right-2 top-11/12 translate-y-[-50%] opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all rounded-full hover:bg-red-50"
                title="Delete project"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${session.title}"?`)) {
                    onDelete(session.sessionId);
                  }
                }}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
