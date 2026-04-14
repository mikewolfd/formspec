/** @filedesc Blueprint section summarizing mapping rule count and direction for the current project. */
import { useProjectState } from '../../state/useProjectState';
import { Pill } from '../ui/Pill';

export function MappingsList() {
  const state = useProjectState();
  const id = state.selectedMappingId ?? Object.keys(state.mappings)[0] ?? 'default';
  const mapping = state.mappings[id] ?? {};
  const rules = mapping.rules ?? [];
  const direction = mapping.direction ?? 'bidirectional';

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-5 border border-dashed border-border/70 rounded-[6px] bg-subtle/30 text-muted mx-1">
        <span className="text-[12px] font-medium font-ui tracking-tight">No mapping rules defined</span>
      </div>
    );
  }

  return (
    <div className="space-y-1 py-1">
      <div className="flex items-center gap-2">
        <Pill text={`${rules.length} rule${rules.length === 1 ? '' : 's'}`} color="accent" size="sm" />
        <Pill text={direction} color="muted" size="sm" />
      </div>
    </div>
  );
}
