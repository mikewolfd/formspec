/** @filedesc MCP tool for changelog: list_changes, diff_from_baseline. */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ProjectRegistry } from '../registry.js';
import { wrapCall } from '../errors.js';
import { READ_ONLY } from '../annotations.js';

type ChangelogAction = 'list_changes' | 'diff_from_baseline';

interface ChangelogParams {
  action: ChangelogAction;
  fromVersion?: string;
}

export function handleChangelog(
  registry: ProjectRegistry,
  projectId: string,
  params: ChangelogParams,
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'list_changes': {
        return { changelog: project.previewChangelog() };
      }

      case 'diff_from_baseline': {
        const changes = project.diffFromBaseline(params.fromVersion);
        return {
          fromVersion: params.fromVersion ?? null,
          changeCount: changes.length,
          changes,
        };
      }
    }
  });
}

export function registerChangelog(server: McpServer, registry: ProjectRegistry): void {
  server.registerTool('formspec_changelog', {
    title: 'Changelog',
    description: 'View form change history. list_changes returns the full changelog preview. diff_from_baseline computes changes since a specific version.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['list_changes', 'diff_from_baseline']),
      fromVersion: z.string().optional().describe('Version to diff from (for diff_from_baseline)'),
    },
    annotations: READ_ONLY,
  }, async ({ project_id, action, fromVersion }) => {
    return handleChangelog(registry, project_id, { action, fromVersion });
  });
}
