/**
 * Flow tool (consolidated):
 *   action: 'set_mode' | 'branch'
 */

import type { ProjectRegistry } from '../registry.js';
import { wrapCall } from '../errors.js';
import type { BranchPath, FlowProps } from '@formspec-org/studio-core';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NON_DESTRUCTIVE } from '../annotations.js';
import { bracketMutation } from './changeset.js';

type FlowAction = 'set_mode' | 'branch';

interface FlowParams {
  action: FlowAction;
  // For set_mode
  mode?: 'single' | 'wizard' | 'tabs';
  props?: FlowProps;
  // For branch
  on?: string;
  paths?: BranchPath[];
  otherwise?: string | string[];
}

export function handleFlow(
  registry: ProjectRegistry,
  projectId: string,
  params: FlowParams,
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'set_mode':
        return project.setFlow(params.mode!, params.props);
      case 'branch':
        return project.branch(params.on!, params.paths!, params.otherwise);
    }
  });
}

export function registerFlow(server: McpServer, registry: ProjectRegistry) {
  server.registerTool('formspec_flow', {
    title: 'Flow',
    description: 'Set form navigation mode or add conditional branching.\n\nAction set_mode: switch between single-page, wizard, or tabs.\nAction branch: batch shorthand for setting `relevant` expressions on page groups. Under the hood, writes the same bind property as formspec_behavior(show_when) but across multiple targets based on one field\'s value.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['set_mode', 'branch']),
      mode: z.enum(['single', 'wizard', 'tabs']).optional(),
      props: z.object({ showProgress: z.boolean(), allowSkip: z.boolean() }).partial().optional(),
      on: z.string().optional(),
      paths: z.array(z.object({
        when: z.union([z.string(), z.number(), z.boolean()]),
        show: z.union([z.string(), z.array(z.string())]),
        mode: z.enum(['equals', 'contains']).optional(),
      })).optional(),
      otherwise: z.union([z.string(), z.array(z.string())]).optional(),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, action, mode, props, on, paths, otherwise }) => {
    return bracketMutation(registry, project_id, 'formspec_flow', () =>
      handleFlow(registry, project_id, { action, mode, props, on, paths, otherwise }),
    );
  });
}
