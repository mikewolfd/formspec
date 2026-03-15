import { describe, it, expect } from 'vitest';
import { createRawProject } from '../src/index.js';

// ── Tokens & Defaults ───────────────────────────────────────────

describe('theme.setToken', () => {
  it('sets a design token', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.setToken', payload: { key: 'color.primary', value: '#007bff' } });
    expect((project.theme as any).tokens?.['color.primary']).toBe('#007bff');
  });

  it('removes a token with null', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.setToken', payload: { key: 'x', value: '1' } });
    project.dispatch({ type: 'theme.setToken', payload: { key: 'x', value: null } });
    expect((project.theme as any).tokens?.x).toBeUndefined();
  });
});

describe('theme.setTokens', () => {
  it('batch-sets multiple tokens', () => {
    const project = createRawProject();
    project.dispatch({
      type: 'theme.setTokens',
      payload: { tokens: { 'color.bg': '#fff', 'color.fg': '#000' } },
    });
    expect((project.theme as any).tokens?.['color.bg']).toBe('#fff');
    expect((project.theme as any).tokens?.['color.fg']).toBe('#000');
  });
});

describe('theme.setDefaults', () => {
  it('sets a form-wide presentation default', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.setDefaults', payload: { property: 'labelPosition', value: 'left' } });
    expect((project.theme as any).defaults?.labelPosition).toBe('left');
  });
});

// ── Selectors ───────────────────────────────────────────────────

describe('theme.addSelector', () => {
  it('adds a selector', () => {
    const project = createRawProject();
    project.dispatch({
      type: 'theme.addSelector',
      payload: { match: { type: 'field' }, apply: { widget: 'TextInput' } },
    });
    expect((project.theme as any).selectors).toHaveLength(1);
    expect((project.theme as any).selectors[0].match.type).toBe('field');
  });
});

describe('theme.setSelector', () => {
  it('updates a selector', () => {
    const project = createRawProject();
    project.dispatch({
      type: 'theme.addSelector',
      payload: { match: { type: 'field' }, apply: { widget: 'TextInput' } },
    });
    project.dispatch({
      type: 'theme.setSelector',
      payload: { index: 0, apply: { widget: 'TextArea' } },
    });
    expect((project.theme as any).selectors[0].apply.widget).toBe('TextArea');
  });
});

describe('theme.deleteSelector', () => {
  it('removes a selector by index', () => {
    const project = createRawProject();
    project.dispatch({
      type: 'theme.addSelector',
      payload: { match: { type: 'field' }, apply: { widget: 'A' } },
    });
    project.dispatch({
      type: 'theme.addSelector',
      payload: { match: { type: 'group' }, apply: { widget: 'B' } },
    });
    project.dispatch({ type: 'theme.deleteSelector', payload: { index: 0 } });
    expect((project.theme as any).selectors).toHaveLength(1);
    expect((project.theme as any).selectors[0].apply.widget).toBe('B');
  });
});

describe('theme.reorderSelector', () => {
  it('reorders selectors', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.addSelector', payload: { match: { type: 'field' }, apply: { widget: 'A' } } });
    project.dispatch({ type: 'theme.addSelector', payload: { match: { type: 'group' }, apply: { widget: 'B' } } });
    project.dispatch({ type: 'theme.reorderSelector', payload: { index: 0, direction: 'down' } });
    expect((project.theme as any).selectors[0].apply.widget).toBe('B');
  });
});

// ── Per-Item Overrides ──────────────────────────────────────────

describe('theme.setItemOverride', () => {
  it('sets a per-item override', () => {
    const project = createRawProject();
    project.dispatch({
      type: 'theme.setItemOverride',
      payload: { itemKey: 'name', property: 'widget', value: 'TextArea' },
    });
    expect((project.theme as any).items?.name?.widget).toBe('TextArea');
  });

  it('removes property with null, cleans up empty', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.setItemOverride', payload: { itemKey: 'x', property: 'widget', value: 'A' } });
    project.dispatch({ type: 'theme.setItemOverride', payload: { itemKey: 'x', property: 'widget', value: null } });
    expect((project.theme as any).items?.x).toBeUndefined();
  });
});

