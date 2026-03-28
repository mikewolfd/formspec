/** @filedesc Collapsible group node for the definition tree editor. */
import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Pill } from '../../components/ui/Pill';
import { DragHandle } from '../../components/ui/DragHandle';
import type { FormItem } from '@formspec-org/types';

function EditMark({ testId }: { testId?: string }) {
  return (
    <span
      aria-hidden="true"
      data-testid={testId}
      className="ml-1 inline-flex items-center justify-center text-[11px] text-ink/34 transition-colors group-hover:text-ink/54"
    >
      ·
    </span>
  );
}

interface GroupNodeProps {
  itemKey: string;
  itemPath: string;
  label?: string;
  summaries?: Array<{ label: string; value: string }>;
  repeatable?: boolean;
  minRepeat?: number;
  maxRepeat?: number;
  statusPills?: Array<{ text: string; color: 'accent' | 'logic' | 'error' | 'green' | 'amber' | 'muted' }>;
  missingActions?: Array<{ key: string; label: string; ariaLabel: string }>;
  depth: number;
  children: ReactNode;
  selected?: boolean;
  dragHandleRef?: (element: Element | null) => void;
  item?: FormItem;
  binds?: Record<string, string>;
  onUpdateItem?: (changes: Record<string, unknown>) => void;
  onRenameIdentity?: (nextKey: string, nextLabel: string) => void;
  onUpdateRepeatSettings?: (changes: { repeatable?: boolean; minRepeat?: number | null; maxRepeat?: number | null }) => void;
  onAddItem?: (e: React.MouseEvent, path: string) => void;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function GroupNode({
  itemKey,
  itemPath,
  label,
  summaries = [],
  repeatable,
  minRepeat,
  maxRepeat,
  statusPills = [],
  missingActions = [],
  depth,
  children,
  selected,
  dragHandleRef,
  item,
  binds = {},
  onUpdateItem,
  onRenameIdentity,
  onUpdateRepeatSettings,
  onAddItem,
  onClick,
  onContextMenu,
}: GroupNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeIdentityField, setActiveIdentityField] = useState<'label' | 'key' | null>(null);
  const [editingContent, setEditingContent] = useState<'description' | 'hint' | 'both' | null>(null);
  const [editingBehavior, setEditingBehavior] = useState(false);
  const [editingRepeats, setEditingRepeats] = useState(false);
  const [draftKey, setDraftKey] = useState(itemKey);
  const [draftLabel, setDraftLabel] = useState(label || itemKey);
  const [activeInlineSummary, setActiveInlineSummary] = useState<string | null>(null);
  const hiddenSummaryLabels = new Set<string>([
    ...(editingContent === 'both' ? ['Description', 'Hint'] : []),
    ...(editingBehavior ? ['Calculate', 'Relevant', 'Readonly', 'Required', 'Constraint', 'Message'] : []),
  ]);
  const supportingText = summaries.filter((entry) => entry.value.trim().length > 0 && !hiddenSummaryLabels.has(entry.label)).slice(0, 4);
  const visibleMissingActions = selected ? missingActions : [];
  const showFooter = repeatable || statusPills.length > 0 || visibleMissingActions.length > 0 || selected;
  const resolvedLabel = label || itemKey;
  const closeOtherEditors = (kind: 'content' | 'behavior' | 'repeats') => {
    setActiveIdentityField(null);
    setEditingContent(kind === 'content' ? 'both' : null);
    setEditingBehavior(kind === 'behavior');
    setEditingRepeats(kind === 'repeats');
    if (kind !== 'content') setActiveInlineSummary(null);
  };

  useEffect(() => {
    if (!activeIdentityField) {
      setDraftKey(itemKey);
      setDraftLabel(label || itemKey);
    }
  }, [activeIdentityField, itemKey, label]);

  useEffect(() => {
    if (!selected) {
      setActiveIdentityField(null);
      setEditingContent(null);
      setEditingBehavior(false);
      setEditingRepeats(false);
      setActiveInlineSummary(null);
    }
  }, [selected]);

  const openEditorForSummary = (label: string) => {
    setActiveIdentityField(null);
    if (label === 'Description' || label === 'Hint') {
      setActiveInlineSummary(label);
      setEditingContent(label === 'Description' ? 'description' : 'hint');
      setEditingBehavior(false);
      setEditingRepeats(false);
      return;
    }
    closeOtherEditors('behavior');
  };

