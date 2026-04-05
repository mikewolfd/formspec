/** @filedesc MCP tool for component tree management: list, add, set property, remove nodes. */
import type { ProjectRegistry } from '../registry.js';
import { successResponse, errorResponse, formatToolError } from '../errors.js';
import { HelperError } from '@formspec-org/studio-core';
import type { Project } from '@formspec-org/studio-core';

type ComponentAction = 'list_nodes' | 'set_node_property' | 'add_node' | 'remove_node';

interface NodeRef {
  bind?: string;
  nodeId?: string;
}

interface ComponentParams {
  action: ComponentAction;
  // For add_node
  parent?: NodeRef;
  component?: string;
  bind?: string;
  props?: Record<string, unknown>;
  // For set_node_property
  node?: NodeRef;
  property?: string;
  value?: unknown;
}

export function handleComponent(
  registry: ProjectRegistry,
  projectId: string,
  params: ComponentParams,
) {
  try {
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
  } catch (err) {
    if (err instanceof HelperError) {
      return errorResponse(formatToolError(err.code, err.message, err.detail as Record<string, unknown>));
    }
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(formatToolError('COMMAND_FAILED', message));
  }
}

// ── Internal helpers ─────────────────────────────────────────────────

function listNodes(project: Project) {
  const componentDoc = project.component;
  const tree = (componentDoc as any)?.tree ?? null;
  return successResponse({ tree });
}

function addNode(project: Project, params: ComponentParams) {
  try {
    const result = project.addComponentNode(
      params.parent!,
      params.component!,
      {
        ...(params.bind ? { bind: params.bind } : {}),
        ...(params.props ? { props: params.props } : {}),
      },
    );
    return successResponse({
      summary: `Added ${params.component} node`,
      nodeRef: result.nodeRef,
      affectedPaths: [],
      warnings: [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(formatToolError('COMMAND_FAILED', message));
  }
}

function setNodeProperty(project: Project, params: ComponentParams) {
  try {
    const target = params.node?.nodeId
      ? `__node:${params.node.nodeId}`
      : params.node?.bind;
    if (!target) {
      throw new HelperError('INVALID_TARGET', 'Node reference is required');
    }
    project.setLayoutNodeProp(target, params.property!, params.value);
    return successResponse({
      summary: `Set ${params.property} on node`,
      affectedPaths: [],
      warnings: [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(formatToolError('COMMAND_FAILED', message));
  }
}

function removeNode(project: Project, params: ComponentParams) {
  try {
    project.deleteComponentNode(params.node!);
    return successResponse({
      summary: `Removed node`,
      affectedPaths: [],
      warnings: [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(formatToolError('COMMAND_FAILED', message));
  }
}
