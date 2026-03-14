import type { AnyCommand } from 'formspec-studio-core';
import type {
  AnalysisField,
  AnalysisRoute,
  AnalysisRule,
  AnalysisSection,
  AnalysisV1,
  CommandPatchV1,
  InquestConfidence,
  InquestIssue,
  InquestModelInput,
  InquestProviderAdapter,
  ConnectionResult,
  ProposalV1,
  TraceMapV1,
} from 'formspec-shared';
import { findInquestTemplate } from 'formspec-shared';

const FIELD_CATALOG: Array<{ match: RegExp; key: string; label: string; dataType: string }> = [
  { match: /\bemail\b/i, key: 'email', label: 'Email', dataType: 'string' },
  { match: /\bphone\b/i, key: 'phone', label: 'Phone Number', dataType: 'string' },
  { match: /\baddress\b/i, key: 'address', label: 'Address', dataType: 'string' },
  { match: /\bincome|amount|budget\b/i, key: 'amount', label: 'Amount', dataType: 'money' },
  { match: /\bdate\b/i, key: 'date', label: 'Date', dataType: 'date' },
  { match: /\bname\b/i, key: 'name', label: 'Name', dataType: 'string' },
  { match: /\bhousehold\b/i, key: 'householdSize', label: 'Household Size', dataType: 'integer' },
  { match: /\bcertif/i, key: 'certify', label: 'Certification', dataType: 'boolean' },
];

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'inquest';
}

