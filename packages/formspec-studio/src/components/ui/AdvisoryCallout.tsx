/** @filedesc Amber-bordered advisory callout with optional action buttons for bind conflict warnings. */

interface AdvisoryCalloutProps {
  message: React.ReactNode;
  actions?: Array<{ label: string; onClick: () => void }>;
}

/**
 * Non-dismissible advisory callout with amber left border.
 * Auto-appears/disappears based on parent state — no dismiss button.
 */
export function AdvisoryCallout({ message, actions }: AdvisoryCalloutProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="border border-border border-l-[3px] border-l-amber rounded-[4px] bg-amber/5 p-2 mb-1 flex items-start gap-2"
    >
      {/* Info icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-amber mt-0.5 shrink-0"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>

      <div className="flex-1 min-w-0">
        <div className="font-ui text-[12px] text-ink leading-snug">
          {message}
        </div>
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-2 mt-1.5">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="font-ui text-[11px] text-accent hover:text-accent/80 font-medium transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
