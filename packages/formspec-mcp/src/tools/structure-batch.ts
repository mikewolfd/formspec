/** @filedesc Structure batch tool: wrap_group, batch_delete, batch_duplicate. */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { HelperError } from '@formspec-org/studio-core';
import type { ProjectRegistry } from '../registry.js';
import { wrapCall, errorResponse, formatToolError } from '../errors.js';
import { DESTRUCTIVE } from '../annotations.js';
import { bracketMutation } from './changeset.js';

export function handleStructureBatch(
  registry: ProjectRegistry,
  projectId: string,
  params: { action: string; paths: string[]; groupPath?: string; groupLabel?: string },
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);
    switch (params.action) {
      case 'wrap_group':
        return project.wrapItemsInGroup(params.paths, params.groupPath!, params.groupLabel!);
      case 'batch_delete':
        return project.batchDeleteItems(params.paths);
      case 'batch_duplicate':
        return project.batchDuplicateItems(params.paths);
      default:
        throw new HelperError('INVALID_ACTION', `Unknown structure batch action: ${params.action}`);
    }
  });
}

export function registerStructureBatch(server: McpServer, registry: ProjectRegistry): void {
  server.registerTool('formspec_structure_batch', {
    title: 'Structure Batch',
    description: 'Batch structure operations: wrap items in a group, batch delete, or batch duplicate. Action "batch_delete" is DESTRUCTIVE.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['wrap_group', 'batch_delete', 'batch_duplicate']),
      paths: z.array(z.string()).describe('Item paths to operate on'),
      groupPath: z.string().optional().describe('Group key for wrap_group action'),
      groupLabel: z.string().optional().describe('Group label for wrap_group action'),
    },
    annotations: DESTRUCTIVE,
  }, async ({ project_id, action, paths, groupPath, groupLabel }) => {
    return bracketMutation(registry, project_id, 'formspec_structure_batch', () =>
      handleStructureBatch(registry, project_id, { action, paths, groupPath, groupLabel }),
    );
  });
}
