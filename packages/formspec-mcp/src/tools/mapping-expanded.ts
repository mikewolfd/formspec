/** @filedesc MCP tool for mapping rule CRUD: add_mapping, remove_mapping, list_mappings, auto_map. */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ProjectRegistry } from '../registry.js';
import { wrapCall } from '../errors.js';
import { NON_DESTRUCTIVE } from '../annotations.js';
import { bracketMutation } from './changeset.js';

type MappingAction = 'add_mapping' | 'remove_mapping' | 'list_mappings' | 'auto_map';

interface MappingParams {
  action: MappingAction;
  mappingId?: string;
  // For add_mapping
  sourcePath?: string;
  targetPath?: string;
  transform?: string;
  insertIndex?: number;
  // For remove_mapping
  ruleIndex?: number;
  // For auto_map
  scopePath?: string;
  replace?: boolean;
}

export function handleMappingExpanded(
  registry: ProjectRegistry,
  projectId: string,
  params: MappingParams,
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'add_mapping': {
        project.addMappingRule({
          ...(params.mappingId ? { mappingId: params.mappingId } : {}),
          sourcePath: params.sourcePath,
          targetPath: params.targetPath,
          transform: params.transform ?? 'preserve',
          ...(params.insertIndex !== undefined ? { insertIndex: params.insertIndex } : {}),
        });

        const mapping = params.mappingId
          ? (project.mappings as any)[params.mappingId]
          : project.mapping;
        const rules = (mapping as any)?.rules ?? [];

        return {
          ruleCount: rules.length,
          summary: `Added mapping: ${params.sourcePath} → ${params.targetPath}`,
        };
      }

      case 'remove_mapping': {
        const ruleIndex = params.ruleIndex!;
        project.removeMappingRule(ruleIndex, params.mappingId);

        return {
          removedIndex: ruleIndex,
          summary: `Removed mapping rule at index ${ruleIndex}`,
        };
      }

      case 'list_mappings': {
        const mappingId = params.mappingId;
        if (mappingId) {
          const mapping = (project.mappings as any)[mappingId];
          return {
            mappingId,
            rules: mapping?.rules ?? [],
          };
        }

        const result: Record<string, unknown> = {};
        for (const [id, m] of Object.entries(project.mappings)) {
          result[id] = { rules: (m as any).rules ?? [] };
        }
        return { mappings: result };
      }

      case 'auto_map': {
        project.autoGenerateMappingRules({
          ...(params.mappingId ? { mappingId: params.mappingId } : {}),
          ...(params.scopePath ? { scopePath: params.scopePath } : {}),
          ...(params.replace !== undefined ? { replace: params.replace } : {}),
        });

        const mapping = params.mappingId
          ? (project.mappings as any)[params.mappingId]
          : project.mapping;
        const rules = (mapping as any)?.rules ?? [];

        return {
          ruleCount: rules.length,
          summary: `Auto-generated mapping rules (${rules.length} total)`,
        };
      }
    }
  });
}

export function registerMapping(server: McpServer, registry: ProjectRegistry): void {
  server.registerTool('formspec_mapping', {
    title: 'Mapping',
    description: 'Manage data mapping rules: add source-to-target mappings, remove rules, list all mappings, or auto-generate mapping rules from the form structure.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['add_mapping', 'remove_mapping', 'list_mappings', 'auto_map']),
      mappingId: z.string().optional().describe('Mapping document ID (omit for the default mapping)'),
      sourcePath: z.string().optional().describe('Source field path (for add_mapping)'),
      targetPath: z.string().optional().describe('Target field path (for add_mapping)'),
      transform: z.string().optional().describe('Transform type: preserve, rename, etc. (for add_mapping)'),
      insertIndex: z.number().optional().describe('Position to insert rule (for add_mapping)'),
      ruleIndex: z.number().optional().describe('Rule index to remove (for remove_mapping)'),
      scopePath: z.string().optional().describe('Scope path for auto-generation (for auto_map)'),
      replace: z.boolean().optional().describe('Replace existing rules when auto-generating (for auto_map)'),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, action, mappingId, sourcePath, targetPath, transform, insertIndex, ruleIndex, scopePath, replace }) => {
    if (action === 'list_mappings') {
      return handleMappingExpanded(registry, project_id, { action, mappingId });
    }
    return bracketMutation(registry, project_id, 'formspec_mapping', () =>
      handleMappingExpanded(registry, project_id, { action, mappingId, sourcePath, targetPath, transform, insertIndex, ruleIndex, scopePath, replace }),
    );
  });
}
