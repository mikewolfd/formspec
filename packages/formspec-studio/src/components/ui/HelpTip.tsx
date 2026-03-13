import { useState, useRef, useEffect, type ReactNode } from 'react';

interface HelpTipProps {
  text: string;
  children: ReactNode;
}

/**
 * Wraps label content with a ? icon. Hovering anywhere on the
 * wrapper (label + icon) shows a tooltip with help text.
 */
export function HelpTip({ text, children }: HelpTipProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShow(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show]);

  return (
    <span
      className="inline-flex items-center gap-1 cursor-help relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <span className="text-[9px] text-muted opacity-60 hover:opacity-100 transition-opacity" aria-label="Help">?</span>
      {show && (
        <span
          role="tooltip"
          className="absolute left-0 top-full mt-1 z-50 w-52 px-2.5 py-2 text-[11px] leading-snug text-ink bg-surface border border-border rounded-[4px] shadow-md font-ui whitespace-normal"
        >
          {text}
        </span>
      )}
    </span>
  );
}
