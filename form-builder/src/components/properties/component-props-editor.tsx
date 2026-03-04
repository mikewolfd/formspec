import { getComponentPropertyDefs } from '../../logic/component-schema-registry';
import { componentDoc, componentVersion, setComponentDoc } from '../../state/project';
import { updateNodeProps } from '../../logic/component-tree-ops';
import type { ComponentNode } from '../../types';

interface ComponentPropsEditorProps {
  node: ComponentNode;
  path: string;
}

export function ComponentPropsEditor({ node, path }: ComponentPropsEditorProps) {
  componentVersion.value;
  const propDefs = getComponentPropertyDefs(node.component);

  if (propDefs.length === 0) {
    return <div class="properties-empty-section">No configurable properties</div>;
  }

  function handleChange(name: string, value: unknown) {
    const doc = componentDoc.value;
    if (!doc) return;
    const newTree = updateNodeProps(doc.tree, path, { [name]: value });
    setComponentDoc({ ...doc, tree: newTree });
  }

  return (
    <div class="component-props">
      {propDefs.map((prop) => (
        <div key={prop.name} class="property-row">
          <label class="property-label">{prop.name}</label>
          {renderEditor(prop, node[prop.name], (val) => handleChange(prop.name, val))}
        </div>
      ))}
    </div>
  );
}

function renderEditor(
  prop: { name: string; type: string; enum?: string[]; minimum?: number; maximum?: number },
  value: unknown,
  onChange: (val: unknown) => void,
) {
  if (prop.enum) {
    return (
      <select
        class="studio-select"
        value={String(value ?? '')}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value || undefined)}
      >
        <option value="">—</option>
        {prop.enum.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (prop.type === 'boolean') {
    return (
      <select
        class="studio-select"
        value={value === true ? 'true' : value === false ? 'false' : ''}
        onChange={(e) => {
          const v = (e.target as HTMLSelectElement).value;
          onChange(v === 'true' ? true : v === 'false' ? false : undefined);
        }}
      >
        <option value="">—</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  if (prop.type === 'integer' || prop.type === 'number') {
    return (
      <input
        class="studio-input"
        type="number"
        value={value != null ? String(value) : ''}
        min={prop.minimum}
        max={prop.maximum}
        step={prop.type === 'integer' ? 1 : 'any'}
        onBlur={(e) => {
          const v = (e.target as HTMLInputElement).value;
          onChange(v ? Number(v) : undefined);
        }}
      />
    );
  }

  // Default: string input
  return (
    <input
      class="studio-input"
      type="text"
      value={String(value ?? '')}
      onBlur={(e) => {
        const v = (e.target as HTMLInputElement).value;
        onChange(v || undefined);
      }}
    />
  );
}
