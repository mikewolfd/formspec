/** @filedesc Hook that returns all mapping IDs and the currently selected ID from project state. */
import { useProjectState } from './useProjectState';

export function useMappingIds() {
  const state = useProjectState();
  const ids = Object.keys(state.mappings);
  const selectedId = state.selectedMappingId ?? ids[0] ?? 'default';
  return { ids, selectedId };
}
