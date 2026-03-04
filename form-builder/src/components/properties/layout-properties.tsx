import { ComponentPropsEditor } from './component-props-editor';
import { componentDoc, componentVersion, setComponentDoc } from '../../state/project';
import { updateNodeProps } from '../../logic/component-tree-ops';
import type { ComponentNode } from '../../types';

export function LayoutProperties({ node, path }: { node: ComponentNode; path: string }) {
  componentVersion.value;

  function handleBaseChange(name: string, value: unknown) {
    const doc = componentDoc.value;
    if (!doc) return;
    const newTree = updateNodeProps(doc.tree, path, { [name]: value || undefined });
    setComponentDoc({ ...doc, tree: newTree });
  }

  return (
    <div class="properties-content">
      <div class="properties-section-title">{node.component}</div>

      <div class="section-title">Base Properties</div>
      <div class="property-row">
        <label class="property-label">When</label>
        <input
          class="studio-input studio-input-mono"
          type="text"
          value={String(node.when ?? '')}
          placeholder="FEL visibility expression"
          onBlur={(e) => handleBaseChange('when', (e.target as HTMLInputElement).value)}
        />
      </div>
      <div class="property-row">
        <label class="property-label">CSS Class</label>
        <input
          class="studio-input"
          type="text"
          value={String(node.cssClass ?? '')}
          placeholder="custom-class"
          onBlur={(e) => handleBaseChange('cssClass', (e.target as HTMLInputElement).value)}
        />
      </div>

      <div class="section-title">Component Properties</div>
      <ComponentPropsEditor node={node} path={path} />
    </div>
  );
}
