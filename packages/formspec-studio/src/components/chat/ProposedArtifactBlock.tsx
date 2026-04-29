/** @filedesc ProposedArtifactBlock — mini-preview of AI-proposed form changes within the chat thread. */
import { useEffect, useRef, useState } from 'react';
import { Project } from '@formspec-org/studio-core';

interface ProposedArtifactBlockProps {
  project: Project;
  changesetId: string;
}

export function ProposedArtifactBlock({ project, changesetId }: ProposedArtifactBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewState, setPreviewState] = useState<any>(null);

  useEffect(() => {
    // Generate the preview state (snapshot of accepted changes)
    const preview = project.previewChangeset();
    if (preview) {
      setPreviewState(preview);
    }
  }, [project, changesetId]);

  if (!previewState) return null;

  const fieldCount = previewState.definition.items?.length || 0;
  const labels = previewState.definition.items?.slice(0, 3).map((it: any) => it.label) || [];

  return (
    <div className="my-3 rounded-xl border border-accent/20 bg-surface shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-subtle/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[14px]">📄</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Proposed Structure</span>
        </div>
        <div className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
          {fieldCount} Fields
        </div>
      </div>

      {/* Mini Preview Canvas */}
      <div className="p-4 bg-bg-default/50 min-h-[80px] flex flex-col gap-2">
        {labels.map((label: string, i: number) => (
          <div key={i} className="flex flex-col gap-1.5 opacity-80">
            <div className="h-2 w-24 bg-muted/20 rounded-full" />
            <div className="h-8 w-full bg-surface border border-border rounded-md px-3 flex items-center text-[12px] text-muted">
              {label}
            </div>
          </div>
        ))}
        {fieldCount > 3 && (
          <div className="text-[10px] text-muted text-center italic mt-1">
            + {fieldCount - 3} more items...
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2 bg-subtle/10 border-t border-border/40">
        <p className="text-[10px] text-muted leading-tight">
          This preview shows how the form will look once the AI changes are committed.
        </p>
      </div>
    </div>
  );
}
