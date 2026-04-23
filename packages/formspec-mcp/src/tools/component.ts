/** @filedesc MCP tool for component tree management: list, add, set property, remove nodes. */
import type { ProjectRegistry } from '../registry.js';
import { wrapCall } from '../errors.js';
import { HelperError } from '@formspec-org/studio-core';
import type { Project } from '@formspec-org/studio-core';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DESTRUCTIVE } from '../annotations.js';
import { bracketMutation } from './changeset.js';

type ComponentAction = 'list_nodes' | 'set_node_property' | 'add_node' | 'remove_node';

interface NodeRef {
  bind?: string;
  nodeId?: string;
}

interface ComponentParams {
  action: ComponentAction;
  parent?: NodeRef;
  component?: string;
  bind?: string;
  props?: Record<string, unknown>;
  node?: NodeRef;
  property?: string;
  value?: unknown;
}

export function handleComponent(
  registry: ProjectRegistry,
  projectId: string,
  params: ComponentParams,
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'list_nodes':
        return listNodes(project);

      case 'add_node':
        return addNode(project, params);

      case 'set_node_property':
        return setNodeProperty(project, params);

      case 'remove_node':
        return removeNode(project, params);
    }
  });
}

function listNodes(project: Project) {
  const componentDoc = project.component;
  const tree = (componentDoc as any)?.tree ?? null;
  return { tree };
}

function addNode(project: Project, params: ComponentParams) {
  const result = project.addComponentNode(
    params.parent!,
    params.component!,
    {
      ...(params.bind ? { bind: params.bind } : {}),
      ...(params.props ? { props: params.props } : {}),
    },
  );
  return {
    summary: `Added ${params.component} node`,
    nodeRef: result.nodeRef,
    affectedPaths: [],
    warnings: [],
  };
}

function setNodeProperty(project: Project, params: ComponentParams) {
  const target = params.node?.nodeId
    ? `__node:${params.node.nodeId}`
    : params.node?.bind;
  if (!target) {
    throw new HelperError('INVALID_TARGET', 'Node reference is required');
  }
  project.setLayoutNodeProp(target, params.property!, params.value);
  return {
    summary: `Set ${params.property} on node`,
    affectedPaths: [],
    warnings: [],
  };
}

function removeNode(project: Project, params: ComponentParams) {
  project.deleteComponentNode(params.node!);
  return {
    summary: `Removed node`,
    affectedPaths: [],
    warnings: [],
  };
}

export function registerComponent(server: McpServer, registry: ProjectRegistry): void {
  server.registerTool('formspec_component', {
    title: 'Component',
    description: 'Manage the component tree. Actions: list_nodes, add_node, set_node_property, remove_node.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['list_nodes', 'add_node', 'set_node_property', 'remove_node']),
      parent: z.object({ bind: z.string().optional(), nodeId: z.string().optional() }).optional().describe('Parent node reference (for add_node)'),
      component: z.string().optional().describe('Component type name (for add_node)'),
      bind: z.string().optional().describe('Bind to definition item key (for add_node)'),
      props: z.record(z.string(), z.unknown()).optional().describe('Component properties (for add_node)'),
      node: z.object({ bind: z.string().optional(), nodeId: z.string().optional() }).optional().describe('Node reference (for set_node_property, remove_node)'),
      property: z.string().optional().describe('Property name (for set_node_property)'),
      value: z.unknown().optional().describe('Property value (for set_node_property)'),
    },
    annotations: DESTRUCTIVE,
  }, async ({ project_id, action, parent, component, bind, props, node, property, value }) => {
    if (action === 'list_nodes') {
      return handleComponent(registry, project_id, { action });
    }
    return bracketMutation(registry, project_id, 'formspec_component', () =>
      handleComponent(registry, project_id, { action, parent, component, bind, props, node, property, value }),
    );
  });
}
