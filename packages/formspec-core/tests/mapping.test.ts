import { describe, it, expect } from 'vitest';
import { createRawProject } from '../src/index.js';

describe('mapping.setProperty', () => {
  it('sets a top-level mapping property', () => {
    const project = createRawProject();
    project.dispatch({ type: 'mapping.setProperty', payload: { property: 'direction', value: 'forward' } });
    expect(project.mapping.direction).toBe('forward');
  });
});

describe('mapping.setTargetSchema', () => {
  it('sets a target schema property', () => {
    const project = createRawProject();
    project.dispatch({ type: 'mapping.setTargetSchema', payload: { property: 'format', value: 'json' } });
    expect((project.mapping.targetSchema as any)?.format).toBe('json');
  });
});

describe('mapping.addRule', () => {
  it('appends a rule', () => {
    const project = createRawProject();
    project.dispatch({
      type: 'mapping.addRule',
      payload: { sourcePath: 'name', targetPath: 'fullName', transform: 'preserve' },
    });
    const rules = project.mapping.rules as any[];
    expect(rules).toHaveLength(1);
    expect(rules[0].sourcePath).toBe('name');
    expect(rules[0].targetPath).toBe('fullName');
  });

  it('inserts at a specific index', () => {
    const project = createRawProject();
    project.dispatch({ type: 'mapping.addRule', payload: { sourcePath: 'a', targetPath: 'a' } });
    project.dispatch({ type: 'mapping.addRule', payload: { sourcePath: 'c', targetPath: 'c' } });
    project.dispatch({ type: 'mapping.addRule', payload: { sourcePath: 'b', targetPath: 'b', insertIndex: 1 } });
    expect((project.mapping.rules as any[])[1].sourcePath).toBe('b');
  });
});

describe('mapping.setRule', () => {
  it('updates a rule property', () => {
    const project = createRawProject();
    project.dispatch({ type: 'mapping.addRule', payload: { sourcePath: 'a', targetPath: 'a' } });
    project.dispatch({ type: 'mapping.setRule', payload: { index: 0, property: 'transform', value: 'expression' } });
    expect((project.mapping.rules as any[])[0].transform).toBe('expression');
  });
});

describe('mapping.deleteRule', () => {
  it('removes a rule', () => {
    const project = createRawProject();
    project.dispatch({ type: 'mapping.addRule', payload: { sourcePath: 'a', targetPath: 'a' } });
    project.dispatch({ type: 'mapping.addRule', payload: { sourcePath: 'b', targetPath: 'b' } });
    project.dispatch({ type: 'mapping.deleteRule', payload: { index: 0 } });
    expect((project.mapping.rules as any[])).toHaveLength(1);
    expect((project.mapping.rules as any[])[0].sourcePath).toBe('b');
  });
});

describe('mapping.reorderRule', () => {
  it('reorders rules', () => {
    const project = createRawProject();
    project.dispatch({ type: 'mapping.addRule', payload: { sourcePath: 'a', targetPath: 'a' } });
    project.dispatch({ type: 'mapping.addRule', payload: { sourcePath: 'b', targetPath: 'b' } });
    project.dispatch({ type: 'mapping.reorderRule', payload: { index: 0, direction: 'down' } });
    expect((project.mapping.rules as any[])[0].sourcePath).toBe('b');
  });
});

describe('mapping.setAdapter', () => {
  it('sets adapter config', () => {
    const project = createRawProject();
    project.dispatch({
      type: 'mapping.setAdapter',
      payload: { format: 'json', config: { pretty: true, sortKeys: false } },
    });
    expect((project.mapping as any).adapters?.json).toEqual({ pretty: true, sortKeys: false });
  });
});

describe('mapping.setDefaults', () => {
  it('sets default values', () => {
    const project = createRawProject();
    project.dispatch({
      type: 'mapping.setDefaults',
      payload: { defaults: { type: 'form', version: '1' } },
    });
    expect((project.mapping as any).defaults).toEqual({ type: 'form', version: '1' });
  });
});

describe('mapping.autoGenerateRules', () => {
  it('generates preserve rules for fields without explicit rules', () => {
    const project = createRawProject();
    project.dispatch({ type: 'definition.addItem', payload: { type: 'field', key: 'a' } });
    project.dispatch({ type: 'definition.addItem', payload: { type: 'field', key: 'b' } });
    project.dispatch({ type: 'mapping.addRule', payload: { sourcePath: 'a', targetPath: 'a_out', transform: 'expression' } });

    project.dispatch({ type: 'mapping.autoGenerateRules', payload: {} });

    const rules = project.mapping.rules as any[];
    // Should have original rule + auto-generated for 'b'
    expect(rules.length).toBeGreaterThanOrEqual(2);
    const autoRule = rules.find((r: any) => r.sourcePath === 'b');
    expect(autoRule).toBeDefined();
    expect(autoRule.transform).toBe('preserve');
  });
});

