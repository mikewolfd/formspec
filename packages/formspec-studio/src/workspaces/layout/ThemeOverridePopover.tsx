/** @filedesc Per-item theme cascade popover — shows provenance and override controls for a clicked field in Theme mode. */
import { useState, useEffect } from 'react';
import {
  getPropertySources,
  getEditableThemeProperties,
  type PropertySource,
} from '@formspec-org/studio-core';
import type { Project } from '@formspec-org/studio-core';

export interface ThemeOverridePopoverProps {
  open: boolean;
  itemKey: string;
  /** Screen-space position for the popover anchor (from ThemeAuthoringOverlay click). */
  position: { x: number; y: number };
  project: Project;
  onClose: () => void;
  onSetOverride: (itemKey: string, prop: string, value: string) => void;
  onClearOverride: (itemKey: string, prop: string) => void;
}

// ── DirtyGuardConfirm (same pattern as PropertyPopover) ──────────────────────

function DirtyGuardConfirm({ onDiscard, onCancel }: { onDiscard: () => void; onCancel: () => void }) {
  return (
    <div
      data-testid="dirty-guard-confirm"
      className="absolute inset-x-0 bottom-0 rounded-b border-t border-border bg-surface p-3 shadow-lg"
    >
      <p className="text-[12px] font-ui text-ink mb-2">Discard unsaved changes?</p>
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="dirty-guard-discard"
          onClick={onDiscard}
          className="rounded-full border border-error bg-surface px-3 py-1 text-[12px] font-semibold text-error hover:bg-error/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/70"
        >
          Discard
        </button>
        <button
          type="button"
          data-testid="dirty-guard-cancel"
          onClick={onCancel}
          className="rounded-full border border-border bg-surface px-3 py-1 text-[12px] font-semibold text-ink hover:border-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
        >
          Keep editing
        </button>
      </div>
    </div>
  );
}

// ── Cascade source badge ──────────────────────────────────────────────────────

function SourceBadge({ source, detail, prop }: { source: PropertySource['source']; detail?: string; prop: string }) {
  const label = source === 'item-override' ? 'override' : source === 'selector' ? (detail ?? 'selector') : 'default';
  const color =
    source === 'item-override' ? 'bg-accent/10 text-accent border-accent/25' :
    source === 'selector' ? 'bg-subtle text-muted border-border/60' :
    'bg-subtle text-muted border-border/40';
  return (
    <span
      data-testid={`cascade-source-${source}-${prop}`}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-mono ${color}`}
    >
      {label}
    </span>
  );
}

// ── Per-property override row ─────────────────────────────────────────────────

interface OverrideRowProps {
  prop: string;
  sources: PropertySource[];
  onCommit: (prop: string, value: string) => void;
  onClear: (prop: string) => void;
  onDirtyChange: (id: string, isDirty: boolean) => void;
}

function OverrideRow({ prop, sources, onCommit, onClear, onDirtyChange }: OverrideRowProps) {
  const hasOverride = sources.some((s) => s.source === 'item-override');
  const overrideSource = sources.find((s) => s.source === 'item-override');
  const initialValue = typeof overrideSource?.value === 'string' ? overrideSource.value : '';
  const [draft, setDraft] = useState(initialValue);

  useEffect(() => {
    setDraft(initialValue);
  }, [initialValue]);

  return (
    <div data-testid={`theme-prop-${prop}`} className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono text-muted">{prop}</span>
        <div className="flex flex-wrap gap-1">
          {sources.map((s, i) => (
            <SourceBadge key={i} source={s.source} detail={s.sourceDetail} prop={prop} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          data-testid={`override-input-${prop}`}
          aria-label={prop}
          value={draft}
          placeholder="Override value…"
          onChange={(e) => {
            setDraft(e.currentTarget.value);
            onDirtyChange(`override-input-${prop}`, e.currentTarget.value !== initialValue);
          }}
          onBlur={(e) => {
            onDirtyChange(`override-input-${prop}`, false);
            onCommit(prop, e.currentTarget.value.trim());
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
          className="flex-1 h-6 rounded border border-border bg-surface px-2 text-[12px] font-mono text-ink outline-none placeholder:text-muted/40 focus:border-accent transition-colors"
        />
        {hasOverride && (
          <button
            type="button"
            data-testid={`clear-override-${prop}`}
            aria-label={`Clear ${prop} override`}
            onClick={() => onClear(prop)}
            className="h-6 px-2 rounded border border-border text-[10px] text-muted hover:border-error hover:text-error transition-colors focus-visible:outline-none"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ThemeOverridePopover({
  open,
  itemKey,
  position,
  project,
  onClose,
  onSetOverride,
  onClearOverride,
}: ThemeOverridePopoverProps) {
  const [dirtyInputs, setDirtyInputs] = useState<Set<string>>(new Set());
  const [showDirtyGuard, setShowDirtyGuard] = useState(false);

  useEffect(() => {
    if (!open) {
      setDirtyInputs(new Set());
      setShowDirtyGuard(false);
    }
  }, [open]);

  function trackDirty(id: string, isDirty: boolean) {
    setDirtyInputs((prev) => {
      const next = new Set(prev);
      if (isDirty) next.add(id); else next.delete(id);
      return next;
    });
  }

  function requestClose() {
    if (dirtyInputs.size > 0) {
      setShowDirtyGuard(true);
    } else {
      onClose();
    }
  }

  if (!open) return null;

  const props = getEditableThemeProperties(project, itemKey);

  return (
    <div
      data-testid="theme-override-popover"
      role="dialog"
      aria-label={`Theme overrides for ${itemKey}`}
      tabIndex={-1}
      className="fixed z-50 w-80 rounded border border-border bg-surface shadow-lg flex flex-col overflow-hidden"
      style={{ left: position.x, top: position.y }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface shrink-0">
        <div>
          <span className="text-[13px] font-semibold text-ink font-ui">Theme Override</span>
          <span className="ml-2 text-[11px] font-mono text-muted">{itemKey}</span>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={requestClose}
          className="text-muted hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/70"
        >
          ×
        </button>
      </div>

      {/* Property rows */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {props.map((prop) => {
          const sources = getPropertySources(project, itemKey, prop);
          return (
            <OverrideRow
              key={prop}
              prop={prop}
              sources={sources}
              onCommit={(p, v) => onSetOverride(itemKey, p, v)}
              onClear={(p) => onClearOverride(itemKey, p)}
              onDirtyChange={trackDirty}
            />
          );
        })}
      </div>

      {/* Dirty guard overlay */}
      {showDirtyGuard && (
        <DirtyGuardConfirm
          onDiscard={() => { setShowDirtyGuard(false); onClose(); }}
          onCancel={() => setShowDirtyGuard(false)}
        />
      )}
    </div>
  );
}
