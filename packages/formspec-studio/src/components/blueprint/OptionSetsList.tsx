/** @filedesc Blueprint section listing named option sets and their option counts from the definition. */
import { useDefinition } from '../../state/useDefinition';
import { Pill } from '../ui/Pill';

export function OptionSetsList() {
  const definition = useDefinition();
  const optionSets = definition.optionSets;

  if (!optionSets || typeof optionSets !== 'object') {
    return (
      <div className="flex flex-col items-center justify-center py-5 border border-dashed border-border/70 rounded-[6px] bg-subtle/30 text-muted mx-1">
        <span className="text-[12px] font-medium font-ui tracking-tight">No option sets defined</span>
      </div>
    );
  }

  const names = Object.keys(optionSets);

  if (names.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-5 border border-dashed border-border/70 rounded-[6px] bg-subtle/30 text-muted mx-1">
        <span className="text-[12px] font-medium font-ui tracking-tight">No option sets defined</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {names.map((name) => {
        const set = optionSets[name];
        const options = Array.isArray(set) ? set : (set?.options ?? []);
        return (
          <div key={name} className="flex items-center justify-between px-2.5 py-1.5 rounded-[4px] hover:bg-subtle/50 transition-colors">
            <span className="text-[13px] font-mono font-medium text-ink/80">{name}</span>
            <Pill text={`${options.length} options`} color="muted" size="sm" />
          </div>
        );
      })}
    </div>
  );
}
