import { describe, expect, it } from 'vitest';
import type { FormspecItem } from 'formspec-engine';
import type { BuilderProject } from '../../types';
import {
  addThemeSelector,
  ensureComponentDocument,
  ensureThemeDocument,
  generateBaselineComponent,
  getEffectiveWidget,
  getThemeSelectors,
  getThemeTokens,
  getThemeWidgetConfig,
  removeThemeSelector,
  removeThemeToken,
  setComponentWidget,
  setThemeToken,
  setThemeWidget,
  setThemeWidgetConfig,
} from '../presentation-docs';

function baseDef() {
  return {
    $formspec: '1.0' as const,
    url: 'https://example.gov/forms/test',
    version: '1.0.0',
    status: 'draft' as const,
    title: 'Test Form',
    items: [
      { key: 'name', type: 'field' as const, label: 'Name', dataType: 'string' as const },
      { key: 'age', type: 'field' as const, label: 'Age', dataType: 'integer' as const },
    ],
  };
}

function emptyProject(): BuilderProject {
  return {
    definition: baseDef(),
    previousDefinitions: [],
    theme: null,
    component: null,
    mappings: [],
    registries: [],
    changelogs: [],
    library: [],
  };
}

describe('ensureThemeDocument', () => {
  it('creates a new theme document when theme is null', () => {
    const project = emptyProject();
    const theme = ensureThemeDocument(project, baseDef());
    expect(theme.$formspecTheme).toBe('1.0');
    expect(theme.version).toBe('1.0.0');
    expect((theme.targetDefinition as Record<string, unknown>).url).toBe('https://example.gov/forms/test');
    expect(theme.tokens).toEqual({});
    expect(theme.items).toEqual({});
  });

  it('returns existing theme if valid', () => {
    const existing = { $formspecTheme: '1.0', version: '2.0.0', tokens: { primary: '#333' }, items: {} };
    const project = { ...emptyProject(), theme: existing };
    const theme = ensureThemeDocument(project, baseDef());
    expect(theme.version).toBe('2.0.0');
    expect((theme.tokens as Record<string, string>).primary).toBe('#333');
  });
});

describe('ensureComponentDocument', () => {
  it('creates a new component document with baseline tree when component is null', () => {
    const project = emptyProject();
    const comp = ensureComponentDocument(project, baseDef());
    expect(comp.$formspecComponent).toBe('1.0');
    expect(comp.version).toBe('1.0.0');
    const tree = comp.tree as Record<string, unknown>;
    expect(tree.component).toBe('Stack');
    const children = tree.children as Record<string, unknown>[];
    expect(children).toHaveLength(2);
    expect(children[0]).toEqual({ bind: 'name', component: 'TextInput' });
    expect(children[1]).toEqual({ bind: 'age', component: 'NumberInput' });
  });

  it('returns existing component if valid', () => {
    const existing = {
      $formspecComponent: '1.0',
      version: '2.0.0',
      tree: { component: 'Wizard', children: [{ bind: 'name', component: 'TextInput' }] },
    };
    const project = { ...emptyProject(), component: existing };
    const comp = ensureComponentDocument(project, baseDef());
    expect(comp.version).toBe('2.0.0');
    expect((comp.tree as Record<string, unknown>).component).toBe('Wizard');
  });
});

describe('setThemeWidget', () => {
  it('sets widget on a new theme when theme is null', () => {
    const project = emptyProject();
    const updated = setThemeWidget(project, baseDef(), 'name', 'TextInput');
    const items = (updated.theme as Record<string, unknown>).items as Record<string, Record<string, unknown>>;
    expect(items.name.widget).toBe('TextInput');
  });

  it('updates widget on existing theme item', () => {
    const project = {
      ...emptyProject(),
      theme: {
        $formspecTheme: '1.0',
        items: { name: { widget: 'TextInput', widgetConfig: { rows: 3 } } },
      },
    };
    const updated = setThemeWidget(project, baseDef(), 'name', 'Textarea');
    const items = (updated.theme as Record<string, unknown>).items as Record<string, Record<string, unknown>>;
    expect(items.name.widget).toBe('Textarea');
    expect(items.name.widgetConfig).toEqual({ rows: 3 });
  });
});