describe('theme.deleteItemOverride', () => {
  it('removes entire item override', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.setItemOverride', payload: { itemKey: 'name', property: 'widget', value: 'A' } });
    project.dispatch({ type: 'theme.deleteItemOverride', payload: { itemKey: 'name' } });
    expect((project.theme as any).items?.name).toBeUndefined();
  });
});

describe('theme.setItemStyle', () => {
  it('sets a CSS property on a per-item style', () => {
    const project = createRawProject();
    project.dispatch({
      type: 'theme.setItemStyle',
      payload: { itemKey: 'f1', property: 'color', value: 'red' },
    });
    expect((project.theme as any).items?.f1?.style?.color).toBe('red');
  });
});

describe('theme.setItemWidgetConfig', () => {
  it('sets a widgetConfig property', () => {
    const project = createRawProject();
    project.dispatch({
      type: 'theme.setItemWidgetConfig',
      payload: { itemKey: 'f1', property: 'maxLength', value: 100 },
    });
    expect((project.theme as any).items?.f1?.widgetConfig?.maxLength).toBe(100);
  });
});

describe('theme.setItemAccessibility', () => {
  it('sets an accessibility property', () => {
    const project = createRawProject();
    project.dispatch({
      type: 'theme.setItemAccessibility',
      payload: { itemKey: 'f1', property: 'role', value: 'textbox' },
    });
    expect((project.theme as any).items?.f1?.accessibility?.role).toBe('textbox');
  });
});

// ── Page Layout ─────────────────────────────────────────────────

describe('theme.addPage', () => {
  it('adds a page', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.addPage', payload: { title: 'Info' } });
    expect((project.theme as any).pages).toHaveLength(1);
    expect((project.theme as any).pages[0].title).toBe('Info');
  });
});

describe('theme.setPageProperty', () => {
  it('updates a page property', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.addPage', payload: { title: 'Old' } });
    project.dispatch({ type: 'theme.setPageProperty', payload: { index: 0, property: 'title', value: 'New' } });
    expect((project.theme as any).pages[0].title).toBe('New');
  });
});

describe('theme.deletePage', () => {
  it('removes a page', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.addPage', payload: { title: 'A' } });
    project.dispatch({ type: 'theme.addPage', payload: { title: 'B' } });
    project.dispatch({ type: 'theme.deletePage', payload: { index: 0 } });
    expect((project.theme as any).pages).toHaveLength(1);
    expect((project.theme as any).pages[0].title).toBe('B');
  });

  it('throws when deleting the last page', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.addPage', payload: { title: 'Only' } });
    expect(() => project.dispatch({ type: 'theme.deletePage', payload: { index: 0 } })).toThrow();
  });
});

describe('theme.reorderPage', () => {
  it('reorders pages', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.addPage', payload: { title: 'A' } });
    project.dispatch({ type: 'theme.addPage', payload: { title: 'B' } });
    project.dispatch({ type: 'theme.reorderPage', payload: { index: 0, direction: 'down' } });
    expect((project.theme as any).pages[0].title).toBe('B');
  });
});

describe('theme.addRegion', () => {
  it('adds a region to a page', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.addPage', payload: { id: 'p1', title: 'P1' } });
    project.dispatch({
      type: 'theme.addRegion',
      payload: { pageId: 'p1', key: 'main', span: 12 },
    });
    expect((project.theme as any).pages[0].regions).toHaveLength(1);
    expect((project.theme as any).pages[0].regions[0].key).toBe('main');
  });
});

describe('theme.setRegionProperty', () => {
  it('updates a region property', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.addPage', payload: { id: 'p1', title: 'P1' } });
    project.dispatch({ type: 'theme.addRegion', payload: { pageId: 'p1', key: 'main', span: 12 } });
    project.dispatch({ type: 'theme.setRegionProperty', payload: { pageId: 'p1', regionIndex: 0, property: 'span', value: 6 } });
    expect((project.theme as any).pages[0].regions[0].span).toBe(6);
  });
});

