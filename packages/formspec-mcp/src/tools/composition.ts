/** @filedesc MCP tool for $ref composition on groups: add_ref, remove_ref, list_refs. */
import type { ProjectRegistry } from '../registry.js';
import { wrapCall } from '../errors.js';
import { HelperError } from '@formspec-org/studio-core';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NON_DESTRUCTIVE } from '../annotations.js';
import { bracketMutation } from './changeset.js';

type CompositionAction = 'add_ref' | 'remove_ref' | 'list_refs';

interface CompositionParams {
  action: CompositionAction;
  path?: string;
  ref?: string;
  keyPrefix?: string;
}

export function handleComposition(
  registry: ProjectRegistry,
  projectId: string,
  params: CompositionParams,
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'add_ref': {
        const path = params.path!;
        const item = project.itemAt(path);
        if (!item) {
          throw new HelperError('ITEM_NOT_FOUND', `Item not found: ${path}`);
        }
        if (item.type !== 'group') {
          throw new HelperError('INVALID_ITEM_TYPE', `$ref can only be set on group items, got: ${item.type}`, {
            path,
            type: item.type,
          });
        }

        project.setGroupRef(path, params.ref!, params.keyPrefix);

        return {
          path,
          ref: params.ref,
          keyPrefix: params.keyPrefix ?? null,
          summary: `Set $ref on '${path}' → '${params.ref}'`,
        };
      }

      case 'remove_ref': {
        const path = params.path!;
        const item = project.itemAt(path);
        if (!item) {
          throw new HelperError('ITEM_NOT_FOUND', `Item not found: ${path}`);
        }

        project.setGroupRef(path, null);

        return {
          path,
          summary: `Removed $ref from '${path}'`,
        };
      }

      case 'list_refs': {
        const refs: Array<{ path: string; ref: string; keyPrefix?: string }> = [];
        const items = (project.definition as any).items ?? [];

        function walkItems(itemList: any[], prefix: string) {
          for (const item of itemList) {
            const path = prefix ? `${prefix}.${item.key}` : item.key;
            if (item.$ref) {
              refs.push({
                path,
                ref: item.$ref,
                ...(item.keyPrefix ? { keyPrefix: item.keyPrefix } : {}),
              });
            }
            if (item.children && Array.isArray(item.children)) {
              walkItems(item.children, path);
            }
          }
        }

        walkItems(items, '');
        return { refs };
      }
    }
  });
}

export function registerComposition(server: McpServer, registry: ProjectRegistry) {
  server.registerTool('formspec_composition', {
    title: 'Composition',
    description: 'Manage $ref composition on group items: add a reference to an external definition fragment, remove a reference, or list all references in the form.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['add_ref', 'remove_ref', 'list_refs']),
      path: z.string().optional().describe('Group item path (for add_ref, remove_ref)'),
      ref: z.string().optional().describe('URI of the external definition fragment (for add_ref)'),
      keyPrefix: z.string().optional().describe('Key prefix for imported items (for add_ref)'),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, action, path, ref, keyPrefix }) => {
    if (action === 'list_refs') {
      return handleComposition(registry, project_id, { action, path, ref, keyPrefix });
    }
    return bracketMutation(registry, project_id, 'formspec_composition', () =>
      handleComposition(registry, project_id, { action, path, ref, keyPrefix }),
    );
  });
}
