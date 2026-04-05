/** @filedesc MCP tool for $ref composition on groups: add_ref, remove_ref, list_refs. */
import type { ProjectRegistry } from '../registry.js';
import type { Project } from '@formspec-org/studio-core';
import { successResponse, errorResponse, formatToolError } from '../errors.js';
import { HelperError } from '@formspec-org/studio-core';

type CompositionAction = 'add_ref' | 'remove_ref' | 'list_refs';

interface CompositionParams {
  action: CompositionAction;
  // For add_ref / remove_ref
  path?: string;
  ref?: string;
  keyPrefix?: string;
}

export function handleComposition(
  registry: ProjectRegistry,
  projectId: string,
  params: CompositionParams,
) {
  try {
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

        return successResponse({
          path,
          ref: params.ref,
          keyPrefix: params.keyPrefix ?? null,
          summary: `Set $ref on '${path}' → '${params.ref}'`,
        });
      }

      case 'remove_ref': {
        const path = params.path!;
        const item = project.itemAt(path);
        if (!item) {
          throw new HelperError('ITEM_NOT_FOUND', `Item not found: ${path}`);
        }

        project.setGroupRef(path, null);

        return successResponse({
          path,
          summary: `Removed $ref from '${path}'`,
        });
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
        return successResponse({ refs });
      }
    }
  } catch (err) {
    if (err instanceof HelperError) {
      return errorResponse(formatToolError(err.code, err.message, err.detail as Record<string, unknown>));
    }
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(formatToolError('COMMAND_FAILED', message));
  }
}
