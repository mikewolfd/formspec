/** @filedesc Widget vocabulary query tool — list widgets, compatible widgets, field type catalog. */

import type { ProjectRegistry } from '../registry.js';
import { wrapCall } from '../errors.js';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { READ_ONLY } from '../annotations.js';

type WidgetAction = 'list_widgets' | 'compatible' | 'field_types';

interface WidgetParams {
  action: WidgetAction;
  dataType?: string;
}

export function handleWidget(
  registry: ProjectRegistry,
  projectId: string,
  params: WidgetParams,
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'list_widgets':
        return project.listWidgets();
      case 'compatible':
        return project.compatibleWidgets(params.dataType!);
      case 'field_types':
        return project.fieldTypeCatalog();
    }
  });
}

export function registerWidget(server: McpServer, registry: ProjectRegistry) {
  server.registerTool('formspec_widget', {
    title: 'Widget',
    description: 'Query widget vocabulary: list all widgets, find compatible widgets for a data type, or get the field type catalog. For signature capture, use dataType "attachment" with widgetHint "signature".',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['list_widgets', 'compatible', 'field_types']),
      data_type: z.string().optional().describe('Data type to check compatibility for (used with action="compatible")'),
    },
    annotations: READ_ONLY,
  }, async ({ project_id, action, data_type }) => {
    return handleWidget(registry, project_id, { action, dataType: data_type });
  });
}
