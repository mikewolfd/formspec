/** @filedesc Legacy sidebar wrapper — re-exports canvas block with full height for tests and rare embeds. */
import { LayoutLivePreviewSection } from './LayoutLivePreviewSection';

interface LayoutPreviewPanelProps {
  width?: string | number;
}

export function LayoutPreviewPanel({ width = '100%' }: LayoutPreviewPanelProps) {
  return <LayoutLivePreviewSection width={width} className="h-full" />;
}
