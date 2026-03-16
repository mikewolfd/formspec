import React, { useState, useRef } from 'react';
import { useChatSession, useChatState } from '../state/ChatContext.js';

export function ChatPanel() {
  const session = useChatSession();
  const state = useChatState();
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || sending) return;

    setSending(true);
    setInputValue('');
    try {
      await session.sendMessage(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {state.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted">
            Describe the form you need, and we'll build it together.
          </div>
        ) : (
          state.messages.map(msg => (
            <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
          ))
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border px-4 py-3 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          placeholder="Describe what you need..."
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={sending || !inputValue.trim()}
          className="px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// ── MessageBubble ────────────────────────────────────────────────────

function MessageBubble({ role, content }: { role: string; content: string }) {
  const styles: Record<string, string> = {
    user: 'bg-accent/10 text-ink ml-12',
    assistant: 'bg-surface border border-border text-ink mr-12',
    system: 'bg-subtle text-muted text-xs italic mx-8 text-center',
  };

  return (
    <div className={`rounded-lg px-4 py-3 text-sm ${styles[role] ?? styles.assistant}`}>
      {content}
    </div>
  );
}
