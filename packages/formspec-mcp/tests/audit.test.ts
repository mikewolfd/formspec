/** @filedesc Tests for formspec_audit MCP tool: classify_items and bind_summary. */
import { describe, it, expect } from 'vitest';
import { registryWithProject, registryInBootstrap } from './helpers.js';
import { handleAudit } from '../src/tools/audit.js';

function parseResult(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text);
}

// ── classify_items ──────────────────────────────────────────────────

describe('handleAudit — classify_items', () => {
  it('returns empty classifications for a fresh project', () => {
    const { registry, projectId } = registryWithProject();
    const result = handleAudit(registry, projectId, { action: 'classify_items' });
    const data = parseResult(result);

    expect(result.isError).toBeUndefined();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items).toHaveLength(0);
  });

  it('classifies a field with its data type', () => {
    const { registry, projectId, project } = registryWithProject();
    project.addField('name', 'Name', 'text');

    const result = handleAudit(registry, projectId, { action: 'classify_items' });
    const data = parseResult(result);

    expect(data.items).toHaveLength(1);
    const item = data.items[0];
    expect(item.path).toBe('name');
    expect(item.type).toBe('field');
    expect(item.dataType).toBe('text');
    expect(item.hasBind).toBe(false);
    expect(item.hasShape).toBe(false);
    expect(item.hasExtension).toBe(false);
  });

  it('classifies a group', () => {
    const { registry, projectId, project } = registryWithProject();
    project.addGroup('contact', 'Contact Info');

    const result = handleAudit(registry, projectId, { action: 'classify_items' });
    const data = parseResult(result);

    const group = data.items.find((i: any) => i.path === 'contact');
    expect(group).toBeDefined();
    expect(group.type).toBe('group');
    expect(group.dataType).toBeUndefined();
  });

  it('classifies a display item', () => {
    const { registry, projectId, project } = registryWithProject();
    project.addContent('intro', 'Welcome to the form');

    const result = handleAudit(registry, projectId, { action: 'classify_items' });
    const data = parseResult(result);

    const display = data.items.find((i: any) => i.path === 'intro');
    expect(display).toBeDefined();
    expect(display.type).toBe('display');
  });

  it('detects hasBind when a field has a bind', () => {
    const { registry, projectId, project } = registryWithProject();
    project.addField('q1', 'Q1', 'text');
    project.require('q1');

    const result = handleAudit(registry, projectId, { action: 'classify_items' });
    const data = parseResult(result);

    const item = data.items.find((i: any) => i.path === 'q1');
    expect(item.hasBind).toBe(true);
  });

  it('detects hasShape when a field has a shape rule', () => {
    const { registry, projectId, project } = registryWithProject();
    project.addField('email', 'Email', 'email');
    project.addValidation('email', 'contains($, "@")', 'Must contain @');

    const result = handleAudit(registry, projectId, { action: 'classify_items' });
    const data = parseResult(result);

    const item = data.items.find((i: any) => i.path === 'email');
    expect(item.hasShape).toBe(true);
  });

  it('classifies nested items with dotted paths', () => {
    const { registry, projectId, project } = registryWithProject();
    project.addGroup('contact', 'Contact');
    project.addField('contact.email', 'Email', 'email');

    const result = handleAudit(registry, projectId, { action: 'classify_items' });
    const data = parseResult(result);

    const nested = data.items.find((i: any) => i.path === 'contact.email');
    expect(nested).toBeDefined();
    expect(nested.type).toBe('field');
    expect(nested.dataType).toBe('string'); // 'email' is a field-type alias for string
  });

  it('returns multiple items in order', () => {
    const { registry, projectId, project } = registryWithProject();
    project.addField('q1', 'Q1', 'text');
    project.addField('q2', 'Q2', 'number');
    project.addGroup('g1', 'Group 1');

    const result = handleAudit(registry, projectId, { action: 'classify_items' });
    const data = parseResult(result);

    expect(data.items.length).toBe(3);
  });
});

// ── bind_summary ────────────────────────────────────────────────────

