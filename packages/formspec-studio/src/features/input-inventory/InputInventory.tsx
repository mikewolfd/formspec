import type { InquestSessionInput } from '../../shared/contracts/inquest';
import type { InquestTemplate } from '../../shared/contracts/inquest';

interface InputInventoryProps {
  input: InquestSessionInput;
  template?: InquestTemplate;
}

export function InputInventory({ input, template }: InputInventoryProps) {
  return (
    <aside className="rounded-2xl border border-[#cfbf9f] bg-white/80 p-5 shadow-sm">
      <div className="mb-4">
        <div className="text-xs font-mono uppercase tracking-[0.24em] text-[#B7791F]">Inputs</div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">Working case file</h2>
      </div>

      <div className="space-y-3 text-sm">
        {template ? (
          <div className="rounded-xl border border-[#dbcdb2] bg-[#f9f4ea] p-3">
            <div className="font-semibold">Template seed</div>
            <div className="mt-1 text-slate-600">{template.name}</div>
          </div>
        ) : null}

        {input.description.trim() ? (
          <div className="rounded-xl border border-[#dbcdb2] bg-white p-3">
            <div className="font-semibold">Description</div>
            <div className="mt-1 whitespace-pre-wrap text-slate-600">{input.description}</div>
          </div>
        ) : null}

        {input.uploads.map((upload) => (
          <div key={upload.id} className="rounded-xl border border-[#dbcdb2] bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold">{upload.name}</div>
              <span className="rounded-full bg-[#f3ead8] px-2 py-0.5 text-[11px] font-mono uppercase tracking-wide text-[#7b5b21]">
                {upload.status}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">{upload.mimeType}</div>
            {upload.excerpt ? <div className="mt-2 text-slate-600">{upload.excerpt}</div> : null}
          </div>
        ))}

        {input.messages.length > 0 ? (
          <div className="rounded-xl border border-[#dbcdb2] bg-white p-3">
            <div className="font-semibold">Conversation</div>
            <div className="mt-2 space-y-2">
              {input.messages.slice(-3).map((message) => (
                <div key={message.id} className="rounded-lg bg-[#f5efe4] px-3 py-2 text-slate-700">
                  <div className="text-[11px] font-mono uppercase tracking-wide text-slate-500">{message.role}</div>
                  <div className="mt-1">{message.text}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
