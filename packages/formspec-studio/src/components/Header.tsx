/** @filedesc Top navigation header with workspace tab bar and actions (new, import, export, search). */
import { useState, useRef, useEffect } from 'react';
import { useProject } from '../state/useProject';
import { useProjectState } from '../state/useProjectState';
import { type ColorScheme, type ThemePreference } from '../hooks/useColorScheme';
import {
  IconMonitor,
  IconMoon,
  IconSun,
  IconSearch,
  IconUndo,
  IconRedo,
  IconMenu,
  IconStack,
} from './icons';
import { AssistantEntryMenu, type AssistantEntryMenuProps } from './AssistantEntryMenu';
import type { EnterWorkspaceSource } from '../onboarding/enter-workspace-source';

/** Header chrome when the user is on the full-screen assistant surface (before tabbed Studio). */
export interface AssistantHeaderSurfaceProps {
  /** Prefer passing a source for telemetry (`header` from this control). */
  onEnterWorkspace: (source: EnterWorkspaceSource) => void;
  onReopenHelp?: () => void;
  /** When true, show a Help control that calls `onReopenHelp`. */
  showHelpButton?: boolean;
}

const TABS: { name: string; help: string }[] = [
  { name: 'Editor', help: 'Build your form structure and manage shared resources' },
  { name: 'Layout', help: 'Visual form builder — pages, layout containers, and widget placement' },
  { name: 'Evidence', help: 'Review source documents, citations, missing coverage, and conflicts' },
  { name: 'Mapping', help: 'Bidirectional data transforms for import/export formats' },
  { name: 'Preview', help: 'Live form preview, behavior lab, and JSON document view' },
];

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onNew?: () => void;
  onExport?: () => void;
  onImport: () => void;
  onSearch: () => void;
  onHome?: () => void;
  onOpenMetadata?: () => void;
  onToggleAccountMenu?: () => void;
  onToggleMenu?: () => void;
  /** In-shell chat control (dock/hide assistant panel within workspace). */
  assistantMenu?: AssistantEntryMenuProps | null;
  /** Switches from workspace to full assistant surface. */
  onSwitchToAssistant?: (() => void) | null;
  /** Replaces workspace tabs with AI-authoring labeling and adds manual-controls CTA (+ optional Help). */
  assistantSurface?: AssistantHeaderSurfaceProps | null;
  isCompact?: boolean;
  colorScheme?: ColorScheme;
}

function tabId(name: string): string {
  return `studio-tab-${name.toLowerCase()}`;
}

function panelId(name: string): string {
  return `studio-panel-${name.toLowerCase()}`;
}

/** Cycle order: system → light → dark → system */
const THEME_CYCLE: ThemePreference[] = ['system', 'light', 'dark'];

function nextTheme(current: ThemePreference): ThemePreference {
  const idx = THEME_CYCLE.indexOf(current);
  return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
}

function ThemeToggleIcon({ theme, resolved }: { theme: ThemePreference; resolved: 'light' | 'dark' }) {
  if (theme === 'system') {
    return <IconMonitor />;
  }
  if (resolved === 'dark') {
    return <IconMoon />;
  }
  return <IconSun />;
}

