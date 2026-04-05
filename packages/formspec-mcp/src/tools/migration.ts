/** @filedesc MCP tool for migration rule CRUD: add_rule, remove_rule, list_rules. */
import type { ProjectRegistry } from '../registry.js';
import { successResponse, errorResponse, formatToolError } from '../errors.js';
import { HelperError } from '@formspec-org/studio-core';

type MigrationAction = 'add_rule' | 'remove_rule' | 'list_rules';

interface MigrationParams {
  action: MigrationAction;
  fromVersion?: string;
  description?: string;
  // For add_rule
  source?: string;
  target?: string | null;
  transform?: string;
  expression?: string;
  insertIndex?: number;
  // For remove_rule
  ruleIndex?: number;
}

export function handleMigration(
  registry: ProjectRegistry,
  projectId: string,
  params: MigrationParams,
) {
  try {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'add_rule': {
        const fromVersion = params.fromVersion!;
        const migrations = (project.definition as any).migrations;

        // Ensure migration descriptor exists for this version
        if (!migrations?.from?.[fromVersion]) {
          project.addMigration(fromVersion, params.description);
        }

        // Add the field map rule
        project.addMigrationRule({
          fromVersion,
          source: params.source!,
          target: params.target ?? null,
          transform: params.transform ?? 'rename',
          ...(params.expression !== undefined ? { expression: params.expression } : {}),
          ...(params.insertIndex !== undefined ? { insertIndex: params.insertIndex } : {}),
        });

        const descriptor = (project.definition as any).migrations?.from?.[fromVersion];
        const rules = descriptor?.fieldMap ?? [];

        return successResponse({
          fromVersion,
          ruleCount: rules.length,
          summary: `Added migration rule from v${fromVersion}: ${params.source} → ${params.target ?? '(removed)'}`,
        });
      }

      case 'remove_rule': {
        const fromVersion = params.fromVersion!;
        const ruleIndex = params.ruleIndex!;

        project.removeMigrationRule(fromVersion, ruleIndex);

        return successResponse({
          fromVersion,
          removedIndex: ruleIndex,
          summary: `Removed migration rule at index ${ruleIndex} from v${fromVersion}`,
        });
      }

      case 'list_rules': {
        const migrations = (project.definition as any).migrations;
        const result: Record<string, unknown> = {};

        if (migrations?.from) {
          for (const [version, descriptor] of Object.entries(migrations.from)) {
            const desc = descriptor as any;
            result[version] = {
              description: desc.description,
              fieldMap: desc.fieldMap ?? [],
              defaults: desc.defaults,
            };
          }
        }

        return successResponse({ migrations: result });
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