describe('setThemeWidgetConfig', () => {
  it('sets a config key', () => {
    const project = emptyProject();
    const updated = setThemeWidgetConfig(project, baseDef(), 'age', 'min', 0);
    expect(getThemeWidgetConfig(updated, 'age', 'min')).toBe(0);
  });

  it('removes a config key when value is empty', () => {
    const project = {
      ...emptyProject(),
      theme: {
        $formspecTheme: '1.0',
        items: { age: { widgetConfig: { min: 0, max: 100 } } },
      },
    };
    const updated = setThemeWidgetConfig(project, baseDef(), 'age', 'min', undefined);
    expect(getThemeWidgetConfig(updated, 'age', 'min')).toBeUndefined();
    expect(getThemeWidgetConfig(updated, 'age', 'max')).toBe(100);
  });
});

describe('getEffectiveWidget', () => {
  const field: FormspecItem = { key: 'name', type: 'field', label: 'Name', dataType: 'string' };

  it('returns renderer-default when no overrides', () => {
    const result = getEffectiveWidget(field, emptyProject());
    expect(result).toEqual({ widget: null, source: 'renderer-default' });
  });

  it('returns definition tier when item has presentation.widgetHint', () => {
    const itemWithHint = { ...field, presentation: { widgetHint: 'Textarea' } } as FormspecItem;
    const result = getEffectiveWidget(itemWithHint, emptyProject());
    expect(result).toEqual({ widget: 'Textarea', source: 'definition' });
  });

  it('returns theme tier when theme overrides field widget', () => {
    const project = {
      ...emptyProject(),
      theme: { $formspecTheme: '1.0', items: { name: { widget: 'NumberInput' } } },
    };
    const result = getEffectiveWidget(field, project);
    expect(result).toEqual({ widget: 'NumberInput', source: 'theme' });
  });

  it('theme overrides definition presentation hint', () => {
    const itemWithHint = { ...field, presentation: { widgetHint: 'Textarea' } } as FormspecItem;
    const project = {
      ...emptyProject(),
      theme: { $formspecTheme: '1.0', items: { name: { widget: 'NumberInput' } } },
    };
    const result = getEffectiveWidget(itemWithHint, project);
    expect(result).toEqual({ widget: 'NumberInput', source: 'theme' });
  });

  it('returns component tier when component tree binds field', () => {
    const project = {
      ...emptyProject(),
      component: {
        $formspecComponent: '1.0',
        tree: {
          component: 'Stack',
          children: [{ bind: 'name', component: 'Select' }],
        },
      },
    };
    const result = getEffectiveWidget(field, project);
    expect(result).toEqual({ widget: 'Select', source: 'component' });
  });

  it('component overrides theme', () => {
    const project = {
      ...emptyProject(),
      theme: { $formspecTheme: '1.0', items: { name: { widget: 'NumberInput' } } },
      component: {
        $formspecComponent: '1.0',
        tree: {
          component: 'Stack',
          children: [{ bind: 'name', component: 'Select' }],
        },
      },
    };
    const result = getEffectiveWidget(field, project);
    expect(result).toEqual({ widget: 'Select', source: 'component' });
  });

  it('finds nested component override', () => {
    const project = {
      ...emptyProject(),
      component: {
        $formspecComponent: '1.0',
        tree: {
          component: 'Stack',
          children: [
            {
              component: 'Page',
              children: [{ bind: 'name', component: 'Textarea' }],
            },
          ],
        },
      },
    };
    const result = getEffectiveWidget(field, project);
    expect(result).toEqual({ widget: 'Textarea', source: 'component' });
  });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTree = any;

describe('generateBaselineComponent', () => {
  it('generates a Stack root for a flat definition (no pageMode)', () => {
    const def = baseDef();
    const tree: AnyTree = generateBaselineComponent(def);
    expect(tree.component).toBe('Stack');
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0]).toEqual({ bind: 'name', component: 'TextInput' });
    expect(tree.children[1]).toEqual({ bind: 'age', component: 'NumberInput' });
  });

  it('generates a Wizard root with Page children when pageMode is wizard', () => {
    const def = {
      ...baseDef(),
      formPresentation: { pageMode: 'wizard' },
      items: [
        { key: 'info', type: 'group' as const, label: 'Info', page: 'Step 1', children: [
          { key: 'name', type: 'field' as const, label: 'Name', dataType: 'string' as const },
        ]},
        { key: 'review', type: 'group' as const, label: 'Review', page: 'Step 2', children: [
          { key: 'notes', type: 'field' as const, label: 'Notes', dataType: 'text' as const },
        ]},
      ],
    };
    const tree: AnyTree = generateBaselineComponent(def);
    expect(tree.component).toBe('Wizard');
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0].component).toBe('Page');
    expect(tree.children[0].bind).toBe('info');
    expect(tree.children[0].children[0]).toEqual({ bind: 'name', component: 'TextInput' });
    expect(tree.children[1].component).toBe('Page');
    expect(tree.children[1].bind).toBe('review');
    expect(tree.children[1].children[0]).toEqual({ bind: 'notes', component: 'Textarea' });
  });

  it('maps dataType to correct default component', () => {
    const def = {
      ...baseDef(),
      items: [
        { key: 'a', type: 'field' as const, label: 'A', dataType: 'string' as const },
        { key: 'b', type: 'field' as const, label: 'B', dataType: 'text' as const },
        { key: 'c', type: 'field' as const, label: 'C', dataType: 'integer' as const },
        { key: 'd', type: 'field' as const, label: 'D', dataType: 'decimal' as const },
        { key: 'e', type: 'field' as const, label: 'E', dataType: 'boolean' as const },
        { key: 'f', type: 'field' as const, label: 'F', dataType: 'date' as const },
        { key: 'g', type: 'field' as const, label: 'G', dataType: 'choice' as const },
        { key: 'h', type: 'field' as const, label: 'H', dataType: 'multiChoice' as const },
        { key: 'i', type: 'field' as const, label: 'I', dataType: 'attachment' as const },
        { key: 'j', type: 'field' as const, label: 'J', dataType: 'money' as const },
      ],
    };
    const tree: AnyTree = generateBaselineComponent(def);
    const components = tree.children.map((c: AnyTree) => c.component);
    expect(components).toEqual([
      'TextInput', 'Textarea', 'NumberInput', 'NumberInput',
      'Toggle', 'DatePicker', 'Select', 'CheckboxGroup',
      'FileUpload', 'NumberInput',
    ]);
  });

  it('wraps group children in a Stack container with bind', () => {
    const def = {
      ...baseDef(),
      items: [
        { key: 'contact', type: 'group' as const, label: 'Contact', children: [
          { key: 'email', type: 'field' as const, label: 'Email', dataType: 'string' as const },
          { key: 'phone', type: 'field' as const, label: 'Phone', dataType: 'string' as const },
        ]},
      ],
    };
    const tree: AnyTree = generateBaselineComponent(def);
    expect(tree.children).toHaveLength(1);
    const group = tree.children[0];
    expect(group.component).toBe('Stack');
    expect(group.bind).toBe('contact');
    expect(group.children).toHaveLength(2);
    expect(group.children[0]).toEqual({ bind: 'email', component: 'TextInput' });
  });

  it('handles display items as Text components', () => {
    const def = {
      ...baseDef(),
      items: [
        { key: 'notice', type: 'display' as const, label: 'Important Notice' },
        { key: 'name', type: 'field' as const, label: 'Name', dataType: 'string' as const },
      ],
    };
    const tree: AnyTree = generateBaselineComponent(def);
    expect(tree.children).toHaveLength(2);
    expect(tree.children[0]).toEqual({ component: 'Text', bind: 'notice' });
  });

  it('handles nested groups recursively', () => {
    const def = {
      ...baseDef(),
      items: [
        { key: 'outer', type: 'group' as const, label: 'Outer', children: [
          { key: 'inner', type: 'group' as const, label: 'Inner', children: [
            { key: 'deep', type: 'field' as const, label: 'Deep', dataType: 'integer' as const },
          ]},
        ]},
      ],
    };
    const tree: AnyTree = generateBaselineComponent(def);
    const outer = tree.children[0];
    expect(outer.component).toBe('Stack');
    expect(outer.bind).toBe('outer');
    const inner = outer.children[0];
    expect(inner.component).toBe('Stack');
    expect(inner.bind).toBe('inner');
    expect(inner.children[0]).toEqual({ bind: 'deep', component: 'NumberInput' });
  });

  it('returns Stack root for empty items', () => {
    const def = { ...baseDef(), items: [] };
    const tree: AnyTree = generateBaselineComponent(def);
    expect(tree.component).toBe('Stack');
    expect(tree.children).toEqual([]);
  });
});

