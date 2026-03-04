import { signal } from '@preact/signals';
/** Currently selected component tree path. null = nothing, '' = root */
export const selectedPath = signal(null);
/** Active add picker state, if picker is open */
export const addPickerState = signal(null);
