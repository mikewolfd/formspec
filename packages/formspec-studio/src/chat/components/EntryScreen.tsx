import React, { useState } from 'react';
import type { SessionSummary } from 'formspec-chat';
import { TemplateLibrary } from 'formspec-chat';

const library = new TemplateLibrary();
const templates = library.getAll();

interface EntryScreenProps {
  onStartBlank: () => void;
  onSelectTemplate: (templateId: string) => void;
  onUpload: () => void;
  onResumeSession: (sessionId: string) => void;
  recentSessions: SessionSummary[];
}

export function EntryScreen({
  onStartBlank,
  onSelectTemplate,
  onUpload,
  onResumeSession,
  recentSessions,
}: EntryScreenProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-default px-6 py-12">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-ink font-ui">Formspec Chat</h1>
          <p className="text-sm text-muted">
            Describe the form you need. We'll build it together.
          </p>
        </div>

        {!showTemplates ? (
          <div className="space-y-6">
            {/* Primary actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={onStartBlank}
                className="flex flex-col items-center gap-2 p-5 rounded-lg border border-border bg-surface hover:border-accent transition-colors text-center"
              >
                <span className="text-lg">✎</span>
                <span className="text-sm font-medium text-ink">Start blank</span>
                <span className="text-xs text-muted">Jump into conversation</span>
              </button>

              <button
                onClick={() => setShowTemplates(true)}
                className="flex flex-col items-center gap-2 p-5 rounded-lg border border-border bg-surface hover:border-accent transition-colors text-center"
              >
                <span className="text-lg">☐</span>
                <span className="text-sm font-medium text-ink">Pick a template</span>
                <span className="text-xs text-muted">Start from a common pattern</span>
              </button>

              <button
                onClick={onUpload}
                className="flex flex-col items-center gap-2 p-5 rounded-lg border border-border bg-surface hover:border-accent transition-colors text-center"
              >
                <span className="text-lg">↑</span>
                <span className="text-sm font-medium text-ink">Upload a form</span>
                <span className="text-xs text-muted">PDF, image, or spreadsheet</span>
              </button>
            </div>

            {/* Recent sessions */}
            {recentSessions.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-mono uppercase tracking-wide text-muted">
                  Resume a recent session
                </h2>
                <div className="space-y-2">
                  {recentSessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => onResumeSession(s.id)}
                      className="w-full text-left px-4 py-3 rounded-lg border border-border bg-surface hover:border-accent transition-colors"
                    >
                      <span className="text-sm text-ink">{s.preview}</span>
                      <span className="text-xs text-muted ml-2">
                        {s.messageCount} messages
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Template grid */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-wide text-muted">
                Choose a template
              </h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-xs text-accent hover:underline"
              >
                Back
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => onSelectTemplate(t.id)}
                  className="text-left p-4 rounded-lg border border-border bg-surface hover:border-accent transition-colors"
                >
                  <span className="text-sm font-medium text-ink block">
                    {t.name}
                  </span>
                  <span className="text-xs text-muted mt-1 block">
                    {t.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
