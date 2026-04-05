/** @filedesc MCP tool for expanded behavior: set_bind_property, set_shape_composition, update_validation. */
import type { ProjectRegistry } from '../registry.js';
import type { Project } from '@formspec-org/studio-core';
import { successResponse, errorResponse, formatToolError, wrapHelperCall } from '../errors.js';
import { HelperError } from '@formspec-org/studio-core';

type BehaviorExpandedAction = 'set_bind_property' | 'set_shape_composition' | 'update_validation';

interface BehaviorExpandedParams {
  action: BehaviorExpandedAction;
  target: string;
  // For set_bind_property
  property?: string;
  value?: string | null;
  // For set_shape_composition
  composition?: 'and' | 'or' | 'not' | 'xone';
  rules?: Array<{ constraint: string; message: string }>;
  // For update_validation
  shapeId?: string;
  changes?: {
    rule?: string;
    message?: string;
    timing?: 'continuous' | 'submit' | 'demand';
    severity?: 'error' | 'warning' | 'info';
    code?: string;
    activeWhen?: string;
  };
}

export function handleBehaviorExpanded(
  registry: ProjectRegistry,
  projectId: string,
  params: BehaviorExpandedParams,
) {
  try {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'set_bind_property': {
        return wrapHelperCall(() =>
          project.updateItem(params.target, { [params.property!]: params.value }),
        );
      }

      case 'set_shape_composition': {
        const rules = params.rules ?? [];
        const composition = params.composition ?? 'and';

        const createdIds: string[] = [];
        for (const rule of rules) {
          const result = wrapHelperCall(() =>
            project.addValidation(params.target, rule.constraint, rule.message),
          );

          if ('isError' in result && result.isError) {
            return result;
          }
          // Extract shape ID from HelperResult wrapped in structuredContent
          if ((result as any).structuredContent?.createdId) {
            createdIds.push((result as any).structuredContent.createdId);
          }
        }

        return successResponse({
          composition,
          createdIds,
          ruleCount: rules.length,
          summary: `Added ${composition} composition with ${rules.length} rule(s) on '${params.target}'`,
        });
      }

      case 'update_validation': {
        return wrapHelperCall(() =>
          project.updateValidation(params.shapeId ?? params.target, params.changes!),
        );
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
