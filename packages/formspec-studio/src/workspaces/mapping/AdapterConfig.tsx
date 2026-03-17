import { useMapping } from '../../state/useMapping';
import { useProject } from '../../state/useProject';
import { Section } from '../../components/ui/Section';

const FORMATS = ['json', 'xml', 'csv'] as const;

export function AdapterConfig() {
  const mapping = useMapping();
  const project = useProject();
  
  const targetSchema = mapping?.targetSchema ?? {};
  const currentFormat = targetSchema.format ?? 'json';
  
  const adapters = (mapping as any)?.adapters ?? {};
  const currentAdapterConfig = adapters[currentFormat] ?? {};

  const setFormat = (format: string) => {
    project.setMappingTargetSchema('format', format);
  };

  const updateTargetSchema = (property: string, value: any) => {
    project.setMappingTargetSchema(property, value);
  };

  const updateAdapterConfig = (property: string, value: any) => {
    const nextConfig = { ...currentAdapterConfig, [property]: value };
    project.setMappingAdapter(currentFormat, nextConfig);
  };

  return (
    <Section title="Adapter">
      <div className="flex flex-col gap-4 text-sm max-w-xl">
        {/* Format Selector */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-subtle/30 border border-border/40">
          <div className="flex flex-col">
            <span className="text-muted font-bold text-[10px] uppercase tracking-wider mb-1">Output Format</span>
            <span className="text-xs text-muted/60">Primary serialization target</span>
          </div>
          <div className="flex gap-1">
            {FORMATS.map(f => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase transition-all ${
                  currentFormat === f 
                    ? 'bg-accent text-white shadow-sm' 
                    : 'bg-panel text-ink hover:bg-subtle border border-border/40'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* XML Specifics */}
        {currentFormat === 'xml' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-panel/40 border border-border/30">
              <span className="text-muted font-bold text-[10px] uppercase tracking-wider">Root Element</span>
              <input
                type="text"
                value={targetSchema.rootElement ?? ''}
                onChange={(e) => updateTargetSchema('rootElement', e.target.value)}
                placeholder="ClinicalDocument"
                className="bg-transparent border-none p-0 font-mono text-sm text-ink focus:ring-0"
              />
            </div>
            
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-panel/40 border border-border/30">
              <span className="text-muted font-bold text-[10px] uppercase tracking-wider">Namespaces</span>
              <div className="text-[11px] text-muted italic mb-1">Mapping of prefixes to URIs</div>
              <textarea
                value={JSON.stringify(targetSchema.namespaces ?? {}, null, 2)}
                onChange={(e) => {
                  try {
                    const val = JSON.parse(e.target.value);
                    updateTargetSchema('namespaces', val);
                  } catch {}
                }}
                rows={3}
                className="w-full bg-subtle/30 rounded-lg p-2 font-mono text-xs border border-border/40 focus:border-accent/30 focus:ring-1 focus:ring-accent/10"
                placeholder='{ "": "urn:hl7-org:v3" }'
              />
            </div>
          </div>
        )}

        {/* Generic Adapter Options summary */}
        <div className="flex flex-col gap-2 p-3 rounded-xl bg-panel/40 border border-border/30 border-dashed">
          <span className="text-muted font-bold text-[10px] uppercase tracking-wider mb-1">Implementation Details</span>
          <div className="text-[11px] text-muted/60 leading-relaxed">
            The <span className="text-ink font-bold uppercase">{currentFormat}</span> adapter is managed by the model-driven 
            <code className="text-[10px] bg-subtle px-1 rounded mx-0.5">formspec-core</code> engine. 
            {currentFormat === 'json' && " No special serialization options required."}
            {currentFormat === 'xml' && " Element nesting and attribute paths (@) are resolved during emit."}
            {currentFormat === 'csv' && " Nested paths are forbidden; column headers are derived from targetPath."}
          </div>
        </div>
      </div>
    </Section>
  );
}
