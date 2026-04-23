/** @filedesc MCP tool for expanded behavior: set_bind_property, set_shape_composition, update_validation. */
import type { ProjectRegistry } from '../registry.js';
import { wrapCall } from '../errors.js';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NON_DESTRUCTIVE } from '../annotations.js';
import { bracketMutation } from './changeset.js';

type BehaviorExpandedAction = 'set_bind_property' | 'set_shape_composition' | 'update_validation';

interface BehaviorExpandedParams {
  action: BehaviorExpandedAction;
  target: string;
  property?: string;
  value?: string | null;
  composition?: 'and' | 'or' | 'not' | 'xone';
  rules?: Array<{ constraint: string; message: string }>;
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
  return wrapCall(() => {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'set_bind_property': {
        return project.updateItem(params.target, { [params.property!]: params.value });
      }

      case 'set_shape_composition': {
        const rules = params.rules ?? [];
        const composition = params.composition ?? 'and';

        const createdIds: string[] = [];
        for (const rule of rules) {
          const result = project.addValidation(params.target, rule.constraint, rule.message);
          if (typeof result === 'object' && result !== null && 'createdId' in result) {
            createdIds.push((result as any).createdId);
          }
        }

        return {
          composition,
          createdIds,
          ruleCount: rules.length,
          summary: `Added ${composition} composition with ${rules.length} rule(s) on '${params.target}'`,
        };
      }

      case 'update_validation': {
        return project.updateValidation(params.shapeId ?? params.target, params.changes!);
      }
    }
  });
}

export function registerBehaviorExpanded(server: McpServer, registry: ProjectRegistry) {
  server.registerTool('formspec_behavior_expanded', {
    title: 'Behavior Expanded',
    description: 'Advanced behavior operations: set individual bind properties, compose shape rules with logical operators, or update existing validation rules.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['set_bind_property', 'set_shape_composition', 'update_validation']),
      target: z.string().describe('Field path or shape ID to operate on'),
      property: z.string().optional().describe('Bind property name (for set_bind_property)'),
      value: z.union([z.string(), z.null()]).optional().describe('Bind property value, or null to clear (for set_bind_property)'),
      composition: z.enum(['and', 'or', 'not', 'xone']).optional().describe('Logical composition type (for set_shape_composition)'),
      rules: z.array(z.object({
        constraint: z.string(),
        message: z.string(),
      })).optional().describe('Shape rules to compose (for set_shape_composition)'),
      shapeId: z.string().optional().describe('Shape ID to update (for update_validation, alternative to target)'),
      changes: z.object({
        rule: z.string(),
        message: z.string(),
        timing: z.enum(['continuous', 'submit', 'demand']),
        severity: z.enum(['error', 'warning', 'info']),
        code: z.string(),
        activeWhen: z.string(),
      }).partial().optional().describe('Validation property changes (for update_validation)'),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, action, target, property, value, composition, rules, shapeId, changes }) => {
    return bracketMutation(registry, project_id, 'formspec_behavior_expanded', () =>
      handleBehaviorExpanded(registry, project_id, { action, target, property, value, composition, rules, shapeId, changes }),
    );
  });
}
