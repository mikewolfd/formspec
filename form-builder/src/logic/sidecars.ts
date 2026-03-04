import type { FormspecDefinition } from 'formspec-engine';

export type MappingRuleTransform =
  | 'preserve'
  | 'drop'
  | 'expression'
  | 'coerce'
  | 'valueMap'
  | 'flatten'
  | 'nest'
  | 'constant'
  | 'concat'
  | 'split';

export interface MappingRuleRecord {
  sourcePath?: string;
  targetPath?: string | null;
  transform: MappingRuleTransform;
  priority?: number;
}

export interface MappingDocumentRecord {
  $formspecMapping: '1.0';
  version: string;
  definitionRef: string;
  definitionVersion: string;
  targetSchema: {
    format: 'json' | 'xml' | 'csv';
    name?: string;
    url?: string;
  };
  rules: MappingRuleRecord[];
  title?: string;
}

export interface ChangelogRecord {
  $formspecChangelog: '1.0';
  definitionUrl: string;
  fromVersion: string;
  toVersion: string;
  semverImpact: 'patch' | 'minor' | 'major' | 'none';
  changes: Array<Record<string, unknown>>;
  summary?: string;
}

export function createMappingDocument(
  definition: FormspecDefinition,
  options?: { format?: 'json' | 'xml' | 'csv'; title?: string },
): MappingDocumentRecord {
  return {
    $formspecMapping: '1.0',
    version: '1.0.0',
    definitionRef: definition.url,
    definitionVersion: `>=${definition.version} <${bumpMajorVersion(definition.version)}`,
    targetSchema: {
      format: options?.format ?? 'json',
      ...(options?.title ? { name: options.title } : {}),
    },
    rules: [],
    ...(options?.title ? { title: options.title } : {}),
  };
}

export function addMappingRule(
  mapping: MappingDocumentRecord,
  rule: MappingRuleRecord,
): MappingDocumentRecord {
  return {
    ...mapping,
    rules: [...mapping.rules, rule],
  };
}

export function updateMappingRule(
  mapping: MappingDocumentRecord,
  ruleIndex: number,
  patch: Partial<MappingRuleRecord>,
): MappingDocumentRecord {
  return {
    ...mapping,
    rules: mapping.rules.map((rule, index) =>
      index === ruleIndex ? { ...rule, ...patch } : rule,
    ),
  };
}

export function removeMappingRule(
  mapping: MappingDocumentRecord,
  ruleIndex: number,
): MappingDocumentRecord {
  return {
    ...mapping,
    rules: mapping.rules.filter((_, index) => index !== ruleIndex),
  };
}

export function moveMappingRule(
  mapping: MappingDocumentRecord,
  fromIndex: number,
  toIndex: number,
): MappingDocumentRecord {
  if (fromIndex === toIndex) {
    return mapping;
  }
  if (fromIndex < 0 || fromIndex >= mapping.rules.length || toIndex < 0 || toIndex >= mapping.rules.length) {
    return mapping;
  }
  const next = [...mapping.rules];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return { ...mapping, rules: next };
}

export function createChangelog(definition: FormspecDefinition, fromVersion?: string): ChangelogRecord {
  return {
    $formspecChangelog: '1.0',
    definitionUrl: definition.url,
    fromVersion: fromVersion ?? definition.version,
    toVersion: definition.version,
    semverImpact: 'patch',
    changes: [],
  };
}

export function mappingRulesForField(
  mappings: unknown[],
  fieldKey: string,
): Array<{ mappingIndex: number; ruleIndex: number; rule: MappingRuleRecord; mapping: MappingDocumentRecord }> {
  const results: Array<{ mappingIndex: number; ruleIndex: number; rule: MappingRuleRecord; mapping: MappingDocumentRecord }> = [];
  mappings.forEach((entry, mappingIndex) => {
    const mapping = entry as MappingDocumentRecord;
    if (!mapping || !Array.isArray(mapping.rules)) {
      return;
    }
    mapping.rules.forEach((rule, ruleIndex) => {
      if (rule.sourcePath === fieldKey) {
        results.push({ mappingIndex, ruleIndex, rule, mapping });
      }
    });
  });
  return results;
}

export function changelogChangesForField(changelog: unknown, fieldKey: string): Array<Record<string, unknown>> {
  const document = changelog as ChangelogRecord;
  if (!document || !Array.isArray(document.changes)) {
    return [];
  }
  return document.changes.filter((change) => {
    const path = String(change.path ?? '');
    const key = String(change.key ?? '');
    return path.includes(fieldKey) || key === fieldKey;
  });
}

export function summarizeChangelog(changelog: unknown): {
  total: number;
  byImpact: Record<string, number>;
  byType: Record<string, number>;
} {
  const document = changelog as ChangelogRecord;
  const changes = Array.isArray(document?.changes) ? document.changes : [];
  const byImpact: Record<string, number> = {};
  const byType: Record<string, number> = {};
  changes.forEach((change) => {
    const impact = String(change.impact ?? 'unknown');
    const type = String(change.type ?? 'unknown');
    byImpact[impact] = (byImpact[impact] ?? 0) + 1;
    byType[type] = (byType[type] ?? 0) + 1;
  });
  return { total: changes.length, byImpact, byType };
}

export function groupChangelogByArea(changelog: unknown): Record<string, Array<Record<string, unknown>>> {
  const document = changelog as ChangelogRecord;
  const changes = Array.isArray(document?.changes) ? document.changes : [];
  return changes.reduce<Record<string, Array<Record<string, unknown>>>>((acc, change) => {
    const path = String(change.path ?? '');
    const area = extractAreaFromPath(path);
    if (!acc[area]) {
      acc[area] = [];
    }
    acc[area].push(change);
    return acc;
  }, {});
}

export function pathToLikelyFieldKey(path: string): string {
  const clean = path.replace(/^items\./, '');
  const parts = clean.split('.');
  const tail = parts[parts.length - 1] ?? clean;
  return tail.replace(/\[\d+\]/g, '').replace(/\[\*\]/g, '');
}

function bumpMajorVersion(version: string): string {
  const [major] = version.split('.');
  const majorNum = Number(major);
  if (Number.isNaN(majorNum)) {
    return '9999.0.0';
  }
  return `${majorNum + 1}.0.0`;
}

function extractAreaFromPath(path: string): string {
  if (!path) return 'root';
  const clean = path.replace(/^items\./, '');
  const [area] = clean.split('.');
  return area || 'root';
}
