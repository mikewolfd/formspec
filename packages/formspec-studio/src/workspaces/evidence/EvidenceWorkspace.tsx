/** @filedesc Evidence workbench for source documents, citation coverage, conflicts, and field provenance. */
import { useMemo, useRef } from 'react';
import { getStudioIntelligence, type FieldProvenance } from '@formspec-org/studio-core';
import { useProject } from '../../state/useProject';
import { useProjectState } from '../../state/useProjectState';
import { updateStudioExtension } from '../shared/studio-intelligence-writer';
import type { FormItem } from '@formspec-org/studio-core';

interface FieldRow {
  ref: string;
  label: string;
  provenance?: FieldProvenance;
}

function flattenFields(items: readonly FormItem[] | undefined, prefix = 'items'): FieldRow[] {
  const rows: FieldRow[] = [];
  for (const item of items ?? []) {
    if (typeof item.key !== 'string') continue;
    const ref = `${prefix}.${item.key}`;
    if (item.type === 'field') rows.push({ ref, label: typeof item.label === 'string' && item.label ? item.label : item.key });
    if (Array.isArray(item.children)) rows.push(...flattenFields(item.children, ref));
  }
  return rows;
}

function toneFor(status: string | undefined): string {
  if (status === 'confirmed') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200';
  if (status === 'conflict') return 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200';
}

export function EvidenceWorkspace() {
  const project = useProject();
  const state = useProjectState();
  const inputRef = useRef<HTMLInputElement>(null);
  const intelligence = getStudioIntelligence(state);
  const coverage = intelligence.evidence.coverage;
  const documents = intelligence.evidence.documents;
  const fields = useMemo(() => {
    const provenanceByRef = new Map(intelligence.provenance.map((entry) => [entry.objectRef, entry]));
    return flattenFields(state.definition.items).map((field) => ({
      ...field,
      provenance: provenanceByRef.get(field.ref),
    }));
  }, [intelligence.provenance, state.definition.items]);

  const handleUpload = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const id = `${file.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'source'}-${Date.now().toString(36)}`;
    updateStudioExtension(project, (draft) => ({
      ...draft,
      evidence: {
        documents: [
          ...draft.evidence.documents,
          { id, name: file.name, mimeType: file.type || 'application/octet-stream', fieldRefs: [] },
        ],
      },
    }));
    if (inputRef.current) inputRef.current.value = '';
  };

  const linkFieldToDocument = (fieldRef: string) => {
    const document = documents[0];
    if (!document) return;
    updateStudioExtension(project, (draft) => {
      const nextDocuments = draft.evidence.documents.map((doc) => doc.id === document.id
        ? { ...doc, fieldRefs: [...new Set([...doc.fieldRefs, fieldRef])] }
        : doc);
      const existing = draft.provenance.filter((entry) => entry.objectRef !== fieldRef);
      return {
        ...draft,
        evidence: { documents: nextDocuments },
        provenance: [
          ...existing,
          {
            objectRef: fieldRef,
            origin: 'evidence',
            rationale: `Supported by ${document.name}.`,
            confidence: 'high',
            sourceRefs: [`evidence.${document.id}`],
            patchRefs: [],
            reviewStatus: 'confirmed',
          },
        ],
      };
    });
  };

  return (
    <div className="flex h-full min-h-0 bg-[linear-gradient(180deg,rgba(255,252,247,0.72),rgba(246,238,227,0.94))] dark:bg-[linear-gradient(180deg,rgba(26,35,47,0.86),rgba(19,24,33,0.96))]">
      <aside className="hidden w-[280px] shrink-0 border-r border-border/70 bg-surface/76 px-4 py-4 lg:flex lg:flex-col" aria-label="Evidence documents">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-[24px] leading-none tracking-[-0.04em] text-ink">Evidence</h2>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted">{documents.length} source{documents.length === 1 ? '' : 's'}</p>
          </div>
          <button
            type="button"
            className="rounded-[5px] border border-border px-2.5 py-1.5 text-[12px] font-medium hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            onClick={() => inputRef.current?.click()}
          >
            Add
          </button>
        </div>
        <input ref={inputRef} type="file" className="hidden" accept=".pdf,.txt,.md,.json,application/pdf,text/plain,application/json" onChange={(event) => handleUpload(event.currentTarget.files)} />
        <div className="mt-5 space-y-2">
          {documents.length === 0 ? (
            <button
              type="button"
              className="w-full rounded-[6px] border border-dashed border-border px-4 py-8 text-left text-[12px] text-muted hover:border-accent/50 hover:text-ink"
              onClick={() => inputRef.current?.click()}
            >
              Upload PDF, text, or JSON sources to start citation coverage.
            </button>
          ) : documents.map((document) => (
            <div key={document.id} className="rounded-[7px] border border-border bg-bg-default/70 px-3 py-3">
              <div className="truncate text-[13px] font-semibold text-ink">{document.name}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{document.mimeType}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/50">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, document.fieldRefs.length * 20)}%` }} />
              </div>
              <div className="mt-2 text-[11px] text-muted">{document.fieldRefs.length} linked field{document.fieldRefs.length === 1 ? '' : 's'}</div>
            </div>
          ))}
        </div>
      </aside>

      <section className="min-w-0 flex-1 overflow-y-auto px-4 py-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Source coverage</p>
            <h1 className="mt-1 font-display text-[34px] leading-none tracking-[-0.05em] text-ink">Evidence workbench</h1>
            <p className="mt-2 max-w-[680px] text-[13px] text-muted">Uploaded sources become field-level support, missing coverage, and conflicts instead of disappearing into chat history.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Covered" value={`${coverage.linkedFields}/${coverage.totalFields}`} />
            <Metric label="Missing" value={String(coverage.missing)} />
            <Metric label="Conflicts" value={String(coverage.conflicts)} />
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[8px] border border-border bg-surface/82">
          <div className="grid grid-cols-[minmax(180px,1fr)_minmax(180px,1.4fr)_auto] gap-4 border-b border-border bg-subtle/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            <span>Field</span>
            <span>Support</span>
            <span>Action</span>
          </div>
          {fields.map((field) => {
            const supported = field.provenance?.sourceRefs.length;
            return (
              <div key={field.ref} className="grid grid-cols-[minmax(180px,1fr)_minmax(180px,1.4fr)_auto] items-center gap-4 border-b border-border/70 px-4 py-3 last:border-b-0">
                <div>
                  <div className="text-[13px] font-semibold text-ink">{field.label}</div>
                  <div className="font-mono text-[10px] text-muted">{field.ref}</div>
                </div>
                <div>
                  <span className={`inline-flex rounded-[4px] border px-2 py-1 text-[11px] font-medium ${toneFor(field.provenance?.reviewStatus)}`}>
                    {supported ? field.provenance?.sourceRefs.join(', ') : 'Missing citation'}
                  </span>
                  {field.provenance?.rationale && <p className="mt-1 text-[12px] text-muted">{field.provenance.rationale}</p>}
                </div>
                <button
                  type="button"
                  disabled={documents.length === 0 || !!supported}
                  className="rounded-[5px] border border-border px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-subtle disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => linkFieldToDocument(field.ref)}
                >
                  Link source
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[92px] rounded-[7px] border border-border bg-surface/80 px-3 py-2">
      <div className="font-display text-[24px] leading-none tracking-[-0.04em] text-ink">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</div>
    </div>
  );
}