describe('mapping.setExtension', () => {
  it('sets a document-level extension', () => {
    const project = createRawProject();
    project.dispatch({ type: 'mapping.setExtension', payload: { key: 'x-vendor', value: { custom: true } } });
    expect((project.mapping as any)['x-vendor']).toEqual({ custom: true });
  });

  it('removes with null', () => {
    const project = createRawProject();
    project.dispatch({ type: 'mapping.setExtension', payload: { key: 'x-test', value: 1 } });
    project.dispatch({ type: 'mapping.setExtension', payload: { key: 'x-test', value: null } });
    expect((project.mapping as any)['x-test']).toBeUndefined();
  });
});

describe('mapping.setRuleExtension', () => {
  it('sets an extension on a rule', () => {
    const project = createRawProject();
    project.dispatch({ type: 'mapping.addRule', payload: { sourcePath: 'a', targetPath: 'a' } });
    project.dispatch({ type: 'mapping.setRuleExtension', payload: { index: 0, key: 'x-tag', value: 'important' } });
    expect((project.mapping.rules as any[])[0]['x-tag']).toBe('important');
  });
});

describe('mapping.addInnerRule', () => {
  it('adds an inner rule to a parent rule', () => {
    const project = createRawProject();
    project.dispatch({ type: 'mapping.addRule', payload: { sourcePath: 'items', targetPath: 'items', transform: 'preserve' } });
    project.dispatch({
      type: 'mapping.addInnerRule',
      payload: { ruleIndex: 0, sourcePath: 'name', targetPath: 'name', transform: 'preserve' },
    });
    const rule = (project.mapping.rules as any[])[0];
    expect(rule.innerRules).toHaveLength(1);
    expect(rule.innerRules[0].sourcePath).toBe('name');
  });
});

describe('mapping.setInnerRule', () => {
  it('updates an inner rule property', () => {
    const project = createRawProject();
    project.dispatch({ type: 'mapping.addRule', payload: { sourcePath: 'items', targetPath: 'items' } });
    project.dispatch({ type: 'mapping.addInnerRule', payload: { ruleIndex: 0, sourcePath: 'x', targetPath: 'x' } });
    project.dispatch({ type: 'mapping.setInnerRule', payload: { ruleIndex: 0, innerIndex: 0, property: 'transform', value: 'drop' } });
    expect((project.mapping.rules as any[])[0].innerRules[0].transform).toBe('drop');
  });
});

describe('mapping.deleteInnerRule', () => {
  it('removes an inner rule', () => {
    const project = createRawProject();
    project.dispatch({ type: 'mapping.addRule', payload: { sourcePath: 'items', targetPath: 'items' } });
    project.dispatch({ type: 'mapping.addInnerRule', payload: { ruleIndex: 0, sourcePath: 'a', targetPath: 'a' } });
    project.dispatch({ type: 'mapping.addInnerRule', payload: { ruleIndex: 0, sourcePath: 'b', targetPath: 'b' } });
    project.dispatch({ type: 'mapping.deleteInnerRule', payload: { ruleIndex: 0, innerIndex: 0 } });
    expect((project.mapping.rules as any[])[0].innerRules).toHaveLength(1);
    expect((project.mapping.rules as any[])[0].innerRules[0].sourcePath).toBe('b');
  });
});

describe('mapping.reorderInnerRule', () => {
  it('reorders inner rules', () => {
    const project = createRawProject();
    project.dispatch({ type: 'mapping.addRule', payload: { sourcePath: 'items', targetPath: 'items' } });
    project.dispatch({ type: 'mapping.addInnerRule', payload: { ruleIndex: 0, sourcePath: 'a', targetPath: 'a' } });
    project.dispatch({ type: 'mapping.addInnerRule', payload: { ruleIndex: 0, sourcePath: 'b', targetPath: 'b' } });
    project.dispatch({ type: 'mapping.reorderInnerRule', payload: { ruleIndex: 0, innerIndex: 0, direction: 'down' } });
    expect((project.mapping.rules as any[])[0].innerRules[0].sourcePath).toBe('b');
  });
});

describe('mapping.preview', () => {
  it('returns transformed sample data', () => {
    const project = createRawProject();
    project.dispatch({ type: 'mapping.addRule', payload: { sourcePath: 'name', targetPath: 'fullName', transform: 'preserve' } });

    const result = project.dispatch({
      type: 'mapping.preview',
      payload: { sampleData: { name: 'Alice' } },
    }) as any;

    expect(result.output).toBeDefined();
    expect(result.output.fullName).toBe('Alice');
  });

  it('uses runtime mapping semantics for nested paths and coercion', () => {
    const project = createRawProject();
    project.batch([
      { type: 'mapping.addRule', payload: { sourcePath: 'profile.age', targetPath: 'out.age', transform: 'coerce' } },
      { type: 'mapping.setRule', payload: { index: 0, property: 'coerce', value: 'number' } },
      { type: 'mapping.addRule', payload: { sourcePath: 'profile.name', targetPath: 'out.name', transform: 'preserve' } },
    ]);

    const result = project.dispatch({
      type: 'mapping.preview',
      payload: { sampleData: { profile: { age: '42', name: 'Alice' } }, direction: 'forward' },
    }) as any;

    expect(result.output).toEqual({ out: { age: 42, name: 'Alice' } });
  });
});
