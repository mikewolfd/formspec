import React from 'react';
import { useChatState } from '../state/ChatContext.js';
import type { SourceTrace, DefinitionDiff } from 'formspec-chat';

interface OptionLike {
  value: string;
  label: string;
}

interface ItemLike {
  key: string;
  type: 'field' | 'group' | 'display';
  label: string;
  description?: string;
  hint?: string;
  dataType?: string;
  options?: OptionLike[];
  children?: ItemLike[];
}

/**
 * Full-screen form preview showing the generated definition.
 * Renders a structured field list with source traces, data type badges,
 * and diff highlighting after refinements.
 */
export function FormPreview() {
  const state = useChatState();

  if (!state.definition) {
    return (
      <div data-testid="form-preview" className="flex items-center justify-center h-full text-sm text-muted px-4">
        No form yet — start a conversation or pick a template.
      </div>
    );
  }

  const def = state.definition;
  const diff = state.lastDiff;
  const traces = state.traces;
  const tracesByPath = new Map<string, SourceTrace[]>();
  for (const t of traces) {
    const list = tracesByPath.get(t.elementPath) ?? [];
    list.push(t);
    tracesByPath.set(t.elementPath, list);
  }

  const diffKeys = diff ? {
    added: new Set(diff.added),
    removed: new Set(diff.removed),
    modified: new Set(diff.modified),
  } : null;

  return (
    <div data-testid="form-preview" className="flex-1 overflow-y-auto px-6 py-8 bg-bg-default">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Form header */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-ink">{def.title}</h2>
          {def.description && (
            <p className="text-sm text-muted">{def.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted">
            {traces.length > 0 && (
              <span>{traces.length} source {traces.length === 1 ? 'trace' : 'traces'}</span>
            )}
            {state.openIssueCount > 0 && (
              <span className="text-amber">{state.openIssueCount} {state.openIssueCount === 1 ? 'issue' : 'issues'}</span>
            )}
          </div>
        </div>

        {/* Diff summary */}
        {diff && <DiffSummary diff={diff} />}

        {/* Items */}
        <div className="space-y-3">
          {def.items.map((item: ItemLike) => (
            <ItemPreview key={item.key} item={item} tracesByPath={tracesByPath} diffKeys={diffKeys} depth={0} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DiffSummary({ diff }: { diff: DefinitionDiff }) {
  const parts: string[] = [];
  if (diff.added.length > 0) parts.push(`${diff.added.length} added`);
  if (diff.modified.length > 0) parts.push(`${diff.modified.length} modified`);
  if (diff.removed.length > 0) parts.push(`${diff.removed.length} removed`);

  return (
    <div data-testid="diff-summary" className="flex items-center gap-3 px-3 py-2 rounded-md bg-accent/5 border border-accent/20 text-xs">
      <span className="font-medium text-accent">Changes:</span>
      {parts.length > 0 ? (
        <span className="text-muted">{parts.join(', ')}</span>
      ) : (
        <span className="text-muted">No structural changes</span>
      )}
    </div>
  );
}

interface DiffKeySet {
  added: Set<string>;
  removed: Set<string>;
  modified: Set<string>;
}

function getDiffStatus(key: string, diffKeys: DiffKeySet | null): 'added' | 'modified' | null {
  if (!diffKeys) return null;
  if (diffKeys.added.has(key)) return 'added';
  if (diffKeys.modified.has(key)) return 'modified';
  return null;
}

function diffBorderClass(status: 'added' | 'modified' | null): string {
  if (status === 'added') return 'border-green-500/50 bg-green-500/5';
  if (status === 'modified') return 'border-amber/50 bg-amber/5';
  return 'border-border bg-surface';
}

function ItemPreview({
  item,
  tracesByPath,
  diffKeys,
  depth,
}: {
  item: ItemLike;
  tracesByPath: Map<string, SourceTrace[]>;
  diffKeys: DiffKeySet | null;
  depth: number;
}) {
  const itemTraces = tracesByPath.get(item.key) ?? [];
  const diffStatus = getDiffStatus(item.key, diffKeys);

  if (item.type === 'group') {
    return (
      <div
        className={`space-y-2 ${depth > 0 ? 'ml-4' : ''}`}
        data-diff={diffStatus ?? undefined}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">{item.label}</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-subtle text-muted border border-border">group</span>
          {diffStatus && <DiffBadge status={diffStatus} />}
        </div>
        {item.description && (
          <p className="text-xs text-muted">{item.description}</p>
        )}
        {itemTraces.map((t, i) => (
          <TraceTag key={i} trace={t} />
        ))}
        {item.children && (
          <div className="space-y-2 border-l border-border pl-3">
            {item.children.map(child => (
              <ItemPreview key={child.key} item={child} tracesByPath={tracesByPath} diffKeys={diffKeys} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (item.type === 'display') {
    return (
      <div
        className={`${depth > 0 ? 'ml-4' : ''}`}
        data-diff={diffStatus ?? undefined}
      >
        <div className="text-xs italic text-muted">{item.label}</div>
        {itemTraces.map((t, i) => (
          <TraceTag key={i} trace={t} />
        ))}
      </div>
    );
  }

  // field
  return (
    <div
      className={`rounded-lg border p-3 space-y-1.5 ${depth > 0 ? 'ml-4' : ''} ${diffBorderClass(diffStatus)}`}
      data-diff={diffStatus ?? undefined}
      data-field-type={item.dataType ?? undefined}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-ink">{item.label}</span>
        {item.dataType && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
            {item.dataType}
          </span>
        )}
        {diffStatus && <DiffBadge status={diffStatus} />}
      </div>
      {item.description && (
        <p className="text-xs text-muted">{item.description}</p>
      )}
      <FieldMockup item={item} />
      {itemTraces.map((t, i) => (
        <TraceTag key={i} trace={t} />
      ))}
    </div>
  );
}

const mockInputClass = 'w-full rounded-[3px] border border-border bg-bg-default px-2 py-1.5 text-sm text-muted pointer-events-none';

function FieldMockup({ item }: { item: ItemLike }) {
  const dt = item.dataType;

  if (dt === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm text-muted pointer-events-none">
        <input type="checkbox" disabled className="rounded border-border" />
        <span>{item.hint ?? item.label}</span>
      </label>
    );
  }

  if (dt === 'choice' && item.options) {
    return (
      <select disabled className={mockInputClass}>
        <option value="">Select...</option>
        {item.options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }

  if (dt === 'multiChoice' && item.options) {
    return (
      <div className="space-y-1">
        {item.options.map(o => (
          <label key={o.value} className="flex items-center gap-2 text-sm text-muted pointer-events-none">
            <input type="checkbox" disabled className="rounded border-border" />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    );
  }

  if (dt === 'text') {
    return (
      <textarea
        disabled
        rows={2}
        placeholder={item.hint ?? `Enter ${item.label.toLowerCase()}...`}
        className={mockInputClass + ' resize-none'}
      />
    );
  }

  if (dt === 'date') {
    return (
      <input
        type="date"
        disabled
        className={mockInputClass}
      />
    );
  }

  if (dt === 'integer' || dt === 'decimal') {
    return (
      <input
        type="number"
        disabled
        placeholder={item.hint ?? '0'}
        className={mockInputClass}
      />
    );
  }

  // Default: string or unknown — text input
  return (
    <input
      type="text"
      disabled
      placeholder={item.hint ?? `Enter ${item.label.toLowerCase()}...`}
      className={mockInputClass}
    />
  );
}

function DiffBadge({ status }: { status: 'added' | 'modified' }) {
  const styles = {
    added: 'bg-green-500/10 text-green-600 border-green-500/20',
    modified: 'bg-amber/10 text-amber border-amber/20',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${styles[status]}`}>
      {status}
    </span>
  );
}

function TraceTag({ trace }: { trace: SourceTrace }) {
  return (
    <div className="text-[11px] text-muted/70 flex items-center gap-1">
      <span className="text-accent/60">→</span>
      <span>{trace.description}</span>
    </div>
  );
}
