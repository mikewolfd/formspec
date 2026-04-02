/** @filedesc Tests for layout-ui-helpers: business logic extracted from Studio UI into studio-core. */
import { describe, expect, it } from 'vitest';
import { createProject } from '../src/project.js';
import {
  resolveLayoutInsertTarget,
  getItemOverrides,
  addStyleOverride,
  validateTokenName,
  applyBreakpointPresets,
  summarizeSelectorRule,
  getTokensByGroup,
  getGroupedTokens,
  getSortedBreakpoints,
  getEditablePropertiesForNode,
} from '../src/layout-ui-helpers.js';

// ── 1. resolveLayoutInsertTarget ──────────────────────────────────────

describe('resolveLayoutInsertTarget', () => {
  it('returns root parentNodeId when project has no pages', () => {
    const project = createProject();
    const result = resolveLayoutInsertTarget(project);
    expect(result.parentNodeId).toBe('root');
  });

  it('returns root parentNodeId in single-page mode even with no active pageId', () => {
    const project = createProject();
    const result = resolveLayoutInsertTarget(project, undefined);
    expect(result.parentNodeId).toBe('root');
  });

  it('returns pageId as parentNodeId when multi-page project has an active page', () => {
    const project = createProject();
    const pageResult = project.addPage('Page One', undefined, undefined, { standalone: true });
    const pageId = pageResult.createdId!;
    const result = resolveLayoutInsertTarget(project, pageId);
    expect(result.parentNodeId).toBe(pageId);
    expect(result.pageId).toBe(pageId);
  });

  it('falls back to root when pageId is provided but not found in tree', () => {
    const project = createProject();
    const result = resolveLayoutInsertTarget(project, 'nonexistent-page');
    expect(result.parentNodeId).toBe('root');
  });
});

// ── 2. getItemOverrides ───────────────────────────────────────────────

describe('getItemOverrides', () => {
  it('returns empty object when no theme overrides exist', () => {
    const project = createProject();
    expect(getItemOverrides(project, 'some-field')).toEqual({});
  });

  it('returns empty object for unknown item key', () => {
    const project = createProject();
    project.addField('name', 'Name', 'text');
    expect(getItemOverrides(project, 'name')).toEqual({});
  });

  it('returns existing overrides when set via setItemOverride', () => {
    const project = createProject();
    project.addField('email', 'Email', 'email');
    project.setItemOverride('email', 'labelPosition', 'start');
    const overrides = getItemOverrides(project, 'email');
    expect(overrides).toHaveProperty('labelPosition', 'start');
  });

  it('returns multiple overrides when set', () => {
    const project = createProject();
    project.addField('name', 'Name', 'text');
    project.setItemOverride('name', 'labelPosition', 'top');
    project.setItemOverride('name', 'widget', 'textarea');
    const overrides = getItemOverrides(project, 'name');
    expect(overrides).toHaveProperty('labelPosition', 'top');
    expect(overrides).toHaveProperty('widget', 'textarea');
  });
});

// ── 3. addStyleOverride ────────────────────────────────────────────────

describe('addStyleOverride', () => {
  it('adds a style key to the item', () => {
    const project = createProject();
    project.addField('name', 'Name', 'text');
    addStyleOverride(project, 'name', 'fontWeight', 'bold');
    const overrides = getItemOverrides(project, 'name');
    expect(overrides.style).toBeDefined();
    expect((overrides.style as Record<string, unknown>)?.fontWeight).toBe('bold');
  });

  it('throws on empty key', () => {
    const project = createProject();
    project.addField('name', 'Name', 'text');
    expect(() => addStyleOverride(project, 'name', '', 'bold')).toThrow();
  });

  it('throws on whitespace-only key', () => {
    const project = createProject();
    project.addField('name', 'Name', 'text');
    expect(() => addStyleOverride(project, 'name', '   ', 'bold')).toThrow();
  });

  it('preserves existing style keys when adding a new one', () => {
    const project = createProject();
    project.addField('name', 'Name', 'text');
    addStyleOverride(project, 'name', 'color', 'red');
    addStyleOverride(project, 'name', 'fontWeight', 'bold');
    const overrides = getItemOverrides(project, 'name');
    const style = overrides.style as Record<string, unknown>;
    expect(style?.color).toBe('red');
    expect(style?.fontWeight).toBe('bold');
  });
});

// ── 4. validateTokenName ───────────────────────────────────────────────

