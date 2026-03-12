import { useDefinition } from '../../state/useDefinition';

interface PageTabsProps {
  activePage: number;
  onPageChange: (index: number) => void;
}

export function PageTabs({ activePage, onPageChange }: PageTabsProps) {
  const definition = useDefinition();
  const items = definition.items || [];

  // Pages are top-level group items, or treat entire form as single page
  const pages = items.filter((item: any) => item.type === 'group');
  const displayPages = pages.length > 0 ? pages : [{ key: 'all', label: 'All Fields' }];

  return (
    <div
      role="tablist"
      className="flex items-center gap-0 py-2 overflow-x-auto"
    >
      {displayPages.map((page: any, i: number) => {
        const isActive = i === activePage;
        return (
          <div key={page.key} className="flex items-center shrink-0">
            <button
              role="tab"
              aria-selected={isActive}
              title={page.label || page.key}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-[4px] transition-all cursor-pointer border ${
                isActive
                  ? 'bg-accent/5 border-accent/20 text-accent font-semibold'
                  : 'bg-transparent border-transparent text-muted hover:text-ink hover:bg-subtle'
              }`}
              onClick={() => onPageChange(i)}
            >
              <span
                className={`w-[18px] h-[18px] rounded-full flex items-center justify-center font-mono text-[10px] font-bold transition-colors shrink-0 ${
                  isActive ? 'bg-accent text-white' : 'bg-border/80 text-muted'
                }`}
              >
                {i + 1}
              </span>
              {isActive && (
                <span className="text-[12.5px] whitespace-nowrap max-w-[140px] overflow-hidden text-ellipsis">
                  {page.label || page.key}
                </span>
              )}
            </button>
            {i < displayPages.length - 1 && (
              <div className="w-3 h-px bg-border/60 mx-1 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
