/** @filedesc UI helpers for writing Studio intelligence metadata into definition extensions. */
import {
  STUDIO_EXTENSION_KEY,
  type EvidenceDocument,
  type FieldProvenance,
  type LayoutDocument,
  type StudioConfidence,
  type StudioOrigin,
  type StudioPatch,
  type StudioReviewStatus,
  type Project,
} from '@formspec-org/studio-core';

export interface WritableStudioExtension {
  provenance: FieldProvenance[];
  evidence: { documents: EvidenceDocument[] };
  layouts: LayoutDocument[];
  patches: StudioPatch[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function currentExtension(project: Project): WritableStudioExtension {
  const rawExtensions = isRecord(project.definition.extensions) ? project.definition.extensions : {};
  const raw = isRecord(rawExtensions[STUDIO_EXTENSION_KEY]) ? rawExtensions[STUDIO_EXTENSION_KEY] : {};
  const evidence = isRecord(raw.evidence) ? raw.evidence : {};
  return {
    provenance: Array.isArray(raw.provenance) ? raw.provenance as FieldProvenance[] : [],
    evidence: {
      documents: Array.isArray(evidence.documents) ? evidence.documents as EvidenceDocument[] : [],
    },
    layouts: Array.isArray(raw.layouts) ? raw.layouts as LayoutDocument[] : [],
    patches: Array.isArray(raw.patches) ? raw.patches as StudioPatch[] : [],
  };
}

export function updateStudioExtension(project: Project, updater: (draft: WritableStudioExtension) => WritableStudioExtension): void {
  const bundle = project.export();
  const next = updater(currentExtension(project));
  const extensions = {
    ...(isRecord(bundle.definition.extensions) ? bundle.definition.extensions : {}),
    [STUDIO_EXTENSION_KEY]: next,
  };
  project.loadBundle({
    ...bundle,
    definition: {
      ...bundle.definition,
      extensions,
    },
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function patchId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function upsertStudioPatch(project: Project, patch: StudioPatch): void {
  updateStudioExtension(project, (draft) => {
    const existingIndex = draft.patches.findIndex((entry) => entry.id === patch.id);
    if (existingIndex >= 0) {
      const nextPatches = [...draft.patches];
      nextPatches[existingIndex] = {
        ...nextPatches[existingIndex],
        ...patch,
        affectedRefs: unique([...(nextPatches[existingIndex].affectedRefs ?? []), ...(patch.affectedRefs ?? [])]),
      };
      return { ...draft, patches: nextPatches };
    }
    return {
      ...draft,
      patches: [...draft.patches, { ...patch, affectedRefs: unique(patch.affectedRefs ?? []) }],
    };
  });
}

export function upsertFieldProvenance(project: Project, entries: FieldProvenance[]): void {
  if (entries.length === 0) return;
  updateStudioExtension(project, (draft) => {
    const byRef = new Map(draft.provenance.map((entry) => [entry.objectRef, entry]));
    for (const incoming of entries) {
      const existing = byRef.get(incoming.objectRef);
      if (!existing) {
        byRef.set(incoming.objectRef, {
          ...incoming,
          sourceRefs: unique(incoming.sourceRefs ?? []),
          patchRefs: unique(incoming.patchRefs ?? []),
        });
        continue;
      }
      byRef.set(incoming.objectRef, {
        ...existing,
        ...incoming,
        sourceRefs: unique([...(existing.sourceRefs ?? []), ...(incoming.sourceRefs ?? [])]),
        patchRefs: unique([...(existing.patchRefs ?? []), ...(incoming.patchRefs ?? [])]),
      });
    }
    return { ...draft, provenance: [...byRef.values()] };
  });
}

export function recordManualPatchAndProvenance(
  project: Project,
  params: {
    summary: string;
    affectedRefs: string[];
    sourceRefs?: string[];
    confidence?: StudioConfidence;
    reviewStatus?: StudioReviewStatus;
    origin?: StudioOrigin;
  },
): string {
  const id = patchId('manual');
  const affectedRefs = unique(params.affectedRefs);
  upsertStudioPatch(project, {
    id,
    source: params.origin ?? 'manual',
    scope: 'spec',
    summary: params.summary,
    affectedRefs,
    status: 'accepted',
  });
  upsertFieldProvenance(project, affectedRefs.map((ref) => ({
    objectRef: ref,
    origin: params.origin ?? 'manual',
    rationale: params.summary,
    confidence: params.confidence ?? 'medium',
    sourceRefs: params.sourceRefs ?? [],
    patchRefs: [id],
    reviewStatus: params.reviewStatus ?? 'confirmed',
  })));
  return id;
}
