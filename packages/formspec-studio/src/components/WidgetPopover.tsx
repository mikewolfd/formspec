/** @filedesc WidgetPopover — tier-aware widget selection for the authoring canvas. */
import { useState } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
} from '@floating-ui/react';
import { Project, treeContainsRef, type CompNode } from '@formspec-org/studio-core';

interface WidgetPopoverProps {
  path: string;
  project: Project;
  onSelect: (widget: string) => void;
  children: (props: { ref: (node: HTMLElement | null) => void; onClick: () => void }) => React.ReactNode;
}

const WIDGETS = [
  { id: 'text', label: 'Text Input', icon: 'abc' },
  { id: 'textarea', label: 'Text Area', icon: '¶' },
  { id: 'number', label: 'Number', icon: '123' },
  { id: 'select', label: 'Dropdown', icon: '▾' },
  { id: 'radio', label: 'Radio Group', icon: '◉' },
  { id: 'checkbox', label: 'Checkbox', icon: '☑' },
  { id: 'datepicker', label: 'Date Picker', icon: '📅' },
  { id: 'switch', label: 'Switch', icon: '⌥' },
];

export function WidgetPopover({ path, project, onSelect, children }: WidgetPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(8), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const hasComponentDoc = treeContainsRef(project.state.component.tree as CompNode, { bind: path });
  const hasThemeDoc = !!project.state.theme.items?.[path];
  const currentWidget = project.getWidget(path) || 'default';

  // Determine the active tier for routing
  const tier = hasComponentDoc ? 'Component' : hasThemeDoc ? 'Theme' : 'Core (Advisory)';
  const tierColor = hasComponentDoc ? 'text-blue-500' : hasThemeDoc ? 'text-purple-500' : 'text-amber-500';

  return (
    <>
      {children({ ref: refs.setReference, onClick: () => setIsOpen(true) })}
      <FloatingPortal>
        {isOpen && (
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className="z-50 bg-surface shadow-2xl rounded-xl border border-border overflow-hidden min-w-[220px] animate-in fade-in zoom-in-95 duration-100"
              {...getFloatingProps()}
            >
              <div className="px-4 py-3 border-b border-border bg-subtle/30 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Change Widget</span>
                <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-surface border border-current ${tierColor}`}>
                  {tier}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-1 p-2">
                {WIDGETS.map((w) => (
                  <button
                    key={w.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] transition-all text-left ${
                      currentWidget === w.id 
                        ? 'bg-accent text-white font-bold' 
                        : 'hover:bg-subtle text-ink'
                    }`}
                    onClick={() => {
                      onSelect(w.id);
                      setIsOpen(false);
                    }}
                  >
                    <span className="w-5 text-center opacity-60 font-mono text-[10px]">{w.icon}</span>
                    <span>{w.label}</span>
                  </button>
                ))}
              </div>

              <div className="px-4 py-2 bg-subtle/20 border-t border-border">
                <p className="text-[9px] text-muted leading-tight">
                  Selection will be saved to the <strong>{tier}</strong> document to ensure maximum durability across renders.
                </p>
              </div>
            </div>
          </FloatingFocusManager>
        )}
      </FloatingPortal>
    </>
  );
}
