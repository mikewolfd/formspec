/** @filedesc Collapsible right-rail preview companion — mounts FormspecPreviewHost, persists across workspace tabs (ADR 0083). */
import { type ResolvedTheme } from '../hooks/useColorScheme';
import { IconChevronRight } from './icons';
import { FormspecPreviewHost } from '../workspaces/preview/FormspecPreviewHost';

export interface PreviewCompanionPanelProps {
  width: number;
  appearance?: ResolvedTheme;
  highlightFieldPath?: string | null;
  onClose: () => void;
  onFieldClick?: (path: string) => void;
}

export function PreviewCompanionPanel({ width, appearance, highlightFieldPath, onClose, onFieldClick }: PreviewCompanionPanelProps) {
  return (
    <aside
      className="flex flex-col overflow-hidden shrink-0 border-l border-border/70 bg-surface"
      style={{ width: `clamp(280px, ${width}px, calc(50vw - 260px))` }}
      data-testid="preview-companion-panel"
      aria-label="Live preview companion"
    >
      <div className="flex items-center justify-between px-3 py-2 shrink-0 border-b border-border/60 bg-surface/60">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Preview
        </span>
        <button
          type="button"
          aria-label="Hide preview companion"
          className="rounded p-1 text-muted hover:text-ink hover:bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          onClick={onClose}
        >
          <IconChevronRight size={14} />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <FormspecPreviewHost
          width="100%"
          appearance={appearance}
          layoutHighlightFieldPath={highlightFieldPath}
          onFieldClick={onFieldClick}
        />
      </div>
    </aside>
  );
}
