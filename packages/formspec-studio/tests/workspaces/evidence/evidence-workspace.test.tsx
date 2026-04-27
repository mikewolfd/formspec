import { fireEvent, render, screen, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createProject, getStudioIntelligence, type Project } from '@formspec-org/studio-core';
import { ProjectProvider } from '../../../src/state/ProjectContext';
import { EvidenceWorkspace } from '../../../src/workspaces/evidence/EvidenceWorkspace';

function renderEvidence(project?: Project) {
  const p = project ?? createProject();
  p.addField('ein', 'EIN', 'string');
  p.addField('legalName', 'Legal name', 'string');
  const result = render(
    <ProjectProvider project={p}>
      <EvidenceWorkspace />
    </ProjectProvider>,
  );
  return { ...result, project: p };
}

describe('EvidenceWorkspace', () => {
  it('uploads a source document into Studio intelligence metadata', async () => {
    const { container, project } = renderEvidence();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, {
        target: {
          files: [new File(['source'], 'IRS letter.pdf', { type: 'application/pdf' })],
        },
      });
    });

    expect(screen.getByText('IRS letter.pdf')).toBeInTheDocument();
    expect(getStudioIntelligence(project.state).evidence.documents).toEqual([
      expect.objectContaining({ name: 'IRS letter.pdf', mimeType: 'application/pdf' }),
    ]);
  });

  it('links a missing field to the first source and updates coverage', async () => {
    const { container, project } = renderEvidence();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(input, {
        target: {
          files: [new File(['source'], 'IRS letter.pdf', { type: 'application/pdf' })],
        },
      });
    });

    await act(async () => {
      screen.getAllByRole('button', { name: /link source/i })[0].click();
    });

    const intelligence = getStudioIntelligence(project.state);
    expect(intelligence.evidence.coverage.linkedFields).toBe(1);
    expect(intelligence.provenance).toContainEqual(
      expect.objectContaining({
        objectRef: 'items.ein',
        origin: 'evidence',
        reviewStatus: 'confirmed',
      }),
    );
  });
});
