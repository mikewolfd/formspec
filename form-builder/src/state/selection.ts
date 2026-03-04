import { signal } from '@preact/signals';

export const selectedPath = signal<string | null>(null);

export interface AddPickerState {
  parentPath: string;
  insertIndex: number;
}

export const addPickerState = signal<AddPickerState | null>(null);
