import type { InquestSessionInput } from '../../shared/contracts/inquest';
import type { InquestTemplate } from '../../shared/contracts/inquest';

interface InputInventoryProps {
  input: InquestSessionInput;
  template?: InquestTemplate;
}

export function InputInventory({ input, template }: InputInventoryProps) {
  const messageCount = input.messages.filter((m) => m.role === 'user').length;
  const isEmpty = !template && !input.description.trim() && input.uploads.length === 0 && messageCount === 0;

  return (
    <section className="rounded-xl border border-warm-border bg-white p-5 shadow-sm">
      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-brass">Context</div>
        <h2 className="mt-1 text-base font-bold text-slate-900">Project Workspace</h2>
      </div>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed border-warm-border p-5 text-center">
          <div className="text-[11px] text-slate-400 leading-relaxed">
            Describe your form, pick a template, or attach a document to get started.
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 text-[13px]">
          {template ? (
            <div className="rounded-lg border border-warm-border bg-warm-subtle/30 p-3">
              <div className="text-[9px] font-bold uppercase tracking-widest text-brass">Blueprint</div>
              <div className="mt-1 font-bold text-slate-800">{template.name}</div>
              <div className="mt-0.5 text-[11px] text-slate-400">{template.category}</div>
            </div>
          ) : null}

          {messageCount > 0 ? (
            <div className="flex items-center gap-2.5 rounded-lg border border-warm-border/60 bg-warm-subtle/20 p-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-slate-700">{messageCount} message{messageCount !== 1 ? 's' : ''}</div>
                <div className="text-[10px] text-slate-400">In conversation</div>
              </div>
            </div>
          ) : null}

          {input.description.trim() ? (
            <div className="rounded-lg border border-warm-border/60 bg-white p-3 shadow-sm">
              <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Description</div>
              <div className="line-clamp-4 text-[12px] text-slate-600 leading-relaxed italic">
                "{input.description.trim().slice(0, 140)}{input.description.trim().length > 140 ? '…' : ''}"
              </div>
            </div>
          ) : null}

          {input.uploads.map((upload) => (
            <div key={upload.id} className="flex items-center gap-2.5 rounded-lg border border-warm-border/60 bg-white p-3 transition-colors hover:border-accent">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warm-subtle text-brass">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-800 text-sm">{upload.name}</div>
                <div className="text-[10px] text-slate-400">{(upload.size / 1024).toFixed(0)} KB · {upload.status}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
