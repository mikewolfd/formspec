import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ChatSession, DeterministicAdapter, SessionStore } from 'formspec-chat';
import type { Attachment, SessionSummary } from 'formspec-chat';
import { ChatProvider, useChatState, useChatSession } from '../state/ChatContext.js';
import { EntryScreen } from './EntryScreen.js';
import { ChatPanel } from './ChatPanel.js';
import { FormPreview } from './FormPreview.js';

interface ChatShellProps {
  store?: SessionStore;
}

const UPLOAD_ACCEPT = '.pdf,.png,.jpg,.jpeg,.csv,.tsv,.xlsx,.json';

function attachmentTypeFromFilename(name: string): Attachment['type'] {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  if (['csv', 'tsv', 'xlsx', 'xls'].includes(ext)) return 'spreadsheet';
  return 'json';
}

/**
 * Master layout for Formspec Chat.
 * Manages the lifecycle: entry → active session (chat / preview toggle).
 * Optionally accepts a SessionStore for persistence and resume.
 */
export function ChatShell({ store }: ChatShellProps = {}) {
  const [session, setSession] = useState<ChatSession | null>(null);
  const recentSessions = useMemo(() => store?.list() ?? [], [store]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save on session changes
  useEffect(() => {
    if (!session || !store) return;
    return session.onChange(() => {
      store.save(session.toState());
    });
  }, [session, store]);

  const handleStartBlank = useCallback(() => {
    const s = new ChatSession({ adapter: new DeterministicAdapter() });
    setSession(s);
  }, []);

  const handleSelectTemplate = useCallback(async (templateId: string) => {
    const s = new ChatSession({ adapter: new DeterministicAdapter() });
    await s.startFromTemplate(templateId);
    setSession(s);
  }, []);

  const handleUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const attachment: Attachment = {
      id: `att-${Date.now()}`,
      type: attachmentTypeFromFilename(file.name),
      name: file.name,
      data: text,
    };

    const s = new ChatSession({ adapter: new DeterministicAdapter() });
    await s.startFromUpload(attachment);
    setSession(s);

    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleResumeSession = useCallback((sessionId: string) => {
    if (!store) return;
    const state = store.load(sessionId);
    if (!state) return;
    const restored = ChatSession.fromState(state, new DeterministicAdapter());
    setSession(restored);
  }, [store]);

  if (!session) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept={UPLOAD_ACCEPT}
          onChange={handleFileSelected}
          className="hidden"
          aria-hidden="true"
        />
        <EntryScreen
          onStartBlank={handleStartBlank}
          onSelectTemplate={handleSelectTemplate}
          onUpload={handleUpload}
          onResumeSession={handleResumeSession}
          recentSessions={recentSessions}
        />
      </>
    );
  }

  return (
    <ChatProvider session={session}>
      <ActiveSessionView />
    </ChatProvider>
  );
}

// ── Active Session ───────────────────────────────────────────────────

function ActiveSessionView() {
  const session = useChatSession();
  const state = useChatState();
  const [view, setView] = useState<'chat' | 'preview'>('chat');

  const handleExport = useCallback(() => {
    const json = session.exportJSON();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${json.title || 'form'}.formspec.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [session]);

  return (
    <div className="flex flex-col h-screen bg-bg-default text-ink font-ui">
      {/* Header bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold">Formspec Chat</h1>
          {state.openIssueCount > 0 && (
            <span
              data-testid="issue-count"
              className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber/10 text-amber border border-amber/20"
            >
              {state.openIssueCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {state.hasDefinition && (
            <>
              <button
                onClick={() => setView('chat')}
                aria-pressed={view === 'chat'}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                  view === 'chat'
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setView('preview')}
                aria-pressed={view === 'preview'}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors ${
                  view === 'preview'
                    ? 'bg-accent text-white'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Preview
              </button>
              <button
                onClick={handleExport}
                className="px-3 py-1.5 text-xs rounded-md font-medium text-muted hover:text-ink border border-border hover:border-accent transition-colors"
              >
                Export
              </button>
            </>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'chat' ? <ChatPanel /> : <FormPreview />}
      </div>
    </div>
  );
}