describe('validateTokenName', () => {
  it('accepts alphanumeric names', () => {
    expect(validateTokenName('token123')).toBe(true);
  });

  it('accepts names with hyphens', () => {
    expect(validateTokenName('color-primary')).toBe(true);
  });

  it('accepts names with underscores', () => {
    expect(validateTokenName('my_token')).toBe(true);
  });

  it('accepts mixed alphanumeric + hyphen + underscore', () => {
    expect(validateTokenName('color-primary_01')).toBe(true);
  });

  it('rejects names with dots', () => {
    expect(validateTokenName('color.primary')).toBe(false);
  });

  it('rejects names with spaces', () => {
    expect(validateTokenName('color token')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateTokenName('')).toBe(false);
  });

  it('rejects names with special characters', () => {
    expect(validateTokenName('my@token')).toBe(false);
  });
});

// ── 5. applyBreakpointPresets ──────────────────────────────────────────

describe('applyBreakpointPresets', () => {
  it('sets mobile at 0px', () => {
    const project = createProject();
    applyBreakpointPresets(project);
    expect(project.state.theme.breakpoints?.mobile).toBe(0);
  });

  it('sets tablet at 768px', () => {
    const project = createProject();
    applyBreakpointPresets(project);
    expect(project.state.theme.breakpoints?.tablet).toBe(768);
  });

  it('sets desktop at 1024px', () => {
    const project = createProject();
    applyBreakpointPresets(project);
    expect(project.state.theme.breakpoints?.desktop).toBe(1024);
  });

  it('applies all three breakpoints in one call', () => {
    const project = createProject();
    applyBreakpointPresets(project);
    const bp = project.state.theme.breakpoints ?? {};
    expect(Object.keys(bp)).toEqual(expect.arrayContaining(['mobile', 'tablet', 'desktop']));
  });
});

// ── 6. summarizeSelectorRule ───────────────────────────────────────────

describe('summarizeSelectorRule', () => {
  it('returns "Any item" for empty match', () => {
    expect(summarizeSelectorRule({})).toBe('Any item');
  });

  it('returns "Any item" for match with no type or dataType', () => {
    expect(summarizeSelectorRule({ match: {} })).toBe('Any item');
  });

  it('returns just the type when only type is set', () => {
    expect(summarizeSelectorRule({ match: { type: 'field' } })).toBe('field');
  });

  it('returns just the dataType when only dataType is set', () => {
    expect(summarizeSelectorRule({ match: { dataType: 'string' } })).toBe('string');
  });

  it('returns type + dataType joined with " + " when both set', () => {
    expect(summarizeSelectorRule({ match: { type: 'field', dataType: 'string' } })).toBe('field + string');
  });
});

// ── 7. getTokensByGroup ────────────────────────────────────────────────

describe('getTokensByGroup', () => {
  it('returns empty array when no tokens exist', () => {
    const project = createProject();
    expect(getTokensByGroup(project, 'color')).toEqual([]);
  });

  it('returns only tokens in the specified group', () => {
    const project = createProject();
    project.setToken('color.primary', '#ff0000');
    project.setToken('color.secondary', '#00ff00');
    project.setToken('font.size', '16px');
    const colorTokens = getTokensByGroup(project, 'color');
    expect(colorTokens).toHaveLength(2);
    const keys = colorTokens.map((t) => t.key);
    expect(keys).toContain('color.primary');
    expect(keys).toContain('color.secondary');
    expect(keys).not.toContain('font.size');
  });

  it('returns token with name stripped of group prefix', () => {
    const project = createProject();
    project.setToken('color.primary', '#ff0000');
    const tokens = getTokensByGroup(project, 'color');
    expect(tokens[0].name).toBe('primary');
  });

  it('returns token with correct value', () => {
    const project = createProject();
    project.setToken('color.primary', '#ff0000');
    const tokens = getTokensByGroup(project, 'color');
    expect(tokens[0].value).toBe('#ff0000');
  });

  it('returns empty array for non-existent group', () => {
    const project = createProject();
    project.setToken('color.primary', '#ff0000');
    expect(getTokensByGroup(project, 'typography')).toEqual([]);
  });
});

// ── 8. getGroupedTokens ────────────────────────────────────────────────

