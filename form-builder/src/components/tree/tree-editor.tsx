import { definition, definitionVersion } from '../../state/definition';
import { componentDoc, componentVersion, setComponentDoc } from '../../state/project';
import { addPickerState, selectedPath } from '../../state/selection';
import { insertNode } from '../../logic/component-tree-ops';
import { draggedPath, dropTarget, executeDrop } from './drag-drop';
import { UnifiedTreeNode } from './tree-node';
import { AddPicker } from './add-picker';
import type { ComponentNode } from '../../types';

export function TreeEditor() {
  // Subscribe to both versions to re-render on changes
  definitionVersion.value;
  componentVersion.value;

  const doc = componentDoc.value;
  const def = definition.value;
  const rootSelected = selectedPath.value === '';
  const picker = addPickerState.value;

  if (!doc) {
    return (
      <div class="tree-editor" role="tree" aria-label="Component tree">
        <div class="tree-empty">No component tree loaded</div>
      </div>
    );
  }

  const rootNode = doc.tree;

  function handleAdd(node: ComponentNode) {
    if (!picker || !doc) return;
    const newTree = insertNode(doc.tree, picker.parentPath, picker.insertIndex, node);
    setComponentDoc({ ...doc, tree: newTree });
    // Select the new node
    const newPath = picker.parentPath
      ? `${picker.parentPath}.${picker.insertIndex}`
      : String(picker.insertIndex);
    selectedPath.value = newPath;
    addPickerState.value = null;
  }

  return (
    <div class="tree-editor" role="tree" aria-label="Component tree">
      <div
        class={`tree-header ${rootSelected ? 'selected' : ''}`}
        onClick={() => {
          selectedPath.value = '';
        }}
        role="treeitem"
        aria-level={1}
        aria-selected={rootSelected}
        tabIndex={0}
      >
        <span class="tree-header-dot" />
        <span class="tree-header-title">{def.title || 'Untitled Form'}</span>
        <span class="tree-header-meta">
          {def.url} · v{def.version}
        </span>
      </div>

      {rootNode.children?.map((child, index) => (
        <div key={`${index}-${child.component}`}>
          {picker && picker.parentPath === '' && picker.insertIndex === index && (
            <AddPicker
              parentPath={picker.parentPath}
              insertIndex={picker.insertIndex}
              onAdd={handleAdd}
              onCancel={() => { addPickerState.value = null; }}
            />
          )}
          <UnifiedTreeNode
            node={child}
            path={String(index)}
            depth={0}
          />
        </div>
      ))}

      {picker && picker.parentPath === '' && picker.insertIndex === (rootNode.children?.length ?? 0) && (
        <AddPicker
          parentPath={picker.parentPath}
          insertIndex={picker.insertIndex}
          onAdd={handleAdd}
          onCancel={() => { addPickerState.value = null; }}
        />
      )}

      {/* Root-level drop zone for reordering to end of root children */}
      {draggedPath.value && (
        <div
          class={`tree-root-drop-zone ${dropTarget.value?.parentPath === '' && dropTarget.value?.mode === 'below' && dropTarget.value?.insertIndex === (rootNode.children?.length ?? 0) ? 'drop-active' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer!.dropEffect = 'move';
            dropTarget.value = { parentPath: '', insertIndex: rootNode.children?.length ?? 0, mode: 'below' };
          }}
          onDrop={(event) => {
            event.preventDefault();
            executeDrop();
          }}
        />
      )}

      <div class="tree-add-root">
        <button
          class="tree-add-btn"
          aria-label="Add component"
          onClick={() => {
            addPickerState.value = { parentPath: '', insertIndex: rootNode.children?.length ?? 0 };
          }}
        >
          + Add Component
        </button>
      </div>
    </div>
  );
}
