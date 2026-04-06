/** @filedesc Live preview block (header + FormspecPreviewHost) — embedded in Layout canvas; replaces right-rail preview. */
import { FormspecPreviewHost } from '../preview/FormspecPreviewHost';
import { useOptionalLayoutMode } from './LayoutModeContext';

export interface LayoutLivePreviewSectionProps {
  width?: string | number;
  /** Extra classes on the outer wrapper (e.g. min-height). */
  className?: string;
}

export function LayoutLivePreviewSection({ width = '100%', className = '' }: LayoutLivePreviewSectionProps) {
  const layoutMode = useOptionalLayoutMode();

  return (
    <div className={`flex flex-col min-h-0 ${className}`.trim()}>
      <div
        data-testid="layout-preview-header"
        className="shrink-0 border-b border-border/60 px-3 py-2 flex items-center justify-between bg-surface/60"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Live Preview
        </span>
        {layoutMode && (
          <button
            type="button"
            data-testid="preview-customize-appearance"
            onClick={() => {
              if (layoutMode.requestLayoutModeChange) {
                layoutMode.requestLayoutModeChange('theme');
              } else {
                layoutMode.setLayoutMode('theme');
              }
            }}
            className="text-[11px] font-semibold text-muted hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50"
          >
            Customize appearance →
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <FormspecPreviewHost width={width} />
      </div>
    </div>
  );
}
