/** @filedesc Toolbar for the selected grid item — width presets, custom width, offset, breakpoint-aware. */
import { useRef, useState } from 'react';
import type { PageItemView } from '@formspec/studio-core';

export interface SelectionToolbarProps {
  item: PageItemView;
  activeBreakpoint: string;
  onSetWidth: (width: number) => void;
  onSetOffset: (offset: number | undefined) => void;
  onSetResponsive: (bp: string, overrides: { width?: number; offset?: number; hidden?: boolean }) => void;
  /** Other pages this item can be moved to. */
  otherPages?: Array<{ id: string; title: string }>;
  /** Called when the user picks a target page from the "Move to page" dropdown. */
  onMoveToPage?: (itemKey: string, targetPageId: string) => void;
  /** Called when the user clicks "Unassign" — removes item from current page back to the unassigned pool. */
  onUnassignItem?: (itemKey: string) => void;
}

const PRESETS: Array<{ label: string; width: number }> = [
  { label: 'Full', width: 12 },
  { label: 'Half', width: 6 },
  { label: 'Third', width: 4 },
  { label: 'Quarter', width: 3 },
];

/** Resolve effective width for the current breakpoint. */
function effectiveWidth(item: PageItemView, bp: string): number {
  if (bp === 'base') return item.width;
  return item.responsive[bp]?.width ?? item.width;
}

export function SelectionToolbar({
  item,
  activeBreakpoint,
  onSetWidth,
  onSetOffset,
  onSetResponsive,
  otherPages,
  onMoveToPage,
  onUnassignItem,
}: SelectionToolbarProps) {
  const [showOffset, setShowOffset] = useState(false);
  const [showMoveDropdown, setShowMoveDropdown] = useState(false);
  const moveTriggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isBase = activeBreakpoint === 'base';
  const currentWidth = effectiveWidth(item, activeBreakpoint);

  const hasMoveTargets = (otherPages?.length ?? 0) > 0;

  function setWidth(w: number) {
    if (isBase) {
      onSetWidth(w);
    } else {
      onSetResponsive(activeBreakpoint, { width: w });
    }
  }

  function setOffset(o: number | undefined) {
    if (isBase) {
      onSetOffset(o);
    } else {
      onSetResponsive(activeBreakpoint, { offset: o });
    }
  }

  function handleCustomWidthBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 12) {
      setWidth(val);
    }
  }

  function handleOffsetBlur(e: React.FocusEvent<HTMLInputElement>) {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1) {
      // Clamp so that offset + width does not exceed 12 columns
      const maxOffset = Math.max(1, 12 - currentWidth);
      const clamped = Math.min(val, maxOffset);
      e.target.value = String(clamped);
      setOffset(clamped);
    } else {
      setOffset(undefined);
    }
  }

  return (
    <div data-testid="selection-toolbar" className="flex flex-wrap items-center gap-1.5 p-1.5 bg-surface border border-border rounded-md shadow-sm text-[11px]">
      {/* Width presets */}
      {PRESETS.map((p) => (
        <button
          key={p.label}
          type="button"
          aria-label={p.label}
          aria-pressed={currentWidth === p.width}
          onClick={() => setWidth(p.width)}
          className={`px-2 py-0.5 rounded transition-colors ${
            currentWidth === p.width
              ? 'bg-accent text-white'
              : 'bg-subtle/50 text-muted hover:text-ink hover:bg-subtle'
          }`}
        >
          {p.label}
        </button>
      ))}

      {/* Separator */}
      <div className="w-px h-4 bg-border mx-0.5" />

      {/* Custom width input */}
      <input
        type="number"
        min={1}
        max={12}
        aria-label="custom width"
        defaultValue={currentWidth}
        key={`cw-${item.key}-${currentWidth}`}
        onBlur={handleCustomWidthBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className="w-10 text-center font-mono bg-transparent border border-border/50 rounded py-0.5 text-ink"
      />

      {/* Separator */}
      <div className="w-px h-4 bg-border mx-0.5" />

      {/* Offset toggle / input */}
      {showOffset ? (
        <div className="flex items-center gap-1">
          <span className="text-muted text-[9px]">Offset</span>
          <input
            type="number"
            min={1}
            max={12}
            aria-label="offset"
            defaultValue={item.offset ?? ''}
            onBlur={handleOffsetBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="w-10 text-center font-mono bg-transparent border border-border/50 rounded py-0.5 text-ink"
          />
        </div>
      ) : (
        <button
          type="button"
          aria-label="Offset"
          onClick={() => setShowOffset(true)}
          className="px-2 py-0.5 rounded text-muted hover:text-ink hover:bg-subtle transition-colors"
        >
          Offset
        </button>
      )}

      {/* Move-to-page controls */}
      {(hasMoveTargets || onUnassignItem) && (
        <div className="w-px h-4 bg-border mx-0.5" />
      )}

      {hasMoveTargets && onMoveToPage && (
        <div className="relative">
          <button
            ref={moveTriggerRef}
            type="button"
            id={`move-trigger-${item.key}`}
            aria-label="Move to page"
            aria-expanded={showMoveDropdown}
            aria-controls={showMoveDropdown ? `move-dropdown-${item.key}` : undefined}
            onClick={() => setShowMoveDropdown((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && !showMoveDropdown) {
                e.preventDefault();
                setShowMoveDropdown(true);
                // Focus first option on next render
                requestAnimationFrame(() => {
                  const first = dropdownRef.current?.querySelector('button') as HTMLButtonElement | null;
                  first?.focus();
                });
              }
            }}
            className="px-2 py-0.5 rounded text-muted hover:text-ink hover:bg-subtle transition-colors"
          >
            Move to page ▾
          </button>
          {showMoveDropdown && (
            <div
              ref={dropdownRef}
              id={`move-dropdown-${item.key}`}
              data-testid="move-to-page-dropdown"
              role="listbox"
              onKeyDown={(e) => {
                const buttons = Array.from(
                  dropdownRef.current?.querySelectorAll('button') ?? [],
                ) as HTMLButtonElement[];
                const focused = document.activeElement as HTMLButtonElement;
                const idx = buttons.indexOf(focused);
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  buttons[Math.min(idx + 1, buttons.length - 1)]?.focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (idx <= 0) {
                    setShowMoveDropdown(false);
                    moveTriggerRef.current?.focus();
                  } else {
                    buttons[idx - 1]?.focus();
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setShowMoveDropdown(false);
                  moveTriggerRef.current?.focus();
                }
              }}
              className="absolute left-0 top-full z-20 mt-1 min-w-[140px] max-h-[200px] overflow-y-auto rounded-md border border-border bg-surface shadow-md"
            >
              {otherPages!.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  role="option"
                  aria-label={`Move to ${page.title}`}
                  onClick={() => {
                    onMoveToPage(item.key, page.id);
                    setShowMoveDropdown(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-[11px] text-muted hover:text-ink hover:bg-subtle transition-colors"
                >
                  {page.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {onUnassignItem && (
        <button
          type="button"
          aria-label="Unassign"
          onClick={() => onUnassignItem(item.key)}
          className="px-2 py-0.5 rounded text-muted hover:text-error hover:bg-error/5 transition-colors"
        >
          Unassign
        </button>
      )}
    </div>
  );
}