describe('theme token helpers', () => {
  it('getThemeTokens returns empty object when no theme', () => {
    expect(getThemeTokens(emptyProject())).toEqual({});
  });

  it('setThemeToken sets a token value', () => {
    const p = setThemeToken(emptyProject(), baseDef(), 'color.primary', '#0057B7');
    expect(getThemeTokens(p)).toEqual({ 'color.primary': '#0057B7' });
  });

  it('setThemeToken updates an existing token', () => {
    let p = setThemeToken(emptyProject(), baseDef(), 'color.primary', '#0057B7');
    p = setThemeToken(p, baseDef(), 'color.primary', '#FF0000');
    expect(getThemeTokens(p)).toEqual({ 'color.primary': '#FF0000' });
  });

  it('removeThemeToken removes a token', () => {
    let p = setThemeToken(emptyProject(), baseDef(), 'color.primary', '#0057B7');
    p = setThemeToken(p, baseDef(), 'spacing.sm', '8px');
    p = removeThemeToken(p, baseDef(), 'color.primary');
    expect(getThemeTokens(p)).toEqual({ 'spacing.sm': '8px' });
  });

  it('removeThemeToken is a no-op for missing key', () => {
    const p = setThemeToken(emptyProject(), baseDef(), 'color.primary', '#0057B7');
    const p2 = removeThemeToken(p, baseDef(), 'nonexistent');
    expect(getThemeTokens(p2)).toEqual({ 'color.primary': '#0057B7' });
  });
});

