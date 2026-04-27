import { describe, expect, it } from 'vitest';
import { createProject, type FormDefinition } from '@formspec-org/studio-core';
import {
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
});
