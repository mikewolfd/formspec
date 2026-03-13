import type { InquestSessionInput } from '../../shared/contracts/inquest';
import type { InquestTemplate } from '../../shared/contracts/inquest';

interface InputInventoryProps {
  input: InquestSessionInput;
  template?: InquestTemplate;
}

export function InputInventory({ input, template }: InputInventoryProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Context</div>
        <h2 className="mt-1 text-base font-bold text-slate-900">Project Workspace</h2>
      </div>

      <div className="space-y-3 text-[13px]">
        {template ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Blueprint</div>
            <div className="mt-1 font-bold text-slate-800">{template.name}</div>
          </div>
        ) : null}

        {input.description.trim() ? (
          <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
            <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Draft Summary</div>
            <div className="mt-1 line-clamp-3 text-slate-600 italic">"{input.description.slice(0, 100)}..."</div>
          </div>
        ) : null}

        {input.uploads.map((upload) => (
          <div key={upload.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white p-3 transition-colors hover:border-accent">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-slate-800">{upload.name}</div>
              <div className="text-[10px] text-slate-400">{(upload.size / 1024).toFixed(0)} KB · {upload.status}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
