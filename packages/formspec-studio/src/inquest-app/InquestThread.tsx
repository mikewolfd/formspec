import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  MessagePartPrimitive,
  useExternalStoreRuntime,
} from '@assistant-ui/react';
import type { InquestMessage } from '../shared/contracts/inquest';

/* ── Avatars ──────────────────────────────────── */

function UserAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
      <svg width="13" height="13" viewBox="0 0 12 12" fill="none">
        <rect x="2" y="1.5" width="8" height="2" rx=".4" fill="currentColor" />
        <rect x="2" y="5" width="8" height="2" rx=".4" fill="currentColor" fillOpacity=".7" />
        <rect x="2" y="8.5" width="8" height="2" rx=".4" fill="currentColor" fillOpacity=".4" />
      </svg>
    </div>
  );
}

/* ── Typing indicator ─────────────────────────── */

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <AssistantAvatar />
      <div className="flex items-center gap-1.5 rounded-[18px] rounded-tl-none bg-slate-100 px-4 py-3.5 shadow-sm">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Message parts ────────────────────────────── */

function TextPart() {
  return <MessagePartPrimitive.Text className="whitespace-pre-wrap" />;
}

function SmoothTextPart() {
  return <MessagePartPrimitive.Text smooth className="whitespace-pre-wrap" />;
}

/* ── Message components ───────────────────────── */

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex max-w-[80%] items-end gap-2.5">
        <div className="rounded-[18px] rounded-tr-none bg-accent px-5 py-3.5 text-[15px] leading-relaxed text-white shadow-sm">
          <MessagePrimitive.Content components={{ Text: TextPart }} />
        </div>
        <UserAvatar />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex max-w-[80%] items-end gap-2.5">
        <AssistantAvatar />
        <div className="rounded-[18px] rounded-tl-none bg-slate-100 px-5 py-3.5 text-[15px] leading-relaxed text-slate-800 shadow-sm">
          <MessagePrimitive.Content components={{ Text: SmoothTextPart }} />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
}

const messageComponents = { UserMessage, AssistantMessage };

/* ── Thread ───────────────────────────────────── */

interface InquestThreadProps {
  messages: InquestMessage[];
  isRunning?: boolean;
  disabled?: boolean;
  onNew?: (text: string) => Promise<void>;
  afterMessages?: React.ReactNode;
  belowComposer?: React.ReactNode;
}

export function InquestThread({
  messages,
  isRunning,
  disabled,
  onNew,
  afterMessages,
  belowComposer,
}: InquestThreadProps) {
  const runtime = useExternalStoreRuntime({
    messages,
    isRunning: isRunning ?? false,
    isDisabled: disabled || isRunning,
    convertMessage: (msg: InquestMessage) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.text,
      id: msg.id,
      createdAt: new Date(msg.createdAt),
    }),
    onNew: async (message) => {
      const text = message.content
        .filter((p) => p.type === 'text')
        .map((p) => (p as { type: 'text'; text: string }).text)
        .join('');
      if (!text.trim()) return;
      if (onNew) await onNew(text);
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="relative flex flex-1 flex-col">
        <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-8 flex justify-center">
          <div className="w-full max-w-3xl space-y-6">
            <ThreadPrimitive.Messages components={messageComponents} />
            <ThreadPrimitive.If running>
              <TypingIndicator />
            </ThreadPrimitive.If>
            {afterMessages}
          </div>
        </ThreadPrimitive.Viewport>

        <div className="border-t border-slate-200 bg-white p-6 pb-8">
          <div className="mx-auto max-w-3xl">
            <ComposerPrimitive.Root className="relative flex items-center">
              <ComposerPrimitive.Input
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 pr-16 text-[15px] shadow-inner outline-none transition-all focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Describe what you're building, or ask a question…"
                submitMode="enter"
                rows={2}
              />
              <ComposerPrimitive.Send className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg transition-all hover:scale-105 hover:bg-black disabled:scale-100 disabled:opacity-20">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
            {belowComposer}
          </div>
        </div>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}
