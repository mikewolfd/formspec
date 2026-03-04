import { signal } from '@preact/signals';
import { getCatalogByCategory } from '../../logic/add-picker-catalog';
import { generateUniqueKey, addBoundItem } from '../../logic/component-def-sync';
import { definition, setDefinition } from '../../state/definition';
import { componentDoc } from '../../state/project';
import type { AddCategory, AddPickerEntry, ComponentNode } from '../../types';

interface AddPickerProps {
  parentPath: string;
  insertIndex: number;
  onAdd: (node: ComponentNode) => void;
  onCancel: () => void;
}

export const activeCategory = signal<AddCategory>('input');
export const selectedEntry = signal<AddPickerEntry | null>(null);
const labelInput = signal('');

export function AddPicker({ parentPath, insertIndex, onAdd, onCancel }: AddPickerProps) {
  const catalog = getCatalogByCategory();
  const entry = selectedEntry.value;

  function handleEntryClick(e: AddPickerEntry) {
    if (e.promptForLabel) {
      selectedEntry.value = e;
      labelInput.value = '';
      return;
    }
    // No label needed — add immediately
    const node: ComponentNode = { component: e.component };
    onAdd(node);
    selectedEntry.value = null;
  }

  function handleConfirm() {
    if (!entry) return;
    const label = labelInput.value.trim() || entry.label;
    const key = generateUniqueKey(label, definition.value);
    const tree = componentDoc.value?.tree ?? { component: 'Stack', children: [] };

    // Create component node
    const node: ComponentNode = { component: entry.component };

    if (entry.createsDefinitionItem) {
      node.bind = key;
      // Also create definition item
      const newDef = addBoundItem(definition.value, tree, parentPath, key, label, entry);
      setDefinition(newDef);
    }

    if (entry.component === 'Page' || entry.component === 'Card' || entry.component === 'Collapsible') {
      node.title = label;
      node.children = [];
    }

    if (entry.component === 'Group') {
      node.component = 'Stack';
      node.children = [];
    }

    onAdd(node);
    selectedEntry.value = null;
  }

  if (entry?.promptForLabel) {
    return (
      <div class="add-picker add-picker-label">
        <div class="add-picker-label-header">
          Add {entry.label}
        </div>
        <input
          class="studio-input"
          placeholder="Enter label"
          value={labelInput.value}
          onInput={(e) => {
            labelInput.value = (e.target as HTMLInputElement).value;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleConfirm();
            if (e.key === 'Escape') {
              selectedEntry.value = null;
            }
          }}
          autoFocus
        />
        <div class="add-picker-actions">
          <button class="btn-primary" onClick={handleConfirm}>Add</button>
          <button class="btn-ghost" onClick={() => { selectedEntry.value = null; }}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div class="add-picker">
      <div class="add-picker-tabs">
        {(['layout', 'input', 'display', 'structure'] as AddCategory[]).map((cat) => (
          <button
            key={cat}
            class={`add-picker-tab ${activeCategory.value === cat ? 'active' : ''}`}
            onClick={() => {
              activeCategory.value = cat;
            }}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>
      <div class="add-picker-grid">
        {catalog[activeCategory.value].map((e) => (
          <button
            key={e.component}
            class="add-picker-option"
            onClick={() => handleEntryClick(e)}
          >
            {e.label}
          </button>
        ))}
      </div>
      <div class="add-picker-actions">
        <button class="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
