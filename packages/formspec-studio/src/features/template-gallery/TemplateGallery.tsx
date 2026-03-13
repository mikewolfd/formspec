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
    <section className="bg-transparent">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const selected = template.id === selectedTemplateId;
          return (
            <article
              key={template.id}
              className={`group relative flex flex-col rounded-[20px] border p-5 transition-all duration-300 ${
                selected 
                  ? 'border-accent bg-accent/5 shadow-md ring-1 ring-accent/20' 
                  : 'border-slate-100 bg-white hover:border-accent hover:shadow-xl hover:scale-[1.02]'
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-[14px] font-bold text-slate-800 leading-tight transition-colors group-hover:text-accent">{template.name}</h3>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                  {template.category}
                </span>
              </div>
              <p className="flex-1 text-[12px] leading-relaxed text-slate-500 line-clamp-2 mb-4">{template.description}</p>
              <div>
                <button
                  type="button"
                  className={`w-full rounded-xl py-2 text-[11px] font-bold transition-all ${
                    selected 
                      ? 'bg-accent text-white shadow-sm' 
                      : 'bg-slate-900 text-white hover:bg-black'
                  }`}
                  onClick={() => onSelect(template.id)}
                >
                  {selected ? 'Active Selection' : 'Use Blueprint'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
