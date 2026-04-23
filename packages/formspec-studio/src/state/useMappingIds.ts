/** @filedesc Hook that returns all mapping IDs and the currently selected ID from project state. */
import { useMemo } from 'react';
import { useProjectSlice } from './useProjectSlice';

/**
 * Stable snapshot for mapping keys — `Object.keys()` alone returns a new array every read and
 * trips useSyncExternalStore infinite update loops.
 */
function mappingIdsKey(mappings: Record<string, unknown>): string {
  const keys = Object.keys(mappings);
  keys.sort();
  return keys.join('\x1e');
}

export function useMappingIds() {
  const idsKey = useProjectSlice((s) => mappingIdsKey(s.mappings as Record<string, unknown>));
  const ids = useMemo(() => (idsKey === '' ? [] : idsKey.split('\x1e')), [idsKey]);
  const selectedMappingId = useProjectSlice((s) => s.selectedMappingId);
  const selectedId = selectedMappingId ?? ids[0] ?? 'default';
  return { ids, selectedId };
}
