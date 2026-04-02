/** @filedesc Layout/Theme mode segmented control for the Layout workspace (role="radiogroup"). */

export type LayoutMode = 'layout' | 'theme';

interface LayoutThemeToggleProps {
  activeMode: LayoutMode;
  onModeChange: (mode: LayoutMode) => void;
}

const OPTIONS: { id: LayoutMode; label: string }[] = [
  { id: 'layout', label: 'Layout' },
  { id: 'theme', label: 'Theme' },
];

export function LayoutThemeToggle({ activeMode, onModeChange }: LayoutThemeToggleProps) {
  const handleKeyDown = (e: React.KeyboardEvent, current: LayoutMode) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const currentIndex = OPTIONS.findIndex(o => o.id === current);
    const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
    const nextIndex = forward
      ? (currentIndex + 1) % OPTIONS.length
      : (currentIndex - 1 + OPTIONS.length) % OPTIONS.length;
    onModeChange(OPTIONS[nextIndex].id);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Layout mode"
      data-testid="layout-theme-toggle"
      className="inline-flex items-center gap-1 rounded-[14px] border border-border bg-subtle/50 p-1"
    >
      {OPTIONS.map(({ id, label }) => {
        const isActive = activeMode === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            tabIndex={isActive ? 0 : -1}
            onClick={() => { if (!isActive) onModeChange(id); }}
            onKeyDown={(e) => handleKeyDown(e, id)}
            className={`px-3.5 py-1.5 text-[13px] font-semibold rounded-[10px] transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 ${
              isActive
                ? 'bg-accent text-white shadow-sm'
                : 'text-muted hover:bg-subtle hover:text-ink'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
