/** @filedesc MCP tool for publish lifecycle: set_version, set_status, validate_transition, get_version_info. */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ProjectRegistry } from '../registry.js';
import { successResponse, errorResponse, formatToolError, wrapCall } from '../errors.js';
import { NON_DESTRUCTIVE } from '../annotations.js';
import { bracketMutation } from './changeset.js';

type PublishAction = 'set_version' | 'set_status' | 'validate_transition' | 'get_version_info';

type LifecycleStatus = 'draft' | 'active' | 'retired';

interface PublishParams {
  action: PublishAction;
  version?: string;
  status?: LifecycleStatus;
}

const STATUS_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  draft: ['active'],
  active: ['retired'],
  retired: [],
};

export function handlePublish(
  registry: ProjectRegistry,
  projectId: string,
  params: PublishParams,
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'set_version': {
        return project.setMetadata({ version: params.version });
      }

      case 'set_status': {
        const currentStatus = ((project.definition as any).status ?? 'draft') as LifecycleStatus;
        const targetStatus = params.status!;
        const allowed = STATUS_TRANSITIONS[currentStatus] ?? [];
        if (!allowed.includes(targetStatus)) {
          return errorResponse(formatToolError(
            'INVALID_STATUS_TRANSITION',
            `Cannot transition from '${currentStatus}' to '${targetStatus}'. Allowed: ${allowed.join(', ') || 'none'}`,
            { currentStatus, targetStatus, allowedTransitions: allowed },
          ));
        }
        return project.setMetadata({ status: targetStatus });
      }

      case 'validate_transition': {
        const currentStatus = ((project.definition as any).status ?? 'draft') as LifecycleStatus;
        const targetStatus = params.status!;
        const allowed = STATUS_TRANSITIONS[currentStatus] ?? [];
        return {
          currentStatus,
          targetStatus,
          valid: allowed.includes(targetStatus),
          allowedTransitions: allowed,
        };
      }

      case 'get_version_info': {
        const def = project.definition as any;
        return {
          version: def.version ?? null,
          status: def.status ?? 'draft',
          name: def.name ?? null,
          date: def.date ?? null,
          versionAlgorithm: def.versionAlgorithm ?? null,
        };
      }
    }
  });
}

export function registerLifecycle(server: McpServer, registry: ProjectRegistry): void {
  server.registerTool('formspec_lifecycle', {
    title: 'Lifecycle',
    description: 'Manage form lifecycle status and versioning: set version string, transition lifecycle status (draft -> active -> retired), validate a proposed transition, or get current version info.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['set_version', 'set_status', 'validate_transition', 'get_version_info']),
      version: z.string().optional().describe('Semantic version string (for set_version)'),
      status: z.enum(['draft', 'active', 'retired']).optional().describe('Target lifecycle status (for set_status, validate_transition)'),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, action, version, status }) => {
    const readOnlyActions: string[] = ['validate_transition', 'get_version_info'];
    if (readOnlyActions.includes(action)) {
      return handlePublish(registry, project_id, { action, version, status });
    }
    return bracketMutation(registry, project_id, 'formspec_lifecycle', () =>
      handlePublish(registry, project_id, { action, version, status }),
    );
  });
}
