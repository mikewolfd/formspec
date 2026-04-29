/** @filedesc Shared primitive components (PropInput, AddPlaceholder) reused across properties panels. */
import { HelpTip } from '../../../components/ui/HelpTip';
import { Project } from '@formspec-org/studio-core';

export function PropInput({
  path,
  property,
  label,
  value,
  project,
  type = 'text',
  help,
  min,
  onCleared,
}: {
  path: string;
  property: string;
  label: string;
  value: string | number;
  project: Project;
  type?: string;
  help?: string;
  min?: number;
  onCleared?: () => void;
}) {
  return (
    <div className="space-y-1.5 mb-2">
      <label className="font-mono text-[10px] text-ink/70 uppercase tracking-wider block" htmlFor={`${path}-${property}`}>
        {help ? <HelpTip text={help}>{label}</HelpTip> : label}
      </label>
      <input
        id={`${path}-${property}`}
        key={`${path}-${property}`}
        type={type}
        min={min}
        aria-label={label}
        className="w-full h-8 px-2.5 text-[13px] border border-border/80 rounded-[6px] bg-surface outline-none transition-shadow focus:border-accent focus:ring-2 focus:ring-accent/30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
        defaultValue={value}
        onBlur={(event) => {
          let nextValue: string | number | null = event.currentTarget.value;
          if (type === 'number') {
            const parsed = Number.parseInt(nextValue, 10);
            nextValue = Number.isNaN(parsed) ? null : parsed;
          }
          project.updateItem(path, { [property]: nextValue || null });
          if (!nextValue) onCleared?.();
        }}
      />
    </div>
  );
}

export function AddPlaceholder({
  label,
  onAdd,
  help,
}: {
  label: string;
  onAdd: () => void;
  help?: string;
}) {
  const button = (
    <button
      type="button"
      className="text-[11px] text-muted hover:text-accent font-mono cursor-pointer transition-colors"
      onClick={onAdd}
    >
      + Add {label}
    </button>
  );

  return help ? <HelpTip text={help}>{button}</HelpTip> : button;
}
