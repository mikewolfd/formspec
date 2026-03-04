import { describe, expect, it } from 'vitest';
import {
  groupChangelogByArea,
  moveMappingRule,
  removeMappingRule,
  summarizeChangelog,
  updateMappingRule,
} from '../sidecars';

describe('sidecars helpers', () => {
  it('updates and removes mapping rules', () => {
    const mapping = {
      $formspecMapping: '1.0' as const,
      version: '1.0.0',
      definitionRef: 'https://example.gov/forms/sample',
      definitionVersion: '>=0.1.0 <1.0.0',
      targetSchema: { format: 'json' as const },
      rules: [
        { sourcePath: 'orgName', targetPath: 'payload.org_name', transform: 'preserve' as const },
      ],
    };

    const updated = updateMappingRule(mapping, 0, { transform: 'coerce', targetPath: 'payload.name' });
    expect(updated.rules[0].transform).toBe('coerce');
    expect(updated.rules[0].targetPath).toBe('payload.name');

    const removed = removeMappingRule(updated, 0);
    expect(removed.rules).toHaveLength(0);
  });

  it('moves mapping rules by index', () => {
    const mapping = {
      $formspecMapping: '1.0' as const,
      version: '1.0.0',
      definitionRef: 'https://example.gov/forms/sample',
      definitionVersion: '>=0.1.0 <1.0.0',
      targetSchema: { format: 'json' as const },
      rules: [
        { sourcePath: 'a', targetPath: 'payload.a', transform: 'preserve' as const },
        { sourcePath: 'b', targetPath: 'payload.b', transform: 'preserve' as const },
      ],
    };
    const moved = moveMappingRule(mapping, 0, 1);
    expect(moved.rules[0].sourcePath).toBe('b');
    expect(moved.rules[1].sourcePath).toBe('a');
  });

  it('summarizes changelog by impact and type', () => {
    const changelog = {
      changes: [
        { type: 'added', impact: 'compatible' },
        { type: 'removed', impact: 'breaking' },
        { type: 'added', impact: 'compatible' },
      ],
    };
    const summary = summarizeChangelog(changelog);
    expect(summary.total).toBe(3);
    expect(summary.byImpact.compatible).toBe(2);
    expect(summary.byImpact.breaking).toBe(1);
    expect(summary.byType.added).toBe(2);
    expect(summary.byType.removed).toBe(1);
  });

  it('groups changelog entries by area', () => {
    const grouped = groupChangelogByArea({
      changes: [
        { path: 'items.budget.total' },
        { path: 'items.budget.lines[0].amount' },
        { path: 'items.applicant.name' },
      ],
    });
    expect(grouped.budget).toHaveLength(2);
    expect(grouped.applicant).toHaveLength(1);
  });
});
