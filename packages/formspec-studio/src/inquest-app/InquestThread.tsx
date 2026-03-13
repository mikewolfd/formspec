import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  MessagePartPrimitive,
  useExternalStoreRuntime,
} from '@assistant-ui/react';
import type { useChat } from '@ai-sdk/react';

/* ── Message components (module-level for stable references) ── */

function TextPart() {
  return <MessagePartPrimitive.Text className="whitespace-pre-wrap" />;
}

function SmoothTextPart() {
  return <MessagePartPrimitive.Text smooth className="whitespace-pre-wrap" />;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="flex flex-col gap-2 max-w-[85%] items-end">
        <div className="px-5 py-4 text-[15px] leading-relaxed shadow-sm bg-accent text-white rounded-[20px] rounded-tr-none">
          <MessagePrimitive.Content components={{ Text: TextPart }} />
        </div>
        <div className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">You</div>
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-start">
      <div className="flex flex-col gap-2 max-w-[85%] items-start">
        <div className="px-5 py-4 text-[15px] leading-relaxed shadow-sm bg-slate-100 text-slate-800 rounded-[20px] rounded-tl-none">
          <MessagePrimitive.Content components={{ Text: SmoothTextPart }} />
        </div>
        <div className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Stack Assistant</div>
      </div>
    </MessagePrimitive.Root>
  );
}

const messageComponents = { UserMessage, AssistantMessage };

/* ── Thread component ── */

type ChatHelpers = ReturnType<typeof useChat>;

interface InquestThreadProps {
  chat: ChatHelpers;
  disabled?: boolean;
  onNew?: (text: string) => Promise<void>;
  afterMessages?: React.ReactNode;
  belowComposer?: React.ReactNode;
}

export function InquestThread({ chat, disabled, onNew, afterMessages, belowComposer }: InquestThreadProps) {
  const runtime = useExternalStoreRuntime({
    messages: chat.messages,
    isRunning: chat.isLoading,
    isDisabled: disabled,
    convertMessage: (msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      id: msg.id,
      createdAt: msg.createdAt,
    }),
    onNew: async (message) => {
      const text = message.content
        .filter((p) => p.type === 'text')
        .map((p) => (p as { type: 'text'; text: string }).text)
        .join('');
      if (!text.trim()) return;

      if (onNew) {
        await onNew(text);
      } else {
        await chat.append({ role: 'user', content: text });
      }
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="relative flex flex-1 flex-col">
        <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto p-8 flex justify-center">
          <div className="w-full max-w-3xl space-y-8">
            <ThreadPrimitive.Messages components={messageComponents} />
            {afterMessages}
          </div>
        </ThreadPrimitive.Viewport>

        <div className="border-t border-slate-200 bg-white p-6 pb-8">
          <div className="mx-auto max-w-3xl">
            <ComposerPrimitive.Root className="relative flex items-center">
              <ComposerPrimitive.Input
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 pr-16 text-[15px] shadow-inner outline-none transition-all focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Ask Stack to build a form..."
                submitMode="enter"
                rows={2}
              />
              <ComposerPrimitive.Send className="absolute right-4 bottom-4 h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg transition-all hover:scale-105 hover:bg-black disabled:opacity-20 disabled:scale-100">
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
