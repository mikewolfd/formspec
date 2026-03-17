/** @filedesc Mapping tab section for setting the top-level mapping direction and URL properties. */
import { useEffect, useId, useState } from 'react';
import { useProject } from '../../state/useProject';
import { useMapping } from '../../state/useMapping';
import { HelpTip } from '../../components/ui/HelpTip';

const directions = ['unset', 'forward', 'reverse', 'both'] as const;

interface MappingConfigProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MappingConfig({ open: controlledOpen, onOpenChange }: MappingConfigProps = {}) {
  const mapping = useMapping();
  const project = useProject();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [localOpen, setLocalOpen] = useState(true);
  const listboxId = useId();
  const direction = mapping?.direction ?? 'unset';
  const isControlled = controlledOpen !== undefined;
  const open = controlledOpen ?? localOpen;

  useEffect(() => {
    if (!pickerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPickerOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pickerOpen]);

  const setDirection = (value: (typeof directions)[number]) => {
    project.setMappingProperty('direction', value === 'unset' ? null : value);
    setPickerOpen(false);
  };

  const toggleOpen = () => {
    const nextOpen = !open;
    if (!isControlled) setLocalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  return (
    <div className="mb-4">
      <button
        type="button"
        className="w-full flex items-center justify-between py-1.5 cursor-pointer group"
        onClick={toggleOpen}
      >
        <span className="font-mono text-[10px] font-bold tracking-[0.15em] uppercase text-muted group-hover:text-ink transition-colors">
          Configuration
        </span>
        <span className={`text-[10px] text-muted transition-transform duration-150 ${open ? 'rotate-90' : ''}`}>
          ▶
        </span>
      </button>
      {open && (
        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Mapping Direction Row */}
          <div className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-subtle/30 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-muted">Direction</span>
              <HelpTip text="The flow of transformation. 'Forward' for exports (Form -> External), 'Reverse' for imports (External -> Form).">
                <span className="text-[10px] text-muted/50 cursor-help hover:text-accent transition-colors">ⓘ</span>
              </HelpTip>
            </div>
            <div className="relative">
              <button
                type="button"
                data-testid="direction-picker"
                className={`inline-flex items-center rounded-sm border font-ui text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 ${direction === 'unset'
                  ? 'bg-panel text-muted border-border'
                  : 'bg-accent/10 text-accent border-accent/20'
                  }`}
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                aria-controls={pickerOpen ? listboxId : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  setPickerOpen((v) => !v);
                }}
              >
                {direction === 'unset' ? 'Default (Forward)' : direction}
              </button>
              {pickerOpen && (
                <div
                  id={listboxId}
                  role="listbox"
                  className="absolute right-0 top-full z-20 mt-1 min-w-32 rounded-md border border-border bg-panel p-1 shadow-lg"
                >
                  {directions.map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-selected={value === direction}
                      className={`flex w-full rounded px-2 py-1 text-left text-[11px] font-bold uppercase ${value === direction ? 'bg-accent/10 text-accent' : 'text-ink hover:bg-subtle'
                        }`}
                      onClick={() => setDirection(value)}
                    >
                      {value === 'unset' ? 'Default (Forward)' : value}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mapping Version Row */}
          <div className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-subtle/30 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium text-muted">Version</span>
              <HelpTip text="Spec version the mapping document conforms to.">
                <span className="text-[10px] text-muted/50 cursor-help hover:text-accent transition-colors">ⓘ</span>
              </HelpTip>
            </div>
            <span className="font-mono text-[11px] font-bold text-ink px-1.5 py-0.5 bg-subtle/50 border border-border/40 rounded min-w-[50px] text-center">
              {mapping?.version ?? '1.2.3'}
            </span>
          </div>

          {/* Definition Ref Row */}
          {mapping?.definitionRef && (
            <div className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-subtle/30 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-muted">Definition</span>
                <HelpTip text="The Formspec definition this mapping transforms.">
                  <span className="text-[10px] text-muted/50 cursor-help hover:text-accent transition-colors">ⓘ</span>
                </HelpTip>
              </div>
              <span className="font-mono text-[11px] text-ink truncate max-w-[120px]" title={mapping.definitionRef}>
                {mapping.definitionRef}
              </span>
            </div>
          )}

          {/* Target Schema & Format Section */}
          <div className="mt-4 pt-3 border-t border-border/40">
            <div className="flex items-center justify-between px-2 mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-muted">Target Schema</span>
                <HelpTip text="External schema structure and format requirements.">
                  <span className="text-[10px] text-muted/50 cursor-help hover:text-accent transition-colors">ⓘ</span>
                </HelpTip>
              </div>
              <span className="text-[11px] font-bold text-ink">
                {Object.keys(mapping?.targetSchema ?? {}).length} properties
              </span>
            </div>
            {(mapping?.targetSchema as any)?.format && (
              <div className="flex items-center justify-between px-2">
                <span className="text-muted/60 italic text-[10px]">Active Format</span>
                <span className="font-bold text-[10px] text-green uppercase tracking-widest bg-green/10 px-1.5 py-0.5 rounded-sm border border-green/20">
                  {(mapping?.targetSchema as any).format}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
