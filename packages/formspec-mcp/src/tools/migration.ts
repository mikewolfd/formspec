/** @filedesc MCP tool for migration rule CRUD: add_rule, remove_rule, list_rules. */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ProjectRegistry } from '../registry.js';
import { wrapCall } from '../errors.js';
import { NON_DESTRUCTIVE } from '../annotations.js';
import { bracketMutation } from './changeset.js';

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
  return wrapCall(() => {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'add_rule': {
        const fromVersion = params.fromVersion!;
        const migrations = (project.definition as any).migrations;

        if (!migrations?.from?.[fromVersion]) {
          project.addMigration(fromVersion, params.description);
        }

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

        return {
          fromVersion,
          ruleCount: rules.length,
          summary: `Added migration rule from v${fromVersion}: ${params.source} → ${params.target ?? '(removed)'}`,
        };
      }

      case 'remove_rule': {
        const fromVersion = params.fromVersion!;
        const ruleIndex = params.ruleIndex!;

        project.removeMigrationRule(fromVersion, ruleIndex);

        return {
          fromVersion,
          removedIndex: ruleIndex,
          summary: `Removed migration rule at index ${ruleIndex} from v${fromVersion}`,
        };
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

        return { migrations: result };
      }
    }
  });
}

export function registerMigration(server: McpServer, registry: ProjectRegistry): void {
  server.registerTool('formspec_migration', {
    title: 'Migration',
    description: 'Manage version migration rules: add field-map rules for upgrading responses from older versions, remove rules, or list all migration descriptors.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['add_rule', 'remove_rule', 'list_rules']),
      fromVersion: z.string().optional().describe('Source version the migration upgrades from'),
      description: z.string().optional().describe('Migration description (for add_rule, creates descriptor if needed)'),
      source: z.string().optional().describe('Source field path (for add_rule)'),
      target: z.union([z.string(), z.null()]).optional().describe('Target field path, or null to remove (for add_rule)'),
      transform: z.string().optional().describe('Transform type: rename, remove, etc. (for add_rule)'),
      expression: z.string().optional().describe('FEL transform expression (for add_rule)'),
      insertIndex: z.number().optional().describe('Position to insert rule (for add_rule)'),
      ruleIndex: z.number().optional().describe('Rule index to remove (for remove_rule)'),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, action, fromVersion, description, source, target, transform, expression, insertIndex, ruleIndex }) => {
    if (action === 'list_rules') {
      return handleMigration(registry, project_id, { action, fromVersion });
    }
    return bracketMutation(registry, project_id, 'formspec_migration', () =>
      handleMigration(registry, project_id, { action, fromVersion, description, source, target, transform, expression, insertIndex, ruleIndex }),
    );
  });
}
