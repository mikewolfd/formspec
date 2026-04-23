/**
 * Style tool (consolidated, replaces presentation.ts):
 *   action: 'layout' | 'style' | 'style_all'
 */

import type { ProjectRegistry } from '../registry.js';
import { wrapCall, errorResponse, formatToolError } from '../errors.js';
import type { LayoutArrangement } from '@formspec-org/studio-core';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NON_DESTRUCTIVE } from '../annotations.js';
import { bracketMutation } from './changeset.js';

type StyleAction = 'layout' | 'style' | 'style_all';

interface StyleParams {
  action: StyleAction;
  // For layout
  target?: string | string[];
  arrangement?: LayoutArrangement;
  // For style / layout fallback
  path?: string;
  properties?: Record<string, unknown>;
  // For style_all
  target_type?: string;
  target_data_type?: string;
}

export function handleStyle(
  registry: ProjectRegistry,
  projectId: string,
  params: StyleParams,
) {
  if (params.action === 'layout') {
    const layoutTarget = params.target ?? params.path;
    if (!layoutTarget) {
      return errorResponse(formatToolError(
        'MISSING_PARAM',
        'layout action requires "target" or "path" parameter',
      ));
    }
    return wrapCall(() => {
      const project = registry.getProject(projectId);
      return project.applyLayout(layoutTarget, params.arrangement!);
    });
  }

  return wrapCall(() => {
    const project = registry.getProject(projectId);

    if (params.action === 'style') {
      return project.applyStyle(params.path!, params.properties!);
    }
    // style_all
    let target: 'form' | { type: 'group' | 'field' | 'display' } | { dataType: string } = 'form';
    if (params.target_type) {
      target = { type: params.target_type as 'group' | 'field' | 'display' };
    } else if (params.target_data_type) {
      target = { dataType: params.target_data_type };
    }
    return project.applyStyleAll(target, params.properties!);
  });
}

export function registerStyle(server: McpServer, registry: ProjectRegistry) {
  server.registerTool('formspec_style', {
    title: 'Style',
    description: 'Apply visual styling: layout arrangements, item-level style properties, or form-wide style defaults.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['layout', 'style', 'style_all']),
      target: z.union([z.string(), z.array(z.string())]).optional(),
      arrangement: z.enum(['columns-2', 'columns-3', 'columns-4', 'card', 'sidebar', 'inline']).optional(),
      path: z.string().optional(),
      properties: z.record(z.string(), z.unknown()).optional(),
      target_type: z.string().optional(),
      target_data_type: z.string().optional(),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, action, target, arrangement, path, properties, target_type, target_data_type }) => {
    return bracketMutation(registry, project_id, 'formspec_style', () =>
      handleStyle(registry, project_id, { action, target, arrangement, path, properties, target_type, target_data_type }),
    );
  });
}
