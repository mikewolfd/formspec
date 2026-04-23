/**
 * Data tool (consolidated):
 *   resource: 'choices' | 'variable' | 'instance'
 *   action: 'add' | 'update' | 'remove' | 'rename'
 */

import type { ProjectRegistry } from '../registry.js';
import { wrapCall } from '../errors.js';
import type { ChoiceOption, InstanceProps } from '@formspec-org/studio-core';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DESTRUCTIVE } from '../annotations.js';
import { bracketMutation } from './changeset.js';

type DataResource = 'choices' | 'variable' | 'instance';
type DataAction = 'add' | 'update' | 'remove' | 'rename';

interface DataParams {
  resource: DataResource;
  action: DataAction;
  name: string;
  // For choices add
  options?: ChoiceOption[];
  // For variable add/update
  expression?: string;
  scope?: string;
  // For instance add/update
  props?: InstanceProps;
  changes?: Partial<InstanceProps>;
  // For rename
  new_name?: string;
}

export function handleData(
  registry: ProjectRegistry,
  projectId: string,
  params: DataParams,
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);
    const { resource, action, name } = params;

    if (resource === 'choices') {
      if (action !== 'add') {
        throw new Error(`Choices only supports 'add' action, got '${action}'`);
      }
      return project.defineChoices(name, params.options!);
    }

    if (resource === 'variable') {
      switch (action) {
        case 'add': return project.addVariable(name, params.expression!, params.scope);
        case 'update': return project.updateVariable(name, params.expression!);
        case 'remove': return project.removeVariable(name);
        case 'rename': return project.renameVariable(name, params.new_name!);
      }
    }

    if (resource === 'instance') {
      switch (action) {
        case 'add': return project.addInstance(name, params.props!);
        case 'update': return project.updateInstance(name, params.changes!);
        case 'remove': return project.removeInstance(name);
        case 'rename': return project.renameInstance(name, params.new_name!);
      }
    }

    throw new Error(`Unknown resource '${resource}'`);
  });
}

export function registerData(server: McpServer, registry: ProjectRegistry) {
  server.registerTool('formspec_data', {
    title: 'Data',
    description: 'Manage reusable choice lists, computed variables, and external data instances.',
    inputSchema: {
      project_id: z.string(),
      resource: z.enum(['choices', 'variable', 'instance']),
      action: z.enum(['add', 'update', 'remove', 'rename']),
      name: z.string(),
      options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
      expression: z.string().optional(),
      scope: z.string().optional(),
      props: z.object({ source: z.string(), data: z.unknown(), schema: z.record(z.string(), z.unknown()), static: z.boolean(), readonly: z.boolean(), description: z.string() }).partial().optional(),
      changes: z.object({ source: z.string(), data: z.unknown(), schema: z.record(z.string(), z.unknown()), static: z.boolean(), readonly: z.boolean(), description: z.string() }).partial().optional(),
      new_name: z.string().optional(),
    },
    annotations: DESTRUCTIVE,
  }, async ({ project_id, resource, action, name, options, expression, scope, props, changes, new_name }) => {
    return bracketMutation(registry, project_id, 'formspec_data', () =>
      handleData(registry, project_id, { resource, action, name, options, expression, scope, props, changes, new_name }),
    );
  });
}
