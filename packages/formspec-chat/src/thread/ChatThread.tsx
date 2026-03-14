import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  MessagePartPrimitive,
  useExternalStoreRuntime,
  type AppendMessage,
  type ExternalStoreMessageConverter,
} from '@assistant-ui/react';
import type { InquestMessage } from 'formspec-shared';
import { FormspecIcon } from '../app/AppHeader';

/* ── Avatars ──────────────────────────────────── */

function UserAvatar() {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
      <FormspecIcon size={11} />
    </div>
  );
}

/* ── Typing indicator ─────────────────────────── */

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <AssistantAvatar />
      <div className="flex items-center gap-[4px] rounded-xl rounded-tl-sm border border-slate-100 bg-white px-3.5 py-2.5 shadow-sm">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[4px] w-[4px] rounded-full bg-slate-300 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '1.2s' }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Inline text renderer ─────────────────────── */

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={i} className="rounded-md bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-700">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/* ── Block markdown parser ────────────────────── */

type MdBlock =
  | { kind: 'p'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'h'; level: 1 | 2 | 3; text: string };

function parseMdBlocks(text: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let current: MdBlock | null = null;

  function flush() {
    if (current) { blocks.push(current); current = null; }
  }

  for (const line of text.split('\n')) {
    if (line.trim() === '') { flush(); continue; }

    const hMatch = line.match(/^(#{1,3})\s+(.*)/);
    if (hMatch) {
      flush();
      blocks.push({ kind: 'h', level: hMatch[1].length as 1 | 2 | 3, text: hMatch[2] });
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.*)/);
    if (ulMatch) {
      if (!current || current.kind !== 'ul') { flush(); current = { kind: 'ul', items: [] }; }
      current.items.push(ulMatch[1]);
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.*)/);
    if (olMatch) {
      if (!current || current.kind !== 'ol') { flush(); current = { kind: 'ol', items: [] }; }
      current.items.push(olMatch[1]);
      continue;
    }

    if (!current || current.kind !== 'p') { flush(); current = { kind: 'p', lines: [] }; }
    current.lines.push(line);
  }

  flush();
  return blocks;
}

function AssistantText({ text }: { text: string }) {
  const blocks = parseMdBlocks(text);
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        if (block.kind === 'h') {
          const cls = block.level === 1
            ? 'text-[14px] font-bold text-slate-900 mt-1'
            : block.level === 2
              ? 'text-[13px] font-bold text-slate-800 mt-0.5'
              : 'text-[13px] font-semibold text-slate-700';
          return <div key={i} className={cls}><InlineText text={block.text} /></div>;
        }
        if (block.kind === 'ul') {
          return (
            <ul key={i} className="ml-4 space-y-0.5 list-disc text-slate-700 marker:text-slate-300">
              {block.items.map((item, j) => (
                <li key={j} className="leading-relaxed"><InlineText text={item} /></li>
              ))}
            </ul>
          );
        }
        if (block.kind === 'ol') {
          return (
            <ol key={i} className="ml-4 space-y-0.5 list-decimal text-slate-700 marker:text-slate-400">
              {block.items.map((item, j) => (
                <li key={j} className="leading-relaxed"><InlineText text={item} /></li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i} className="leading-relaxed">
            {block.lines.map((line, j) => (
              <span key={j}>{j > 0 && <br />}<InlineText text={line} /></span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

/* ── Message components ───────────────────────── */

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end animate-in fade-in slide-in-from-bottom-1 duration-250">
      <div className="flex max-w-[76%] items-end gap-2">
        <div className="rounded-2xl rounded-tr-sm bg-accent px-4 py-2.5 text-[13.5px] leading-relaxed text-white">
          <MessagePrimitive.Content
            components={{
              Text: () => <MessagePartPrimitive.Text className="whitespace-pre-wrap" />,
            }}
          />
        </div>
        <UserAvatar />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantTextPart({ text }: { text: string }) {
  return <AssistantText text={text} />;
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-start animate-in fade-in slide-in-from-bottom-1 duration-250">
      <div className="flex max-w-[80%] items-end gap-2">
        <AssistantAvatar />
        <div className="rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-4 py-2.5 text-[13.5px] text-slate-800 shadow-sm">
          <MessagePrimitive.Content components={{ Text: AssistantTextPart }} />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
}

const messageComponents = { UserMessage, AssistantMessage };

/* ── Stable message converter ─────────────────── */

function useStableConverter(): ExternalStoreMessageConverter<InquestMessage> {
  return useCallback((msg: InquestMessage) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.text,
    id: msg.id,
    createdAt: new Date(msg.createdAt),
  }), []);
}

/* ── Scroll anchor ─────────────────────────────── */

function ScrollAnchor({ trigger }: { trigger: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [trigger]);
  return <div ref={ref} />;
}

/* ── Send button ──────────────────────────────── */

function SendButton() {
  return (
    <ComposerPrimitive.Send className="absolute bottom-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white transition-all hover:bg-slate-800 active:scale-95 disabled:bg-slate-100 disabled:text-slate-300">
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    </ComposerPrimitive.Send>
  );
}

/* ── Thread ───────────────────────────────────── */

interface InquestThreadProps {
  messages: InquestMessage[];
  isRunning?: boolean;
  disabled?: boolean;
  onNew?: (text: string) => Promise<void>;
  afterMessages?: ReactNode;
  belowComposer?: ReactNode;
}

export function InquestThread({
  messages,
  isRunning,
  disabled,
  onNew,
  afterMessages,
  belowComposer,
}: InquestThreadProps) {
  const convertMessage = useStableConverter();

  const handleNew = useCallback(async (message: AppendMessage) => {
    const text = message.content
      .filter((p) => p.type === 'text')
      .map((p) => (p as { type: 'text'; text: string }).text)
      .join('');
    if (!text.trim() || !onNew) return;
    await onNew(text);
  }, [onNew]);

  const runtime = useExternalStoreRuntime({
    messages,
    isRunning: isRunning ?? false,
    isDisabled: disabled || isRunning,
    convertMessage,
    onNew: handleNew,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="relative flex flex-1 flex-col overflow-hidden">
        {/* Messages */}
        <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto scroll-smooth">
          <div className="mx-auto w-full max-w-2xl space-y-4 px-6 pt-8 pb-4">
            <ThreadPrimitive.Messages components={messageComponents} />
            <ThreadPrimitive.If running>
              <TypingIndicator />
            </ThreadPrimitive.If>
            {afterMessages}
            <ScrollAnchor trigger={`${messages.length}:${String(isRunning)}`} />
          </div>
        </ThreadPrimitive.Viewport>

        {/* Composer */}
        <div className="shrink-0 border-t border-slate-100 bg-white/96 backdrop-blur-sm px-5 pt-3 pb-4">
          <div className="mx-auto max-w-2xl">
            <ComposerPrimitive.Root className="relative">
              <ComposerPrimitive.Input
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 pr-12 text-[13.5px] leading-relaxed outline-none transition-all placeholder:text-slate-400 focus:border-accent/40 focus:bg-white focus:ring-4 focus:ring-accent/8 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Describe the form you need…"
                submitMode="enter"
                rows={2}
              />
              <SendButton />
            </ComposerPrimitive.Root>
            {belowComposer}
          </div>
        </div>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}
