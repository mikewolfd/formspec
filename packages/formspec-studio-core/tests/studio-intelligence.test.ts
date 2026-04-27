import { describe, expect, it } from 'vitest';
import { createProject, getStudioIntelligence } from '../src/index';

describe('studio intelligence metadata', () => {
  it('derives review-grade defaults from an ordinary project', () => {
    const project = createProject();
    project.addField('name', 'Legal name', 'string');
    project.addField('irsLetter', 'IRS letter', 'file');
    project.addValidation('name', 'length(name) > 1', 'Legal name is required for review.');

    const intelligence = getStudioIntelligence(project.state);

    expect(intelligence.provenance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          objectRef: 'items.name',
          origin: 'manual',
          confidence: 'medium',
          reviewStatus: 'unreviewed',
        }),
        expect.objectContaining({
          objectRef: 'shapes.shape_1',
          origin: 'manual',
        }),
      ]),
    );
    expect(intelligence.layouts).toEqual([
      expect.objectContaining({
        id: 'default',
        name: 'Default layout',
        drift: [],
        placements: expect.arrayContaining([
          expect.objectContaining({ fieldRef: 'items.name' }),
          expect.objectContaining({ fieldRef: 'items.irsLetter' }),
        ]),
      }),
    ]);
    expect(intelligence.evidence.coverage.totalFields).toBe(2);
    expect(intelligence.evidence.coverage.missing).toBe(2);
  });

  it('preserves explicit Studio intelligence extension data', () => {
    const project = createProject({
      seed: {
        definition: {
          $formspec: '1.0',
          url: 'urn:test',
          version: '1.0.0',
          items: [{ key: 'ein', type: 'field', label: 'EIN', dataType: 'string' }],
          extensions: {
            'x-studio': {
              provenance: [{
                objectRef: 'items.ein',
                origin: 'evidence',
                rationale: 'Extracted from IRS determination letter.',
                confidence: 'high',
                sourceRefs: ['evidence.irs-letter#p1'],
                reviewStatus: 'confirmed',
              }],
              evidence: {
                documents: [{
                  id: 'irs-letter',
                  name: 'IRS determination letter.pdf',
                  mimeType: 'application/pdf',
                  fieldRefs: ['items.ein'],
                }],
              },
            },
          },
        },
      },
    });

    const intelligence = getStudioIntelligence(project.state);

    expect(intelligence.provenance[0]).toMatchObject({
      objectRef: 'items.ein',
      origin: 'evidence',
      confidence: 'high',
      reviewStatus: 'confirmed',
    });
    expect(intelligence.evidence.coverage.linkedFields).toBe(1);
    expect(intelligence.evidence.coverage.missing).toBe(0);
  });
});
