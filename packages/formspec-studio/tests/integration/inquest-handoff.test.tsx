import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createProject } from 'formspec-studio-core';
import { StudioApp } from '../../src/studio-app/StudioApp';
import { saveBootstrapProject, saveHandoffPayload } from 'formspec-shared';
import type { InquestHandoffPayloadV1 } from 'formspec-shared';

describe('StudioApp handoff', () => {
  it('applies a new-project handoff into Studio', async () => {
    const handoffId = crypto.randomUUID();
    window.history.replaceState({}, '', `/studio/?h=${handoffId}`);

    const payload: InquestHandoffPayloadV1 = {
      version: 1,
      mode: 'new-project',
      handoffId,
      commandBundle: [],
      scaffold: {
        definition: {
          $formspec: '1.0',
          url: 'urn:test:handoff:new',
          version: '0.1.0',
          title: 'Imported From Inquest',
          items: [{ type: 'field', key: 'name', label: 'Name', dataType: 'string' }],
        },
      },
      inquest: {
        sessionId: 'session-new',
        workflowMode: 'verify-carefully',
        inputs: [],
        analysisSummary: 'Test analysis',
        proposalSummary: {
          fieldCount: 1,
          sectionCount: 1,
          bindCount: 0,
          shapeCount: 0,
          variableCount: 0,
          coverage: 100,
        },
        issues: [],
      },
      createdAt: new Date().toISOString(),
    };

    await saveHandoffPayload(payload);

    const project = createProject();
    render(<StudioApp project={project} />);

    await screen.findByText(/Inquest handoff applied/i);
    expect(project.definition.title).toBe('Imported From Inquest');
    expect((project.definition as any)['x-inquest']?.sessionId).toBe('session-new');
  });

  it('stages and applies an import-subform handoff', async () => {
    const projectId = crypto.randomUUID();
    const handoffId = crypto.randomUUID();
    window.history.replaceState({}, '', `/studio/?h=${handoffId}`);

    await saveBootstrapProject(projectId, {
      definition: {
        $formspec: '1.0',
        url: 'urn:test:host',
        version: '0.1.0',
        title: 'Host',
        items: [
          {
            type: 'group',
            key: 'container',
            label: 'Container',
            children: [],
          },
        ],
      } as any,
      component: {} as any,
      theme: {} as any,
      mapping: {} as any,
    });

    const payload: InquestHandoffPayloadV1 = {
      version: 1,
      mode: 'import-subform',
      handoffId,
      target: {
        projectId,
        groupPath: 'container',
      },
      commandBundle: [],
      scaffold: {
        definition: {
          $formspec: '1.0',
          url: 'urn:test:subform',
          version: '0.1.0',
          title: 'Subform',
          items: [{ type: 'field', key: 'importedField', label: 'Imported Field', dataType: 'string' }],
          binds: {
            importedField: { required: 'true' },
          },
        },
      },
      inquest: {
        sessionId: 'session-import',
        workflowMode: 'draft-fast',
        inputs: [],
        analysisSummary: 'Test analysis',
        proposalSummary: {
          fieldCount: 1,
          sectionCount: 1,
          bindCount: 1,
          shapeCount: 0,
          variableCount: 0,
          coverage: 100,
        },
        issues: [],
      },
      createdAt: new Date().toISOString(),
    };

    await saveHandoffPayload(payload);

    const project = createProject();
    render(<StudioApp project={project} />);

    await waitFor(() => {
      expect(project.itemAt('container.importedField')).toBeDefined();
    });
    expect(project.bindFor('container.importedField')?.required).toBe('true');
    expect((project.definition as any)['x-inquest']?.sessionId).toBe('session-import');
  });
});