describe('theme selector helpers', () => {
  it('getThemeSelectors returns empty array when no theme', () => {
    expect(getThemeSelectors(emptyProject())).toEqual([]);
  });

  it('addThemeSelector adds a selector', () => {
    const p = addThemeSelector(emptyProject(), baseDef(), { dataType: 'money' }, { widget: 'MoneyInput' });
    const selectors = getThemeSelectors(p);
    expect(selectors).toHaveLength(1);
    expect(selectors[0].match).toEqual({ dataType: 'money' });
    expect(selectors[0].apply).toEqual({ widget: 'MoneyInput' });
  });

  it('addThemeSelector appends to existing selectors', () => {
    let p = addThemeSelector(emptyProject(), baseDef(), { dataType: 'money' }, { widget: 'MoneyInput' });
    p = addThemeSelector(p, baseDef(), { dataType: 'boolean' }, { widget: 'Toggle' });
    expect(getThemeSelectors(p)).toHaveLength(2);
  });

  it('removeThemeSelector removes by index', () => {
    let p = addThemeSelector(emptyProject(), baseDef(), { dataType: 'money' }, { widget: 'MoneyInput' });
    p = addThemeSelector(p, baseDef(), { dataType: 'boolean' }, { widget: 'Toggle' });
    p = removeThemeSelector(p, baseDef(), 0);
    const selectors = getThemeSelectors(p);
    expect(selectors).toHaveLength(1);
    expect(selectors[0].match).toEqual({ dataType: 'boolean' });
  });
});

describe('setComponentWidget', () => {
  it('sets widget on an existing component tree node', () => {
    const project = {
      ...emptyProject(),
      component: {
        $formspecComponent: '1.0',
        tree: {
          component: 'Stack',
          children: [{ bind: 'name', component: 'TextInput' }],
        },
      },
    };
    const updated = setComponentWidget(project, baseDef(), 'name', 'Select');
    const tree = (updated.component as Record<string, unknown>).tree as Record<string, unknown>;
    const children = tree.children as Record<string, unknown>[];
    expect(children[0].component).toBe('Select');
  });

  it('adds a new node when field is not in the component tree', () => {
    const project = {
      ...emptyProject(),
      component: {
        $formspecComponent: '1.0',
        tree: {
          component: 'Stack',
          children: [{ bind: 'name', component: 'TextInput' }],
        },
      },
    };
    const updated = setComponentWidget(project, baseDef(), 'age', 'NumberInput');
    const tree = (updated.component as Record<string, unknown>).tree as Record<string, unknown>;
    const children = tree.children as Record<string, unknown>[];
    expect(children).toHaveLength(2);
    expect(children[1]).toEqual({ bind: 'age', component: 'NumberInput' });
  });

  it('creates component doc with baseline when component is null', () => {
    const updated = setComponentWidget(emptyProject(), baseDef(), 'name', 'Textarea');
    expect(updated.component).toBeTruthy();
    const tree = (updated.component as Record<string, unknown>).tree as Record<string, unknown>;
    const children = tree.children as Record<string, unknown>[];
    const nameNode = children.find((c) => c.bind === 'name');
    expect(nameNode).toBeTruthy();
    expect(nameNode!.component).toBe('Textarea');
  });

  it('removes component override when widget is empty', () => {
    const project = {
      ...emptyProject(),
      component: {
        $formspecComponent: '1.0',
        tree: {
          component: 'Stack',
          children: [
            { bind: 'name', component: 'TextInput' },
            { bind: 'age', component: 'NumberInput' },
          ],
        },
      },
    };
    const updated = setComponentWidget(project, baseDef(), 'name', '');
    const tree = (updated.component as Record<string, unknown>).tree as Record<string, unknown>;
    const children = tree.children as Record<string, unknown>[];
    expect(children).toHaveLength(1);
    expect(children[0].bind).toBe('age');
  });
});