describe('getGroupedTokens', () => {
  it('returns empty Map when no tokens exist', () => {
    const project = createProject();
    const grouped = getGroupedTokens(project);
    expect(grouped.size).toBe(0);
  });

  it('groups tokens by dot-prefix', () => {
    const project = createProject();
    project.setToken('color.primary', '#ff0000');
    project.setToken('color.secondary', '#00ff00');
    project.setToken('font.size', '16px');
    const grouped = getGroupedTokens(project);
    expect(grouped.has('color')).toBe(true);
    expect(grouped.has('font')).toBe(true);
    expect(grouped.get('color')!).toHaveLength(2);
    expect(grouped.get('font')!).toHaveLength(1);
  });

  it('places tokens without dots in "other" group', () => {
    const project = createProject();
    project.setToken('mytoken', 'val');
    const grouped = getGroupedTokens(project);
    expect(grouped.has('other')).toBe(true);
    expect(grouped.get('other')!).toHaveLength(1);
  });

  it('tokens in groups have key, name, and value', () => {
    const project = createProject();
    project.setToken('color.accent', '#0000ff');
    const grouped = getGroupedTokens(project);
    const token = grouped.get('color')![0];
    expect(token.key).toBe('color.accent');
    expect(token.name).toBe('accent');
    expect(token.value).toBe('#0000ff');
  });
});

// ── 9. getSortedBreakpoints ────────────────────────────────────────────

describe('getSortedBreakpoints', () => {
  it('returns empty array when no breakpoints defined', () => {
    const project = createProject();
    expect(getSortedBreakpoints(project)).toEqual([]);
  });

  it('returns breakpoints sorted by ascending width', () => {
    const project = createProject();
    project.setBreakpoint('desktop', 1024);
    project.setBreakpoint('mobile', 0);
    project.setBreakpoint('tablet', 768);
    const sorted = getSortedBreakpoints(project);
    expect(sorted.map((b) => b.name)).toEqual(['mobile', 'tablet', 'desktop']);
  });

  it('each entry has name and width', () => {
    const project = createProject();
    project.setBreakpoint('tablet', 768);
    const sorted = getSortedBreakpoints(project);
    expect(sorted[0]).toEqual({ name: 'tablet', width: 768 });
  });

  it('handles a single breakpoint', () => {
    const project = createProject();
    project.setBreakpoint('mobile', 0);
    const sorted = getSortedBreakpoints(project);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].name).toBe('mobile');
  });
});

// ── 10. getEditablePropertiesForNode ──────────────────────────────────

describe('getEditablePropertiesForNode', () => {
  it('Grid node returns container properties', () => {
    const project = createProject();
    const result = project.addLayoutNode('root', 'Grid');
    const nodeId = result.createdId!;
    const props = getEditablePropertiesForNode(project, `__node:${nodeId}`);
    expect(props).toContain('columns');
    expect(props).toContain('gap');
  });

  it('Stack node returns direction and gap properties', () => {
    const project = createProject();
    const result = project.addLayoutNode('root', 'Stack');
    const nodeId = result.createdId!;
    const props = getEditablePropertiesForNode(project, `__node:${nodeId}`);
    expect(props).toContain('direction');
    expect(props).toContain('gap');
  });

  it('Card node returns container properties', () => {
    const project = createProject();
    const result = project.addLayoutNode('root', 'Card');
    const nodeId = result.createdId!;
    const props = getEditablePropertiesForNode(project, `__node:${nodeId}`);
    expect(props).toContain('elevation');
    expect(props).toContain('padding');
  });

  it('Heading node does not return container layout properties', () => {
    const project = createProject();
    const result = project.addLayoutNode('root', 'Heading');
    const nodeId = result.createdId!;
    const props = getEditablePropertiesForNode(project, `__node:${nodeId}`);
    expect(props).not.toContain('columns');
    expect(props).not.toContain('direction');
    expect(props).not.toContain('elevation');
  });

  it('Divider node does not return container layout properties', () => {
    const project = createProject();
    const result = project.addLayoutNode('root', 'Divider');
    const nodeId = result.createdId!;
    const props = getEditablePropertiesForNode(project, `__node:${nodeId}`);
    expect(props).not.toContain('columns');
    expect(props).not.toContain('direction');
  });

  it('all non-Heading/Divider nodes include common properties', () => {
    const project = createProject();
    const result = project.addLayoutNode('root', 'Stack');
    const nodeId = result.createdId!;
    const props = getEditablePropertiesForNode(project, `__node:${nodeId}`);
    expect(props).toContain('when');
  });
});