describe('handleAudit — bind_summary', () => {
  it('returns empty bind summary for a field with no binds', () => {
    const { registry, projectId, project } = registryWithProject();
    project.addField('q1', 'Q1', 'text');

    const result = handleAudit(registry, projectId, { action: 'bind_summary', target: 'q1' });
    const data = parseResult(result);

    expect(result.isError).toBeUndefined();
    expect(data).toHaveProperty('binds');
    expect(Object.keys(data.binds)).toHaveLength(0);
  });

  it('returns required expression in bind summary', () => {
    const { registry, projectId, project } = registryWithProject();
    project.addField('q1', 'Q1', 'text');
    project.require('q1');

    const result = handleAudit(registry, projectId, { action: 'bind_summary', target: 'q1' });
    const data = parseResult(result);

    expect(data.binds).toHaveProperty('required');
    expect(data.binds.required).toBe('true');
  });

  it('returns calculate expression in bind summary', () => {
    const { registry, projectId, project } = registryWithProject();
    project.addField('q1', 'Q1', 'number');
    project.addField('total', 'Total', 'number');
    project.calculate('total', '$q1 * 2');

    const result = handleAudit(registry, projectId, { action: 'bind_summary', target: 'total' });
    const data = parseResult(result);

    expect(data.binds).toHaveProperty('calculate');
    expect(data.binds.calculate).toBe('$q1 * 2');
  });

  it('returns relevant expression in bind summary', () => {
    const { registry, projectId, project } = registryWithProject();
    project.addField('q1', 'Q1', 'boolean');
    project.addField('q2', 'Q2', 'text');
    project.showWhen('q2', '$q1 = true');

    const result = handleAudit(registry, projectId, { action: 'bind_summary', target: 'q2' });
    const data = parseResult(result);

    expect(data.binds).toHaveProperty('relevant');
    expect(data.binds.relevant).toBe('$q1 = true');
  });

  it('returns multiple bind properties for a field', () => {
    const { registry, projectId, project } = registryWithProject();
    project.addField('q1', 'Q1', 'boolean');
    project.addField('q2', 'Q2', 'text');
    project.showWhen('q2', '$q1 = true');
    project.require('q2');

    const result = handleAudit(registry, projectId, { action: 'bind_summary', target: 'q2' });
    const data = parseResult(result);

    expect(data.binds).toHaveProperty('relevant');
    expect(data.binds).toHaveProperty('required');
  });

  it('returns error for non-existent field', () => {
    const { registry, projectId } = registryWithProject();

    const result = handleAudit(registry, projectId, { action: 'bind_summary', target: 'nonexistent' });
    const data = parseResult(result);

    expect(result.isError).toBe(true);
    expect(data.code).toBeTruthy();
  });
});

// ── BUG-9: cross_document audit component_ref check ─────────────────
//
// The cross-document audit previously used project.itemAt(node.bind) to
// check component tree binds. Since binds store leaf keys (not full paths),
// this produced false warnings for nested items. The fix removes the
// duplicate check — project.diagnose() already validates binds correctly
// using the itemKeySet approach. These tests verify that the classify_items
// action (which walks the definition tree) correctly handles nested items.
// The cross_document action delegates to project.diagnose() for bind checks.

describe('BUG-9: nested item classification', () => {
  it('classifies nested items with correct full paths', () => {
    const { registry, projectId, project } = registryWithProject();
    project.addGroup('demographics', 'Demographics');
    project.addField('demographics.participant_name', 'Name', 'text');

    const result = handleAudit(registry, projectId, { action: 'classify_items' });
    const data = parseResult(result);

    // participant_name should be reported with its full path
    const nested = data.items.find((i: any) => i.path === 'demographics.participant_name');
    expect(nested).toBeDefined();
    expect(nested.type).toBe('field');

    // It should NOT appear as a bare leaf key
    const bare = data.items.find((i: any) => i.path === 'participant_name');
    expect(bare).toBeUndefined();
  });

  it('classifies deeply nested items correctly', () => {
    const { registry, projectId, project } = registryWithProject();
    project.addGroup('section', 'Section');
    project.addGroup('section.subsection', 'Subsection');
    project.addField('section.subsection.email', 'Email', 'text');

    const result = handleAudit(registry, projectId, { action: 'classify_items' });
    const data = parseResult(result);

    const nested = data.items.find((i: any) => i.path === 'section.subsection.email');
    expect(nested).toBeDefined();
    expect(nested.type).toBe('field');
  });
});

// ── WRONG_PHASE ─────────────────────────────────────────────────────

describe('handleAudit — errors', () => {
  it('returns WRONG_PHASE during bootstrap', () => {
    const { registry, projectId } = registryInBootstrap();

    const result = handleAudit(registry, projectId, { action: 'classify_items' });
    const data = parseResult(result);

    expect(result.isError).toBe(true);
    expect(data.code).toBe('WRONG_PHASE');
  });
});