  const resetEditors = () => {
    setActiveIdentityField(null);
    setEditingContent(null);
    setEditingBehavior(false);
    setEditingRepeats(false);
    setActiveInlineSummary(null);
  };

  const openIdentityField = (field: 'label' | 'key') => {
    resetEditors();
    setActiveIdentityField(field);
  };

  const commitIdentityField = (field: 'label' | 'key') => {
    if (!onRenameIdentity) {
      setActiveIdentityField(null);
      return;
    }
    const nextKey = field === 'key' ? draftKey.trim() || itemKey : itemKey;
    const nextLabel = field === 'label' ? draftLabel.trim() || itemKey : resolvedLabel;
    onRenameIdentity(nextKey, nextLabel);
    setActiveIdentityField(null);
  };

  const cancelIdentityField = () => {
    setDraftKey(itemKey);
    setDraftLabel(resolvedLabel);
    setActiveIdentityField(null);
  };

  const handleIdentityKeyDown = (field: 'label' | 'key') => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitIdentityField(field);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelIdentityField();
    }
  };

  const closeInlineSummary = () => {
    setActiveInlineSummary(null);
    setEditingContent(null);
  };

  return (
    <div
      data-testid={`group-${itemKey}`}
      data-editor-path={itemPath}
      style={{ paddingLeft: depth * 20 }}
      className={[
        'rounded-[20px] border transition-[border-color,background-color,box-shadow]',
        selected
          ? 'border-accent/40 bg-accent/[0.05] shadow-[0_16px_40px_rgba(59,130,246,0.12)]'
          : 'border-transparent hover:border-border/65 hover:bg-bg-default/40',
      ].join(' ')}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <div className="rounded-[20px] px-3 py-4 md:px-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <DragHandle ref={dragHandleRef} label={`Reorder ${resolvedLabel}`} className="h-9 self-start" />
            <button
              type="button"
              aria-label={`${expanded ? 'Collapse' : 'Expand'} ${resolvedLabel}`}
              aria-expanded={expanded}
              aria-controls={`group-panel-${itemKey}`}
              data-testid={`toggle-${itemKey}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/80 bg-surface text-[12px] text-ink/80 shadow-sm transition-colors hover:border-accent/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? '\u25BE' : '\u25B8'}
            </button>
            <button
              type="button"
              aria-label={`Select group ${resolvedLabel}`}
              className="flex min-w-0 flex-1 items-start gap-4 rounded-[10px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            >
              <>
                <div className="pt-1">
                  <div className="h-14 w-1.5 rounded-full bg-ink/75" />
                  <div className="mt-3 font-mono text-[11px] tracking-[0.14em] text-ink/68">
                    Group
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  {activeIdentityField === 'label' ? (
                    <input
                      aria-label="Inline label"
                      type="text"
                      autoFocus
                      value={draftLabel}
                      className="w-full rounded-[6px] border border-accent/30 bg-surface px-2 py-1.5 text-[20px] font-semibold tracking-tight text-ink outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/25 md:text-[22px]"
                      onChange={(event) => setDraftLabel(event.currentTarget.value)}
                      onClick={(event) => event.stopPropagation()}
                      onBlur={() => commitIdentityField('label')}
                      onKeyDown={handleIdentityKeyDown('label')}
                    />
                  ) : (
                    <div
                      className={`truncate text-[20px] font-semibold tracking-tight text-ink md:text-[22px] ${selected ? 'cursor-text' : ''}`}
                      onClick={(event) => {
                        if (!selected) return;
                        event.stopPropagation();
                        openIdentityField('label');
                      }}
                    >
                      {resolvedLabel}
                    </div>
                  )}
                  <div className="mt-1 font-mono text-[12px] tracking-[0.1em] text-ink/68">
                    {activeIdentityField === 'key' ? (
                      <input
                        aria-label="Inline key"
                        type="text"
                        autoFocus
                        value={draftKey}
                        className="w-full max-w-[16rem] rounded-[6px] border border-border/80 bg-surface px-2 py-1.5 text-[12px] font-mono tracking-[0.1em] text-ink outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/25"
                        onChange={(event) => setDraftKey(event.currentTarget.value)}
                        onClick={(event) => event.stopPropagation()}
                        onBlur={() => commitIdentityField('key')}
                        onKeyDown={handleIdentityKeyDown('key')}
                      />
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="font-mono text-[11px] tracking-[0.12em] text-ink/60">
                          Key
                        </span>
                        <span
                          className={selected ? 'cursor-text' : undefined}
                          onClick={(event) => {
                            if (!selected) return;
                            event.stopPropagation();
                            openIdentityField('key');
                          }}
                        >
                          {itemKey}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </>
            </button>
          </div>

          <button
            type="button"
            data-testid={`add-to-${itemKey}`}
            aria-label={`Add item to ${resolvedLabel}`}
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/80 bg-bg-default text-[18px] leading-none text-ink/80 transition-colors hover:border-accent/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
            onClick={(e) => {
              e.stopPropagation();
              onAddItem?.(e, itemPath);
            }}
          >
            +
          </button>
        </div>

        {(supportingText.length > 0 || showFooter) && (
          <div className="mt-4 border-t border-border/70 pt-4">
            {supportingText.length > 0 && (
              <dl data-testid={`group-${itemKey}-summary`} className="grid gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
                {supportingText.map((entry) => (
                  <div key={`${itemPath}-${entry.label}`} className="min-w-0 border-l border-border/65 pl-3">
                    <dt className="font-mono text-[11px] tracking-[0.14em] text-ink/62">{entry.label}</dt>
                    {activeInlineSummary === 'Description' && editingContent === 'description' && entry.label === 'Description' ? (
                      <input
                        aria-label="Inline group description"
                        type="text"
                        autoFocus
                        className="mt-1 w-full rounded-[6px] border border-border/80 bg-surface px-2.5 py-2 text-[14px] leading-5 text-ink outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/25"
                        value={typeof item?.description === 'string' ? item.description : ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => onUpdateItem?.({ description: event.currentTarget.value || null })}
                        onBlur={closeInlineSummary}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') closeInlineSummary();
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            closeInlineSummary();
                          }
                        }}
                      />
                    ) : activeInlineSummary === 'Hint' && editingContent === 'hint' && entry.label === 'Hint' ? (
                      <input
                        aria-label="Inline group hint"
                        type="text"
                        autoFocus
                        className="mt-1 w-full rounded-[6px] border border-border/80 bg-surface px-2.5 py-2 text-[14px] leading-5 text-ink outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/25"
                        value={typeof item?.hint === 'string' ? item.hint : ''}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => onUpdateItem?.({ hint: event.currentTarget.value || null })}
                        onBlur={closeInlineSummary}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') closeInlineSummary();
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            closeInlineSummary();
                          }
                        }}
                      />
                    ) : (
                      <dd
                        className={`group mt-1 inline-flex max-w-full items-center truncate text-[14px] font-medium leading-5 text-ink md:text-[15px] ${selected ? 'cursor-text' : ''}`}
                        onClick={(event) => {
                          if (!selected) return;
                          event.stopPropagation();
                          openEditorForSummary(entry.label);
                        }}
                      >
                        <span className="truncate">{entry.value}</span>
                        {selected ? <EditMark testId={`group-${itemKey}-summary-edit-${entry.label}`} /> : null}
                      </dd>
                    )}
                  </div>
                ))}
              </dl>
            )}

            <div data-testid={`group-${itemKey}-status`} className="mt-3 flex flex-wrap items-center gap-2">
              {repeatable && (
                <Pill
                  text={`\u27F3 ${minRepeat ?? 0}\u2013${maxRepeat ?? '\u221E'}`}
                  color="logic"
                  size="sm"
                />
              )}
              {statusPills.map((pill) => (
                <Pill key={`${itemPath}-${pill.text}`} text={pill.text} color={pill.color} size="sm" />
              ))}
              {selected && (
                <button
                  type="button"
                  aria-label={`Edit repeats for ${resolvedLabel}`}
                  className="inline-flex items-center rounded-full border border-border/90 px-2.5 py-1 text-[12px] font-medium text-ink/75 transition-colors hover:border-accent/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeOtherEditors('repeats');
                  }}
                >
                  Edit repeats
                </button>
              )}
              {visibleMissingActions.map((action) => (
                <button
                  key={`${itemPath}-${action.key}`}
                  type="button"
                  aria-label={action.ariaLabel}
                  className="inline-flex items-center rounded-full border border-dashed border-accent/25 px-2.5 py-1 text-[12px] font-medium text-accent/65 transition-colors hover:border-accent/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (action.key === 'behavior') closeOtherEditors('behavior');
                    else closeOtherEditors('content');
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
            {(((editingContent === 'both') && !activeInlineSummary) || editingBehavior) && (
              <div className="mt-4 space-y-4 border-t border-border/65 pt-4">
                {editingContent === 'both' && (
                  <section aria-label="Group details" className="space-y-3">
                    <h3 className="text-[13px] font-semibold tracking-[0.04em] text-ink/84">
                      Group details
                    </h3>
                    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <label className="text-[13px] font-semibold tracking-[0.01em] text-ink/95">
                      Description
                      <textarea
                        aria-label="Inline group description"
                        className="mt-1 min-h-20 w-full rounded-[6px] border border-border/80 bg-surface px-2.5 py-2 text-[14px] text-ink outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/25"
                        value={typeof item?.description === 'string' ? item.description : ''}
                        onChange={(event) => onUpdateItem?.({ description: event.currentTarget.value || null })}
                      />
                    </label>
                    <label className="text-[13px] font-semibold tracking-[0.01em] text-ink/95">
                      Hint
                      <textarea
                        aria-label="Inline group hint"
                        className="mt-1 min-h-20 w-full rounded-[6px] border border-border/80 bg-surface px-2.5 py-2 text-[14px] text-ink outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/25"
                        value={typeof item?.hint === 'string' ? item.hint : ''}
                        onChange={(event) => onUpdateItem?.({ hint: event.currentTarget.value || null })}
                      />
                    </label>
                    </div>
                  </section>
                )}
                {editingBehavior && (
                  <section aria-label="Behavior" className="space-y-3 border-t border-border/65 pt-4 first:border-t-0 first:pt-0">
                    <h3 className="text-[13px] font-semibold tracking-[0.04em] text-ink/84">
                      Behavior
                    </h3>
                    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
                      <input
                        aria-label="Group required behavior"
                        type="checkbox"
                        checked={Boolean(binds.required)}
                        onChange={(event) => onUpdateItem?.({ required: event.currentTarget.checked ? 'true' : null })}
                      />
                      Required
                    </label>
                    <label className="text-[13px] font-semibold tracking-[0.01em] text-ink/95">
                      Relevant
                      <input
                        aria-label="Group relevant behavior"
                        type="text"
                        className="mt-1 w-full rounded-[6px] border border-border/80 bg-surface px-2.5 py-2 text-[14px] text-ink outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/25"
                        value={binds.relevant ?? ''}
                        onChange={(event) => onUpdateItem?.({ relevant: event.currentTarget.value || null })}
                      />
                    </label>
                    </div>
                  </section>
                )}
              </div>
            )}
            {editingRepeats && (
              <section aria-label="Repeat settings" className="mt-4 space-y-3 border-t border-border/65 pt-4">
                <h3 className="text-[13px] font-semibold tracking-[0.04em] text-ink/84">
                  Repeat settings
                </h3>
                <div className="grid gap-x-6 gap-y-4 sm:grid-cols-[auto,110px,110px] sm:items-end">
                  <label className="flex items-center gap-2 text-[13px] font-medium text-ink">
                    <input
                      aria-label="Repeatable"
                      type="checkbox"
                      checked={Boolean(repeatable)}
                      onChange={(event) => onUpdateRepeatSettings?.({ repeatable: event.currentTarget.checked })}
                    />
                    Repeatable
                  </label>
                  <label className="text-[13px] font-semibold tracking-[0.01em] text-ink/95">
                    Minimum repeats
                    <input
                      aria-label="Minimum repeats"
                      type="number"
                      min="0"
                      value={minRepeat ?? ''}
                      className="mt-1 w-full rounded-[6px] border border-border/80 bg-surface px-2.5 py-2 text-[14px] text-ink outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/25"
                      onChange={(event) => onUpdateRepeatSettings?.({ minRepeat: event.currentTarget.value === '' ? null : Number(event.currentTarget.value) })}
                    />
                  </label>
                  <label className="text-[13px] font-semibold tracking-[0.01em] text-ink/95">
                    Maximum repeats
                    <input
                      aria-label="Maximum repeats"
                      type="number"
                      min="0"
                      value={maxRepeat ?? ''}
                      className="mt-1 w-full rounded-[6px] border border-border/80 bg-surface px-2.5 py-2 text-[14px] text-ink outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/25"
                      onChange={(event) => onUpdateRepeatSettings?.({ maxRepeat: event.currentTarget.value === '' ? null : Number(event.currentTarget.value) })}
                    />
                  </label>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
      {expanded && (
        <div
          id={`group-panel-${itemKey}`}
          data-testid={`group-${itemKey}-children`}
          className="ml-5 mt-2 flex flex-col gap-1 border-l border-border/55 pb-1 pl-4"
        >
          {children}
        </div>
      )}
    </div>
  );
}
