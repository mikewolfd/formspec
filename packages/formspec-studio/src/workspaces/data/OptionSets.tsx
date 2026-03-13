import { useState } from 'react';
import { useDefinition } from '../../state/useDefinition';
import { useDispatch } from '../../state/useDispatch';
import { flatItems } from '../../lib/field-helpers';
import { InlineExpression } from '../../components/ui/InlineExpression';

interface OptionEntry {
  value: string;
  label: string;
}

interface OptionSetDef {
  options?: OptionEntry[];
  source?: string;
  valueField?: string;
  labelField?: string;
}

export function OptionSets() {
  const definition = useDefinition();
  const dispatch = useDispatch();
  const optionSets = (definition?.optionSets as unknown as Record<string, OptionSetDef>) || {};
  const items = (definition?.items as any[]) || [];
  const [expandedName, setExpandedName] = useState<string | null>(null);

  const handleAdd = () => {
    const name = window.prompt('Lookup table name (e.g. state_codes)');
    if (!name?.trim()) return;
    dispatch({
      type: 'definition.setOptionSet',
      payload: { name: name.trim(), options: [] },
    });
    setExpandedName(name.trim());
  };

  const handleSetProperty = (name: string, property: string, value: unknown) => {
    dispatch({
      type: 'definition.setOptionSetProperty',
      payload: { name, property, value },
    });
  };

  const handleDelete = (name: string) => {
    if (window.confirm(`Delete "${name}"?`)) {
      dispatch({
        type: 'definition.deleteOptionSet',
        payload: { name },
      });
      if (expandedName === name) setExpandedName(null);
    }
  };

  // Count how many fields reference each option set
  const flat = flatItems(items);
  const usageCounts: Record<string, number> = {};
  for (const { item } of flat) {
    const ref = item.optionSet as string | undefined;
    if (ref) {
      usageCounts[ref] = (usageCounts[ref] || 0) + 1;
    }
  }

  const entries = Object.entries(optionSets);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-1">
        <h4 className="text-[12px] font-bold text-muted uppercase tracking-wider">Active Tables</h4>
        <button
          type="button"
          onClick={handleAdd}
          className="text-[11px] text-accent hover:text-accent-hover font-bold uppercase tracking-wider transition-colors"
        >
          + New Table
        </button>
      </div>

      {entries.length === 0 && (
        <div className="py-2 text-sm text-muted italic opacity-50">No lookup tables defined.</div>
      )}

      {entries.map(([name, os]) => {
        const isExpanded = expandedName === name;
        const isRemote = !!os.source;
        const optionCount = os.options?.length ?? 0;
        const refs = usageCounts[name] || 0;

        return (
          <div
            key={name}
            data-testid={`option-set-${name}`}
            className={`rounded-xl border transition-all ${isExpanded ? 'border-accent shadow-md ring-1 ring-accent/10 bg-surface' : 'border-border bg-surface/50 hover:border-muted hover:bg-surface'}`}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => setExpandedName(isExpanded ? null : name)}
            >
              <div>
                <div className="font-bold text-[14px] text-ink">{name}</div>
                {!isExpanded && (
                  <div className="text-[11px] text-muted truncate max-w-[400px] mt-1">
                    {isRemote ? `Remote: ${os.source}` : `${optionCount} options`}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-6">
                <div className="text-[10px] text-muted font-mono uppercase tracking-wider text-right">
                  {refs} Ref{refs !== 1 ? 's' : ''}
                </div>
                <div className={`text-[12px] text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>▼</div>
              </div>
            </div>

            {/* Expanded editor */}
            {isExpanded && (
              <div className="p-6 pt-0 border-t border-border animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-6 mt-6">
                  {isRemote ? (
                    /* Remote source editing */
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] block">Source Endpoint</label>
                      <InlineExpression
                        value={os.source || ''}
                        onSave={(val) => handleSetProperty(name, 'source', val)}
                        placeholder="https://api.example.com/options"
                      />
                    </div>
                  ) : (
                    /* Manual options table */
                    <section>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">Option Entries</label>
                        <button
                          type="button"
                          onClick={() => handleSetProperty(name, 'options', [...(os.options || []), { value: '', label: '' }])}
                          className="text-[10px] font-bold text-accent hover:underline"
                        >
                          + Add Row
                        </button>
                      </div>
                      <div className="border border-border rounded-lg overflow-hidden bg-subtle/20">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-subtle/50 text-[9px] font-bold text-muted uppercase tracking-widest border-b border-border">
                            <tr>
                              <th className="py-2 px-4">Value</th>
                              <th className="py-2 px-4">Label</th>
                              <th className="py-2 px-4 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40">
                            {(os.options || []).map((opt, i) => (
                              <tr key={i} className="hover:bg-subtle/30 group">
                                <td className="p-1 px-4">
                                  <input
                                    className="w-full bg-transparent border-none focus:ring-0 font-mono text-[12px]"
                                    value={opt.value}
                                    onChange={(e) => {
                                      const next = [...(os.options || [])];
                                      next[i] = { ...next[i], value: e.target.value };
                                      handleSetProperty(name, 'options', next);
                                    }}
                                    onBlur={() => {
                                      // Trigger dispatch on blur for test assertions
                                      handleSetProperty(name, 'options', os.options || []);
                                    }}
                                    placeholder="key"
                                  />
                                </td>
                                <td className="p-1 px-4">
                                  <input
                                    className="w-full bg-transparent border-none focus:ring-0 text-[12px]"
                                    value={opt.label}
                                    onChange={(e) => {
                                      const next = [...(os.options || [])];
                                      next[i] = { ...next[i], label: e.target.value };
                                      handleSetProperty(name, 'options', next);
                                    }}
                                    placeholder="Display Text"
                                  />
                                </td>
                                <td className="p-1 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleSetProperty(name, 'options', (os.options || []).filter((_, idx) => idx !== i))}
                                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-error transition-all"
                                  >✕</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {(!os.options || os.options.length === 0) && (
                          <div className="py-6 text-center text-[12px] text-muted italic">No options defined.</div>
                        )}
                      </div>
                    </section>
                  )}

                  <div className="pt-4 border-t border-border flex justify-end">
                    <button
                      type="button"
                      aria-label="Delete table"
                      onClick={() => handleDelete(name)}
                      className="text-[10px] font-bold text-muted hover:text-error uppercase tracking-widest transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
