import { describe, expect, it } from 'vitest';
import { InquestDraft } from '../../src/shared/authoring/inquest-draft';
import type { ProposalV1 } from '../../src/shared/contracts/inquest';

const proposal: ProposalV1 = {
  definition: {
    $formspec: '1.0',
    url: 'urn:test:inquest-draft',
    version: '0.1.0',
    title: 'Draft Test',
    items: [
      { type: 'field', key: 'name', label: 'Name', dataType: 'string' },
    ],
    binds: {
      name: { required: 'true()' },
    },
  },
  issues: [],
  trace: {},
  summary: {
    fieldCount: 1,
    sectionCount: 1,
    bindCount: 1,
    shapeCount: 0,
    variableCount: 0,
    coverage: 100,
  },
};

describe('InquestDraft', () => {
  it('loads a proposal into a real project and delegates statistics/export', () => {
    const draft = new InquestDraft();
    draft.loadProposal(proposal);

    expect(draft.statistics().fieldCount).toBe(1);
    expect(draft.export().definition.title).toBe('Draft Test');
    expect(draft.log()).toHaveLength(1);
  });

  it('applies command patches through project.batch/dispatch and clones for preflight', () => {
    const draft = new InquestDraft();
    draft.loadProposal(proposal);
    draft.applyCommands([
      {
        type: 'definition.addItem',
        payload: { type: 'field', key: 'email', label: 'Email', dataType: 'string' },
      },
    ]);

    expect(draft.statistics().fieldCount).toBe(2);
    const clone = draft.cloneForPreflight();
    expect(clone.export().definition.items).toHaveLength(2);
  });
});
