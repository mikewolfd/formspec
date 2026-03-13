import { useState } from 'react';
import { useDispatch } from '../../state/useDispatch';
import { useDefinition } from '../../state/useDefinition';
import { InlineExpression } from '../../components/ui/InlineExpression';

interface Instance {
  name: string;
  source?: string;
  description?: string;
  schema?: Record<string, string>;
  static?: boolean;
}

export function DataSources() {
  const definition = useDefinition();
  const dispatch = useDispatch();
  const rawInstances = definition?.instances;
  const [expandedName, setExpandedName] = useState<string | null>(null);

  const instances: Instance[] = Array.isArray(rawInstances)
    ? rawInstances
    : Object.entries(rawInstances || {}).map(([name, inst]) => ({
        name,
        ...(inst as object),
      }));

  const handleAdd = () => {
    const name = window.prompt('Data source name (e.g. patient_record)');
    if (!name?.trim()) return;
    dispatch({
      type: 'definition.addInstance',
      payload: { name: name.trim() },
    });
    setExpandedName(name.trim());
  };

  const handleSetProperty = (name: string, property: string, value: unknown) => {
    dispatch({
      type: 'definition.setInstance',
      payload: { name, property, value },
    });
  };

  const handleDelete = (name: string) => {
    if (window.confirm(`Delete data source "${name}"?`)) {
      dispatch({
        type: 'definition.deleteInstance',
        payload: { name },
      });
      if (expandedName === name) setExpandedName(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-1">
        <h4 className="text-[12px] font-bold text-muted uppercase tracking-wider">External Data Catalog</h4>
        <button
          type="button"
          onClick={handleAdd}
          className="text-[11px] text-accent hover:text-accent-hover font-bold uppercase tracking-wider transition-colors"
        >
          + Add Document
        </button>
      </div>

      {instances.length === 0 && (
        <div className="py-2 text-sm text-muted italic opacity-50">No external sources connected.</div>
      )}

      {instances.map((inst) => {
        const isExpanded = expandedName === inst.name;

        return (
          <div
            key={inst.name}
            data-testid={`instance-${inst.name}`}
            className={`group relative bg-surface border rounded-xl transition-all overflow-hidden ${isExpanded ? 'border-accent ring-1 ring-accent/10' : 'border-border'}`}
          >
            {/* Header — click to expand/collapse */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer"
              onClick={() => setExpandedName(isExpanded ? null : inst.name)}
            >
              <div>
                <div className="font-bold text-[14px] text-ink">{inst.name}</div>
                {!isExpanded && inst.source && (
                  <div className="text-[11px] text-muted font-mono truncate max-w-[400px] mt-0.5">
                    {inst.source}
                  </div>
                )}
                {!isExpanded && !inst.source && (
                  <div className="text-[11px] text-muted italic mt-0.5">Inline Document</div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {inst.static && (
                  <span className="text-[9px] font-bold text-muted uppercase tracking-tighter border border-border px-1.5 rounded">Static</span>
                )}
                <div className={`text-[12px] text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</div>
              </div>
            </div>

            {/* Expanded editor */}
            {isExpanded && (
              <div className="p-5 pt-0 border-t border-border space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-2 mt-4">
                  <label className="text-[10px] font-bold text-muted uppercase tracking-widest block">Connection Endpoint</label>
                  <InlineExpression
                    value={inst.source || ''}
                    onSave={(val) => handleSetProperty(inst.name, 'source', val)}
                    placeholder="https://api.example.com/data"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Static caching"
                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
                    checked={!!inst.static}
                    onChange={(e) => handleSetProperty(inst.name, 'static', e.target.checked)}
                  />
                  <span className="text-[12px] font-bold text-ink">Static (Caching)</span>
                </label>

                <div className="pt-4 border-t border-border flex justify-end">
                  <button
                    type="button"
                    aria-label="Delete data source"
                    onClick={() => handleDelete(inst.name)}
                    className="text-[10px] font-bold text-muted hover:text-error uppercase tracking-widest transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