describe('theme.deleteRegion', () => {
  it('removes a region', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.addPage', payload: { id: 'p1', title: 'P1' } });
    project.dispatch({ type: 'theme.addRegion', payload: { pageId: 'p1', key: 'a', span: 6 } });
    project.dispatch({ type: 'theme.addRegion', payload: { pageId: 'p1', key: 'b', span: 6 } });
    project.dispatch({ type: 'theme.deleteRegion', payload: { pageId: 'p1', regionIndex: 0 } });
    expect((project.theme as any).pages[0].regions).toHaveLength(1);
    expect((project.theme as any).pages[0].regions[0].key).toBe('b');
  });
});

describe('theme.reorderRegion', () => {
  it('reorders regions', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.addPage', payload: { id: 'p1', title: 'P1' } });
    project.dispatch({ type: 'theme.addRegion', payload: { pageId: 'p1', key: 'a', span: 6 } });
    project.dispatch({ type: 'theme.addRegion', payload: { pageId: 'p1', key: 'b', span: 6 } });
    project.dispatch({ type: 'theme.reorderRegion', payload: { pageId: 'p1', regionIndex: 0, direction: 'down' } });
    expect((project.theme as any).pages[0].regions[0].key).toBe('b');
  });
});

describe('theme.renamePage', () => {
  it('renames a page id', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.addPage', payload: { id: 'old', title: 'P1' } });
    project.dispatch({ type: 'theme.renamePage', payload: { pageId: 'old', newId: 'new' } });
    expect((project.theme as any).pages[0].id).toBe('new');
  });
});

describe('theme.setRegionKey', () => {
  it('changes a region key', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.addPage', payload: { id: 'p1', title: 'P1' } });
    project.dispatch({ type: 'theme.addRegion', payload: { pageId: 'p1', key: 'old', span: 12 } });
    project.dispatch({ type: 'theme.setRegionKey', payload: { pageId: 'p1', regionIndex: 0, newKey: 'renamed' } });
    expect((project.theme as any).pages[0].regions[0].key).toBe('renamed');
  });
});

describe('theme.setPages', () => {
  it('bulk replaces all pages', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.addPage', payload: { title: 'Old' } });
    project.dispatch({
      type: 'theme.setPages',
      payload: {
        pages: [
          { id: 'p1', title: 'New1', regions: [] },
          { id: 'p2', title: 'New2', regions: [] },
        ],
      },
    });
    expect((project.theme as any).pages).toHaveLength(2);
    expect((project.theme as any).pages[0].title).toBe('New1');
  });
});

// ── Document-Level ──────────────────────────────────────────────

describe('theme.setBreakpoint', () => {
  it('sets a breakpoint', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.setBreakpoint', payload: { name: 'md', minWidth: 768 } });
    expect((project.theme as any).breakpoints?.md).toBe(768);
  });
});

describe('theme.setStylesheets', () => {
  it('sets external stylesheets', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.setStylesheets', payload: { urls: ['https://cdn/style.css'] } });
    expect((project.theme as any).stylesheets).toEqual(['https://cdn/style.css']);
  });
});

describe('theme.setDocumentProperty', () => {
  it('sets a document property', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.setDocumentProperty', payload: { property: 'title', value: 'My Theme' } });
    expect((project.theme as any).title).toBe('My Theme');
  });
});

describe('theme.setExtension', () => {
  it('sets a document-level extension', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.setExtension', payload: { key: 'x-vendor', value: { flag: true } } });
    expect((project.theme as any)['x-vendor']).toEqual({ flag: true });
  });
});

describe('theme.setTargetCompatibility', () => {
  it('sets compatible versions', () => {
    const project = createRawProject();
    project.dispatch({ type: 'theme.setTargetCompatibility', payload: { compatibleVersions: '>=1.0.0' } });
    expect((project.theme as any).targetDefinition?.compatibleVersions).toBe('>=1.0.0');
  });
});
