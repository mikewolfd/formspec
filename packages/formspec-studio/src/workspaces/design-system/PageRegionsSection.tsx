/** @filedesc Design mode section — form pagination and structural regions. */
import { useProject } from '../../state/useProject';
import { useProjectState } from '../../state/useProjectState';

export function PageRegionsSection() {
  const project = useProject();
  const state = useProjectState();
  const pages = project.listPages();

  const handleAddPage = () => {
    project.addPage(`Page ${pages.length + 1}`);
  };

  return (
    <section className="space-y-8">
      <div>
        <h3 className="text-[19px] font-semibold text-ink tracking-tight">Form Structure</h3>
        <p className="text-[13px] text-muted mt-1">Organize your form into pages and define global header/footer areas.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[14px] font-bold text-ink uppercase tracking-wider">Pages</h4>
          <button 
            onClick={handleAddPage}
            className="text-[12px] font-bold text-accent hover:underline cursor-pointer"
          >
            + Add Page
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {pages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-[13px] text-muted">
              Single-page form (default)
            </div>
          ) : (
            pages.map((page, i) => (
              <div key={page.id} className="rounded-xl border border-border bg-surface p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold text-[13px]">
                    {i + 1}
                  </div>
                  <div className="text-[14px] font-medium text-ink">{page.title || `Page ${i + 1}`}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => project.removePage(page.id)}
                    className="text-muted hover:text-error text-[12px] font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <h4 className="text-[14px] font-bold text-ink uppercase tracking-wider">Shared Regions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RegionCard 
            title="Header" 
            description="Visible at the top of every page."
            isActive={!!(state.theme as any).regions?.header}
            onToggle={() => project.setThemeExtension('regions.header', !(state.theme as any).regions?.header)}
          />
          <RegionCard 
            title="Footer" 
            description="Visible at the bottom of every page."
            isActive={!!(state.theme as any).regions?.footer}
            onToggle={() => project.setThemeExtension('regions.footer', !(state.theme as any).regions?.footer)}
          />
          <RegionCard 
            title="Sidebar" 
            description="Collapsible area for supplementary info."
            isActive={!!(state.theme as any).regions?.sidebar}
            onToggle={() => project.setThemeExtension('regions.sidebar', !(state.theme as any).regions?.sidebar)}
          />
        </div>
      </div>
    </section>
  );
}

function RegionCard({ title, description, isActive, onToggle }: { title: string; description: string; isActive: boolean; onToggle: () => void }) {
  return (
    <div className={`rounded-xl border p-4 transition-all ${isActive ? 'border-accent bg-accent/5' : 'border-border bg-surface hover:border-border-hover'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[15px] font-semibold text-ink">{title}</div>
        <button 
          onClick={onToggle}
          className={`h-5 w-9 rounded-full relative transition-colors ${isActive ? 'bg-accent' : 'bg-muted/30'}`}
        >
          <div className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-all ${isActive ? 'left-5' : 'left-1'}`} />
        </button>
      </div>
      <p className="text-[12px] text-muted leading-relaxed">{description}</p>
    </div>
  );
}
