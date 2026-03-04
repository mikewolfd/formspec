import type { FormspecDefinition, FormspecItem } from 'formspec-engine';
import type { ComponentNode, NodeKind } from '../types';

// --- DataType → Component mapping ---

const DATA_TYPE_COMPONENT: Record<string, string> = {
  string: 'TextInput',
  text: 'TextInput',
  integer: 'NumberInput',
  decimal: 'NumberInput',
  number: 'NumberInput',
  boolean: 'Toggle',
  date: 'DatePicker',
  dateTime: 'DatePicker',
  time: 'DatePicker',
  uri: 'TextInput',
  attachment: 'FileUpload',
  choice: 'Select',
  multiChoice: 'CheckboxGroup',
  money: 'MoneyInput',
};

// --- Component classification ---

const LAYOUT_COMPONENTS = new Set([
  'Stack', 'Grid', 'Page', 'Wizard', 'Columns', 'Tabs', 'Accordion',
]);

const INPUT_COMPONENTS = new Set([
  'TextInput', 'NumberInput', 'DatePicker', 'Select', 'CheckboxGroup',
  'Toggle', 'FileUpload', 'RadioGroup', 'MoneyInput', 'Slider', 'Rating', 'Signature',
]);

const DISPLAY_COMPONENTS = new Set([
  'Heading', 'Text', 'Summary', 'ValidationSummary', 'ProgressBar', 'DataTable',
]);

const CONTAINER_COMPONENTS = new Set([
  'Card', 'Collapsible', 'ConditionalGroup', 'Panel', 'Modal', 'Popover',
]);

export function classifyNode(node: ComponentNode): NodeKind {
  const { component, bind } = node;

  // A container or layout with a bind is a group wrapper
  if (bind && (CONTAINER_COMPONENTS.has(component) || LAYOUT_COMPONENTS.has(component))) {
    return 'group';
  }

  if (LAYOUT_COMPONENTS.has(component)) return 'layout';
  if (INPUT_COMPONENTS.has(component) && bind) return 'bound-input';
  if (DISPLAY_COMPONENTS.has(component) && bind) return 'bound-display';
  if (CONTAINER_COMPONENTS.has(component)) return 'layout'; // unbound container = layout

  return 'structure-only';
}

// --- Tree navigation ---

export function resolveNode(tree: ComponentNode, path: string): ComponentNode | null {
  if (path === '') return tree;
  const indices = path.split('.').map(Number);
  let current: ComponentNode = tree;
  for (const idx of indices) {
    if (!current.children || idx < 0 || idx >= current.children.length) return null;
    current = current.children[idx];
  }
  return current;
}

export function parentPath(path: string): string {
  const lastDot = path.lastIndexOf('.');
  return lastDot === -1 ? '' : path.substring(0, lastDot);
}

export function childIndex(path: string): number {
  const lastDot = path.lastIndexOf('.');
  return Number(lastDot === -1 ? path : path.substring(lastDot + 1));
}

// --- Label resolution ---

export function getNodeLabel(
  node: ComponentNode,
  definitionItems: FormspecItem[],
): string {
  // Check title prop (Page, Card, Collapsible, etc.)
  if (typeof node.title === 'string' && node.title) return node.title;

  // Check bound definition item
  if (node.bind) {
    const item = findItemByKeyFlat(node.bind, definitionItems);
    if (item?.label) return item.label;
  }

  // Fallback to component name
  return node.component;
}

function findItemByKeyFlat(key: string, items: FormspecItem[]): FormspecItem | null {
  for (const item of items) {
    if (item.key === key) return item;
    if (item.children) {
      const found = findItemByKeyFlat(key, item.children);
      if (found) return found;
    }
  }
  return null;
}

// --- Component tree generation from definition ---

function itemToNode(item: FormspecItem): ComponentNode {
  if (item.type === 'display') {
    return { component: 'Text', bind: item.key };
  }
  if (item.type === 'group') {
    const children = (item.children ?? []).map(itemToNode);
    return { component: 'Card', bind: item.key, title: item.label || item.key, children };
  }
  const component = DATA_TYPE_COMPONENT[item.dataType ?? 'string'] ?? 'TextInput';
  return { component, bind: item.key };
}

export function generateComponentTree(definition: FormspecDefinition): ComponentNode {
  const pageMode = (definition as Record<string, unknown>).formPresentation as
    | { pageMode?: string }
    | undefined;
  const isWizard = pageMode?.pageMode === 'wizard';

  const children = definition.items.map((item) => {
    if (isWizard && item.type === 'group') {
      const pageChildren = (item.children ?? []).map(itemToNode);
      return { component: 'Page', title: item.label, bind: item.key, children: pageChildren } as ComponentNode;
    }
    return itemToNode(item);
  });

  return {
    component: isWizard ? 'Wizard' : 'Stack',
    children,
  };
}