function toKey(value: string): string {
  const slug = slugify(value).replace(/-([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());
  return slug.replace(/-+/g, '');
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

function parseDescriptionFields(description: string): AnalysisField[] {
  const lower = description.toLowerCase();
  const seen = new Set<string>();
  const fields: AnalysisField[] = [];

  for (const entry of FIELD_CATALOG) {
    if (!entry.match.test(lower)) continue;
    seen.add(entry.key);
    fields.push({
      id: `desc:${entry.key}`,
      key: entry.key,
      label: entry.label,
      dataType: entry.dataType,
      required: /required|must collect|need/i.test(description),
      included: true,
      confidence: 'medium',
      sourceIds: ['description'],
    });
  }

  for (const phrase of description.split(/[,\n;]/).map((part) => part.trim()).filter(Boolean)) {
    if (!/\b(field|collect|capture|ask|need|include)\b/i.test(phrase)) continue;
    const normalized = phrase
      .replace(/\b(field|collect|capture|ask|need|include|for|the|a|an)\b/gi, ' ')
      .trim();
    if (!normalized) continue;
    const key = toKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    fields.push({
      id: `desc:${key}`,
      key,
      label: titleCase(normalized),
      dataType: /amount|income|budget|cost/i.test(normalized)
        ? 'money'
        : /date/i.test(normalized)
          ? 'date'
          : /count|number|size/i.test(normalized)
            ? 'integer'
            : /yes|no|check|certif/i.test(normalized)
              ? 'boolean'
              : 'string',
      required: /required|must/i.test(phrase),
      included: true,
      confidence: 'low',
      sourceIds: ['description'],
    });
  }

  return fields;
}

function createIssue(
  id: string,
  title: string,
  message: string,
  severity: InquestIssue['severity'],
  confidence: InquestConfidence,
  blocking: boolean,
  source: InquestIssue['source'],
  traceIds?: string[],
): InquestIssue {
  return {
    id,
    title,
    message,
    severity,
    confidence,
    blocking,
    source,
    status: 'open',
    traceIds,
  };
}

function mergeSections(templateSections: AnalysisSection[], fields: AnalysisField[]): AnalysisSection[] {
  if (templateSections.length > 0) {
    const firstSectionId = templateSections[0].id;
    return templateSections.map((section, index) => ({
      ...section,
      fieldIds: fields
        .filter((field) => (field.sectionId ?? firstSectionId) === section.id || (index === 0 && !field.sectionId))
        .map((field) => field.id),
    }));
  }

  return [{
    id: 'general',
    title: 'General',
    fieldIds: fields.map((field) => field.id),
  }];
}

function buildTrace(fields: AnalysisField[], templateId?: string, description?: string): TraceMapV1 {
  const trace: TraceMapV1 = {};
  for (const field of fields) {
    trace[field.id] = [];
    if (templateId) {
      trace[field.id].push({
        id: `${field.id}:template`,
        type: 'template',
        label: `Template: ${templateId}`,
        sourceId: templateId,
        fieldPath: field.key,
      });
    }
    if (description) {
      trace[field.id].push({
        id: `${field.id}:description`,
        type: 'description',
        label: 'Description',
        sourceId: 'description',
        excerpt: description.slice(0, 180),
        fieldPath: field.key,
      });
    }
  }
  return trace;
}

function definitionItemsFromAnalysis(fields: AnalysisField[], sections: AnalysisSection[]) {
  if (sections.length <= 1) {
    return fields.map((field) => ({
      type: 'field',
      key: field.key,
      label: field.label,
      dataType: field.dataType,
    }));
  }

  return sections.map((section) => ({
    type: 'group',
    key: toKey(section.title),
    label: section.title,
    children: section.fieldIds
      .map((fieldId) => fields.find((field) => field.id === fieldId))
      .filter(Boolean)
      .map((field) => ({
        type: 'field',
        key: field!.key,
        label: field!.label,
        dataType: field!.dataType,
      })),
  }));
}

function pathMapFromSections(fields: AnalysisField[], sections: AnalysisSection[]): Map<string, string> {
  const map = new Map<string, string>();
  if (sections.length <= 1) {
    for (const field of fields) {
      map.set(field.id, field.key);
      map.set(field.key, field.key);
    }
    return map;
  }

  for (const section of sections) {
    const sectionKey = toKey(section.title);
    for (const fieldId of section.fieldIds) {
      const field = fields.find((entry) => entry.id === fieldId);
      if (!field) continue;
      const path = `${sectionKey}.${field.key}`;
      map.set(field.id, path);
      map.set(field.key, path);
    }
  }
  return map;
}

function flattenDefinitionItems(items: any[], prefix = ''): Array<{ key: string; path: string; label?: string }> {
  const results: Array<{ key: string; path: string; label?: string }> = [];
  for (const item of items) {
    const path = prefix ? `${prefix}.${item.key}` : item.key;
    results.push({ key: item.key, path, label: item.label });
    if (Array.isArray(item.children)) {
      results.push(...flattenDefinitionItems(item.children, path));
    }
  }
  return results;
}

export function buildAnalysis(input: InquestModelInput): AnalysisV1 {
  const template = input.template ?? findInquestTemplate(input.session.input.templateId);
  const templateFields = (template?.seedAnalysis.fields ?? []).map<AnalysisField>((field) => ({
    id: `template:${field.key}`,
    key: field.key,
    label: field.label,
    dataType: field.dataType,
    sectionId: field.sectionId,
    required: field.required ?? false,
    included: true,
    confidence: 'high',
    sourceIds: [template?.id ?? 'template'],
  }));
  const descriptionFields = parseDescriptionFields(input.session.input.description);
  const fieldsByKey = new Map<string, AnalysisField>();
  [...templateFields, ...descriptionFields].forEach((field) => {
    const existing = fieldsByKey.get(field.key);
    if (!existing) {
      fieldsByKey.set(field.key, field);
      return;
    }
    fieldsByKey.set(field.key, {
      ...existing,
      required: existing.required || field.required,
      confidence: existing.confidence === 'high' ? 'high' : field.confidence,
      sourceIds: Array.from(new Set([...existing.sourceIds, ...field.sourceIds])),
    });
  });

  const fields = Array.from(fieldsByKey.values());
  const sections = mergeSections(
    (template?.seedAnalysis.sections ?? []).map((section) => ({ ...section, fieldIds: [] })),
    fields,
  );
  const rules: AnalysisRule[] = (template?.seedAnalysis.rules ?? []).map((rule) => ({
    id: rule.id,
    label: rule.label,
    kind: rule.kind,
    expression: rule.expression,
    explanation: rule.explanation,
    fieldPaths: rule.fieldPaths,
    confidence: 'high',
    sourceIds: [template?.id ?? 'template'],
  }));
  const repeats = (template?.seedAnalysis.repeats ?? []).map((repeat) => ({
    ...repeat,
    confidence: 'medium' as const,
  }));
  const routes: AnalysisRoute[] = (template?.seedAnalysis.routes ?? []).map((route) => ({
    ...route,
    confidence: 'medium' as const,
  }));

  const issues: InquestIssue[] = [];
  if (fields.length === 0) {
    issues.push(createIssue(
      'no-fields',
      'Need more input',
      'Add a template or describe the information the form needs to capture before analysis.',
      'warning',
      'low',
      true,
      'analysis',
    ));
  }
  if (input.session.input.description.trim().length < 24) {
    issues.push(createIssue(
      'limited-description',
      'Limited source description',
      'The written description is short, so generated structure may need more review.',
      'warning',
      'low',
      input.session.workflowMode === 'verify-carefully',
      'analysis',
      ['description'],
    ));
  }

  return {
    summary: template
      ? `Started from ${template.name} and identified ${fields.length} candidate fields.`
      : `Identified ${fields.length} candidate fields from the provided description.`,
    requirements: {
      fields,
      sections,
      rules,
      repeats,
      routes,
    },
    issues,
    trace: buildTrace(fields, template?.id, input.session.input.description),
  };
}

export function buildProposal(input: InquestModelInput): ProposalV1 {
  const analysis = input.analysis ?? buildAnalysis(input);
  const template = input.template ?? findInquestTemplate(input.session.input.templateId);
  const sections = analysis.requirements.sections;
  const fields = analysis.requirements.fields.filter((field) => field.included);
  const pathMap = pathMapFromSections(fields, sections);

  const templateDefinition = template?.seedScaffold?.definition as Record<string, unknown> | undefined;
  const definition = templateDefinition
    ? {
        ...structuredClone(templateDefinition),
        title: input.session.title || templateDefinition.title,
        url: `urn:formspec:inquest:${input.session.sessionId}`,
      }
    : {
        $formspec: '1.0',
        url: `urn:formspec:inquest:${input.session.sessionId}`,
        version: '0.1.0',
        title: input.session.title || 'Inquest Draft',
        nonRelevantBehavior: 'remove',
        items: definitionItemsFromAnalysis(fields, sections),
      };

  const binds: Record<string, Record<string, string>> = {};
  for (const field of fields) {
    const path = pathMap.get(field.id) ?? field.key;
    if (field.required) {
      binds[path] = { ...(binds[path] ?? {}), required: 'true' };
    }
  }
  for (const rule of analysis.requirements.rules) {
    for (const fieldPath of rule.fieldPaths) {
      const actualPath = pathMap.get(fieldPath) ?? fieldPath;
      const prop = rule.kind;
      binds[actualPath] = {
        ...(binds[actualPath] ?? {}),
        ...(rule.expression ? { [prop]: rule.expression } : {}),
      };
    }
  }

  const bindCount = Object.keys(binds).length;
  (definition as Record<string, unknown>).binds = {
    ...((definition as Record<string, any>).binds ?? {}),
    ...binds,
  };

  const issues = [...analysis.issues];
  if (fields.some((field) => field.confidence === 'low')) {
    issues.push(createIssue(
      'low-confidence-fields',
      'Low confidence fields need review',
      'Some fields came from weak textual hints and should be reviewed before handoff.',
      'warning',
      'low',
      input.session.workflowMode === 'verify-carefully',
      'proposal',
    ));
  }

  return {
    definition,
    component: template?.seedScaffold?.component,
    issues,
    trace: analysis.trace,
    summary: {
      fieldCount: fields.length,
      sectionCount: sections.length,
      bindCount,
      shapeCount: 0,
      variableCount: 0,
      coverage: Math.round((fields.length / Math.max(analysis.requirements.fields.length, 1)) * 100),
    },
  };
}

export function buildEditPatch(input: InquestModelInput): CommandPatchV1 {
  const prompt = input.prompt?.trim() ?? '';
  const definition = (input.proposal?.definition as Record<string, any> | undefined) ?? {};
  const flattened = flattenDefinitionItems(Array.isArray(definition.items) ? definition.items : []);

  const resolvePath = (needle: string): string | undefined => {
    const normalized = needle.trim().toLowerCase();
    return flattened.find((entry) => entry.path.toLowerCase() === normalized
      || entry.key.toLowerCase() === normalized
      || entry.label?.toLowerCase() === normalized)?.path;
  };

  const commands: AnyCommand[] = [];
  const issues: InquestIssue[] = [];

  const makeRequired = prompt.match(/^make (.+?) required$/i);
  if (makeRequired) {
    const path = resolvePath(makeRequired[1]);
    if (path) {
      commands.push({ type: 'definition.setBind', payload: { path, properties: { required: 'true' } } });
    } else {
      issues.push(createIssue(
        'edit-required-miss',
        'Field not found',
        `Could not find a field matching "${makeRequired[1]}".`,
        'warning',
        'low',
        false,
        'provider',
      ));
    }
  }

  const addField = prompt.match(/^add (.+?) field$/i);
  if (addField) {
    const label = titleCase(addField[1]);
    commands.push({
      type: 'definition.addItem',
      payload: {
        type: 'field',
        key: toKey(addField[1]),
        label,
        dataType: /amount|income|budget|cost/i.test(addField[1])
          ? 'money'
          : /date/i.test(addField[1])
            ? 'date'
            : 'string',
      },
    });
  }

  const conditional = prompt.match(/^show (.+?) only when (.+?)$/i);
  if (conditional) {
    const targetPath = resolvePath(conditional[1]);
    const sourcePath = resolvePath(conditional[2]);
    if (targetPath && sourcePath) {
      commands.push({
        type: 'definition.setBind',
        payload: {
          path: targetPath,
          properties: { relevant: `$${sourcePath} = true` },
        },
      });
    } else {
      issues.push(createIssue(
        'edit-relevant-miss',
        'Could not map conditional edit',
        'Inquest could not confidently identify the source or target field in the requested conditional edit.',
        'warning',
        'low',
        false,
        'provider',
      ));
    }
  }

  if (commands.length === 0 && issues.length === 0) {
    issues.push(createIssue(
      'edit-unsupported',
      'Edit not translated',
      'This edit request did not match the supported command patterns yet. Use the refine workspace or a simpler phrasing.',
      'info',
      'low',
      false,
      'provider',
    ));
  }

  return { commands, issues, explanation: prompt };
}

export function createDeterministicAdapter(id: string, label: string): InquestProviderAdapter {
  return {
    id,
    label,
    capabilities: {
      chat: true,
      images: false,
      pdf: false,
      structuredOutput: true,
      streaming: false,
    },
    async testConnection(input): Promise<ConnectionResult> {
      if (!input.apiKey.trim()) {
        return { ok: false, message: 'Enter an API key to continue.' };
      }
      return { ok: true, message: `${label} is configured on this browser.` };
    },
    async runAnalysis(input) {
      return buildAnalysis(input);
    },
    async runProposal(input) {
      return buildProposal(input);
    },
    async runEdit(input) {
      return buildEditPatch(input);
    },
  };
}
