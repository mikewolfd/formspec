import type { FormspecDefinition, FormspecItem } from 'formspec-engine';
import type { BuilderProject } from '../types';

type GenericRecord = Record<string, unknown>;

function asRecord(value: unknown): GenericRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as GenericRecord;
}

function buildTheme(definition: FormspecDefinition): GenericRecord {
  return {
    $formspecTheme: '1.0',
    version: '1.0.0',
    targetDefinition: { url: definition.url },
    tokens: {},
    defaults: {},
    selectors: [],
    items: {},
  };
}

function buildComponent(definition: FormspecDefinition): GenericRecord {
  return {
    $formspecComponent: '1.0',
    version: '1.0.0',
    targetDefinition: { url: definition.url },
    tree: generateBaselineComponent(definition),
  };
}

export function ensureThemeDocument(project: BuilderProject, definition: FormspecDefinition): GenericRecord {
  return asRecord(project.theme).$formspecTheme === '1.0'
    ? asRecord(project.theme)
    : buildTheme(definition);
}

export function ensureComponentDocument(
  project: BuilderProject,
  definition: FormspecDefinition,
): GenericRecord {
  return asRecord(project.component).$formspecComponent === '1.0'
    ? asRecord(project.component)
    : buildComponent(definition);
}

export function setThemeWidget(project: BuilderProject, definition: FormspecDefinition, key: string, widget: string): BuilderProject {
  const theme = ensureThemeDocument(project, definition);
  const items = asRecord(theme.items);
  const existing = asRecord(items[key]);
  items[key] = { ...existing, widget };
  return { ...project, theme: { ...theme, items } };
}

export function setThemeWidgetConfig(
  project: BuilderProject,
  definition: FormspecDefinition,
  key: string,
  configKey: string,
  value: unknown,
): BuilderProject {
  const theme = ensureThemeDocument(project, definition);
  const items = asRecord(theme.items);
  const existing = asRecord(items[key]);
  const widgetConfig = asRecord(existing.widgetConfig);
  if (value === '' || value === null || value === undefined) {
    delete widgetConfig[configKey];
  } else {
    widgetConfig[configKey] = value;
  }
  items[key] = { ...existing, widgetConfig };
  return { ...project, theme: { ...theme, items } };
}

function findComponentOverride(tree: unknown, key: string): string | null {
  const node = asRecord(tree);
  if (node.bind === key && typeof node.component === 'string') {
    return node.component;
  }
  const children = Array.isArray(node.children) ? node.children : [];
  for (const child of children) {
    const found = findComponentOverride(child, key);
    if (found) return found;
  }
  return null;
}

export function getEffectiveWidget(item: FormspecItem, project: BuilderProject): { widget: string | null; source: 'component' | 'theme' | 'definition' | 'renderer-default' } {
  const componentWidget = findComponentOverride(asRecord(project.component).tree, item.key);
  if (componentWidget) {
    return { widget: componentWidget, source: 'component' };
  }
  const themeItem = asRecord(asRecord(asRecord(project.theme).items)[item.key]);
  if (typeof themeItem.widget === 'string' && themeItem.widget) {
    return { widget: themeItem.widget, source: 'theme' };
  }
  const presentation = asRecord((item as GenericRecord).presentation);
  if (typeof presentation.widgetHint === 'string' && presentation.widgetHint) {
    return { widget: presentation.widgetHint, source: 'definition' };
  }
  return { widget: null, source: 'renderer-default' };
}

const DATA_TYPE_COMPONENT: Record<string, string> = {
  string: 'TextInput',
  text: 'Textarea',
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
  money: 'NumberInput',
};

function itemToComponentNode(item: FormspecItem): GenericRecord {
  if (item.type === 'display') {
    return { component: 'Text', bind: item.key };
  }
  if (item.type === 'group') {
    const children = (item.children ?? []).map(itemToComponentNode);
    return { component: 'Stack', bind: item.key, children };
  }
  const component = DATA_TYPE_COMPONENT[item.dataType ?? 'string'] ?? 'TextInput';
  return { bind: item.key, component };
}

