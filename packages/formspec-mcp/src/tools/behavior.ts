/**
 * Behavior tool (consolidated):
 *   action: 'show_when' | 'readonly_when' | 'require' | 'calculate' | 'add_rule'
 *   Batch-enabled via items[] array.
 */

import { HelperError } from '@formspec-org/studio-core';
import type { Project, ValidationOptions } from '@formspec-org/studio-core';
import type { ProjectRegistry } from '../registry.js';
import { wrapCall, wrapBatchCall, resolveProject, errorResponse, formatToolError } from '../errors.js';
import type { BatchItem } from '../batch.js';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NON_DESTRUCTIVE } from '../annotations.js';
import { bracketMutation } from './changeset.js';

const behaviorItemSchema = z.object({
  action: z.enum(['show_when', 'readonly_when', 'require', 'calculate', 'add_rule', 'remove_rule']),
  target: z.string().describe('Field path to apply behavior to'),
  condition: z.string().optional().describe('FEL condition (for show_when, readonly_when, require). Field refs use $-prefix: $field_name, $group.field'),
  expression: z.string().optional().describe('FEL expression (for calculate). Field refs use $-prefix: $field_name, $group.field'),
  rule: z.string().optional().describe('FEL validation expression (for add_rule)'),
  message: z.string().optional().describe('Validation message (for add_rule)'),
  options: z.object({
    timing: z.enum(['continuous', 'submit', 'demand']),
    severity: z.enum(['error', 'warning', 'info']),
    code: z.string(),
    activeWhen: z.string().describe('FEL condition to activate this rule. Field refs use $-prefix: $field_name'),
  }).partial().optional(),
});

type BehaviorAction = 'show_when' | 'readonly_when' | 'require' | 'calculate' | 'add_rule' | 'remove_rule';

interface BehaviorParams {
  action: BehaviorAction;
  target: string;
  condition?: string;
  expression?: string;
  rule?: string;
  message?: string;
  options?: ValidationOptions;
}

function executeBehavior(project: Project, p: BehaviorParams) {
  switch (p.action) {
    case 'show_when':
      return project.showWhen(p.target, p.condition!);
    case 'readonly_when':
      return project.readonlyWhen(p.target, p.condition!);
    case 'require':
      return project.require(p.target, p.condition);
    case 'calculate':
      return project.calculate(p.target, p.expression!);
    case 'add_rule':
      return project.addValidation(p.target, p.rule!, p.message!, p.options);
    case 'remove_rule':
      return project.removeValidation(p.target);
  }
}

export function handleBehavior(
  registry: ProjectRegistry,
  projectId: string,
  params: BehaviorParams | { items: BatchItem[] },
) {
  if ('items' in params) {
    const { project, error } = resolveProject(registry, projectId);
    if (error) return error;
    return wrapBatchCall(params.items, (item) => {
      return executeBehavior(project!, item as unknown as BehaviorParams);
    });
  }
  return wrapCall(() => {
    const project = registry.getProject(projectId);
    return executeBehavior(project, params);
  });
}

export function registerBehavior(server: McpServer, registry: ProjectRegistry) {
  server.registerTool('formspec_behavior', {
    title: 'Behavior',
    description: 'Set per-field logic and cross-field validation. Supports batch via items[] array.\n\nActions show_when, readonly_when, require, calculate set per-field bind properties. Action add_rule creates a cross-field validation shape (named rules with severity). remove_rule removes validation (both bind constraints and shape rules).\n\nshow_when sets a `relevant` expression on a single field. For branching patterns (show different pages/sections based on one answer), use formspec_flow(branch) instead. To skip a wizard page conditionally, set relevant on the page\'s backing group.\n\nFEL syntax: Field references in condition/expression/rule MUST use $-prefix: `$field_name`, `$group.field`. The target parameter uses bare authoring paths (no $). For display-only computed values, use calculate on a field bound to a Text component.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['show_when', 'readonly_when', 'require', 'calculate', 'add_rule', 'remove_rule']).optional(),
      target: z.string().optional().describe('Field path (bare authoring path, no $ prefix)'),
      condition: z.string().optional().describe('FEL condition. Field refs use $-prefix: $field_name, $group.field'),
      expression: z.string().optional().describe('FEL expression. Field refs use $-prefix: $field_name, $group.field'),
      rule: z.string().optional(),
      message: z.string().optional(),
      options: z.object({
        timing: z.enum(['continuous', 'submit', 'demand']),
        severity: z.enum(['error', 'warning', 'info']),
        code: z.string(),
        activeWhen: z.string().describe('FEL condition. Field refs use $-prefix: $field_name'),
      }).partial().optional(),
      items: z.array(behaviorItemSchema).optional(),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, action, target, condition, expression, rule, message, options, items }) => {
    return bracketMutation(registry, project_id, 'formspec_behavior', () => {
      if (items) return handleBehavior(registry, project_id, { items });
      return handleBehavior(registry, project_id, { action: action!, target: target!, condition, expression, rule, message, options });
    });
  });
}
