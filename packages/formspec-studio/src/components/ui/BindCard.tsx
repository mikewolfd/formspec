import { FELReferencePopup } from './FELReferencePopup';

const bindColors: Record<string, string> = {
  required: 'text-accent border-l-accent',
  relevant: 'text-logic border-l-logic',
  calculate: 'text-green border-l-green',
  constraint: 'text-amber border-l-amber',
  readonly: 'text-muted border-l-muted',
};

interface BindCardProps {
  bindType: string;
  expression: string;
  humanized?: string;
  message?: string;
}

/**
 * Bind type card with colored left border.
 * Shows humanized description and raw FEL expression.
 * Includes a contextual FEL reference popup button for quick function lookup.
 */
export function BindCard({ bindType, expression, humanized, message }: BindCardProps) {
  const styles = bindColors[bindType] || 'text-muted border-l-muted';
  const colorClass = styles.split(' ')[0];
  const borderClass = styles.split(' ')[1];

  return (
    <div className={`border border-border border-l-[3px] ${borderClass} rounded-[4px] bg-surface p-2 mb-1`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`font-mono text-[9px] font-bold tracking-wider uppercase ${colorClass}`}>
          {bindType}
        </span>
        <FELReferencePopup />
      </div>

      {humanized && (
        <div className="font-ui text-[12px] text-ink leading-snug mb-1">
          {humanized}
        </div>
      )}

      {expression && expression !== 'true' && (
        <div
          className="font-mono text-[10px] text-muted bg-subtle px-1.5 py-0.5 rounded-[2px] truncate"
          title={expression}
        >
          {expression}
        </div>
      )}

      {message && (
        <div className="font-ui text-[11px] text-muted italic mt-1 leading-tight">
          &ldquo;{message}&rdquo;
        </div>
      )}
    </div>
  );
}
