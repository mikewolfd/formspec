/** @filedesc Studio provenance, evidence, layout-document, and patch metadata helpers. */
import type { FormDefinition, FormItem, ProjectSnapshot } from './types.js';

export const STUDIO_EXTENSION_KEY = 'x-studio';

export type StudioOrigin = 'brief' | 'manual' | 'ai' | 'evidence' | 'playthrough';
export type StudioConfidence = 'low' | 'medium' | 'high';
export type StudioReviewStatus = 'unreviewed' | 'confirmed' | 'conflict' | 'missing';

export interface FieldProvenance {
  objectRef: string;
  origin: StudioOrigin;
  rationale?: string;
  confidence: StudioConfidence;
  sourceRefs: string[];
  author?: string;
  patchRefs: string[];
  reviewStatus: StudioReviewStatus;
}

export interface EvidenceDocument {
  id: string;
  name: string;
  mimeType: string;
  hash?: string;
  fieldRefs: string[];
  redactionPolicy?: string[];
}

export interface EvidenceCoverage {
  totalFields: number;
  linkedFields: number;
  missing: number;
  conflicts: number;
}

export interface EvidenceWorkbench {
  documents: EvidenceDocument[];
  coverage: EvidenceCoverage;
}

export interface LayoutPlacement {
  fieldRef: string;
  pageId?: string;
  hidden?: boolean;
}

export interface LayoutDrift {
  fieldRef: string;
  changeKind?: 'added' | 'changed' | 'removed';
  status: 'open' | 'placed' | 'hidden' | 'skipped';
}

export interface LayoutDocument {
  id: string;
  name: string;
  channel: string;
  baseSpecVersion?: string;
  placements: LayoutPlacement[];
  hiddenFields: string[];
  drift: LayoutDrift[];
  version?: string;
  publishStatus?: 'draft' | 'live';
}

export interface StudioPatch {
  id: string;
  source: StudioOrigin;
  scope: 'spec' | 'layout' | 'evidence' | 'playthrough';
  summary: string;
  affectedRefs: string[];
  status: 'open' | 'accepted' | 'rejected' | 'reverted';
}

export interface StudioIntelligence {
  provenance: FieldProvenance[];
  evidence: EvidenceWorkbench;
  layouts: LayoutDocument[];
  patches: StudioPatch[];
}

type StudioExtensionInput = Partial<Omit<StudioIntelligence, 'evidence'>> & {
  evidence?: Partial<EvidenceWorkbench>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function origin(value: unknown): StudioOrigin {
  return value === 'brief' || value === 'ai' || value === 'evidence' || value === 'playthrough' || value === 'manual'
    ? value
    : 'manual';
}

function confidence(value: unknown): StudioConfidence {
  return value === 'low' || value === 'high' || value === 'medium' ? value : 'medium';
}

function reviewStatus(value: unknown): StudioReviewStatus {
  return value === 'confirmed' || value === 'conflict' || value === 'missing' || value === 'unreviewed'
    ? value
    : 'unreviewed';
}

function flattenFields(items: readonly FormItem[] | undefined, prefix = 'items'): Array<{ ref: string; item: FormItem }> {
  const rows: Array<{ ref: string; item: FormItem }> = [];
  for (const item of items ?? []) {
    const key = typeof item.key === 'string' ? item.key : undefined;
    if (!key) continue;
    const ref = `${prefix}.${key}`;
    if (item.type === 'field') rows.push({ ref, item });
    if (Array.isArray(item.children)) rows.push(...flattenFields(item.children, ref));
  }
  return rows;
}

function shapeRefs(definition: FormDefinition): string[] {
  const shapes = Array.isArray(definition.shapes) ? definition.shapes : [];
  return shapes.map((shape, index) => {
    const named = isRecord(shape) ? asString(shape.name) || asString(shape.id) : undefined;
    return `shapes.${named ?? index}`;
  });
}

function readExtension(definition: FormDefinition): StudioExtensionInput {
  const extensions = isRecord(definition.extensions) ? definition.extensions : {};
  const candidate = extensions[STUDIO_EXTENSION_KEY];
  return isRecord(candidate) ? candidate as StudioExtensionInput : {};
}

function normalizeProvenance(value: unknown): FieldProvenance[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const objectRef = asString(entry.objectRef);
    if (!objectRef) return [];
    return [{
      objectRef,
      origin: origin(entry.origin),
      rationale: asString(entry.rationale),
      confidence: confidence(entry.confidence),
      sourceRefs: asStringArray(entry.sourceRefs),
      author: asString(entry.author),
      patchRefs: asStringArray(entry.patchRefs),
      reviewStatus: reviewStatus(entry.reviewStatus),
    }];
  });
}

function normalizeEvidenceDocuments(value: unknown): EvidenceDocument[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const id = asString(entry.id);
    const name = asString(entry.name);
    if (!id || !name) return [];
    return [{
      id,
      name,
      mimeType: asString(entry.mimeType) ?? 'application/octet-stream',
      hash: asString(entry.hash),
      fieldRefs: asStringArray(entry.fieldRefs),
      redactionPolicy: asStringArray(entry.redactionPolicy),
    }];
  });
}