export function Header({
  activeTab,
  onTabChange,
  onNew,
  onExport,
  onImport,
  onSearch,
  onHome,
  onOpenMetadata,
  onToggleAccountMenu,
  onToggleMenu,
  assistantMenu,
  onSwitchToAssistant,
  assistantSurface,
  isCompact = false,
  colorScheme,
}: HeaderProps) {
  const project = useProject();
  const state = useProjectState();
  const { definition } = state;
  const formTitle = definition.title?.trim() ? definition.title.trim() : 'Untitled form';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();

    const lastIndex = TABS.length - 1;
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = index === lastIndex ? 0 : index + 1;
    if (event.key === 'ArrowLeft') nextIndex = index === 0 ? lastIndex : index - 1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = lastIndex;

    const nextTab = TABS[nextIndex];
    onTabChange(nextTab.name);
    tabRefs.current[nextIndex]?.focus();
  };

  const tabButtons = TABS.map(({ name, help }, index) => (
    <button
      key={name}
      id={tabId(name)}
      role="tab"
      aria-selected={activeTab === name}
      aria-controls={panelId(name)}
      tabIndex={activeTab === name ? 0 : -1}
      data-testid={`tab-${name}`}
      title={help}
      ref={(node) => {
        tabRefs.current[index] = node;
      }}
      className={`flex items-center px-3 sm:px-3.5 h-full text-[13px] transition-colors border-b-2 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-inset ${
        activeTab === name
          ? 'border-accent text-accent font-semibold'
          : 'border-transparent text-muted hover:text-ink'
      }`}
      onClick={() => onTabChange(name)}
      onKeyDown={(event) => handleTabKeyDown(event, index)}
    >
      {name}
    </button>
  ));

  const profileMenu = (
    <div ref={menuRef} className="relative ml-0.5 sm:ml-1">
      <button
        type="button"
        aria-label="Open account menu"
        aria-expanded={menuOpen}
        className={`w-7 h-7 rounded-full bg-[#E2D9CF] border-2 shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
          menuOpen ? 'border-accent' : 'border-border hover:border-muted/40'
        }`}
        onClick={() => setMenuOpen(!menuOpen)}
      />
      {menuOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-surface border border-border rounded-[6px] shadow-lg py-1 z-50" role="menu" aria-label="Account actions">
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-3 py-2 text-[13px] hover:bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-inset"
            onClick={() => { setMenuOpen(false); onNew?.(); }}
          >
            New Form
          </button>
          <button
            type="button"
            role="menuitem"
            data-testid="import-btn"
            className="w-full text-left px-3 py-2 text-[13px] hover:bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-inset"
            onClick={() => { setMenuOpen(false); onImport(); }}
          >
            Import
          </button>
          {onExport && (
            <button
              type="button"
              role="menuitem"
              className="w-full text-left px-3 py-2 text-[13px] hover:bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-inset"
              onClick={() => { setMenuOpen(false); onExport(); }}
            >
              Export
            </button>
          )}
          <div className="border-t border-border my-1" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-3 py-2 text-[13px] hover:bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-inset"
            onClick={() => { setMenuOpen(false); onOpenMetadata?.(); }}
          >
            Form Settings
          </button>
          <button
            type="button"
            role="menuitem"
            className="w-full text-left px-3 py-2 text-[13px] hover:bg-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-inset"
            onClick={() => { setMenuOpen(false); onToggleAccountMenu?.(); }}
          >
            App Settings
          </button>
        </div>
      )}
    </div>
  );

  const actionButtons = (
    <div
      className={`flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2 ${
        assistantSurface && isCompact ? 'max-w-[min(100%,52vw)] overflow-x-auto scrollbar-none pr-0.5' : ''
      }`}
    >
      {/* Search — icon-only on compact, full bar on wide */}
      {isCompact ? (
        <button
          onClick={onSearch}
          aria-label="Search"
          className="rounded-full border border-border/65 bg-surface/70 p-2 text-muted hover:bg-surface hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          title="Search (⌘K)"
        >
          <IconSearch />
        </button>
      ) : (
        <button
          onClick={onSearch}
          className="group flex max-w-[220px] items-center gap-2 rounded-full border border-border/55 bg-surface/70 px-3.5 py-1.5 text-muted hover:border-border/80 hover:bg-surface hover:text-ink dark:bg-surface/40 dark:hover:bg-surface/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
        >
          <span className="text-[13px]">⌕</span>
          <span className="text-[13px] font-ui">Search…</span>
          <span className="ml-auto rounded-full border border-border/50 px-1.5 py-0.5 font-mono text-[11px] text-muted group-hover:text-ink/80 transition-colors">
            ⌘K
          </span>
        </button>
      )}

      {!isCompact && (
        <button
          type="button"
          aria-label={`FORMSPEC ${definition.$formspec} metadata`}
          className="rounded-full border border-border/75 px-3.5 py-2 text-[12.5px] font-medium text-ink/88 hover:bg-surface/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          onClick={() => onOpenMetadata?.()}
        >
          Metadata
        </button>
      )}
      <button
        data-testid="undo-btn"
        aria-label="Undo"
        disabled={!project.canUndo}
        className="rounded-full border border-transparent p-2 text-muted hover:border-border/60 hover:bg-surface/75 hover:text-ink disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
        onClick={() => project.undo()}
        title="Undo (⌘Z)"
      >
        <IconUndo />
      </button>
      <button
        data-testid="redo-btn"
        aria-label="Redo"
        disabled={!project.canRedo}
        className="rounded-full border border-transparent p-2 text-muted hover:border-border/60 hover:bg-surface/75 hover:text-ink disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
        onClick={() => project.redo()}
        title="Redo (⌘⇧Z)"
      >
        <IconRedo />
      </button>

      {!assistantSurface && assistantMenu && <AssistantEntryMenu {...assistantMenu} />}

      {!assistantSurface && onSwitchToAssistant && (
        <button
          type="button"
          data-testid="toggle-to-assistant"
          className={`shrink-0 rounded-full border border-accent/25 bg-accent/10 font-semibold text-accent hover:bg-accent/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 ${
            isCompact ? 'p-2' : 'px-3 py-1.5 text-[12px]'
          }`}
          onClick={onSwitchToAssistant}
          aria-label="Switch to AI authoring"
        >
          Ask AI
        </button>
      )}

      {assistantSurface?.showHelpButton && assistantSurface.onReopenHelp && (
        <button
          type="button"
          aria-label="Studio setup help"
          title="Studio setup help"
          className={`inline-flex shrink-0 items-center rounded-full border border-border/65 bg-surface/70 font-medium text-ink hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 ${
            isCompact ? 'px-2.5 py-1.5 text-[11px]' : 'hidden px-3 py-1.5 text-[12px] md:inline-flex'
          }`}
          onClick={() => assistantSurface.onReopenHelp?.()}
        >
          Help
        </button>
      )}
      {assistantSurface && (
        <button
          type="button"
          data-testid="assistant-enter-workspace"
          className={`shrink-0 rounded-full bg-accent font-semibold text-white shadow-sm hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
            isCompact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3.5 py-2 text-[12px]'
          }`}
          onClick={() => assistantSurface.onEnterWorkspace('header')}
        >
          Open manual controls
        </button>
      )}

      {colorScheme && (
        <button
          type="button"
          aria-label={`Switch to ${nextTheme(colorScheme.theme)} theme`}
          title={`Theme: ${colorScheme.theme} (click to switch to ${nextTheme(colorScheme.theme)})`}
          className="rounded-full border border-transparent p-2 text-muted hover:border-border/60 hover:bg-surface/75 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
          onClick={() => colorScheme.setTheme(nextTheme(colorScheme.theme))}
        >
          <ThemeToggleIcon theme={colorScheme.theme} resolved={colorScheme.resolvedTheme} />
        </button>
      )}

      {profileMenu}
    </div>
  );

  /* ── Compact: two rows (toolbar + tab strip) ── */
  if (isCompact) {
    return (
      <div data-testid="header" className="shrink-0 border-b border-border bg-surface">
        {/* Row 1: Logo + Title + Actions */}
        <div className="flex min-h-[56px] items-center gap-3 px-3">
          {onToggleMenu && (
            <button
              type="button"
              aria-label="Toggle blueprint menu"
              className="rounded-full border border-border/60 bg-surface/75 p-2 -ml-1.5 hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
              onClick={onToggleMenu}
            >
              <IconMenu />
            </button>
          )}
          <button
            type="button"
            aria-label="The Stack home"
            className="flex items-center gap-2.5 shrink-0 text-left"
            onClick={() => { onTabChange('Editor'); onHome?.(); }}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-accent text-surface" aria-hidden="true">
              <IconStack size={11} className="text-surface" />
            </div>
            <div>
              <div className="font-display text-[22px] tracking-[-0.04em] leading-none whitespace-nowrap text-ink">The Stack</div>
            <div className="font-mono text-[11px] text-muted tracking-[0.18em] uppercase whitespace-nowrap">
                {assistantSurface ? (
                  <span className="truncate">{formTitle} · AI authoring</span>
                ) : (
                  <>FORMSPEC {definition.$formspec} · {definition.status || 'DRAFT'}</>
                )}
              </div>
            </div>
          </button>
          <div className="flex-1" />
          {actionButtons}
        </div>

        {/* Row 2: Workspace tabs or assistant stage label */}
        {assistantSurface ? (
          <div
            className="flex h-[42px] items-center justify-center border-t border-border/40 px-3"
            role="status"
            aria-label="AI method active"
          >
            <span className="rounded-full border border-border/55 bg-surface/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">AI method active</span>
          </div>
        ) : (
          <nav className="flex h-[42px] overflow-x-auto scrollbar-none border-t border-border/40 px-3" role="tablist" aria-label="Studio workspaces">
            {tabButtons}
          </nav>
        )}
      </div>
    );
  }

  /* ── Desktop: single row ── */
  return (
    <header
      data-testid="header"
      className="relative flex min-h-[72px] shrink-0 items-center gap-5 border-b border-border bg-surface px-4 py-3"
    >
      {/* Left: App Mark + Title */}
      <button
        type="button"
        aria-label="The Stack home"
        className="flex items-center gap-3 mr-4 shrink-0 text-left"
        onClick={() => { onTabChange('Editor'); onHome?.(); }}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-accent text-surface" aria-hidden="true">
          <IconStack size={16} className="text-surface" />
        </div>
        <div className="space-y-1">
          <div className="font-display text-[31px] tracking-[-0.05em] leading-none text-ink">The Stack</div>
          <div className="font-mono text-[11px] text-muted tracking-[0.18em] uppercase">
            {assistantSurface ? (
              <span className="block max-w-[min(52vw,28rem)] truncate">{formTitle} · AI authoring</span>
            ) : (
              <>FORMSPEC {definition.$formspec} · {definition.status || 'DRAFT'}</>
            )}
          </div>
        </div>
      </button>

      {/* Workspace tabs or assistant stage label */}
      {assistantSurface ? (
        <div className="flex h-12 items-end self-stretch pb-1" role="status" aria-label="AI method active">
          <span className="mb-0.5 rounded-full border border-border/60 bg-surface/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">AI method active</span>
        </div>
      ) : (
        <nav className="flex h-12 items-end self-stretch" role="tablist" aria-label="Studio workspaces">
          {tabButtons}
        </nav>
      )}

      <div className="flex-1 min-w-0" />

      {actionButtons}
    </header>
  );
}
