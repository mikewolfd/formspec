import { describe, expect, it } from 'vitest';
import { createProject, type FormDefinition } from '@formspec-org/studio-core';
import {
  recordAiPatchLifecycle,
  recordManualPatchAndProvenance,
  upsertFieldProvenance,
  upsertStudioPatch,
} from '../../../src/workspaces/shared/studio-intelligence-writer';

function seededDefinition(): FormDefinition {
  return {
    $formspec: '1.0',
    name: 'writer-test',
    title: 'Writer Test',
    status: 'draft',
    items: [{ key: 'name', type: 'field', label: 'Name', dataType: 'string' }],
  } as FormDefinition;
}

function studioExtension(project: ReturnType<typeof createProject>) {
  return (project.definition.extensions as Record<string, any> | undefined)?.['x-studio'];
}

describe('studio-intelligence-writer', () => {
  it('upserts patch records and deduplicates affected refs', () => {
    const project = createProject({ seed: { definition: seededDefinition() } });

    upsertStudioPatch(project, {
      id: 'patch-1',
      source: 'ai',
      scope: 'spec',
      summary: 'First pass',
      affectedRefs: ['items.name', 'items.name'],
      status: 'open',
    });
    upsertStudioPatch(project, {
      id: 'patch-1',
      source: 'ai',
      scope: 'spec',
      summary: 'Updated summary',
      affectedRefs: ['items.email', 'items.name'],
      status: 'accepted',
    });

    const ext = studioExtension(project);
    expect(ext).toBeDefined();
    expect(ext.patches).toHaveLength(1);
    expect(ext.patches[0].summary).toBe('Updated summary');
    expect(ext.patches[0].status).toBe('accepted');
    expect(ext.patches[0].affectedRefs.sort()).toEqual(['items.email', 'items.name']);
  });

  it('upserts provenance and merges source/patch refs by objectRef', () => {
    const project = createProject({ seed: { definition: seededDefinition() } });

    upsertFieldProvenance(project, [{
      objectRef: 'items.name',
      origin: 'manual',
      confidence: 'medium',
      sourceRefs: ['source.one'],
      patchRefs: ['patch-a'],
      reviewStatus: 'unreviewed',
    }]);
    upsertFieldProvenance(project, [{
      objectRef: 'items.name',
      origin: 'ai',
      confidence: 'high',
      sourceRefs: ['source.two'],
      patchRefs: ['patch-b', 'patch-a'],
      reviewStatus: 'confirmed',
    }]);

    const ext = studioExtension(project);
    expect(ext).toBeDefined();
    expect(ext.provenance).toHaveLength(1);
    const provenance = ext.provenance[0];
    expect(provenance.objectRef).toBe('items.name');
    expect(provenance.origin).toBe('ai');
    expect(provenance.confidence).toBe('high');
    expect(provenance.reviewStatus).toBe('confirmed');
    expect(provenance.sourceRefs.sort()).toEqual(['source.one', 'source.two']);
    expect(provenance.patchRefs.sort()).toEqual(['patch-a', 'patch-b']);
  });

  it('records a manual patch and linked provenance in one call', () => {
    const project = createProject({ seed: { definition: seededDefinition() } });

    const patchRef = recordManualPatchAndProvenance(project, {
      summary: 'Updated Name label.',
      affectedRefs: ['items.name'],
    });

    const ext = studioExtension(project);
    expect(ext).toBeDefined();
    expect(ext.patches.some((patch: any) => patch.id === patchRef && patch.source === 'manual')).toBe(true);
    expect(ext.provenance.some((entry: any) => (
      entry.objectRef === 'items.name'
      && entry.patchRefs.includes(patchRef)
      && entry.origin === 'manual'
    ))).toBe(true);
  });

  it('records accepted AI patch lifecycle and linked provenance', () => {
    const project = createProject({ seed: { definition: seededDefinition() } });

    const patchRef = recordAiPatchLifecycle(project, {
      changesetId: '123',
      summary: 'AI accepted a field update.',
      affectedRefs: ['items.name'],
      status: 'accepted',
      capability: 'field_group_crud',
    });

    const ext = studioExtension(project);
    expect(ext).toBeDefined();
    expect(patchRef).toBe('changeset:123');
    expect(ext.patches.some((patch: any) => patch.id === 'changeset:123' && patch.status === 'accepted')).toBe(true);
    expect(ext.provenance.some((entry: any) => (
      entry.objectRef === 'items.name'
      && entry.patchRefs.includes('changeset:123')
      && entry.origin === 'ai'
    ))).toBe(true);
  });

  it('emits authoring fallback telemetry when AI changes are rejected', () => {
    const project = createProject({ seed: { definition: seededDefinition() } });
    const telemetry: Array<Record<string, unknown>> = [];
    const listener = (event: Event) => {
      telemetry.push((event as CustomEvent<Record<string, unknown>>).detail);
    };
    window.addEventListener('formspec:authoring-telemetry', listener);

    try {
      recordAiPatchLifecycle(project, {
        changesetId: 'rejected-1',
        summary: 'AI suggestion rejected.',
        affectedRefs: ['items.name'],
        status: 'rejected',
        capability: 'patch_lifecycle',
        fallbackReason: 'rejected_in_review',
      });
    } finally {
      window.removeEventListener('formspec:authoring-telemetry', listener);
    }

    expect(telemetry.some((detail) => detail.name === 'authoring_capability_method_used' && detail.outcome === 'rejected')).toBe(true);
    expect(telemetry.some((detail) => (
      detail.name === 'authoring_capability_fallback'
      && detail.outcome === 'fallback'
      && detail.fallbackReason === 'rejected_in_review'
    ))).toBe(true);
  });
});