export function generateBaselineComponent(definition: FormspecDefinition): GenericRecord {
  const pageMode = (definition.formPresentation as GenericRecord)?.pageMode;
  const isWizard = pageMode === 'wizard';

  const children = definition.items.map((item) => {
    if (isWizard && item.type === 'group') {
      const pageChildren = (item.children ?? []).map(itemToComponentNode);
      return { component: 'Page', bind: item.key, children: pageChildren };
    }
    return itemToComponentNode(item);
  });

  return {
    component: isWizard ? 'Wizard' : 'Stack',
    children,
  };
}

export function getThemeWidgetConfig(
  project: BuilderProject,
  key: string,
  configKey: string,
): unknown {
  const themeItems = asRecord(asRecord(project.theme).items);
  const item = asRecord(themeItems[key]);
  const widgetConfig = asRecord(item.widgetConfig);
  return widgetConfig[configKey];
}

// --- Token helpers ---

export function getThemeTokens(project: BuilderProject): Record<string, string> {
  const tokens = asRecord(asRecord(project.theme).tokens);
  return tokens as Record<string, string>;
}

export function setThemeToken(project: BuilderProject, definition: FormspecDefinition, key: string, value: string): BuilderProject {
  const theme = ensureThemeDocument(project, definition);
  const tokens = { ...asRecord(theme.tokens), [key]: value };
  return { ...project, theme: { ...theme, tokens } };
}

export function removeThemeToken(project: BuilderProject, definition: FormspecDefinition, key: string): BuilderProject {
  const theme = ensureThemeDocument(project, definition);
  const tokens = { ...asRecord(theme.tokens) };
  delete tokens[key];
  return { ...project, theme: { ...theme, tokens } };
}

// --- Selector helpers ---

export function getThemeSelectors(project: BuilderProject): Array<{ match: GenericRecord; apply: GenericRecord }> {
  const selectors = asRecord(project.theme).selectors;
  if (!Array.isArray(selectors)) return [];
  return selectors as Array<{ match: GenericRecord; apply: GenericRecord }>;
}

export function addThemeSelector(
  project: BuilderProject,
  definition: FormspecDefinition,
  match: GenericRecord,
  apply: GenericRecord,
): BuilderProject {
  const theme = ensureThemeDocument(project, definition);
  const selectors = Array.isArray(theme.selectors) ? [...(theme.selectors as unknown[])] : [];
  selectors.push({ match, apply });
  return { ...project, theme: { ...theme, selectors } };
}

// --- Component widget helpers ---

function updateComponentNode(tree: GenericRecord, key: string, widget: string): GenericRecord {
  const children = Array.isArray(tree.children) ? (tree.children as GenericRecord[]) : [];
  const idx = children.findIndex((c) => c.bind === key);
  if (!widget) {
    // Remove the node
    if (idx >= 0) {
      return { ...tree, children: children.filter((_, i) => i !== idx) };
    }
    return tree;
  }
  if (idx >= 0) {
    const updated = [...children];
    updated[idx] = { ...updated[idx], component: widget };
    return { ...tree, children: updated };
  }
  return { ...tree, children: [...children, { bind: key, component: widget }] };
}

export function setComponentWidget(
  project: BuilderProject,
  definition: FormspecDefinition,
  key: string,
  widget: string,
): BuilderProject {
  const comp = ensureComponentDocument(project, definition);
  const tree = updateComponentNode(asRecord(comp.tree), key, widget);
  return { ...project, component: { ...comp, tree } };
}

export function removeThemeSelector(
  project: BuilderProject,
  definition: FormspecDefinition,
  index: number,
): BuilderProject {
  const theme = ensureThemeDocument(project, definition);
  const selectors = Array.isArray(theme.selectors) ? [...(theme.selectors as unknown[])] : [];
  selectors.splice(index, 1);
  return { ...project, theme: { ...theme, selectors } };
}
