import type { InquestTemplate } from '../../shared/contracts/inquest';

export interface TemplateGalleryProps {
  templates: InquestTemplate[];
  selectedTemplateId?: string;
  mode: 'inquest' | 'studio';
  onSelect(templateId: string): void;
  onPreview?(templateId: string): void;
}

export function TemplateGallery({
  templates,
  selectedTemplateId,
  mode,
  onSelect,
  onPreview,
}: TemplateGalleryProps) {
  return (
    <section className="rounded-2xl border border-[#cfbf9f] bg-white/80 p-5 shadow-sm">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.24em] text-[#B7791F]">Templates</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Start from a known structure</h2>
        </div>
        <div className="text-sm text-slate-600">{mode === 'inquest' ? 'Inquest' : 'Studio'}</div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => {
          const selected = template.id === selectedTemplateId;
          return (
            <article
              key={template.id}
              className={`rounded-xl border p-4 transition-colors ${
                selected ? 'border-[#2F6B7E] bg-[#edf6f8]' : 'border-[#dbcdb2] bg-white'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">{template.name}</h3>
                <span className="rounded-full bg-[#f3ead8] px-2 py-1 text-[11px] font-mono uppercase tracking-wide text-[#7b5b21]">
                  {template.category}
                </span>
              </div>
              <p className="text-sm text-slate-700">{template.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {template.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-[#dbcdb2] px-2 py-0.5 text-xs text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    selected ? 'bg-[#2F6B7E] text-white' : 'bg-[#1C2433] text-white'
                  }`}
                  onClick={() => onSelect(template.id)}
                >
                  {selected ? 'Selected' : 'Use template'}
                </button>
                {onPreview ? (
                  <button
                    type="button"
                    className="rounded-md border border-[#dbcdb2] px-3 py-2 text-sm text-slate-700"
                    onClick={() => onPreview(template.id)}
                  >
                    Preview
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