function normalizeLayouts(value: unknown): LayoutDocument[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const id = asString(entry.id);
    const name = asString(entry.name);
    if (!id || !name) return [];
    const placements = Array.isArray(entry.placements)
      ? entry.placements.flatMap((placement): LayoutPlacement[] => {
          if (!isRecord(placement)) return [];
          const fieldRef = asString(placement.fieldRef);
          if (!fieldRef) return [];
          return [{
            fieldRef,
            pageId: asString(placement.pageId),
            hidden: placement.hidden === true,
          }];
        })
      : [];
    const drift = Array.isArray(entry.drift)
      ? entry.drift.flatMap((driftEntry): LayoutDrift[] => {
          if (!isRecord(driftEntry)) return [];
          const fieldRef = asString(driftEntry.fieldRef);
          if (!fieldRef) return [];
          const status = driftEntry.status === 'placed' || driftEntry.status === 'hidden' || driftEntry.status === 'skipped'
            ? driftEntry.status
            : 'open';
          const changeKind = driftEntry.changeKind === 'changed' || driftEntry.changeKind === 'removed' ? driftEntry.changeKind : 'added';
          return [{ fieldRef, status, changeKind }];
        })
      : [];
    return [{
      id,
      name,
      channel: asString(entry.channel) ?? 'Default channel',
      baseSpecVersion: asString(entry.baseSpecVersion),
      placements,
      hiddenFields: asStringArray(entry.hiddenFields),
      drift,
      version: asString(entry.version),
      publishStatus: entry.publishStatus === 'live' ? 'live' : 'draft',
    }];
  });
}

function normalizePatches(value: unknown): StudioPatch[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const id = asString(entry.id);
    const summary = asString(entry.summary);
    if (!id || !summary) return [];
    const scope = entry.scope === 'layout' || entry.scope === 'evidence' || entry.scope === 'playthrough' ? entry.scope : 'spec';
    const status = entry.status === 'accepted' || entry.status === 'rejected' || entry.status === 'reverted' ? entry.status : 'open';
    return [{
      id,
      source: origin(entry.source),
      scope,
      summary,
      affectedRefs: asStringArray(entry.affectedRefs),
      status,
    }];
  });
}

function mergeProvenance(defaults: FieldProvenance[], explicit: FieldProvenance[]): FieldProvenance[] {
  const byRef = new Map(defaults.map((entry) => [entry.objectRef, entry]));
  for (const entry of explicit) byRef.set(entry.objectRef, entry);
  return [...byRef.values()];
}

function evidenceCoverage(fields: Array<{ ref: string; item: FormItem }>, provenance: FieldProvenance[], documents: EvidenceDocument[]): EvidenceCoverage {
  const fieldRefs = new Set(fields.map((field) => field.ref));
  const linked = new Set<string>();
  let conflicts = 0;
  for (const entry of provenance) {
    if (fieldRefs.has(entry.objectRef) && entry.sourceRefs.length > 0) linked.add(entry.objectRef);
    if (entry.reviewStatus === 'conflict') conflicts += 1;
  }
  for (const document of documents) {
    for (const ref of document.fieldRefs) {
      if (fieldRefs.has(ref)) linked.add(ref);
    }
  }
  return {
    totalFields: fieldRefs.size,
    linkedFields: linked.size,
    missing: Math.max(0, fieldRefs.size - linked.size),
    conflicts,
  };
}

export function getStudioIntelligence(snapshot: Pick<ProjectSnapshot, 'definition'>): StudioIntelligence {
  const definition = snapshot.definition;
  const fields = flattenFields(definition.items);
  const defaults: FieldProvenance[] = [
    ...fields.map(({ ref, item }) => ({
      objectRef: ref,
      origin: 'manual' as const,
      rationale: typeof item.label === 'string' && item.label
        ? `Field "${item.label}" exists in the authored definition.`
        : 'Field exists in the authored definition.',
      confidence: 'medium' as const,
      sourceRefs: [],
      patchRefs: [],
      reviewStatus: 'unreviewed' as const,
    })),
    ...shapeRefs(definition).map((ref) => ({
      objectRef: ref,
      origin: 'manual' as const,
      rationale: 'Validation rule exists in the authored definition.',
      confidence: 'medium' as const,
      sourceRefs: [],
      patchRefs: [],
      reviewStatus: 'unreviewed' as const,
    })),
  ];
  const extension = readExtension(definition);
  const provenance = mergeProvenance(defaults, normalizeProvenance(extension.provenance));
  const documents = normalizeEvidenceDocuments(extension.evidence?.documents);
  const layouts = normalizeLayouts(extension.layouts);
  const defaultLayout: LayoutDocument = {
    id: 'default',
    name: 'Default layout',
    channel: 'Primary form',
    baseSpecVersion: definition.version,
    placements: fields.map(({ ref }) => ({ fieldRef: ref })),
    hiddenFields: [],
    drift: [],
    version: definition.version,
    publishStatus: definition.status === 'active' ? 'live' : 'draft',
  };
  return {
    provenance,
    evidence: {
      documents,
      coverage: evidenceCoverage(fields, provenance, documents),
    },
    layouts: layouts.length > 0 ? layouts : [defaultLayout],
    patches: normalizePatches(extension.patches),
  };
}
