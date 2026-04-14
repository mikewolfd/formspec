/** @filedesc Blueprint section listing named data source instances defined on the form. */
import { useDefinition } from '../../state/useDefinition';

interface InstanceEntry {
  name: string;
  source?: string;
  description?: string;
}

export function DataSourcesList() {
  const definition = useDefinition();
  const raw = definition.instances;

  const entries: InstanceEntry[] = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? Object.entries(raw).map(([name, val]) => ({
        name,
        ...(typeof val === 'object' && val !== null ? val as Record<string, unknown> : {}),
      })) as InstanceEntry[]
    : [];

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-5 border border-dashed border-border/70 rounded-[6px] bg-subtle/30 text-muted mx-1">
        <span className="text-[12px] font-medium font-ui tracking-tight">No data sources defined</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((inst) => (
        <div key={inst.name} className="px-2.5 py-1.5 rounded-[4px] hover:bg-subtle/50 transition-colors cursor-default">
          <div className="text-[13px] font-mono font-medium text-ink/80">{inst.name}</div>
          {inst.source && (
            <div className="text-[11px] text-muted truncate mt-0.5">{inst.source}</div>
          )}
        </div>
      ))}
    </div>
  );
}
