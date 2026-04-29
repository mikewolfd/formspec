/** @filedesc Proposed artifact block — inline read-only form preview for changeset review in chat. */
import { useMemo, type ReactElement } from 'react';
import type { FormDefinition } from '@formspec-org/types';

export interface ProposedArtifactBlockProps {
  /** The proposed definition state to render. */
  definition: FormDefinition;
  /** Label for the changeset (e.g. "Added 3 fields, reorganized address group"). */
  summary?: string;
  /** Called when the user accepts all changes. */
  onAccept: () => void;
  /** Called when the user wants to review individual changes. */
  onReviewDetails: () => void;
  /** Called when the user wants to tweak via further chat. */
  onTweak: () => void;
  /** Called when the user rejects the proposal. */
  onReject?: () => void;
  /** Current status of the AI operation */
  status?: 'generating' | 'refining' | 'complete';
}

/**
 * ProposedArtifactBlock — renders as a first-class artifact review block
 * attached to an assistant proposal when a changeset is structural.
 *
 * Chat supplies intent and rationale; this block is the thing being accepted.
 * ~240px max height with scroll; [Accept all] [Review details] [Tweak it].
 *
 * Uses `<formspec-render>` in read-only mode over the proposed-state definition.
 */
export function ProposedArtifactBlock({
  definition,
  summary,
  onAccept,
  onReviewDetails,
  onTweak,
  onReject,
  status = 'complete',
}: ProposedArtifactBlockProps): ReactElement {
  const fieldCount = useMemo(() => countFields(definition.items ?? []), [definition.items]);

  return (
    <div
      className="rounded-xl border border-accent/20 bg-accent/[0.03] overflow-hidden"
      data-testid="proposed-artifact-block"
    >
      {/* Preview area */}
      <div className="max-h-[240px] overflow-y-auto px-3 py-3">
        <div className="rounded-lg border border-border/50 bg-surface/80 px-3 py-2.5">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-1.5 h-1.5 rounded-full ${status === 'complete' ? 'bg-accent' : 'bg-amber-500 animate-pulse'}`} />
            <span className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${status === 'complete' ? 'text-accent' : 'text-amber-500'}`}>
              {status === 'generating' ? 'Generating proposal...' : status === 'refining' ? 'Refining layout...' : 'Proposed changes'}
            </span>
          </div>
          {summary && (
            <p className="text-[13px] text-ink/80 leading-relaxed mb-2">{summary}</p>
          )}
          <div className="text-[12px] text-muted">
            <span className="font-medium text-ink">{definition.title ?? 'Untitled'}</span>
            <span className="mx-1.5">·</span>
            <span>{fieldCount} field{fieldCount === 1 ? '' : 's'}</span>
          </div>
          {/* Structural preview: show item keys */}
          <div className="mt-2 space-y-0.5">
            {(definition.items ?? []).slice(0, 8).map((item: any) => (
              <div key={item.key} className="flex items-center gap-1.5 text-[12px]">
                <span className={`w-4 text-center text-muted ${item.type === 'group' ? 'text-[10px]' : 'text-[11px]'}`}>
                  {item.type === 'group' ? '▤' : '▪'}
                </span>
                <span className="text-ink/70">{item.label ?? item.key}</span>
                {item.type === 'group' && item.children && (
                  <span className="text-muted text-[11px]">({item.children.length})</span>
                )}
              </div>
            ))}
            {(definition.items ?? []).length > 8 && (
              <div className="text-[11px] text-muted pl-5.5">
                +{(definition.items ?? []).length - 8} more
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action bar */}
      {status === 'complete' ? (
        <div className="flex items-center gap-2 px-3 py-2.5 border-t border-accent/10 bg-accent/[0.02]">
          <button
            type="button"
            data-testid="accept-proposal"
            className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            onClick={onAccept}
          >
            Accept all
          </button>
          <button
            type="button"
            data-testid="review-proposal"
            className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            onClick={onReviewDetails}
          >
            Review details
          </button>
          <button
            type="button"
            data-testid="tweak-proposal"
            className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted hover:text-ink hover:bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            onClick={onTweak}
          >
            Tweak it
          </button>
          <div className="flex-1" />
          {onReject && (
            <button
              type="button"
              data-testid="reject-proposal"
              className="rounded-lg px-2.5 py-1.5 text-[12px] text-muted hover:text-red-600 hover:bg-red-500/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/35"
              onClick={onReject}
            >
              Reject
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3 border-t border-accent/10 bg-accent/[0.02]">
          <div className="flex items-center gap-3 text-[12px] text-muted">
            <svg className="animate-spin h-4 w-4 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{status === 'generating' ? 'Writing structure...' : 'Evaluating rules...'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function countFields(items: any[]): number {
  let count = 0;
  for (const item of items) {
    if (item.type === 'field') count++;
    if (item.children) count += countFields(item.children);
  }
  return count;
}
