/** @filedesc Live preview block (header + FormspecPreviewHost) — embedded in Layout canvas; replaces right-rail preview. */
import type { ResolvedTheme } from '../../hooks/useColorScheme';
import { FormspecPreviewHost } from '../preview/FormspecPreviewHost';
import { useLayoutPreviewNav } from './LayoutPreviewNavContext';

export interface LayoutLivePreviewSectionProps {
  width?: string | number;
  /** Extra classes on the outer wrapper (e.g. min-height). */
  className?: string;
  appearance?: ResolvedTheme;
}

export function LayoutLivePreviewSection({ width = '100%', className = '', appearance }: LayoutLivePreviewSectionProps) {
  const { previewPageIndex, highlightFieldPath } = useLayoutPreviewNav();
  return (
    <div className={`flex flex-col min-h-0 ${className}`.trim()}>
      <div
        data-testid="layout-preview-header"
        className="shrink-0 border-b border-border/60 px-3 py-2 flex items-center justify-between bg-surface/60"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          Live Preview
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <FormspecPreviewHost
          width={width}
          appearance={appearance}
          layoutPreviewPageIndex={previewPageIndex}
          layoutHighlightFieldPath={highlightFieldPath}
        />
      </div>
    </div>
  );
}
