interface PropertyRowProps {
  label: string;
  children: React.ReactNode;
  color?: string;
}

/**
 * Label/value row for property panels.
 * Highly compact, justified baseline alignment.
 */
export function PropertyRow({ label, children, color }: PropertyRowProps) {
  return (
    <div className="flex justify-between items-baseline gap-4 py-0.5 border-b border-border/50 last:border-0 transition-colors hover:bg-subtle/30">
      <span className="font-mono text-[11px] text-muted shrink-0 uppercase tracking-tight">
        {label}
      </span>
      <span className={`font-mono text-[11.5px] text-right truncate flex-1 ${color || 'text-ink'}`}>
        {children}
      </span>
    </div>
  );
}
