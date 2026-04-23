/**
 * Query tools (split per plan):
 *   formspec_describe: mode 'structure' | 'audit' | 'shapes'
 *   formspec_search: standalone search
 *   formspec_trace: mode 'trace' | 'changelog'
 *   formspec_preview: mode 'preview' | 'validate'
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ProjectRegistry } from '../registry.js';
import { previewForm, validateResponse, describeShapeConstraint, type ItemFilter, type FormShape } from '@formspec-org/studio-core';
import { wrapCall } from '../errors.js';
import { READ_ONLY } from '../annotations.js';


// ── formspec_describe: structure + audit ─────────────────────────

export function handleDescribe(
  registry: ProjectRegistry,
  projectId: string,
  mode: 'structure' | 'audit' | 'shapes',
  target?: string,
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);
    if (mode === 'audit') {
      return project.diagnose();
    }
    if (mode === 'shapes') {
      const shapes = (project.definition.shapes ?? []) as FormShape[];
      return {
        shapes: shapes.map(shape => {
          const s = shape as Record<string, unknown>;
          return {
            id: s.id,
            target: s.target,
            severity: s.severity ?? 'error',
            constraint: s.constraint ?? null,
            message: s.message ?? null,
            description: describeShapeConstraint(shape),
          };
        }),
      };
    }
    // structure mode
    if (target) {
      const item = project.itemAt(target);
      const bind = project.bindFor(target);
      const result: Record<string, unknown> = { item: item ?? null, bind: bind ?? null };
      // Include repeat config when item is repeatable
      if (item && (item as any).repeatable) {
        const repeat: Record<string, unknown> = {};
        if ((item as any).minRepeat !== undefined) repeat.min = (item as any).minRepeat;
        if ((item as any).maxRepeat !== undefined) repeat.max = (item as any).maxRepeat;
        result.repeat = repeat;
      }
      return result;
    }
    // Include pages and component-tier nodes (submit buttons, etc.)
    // Rename 'id' to 'page_id' so it matches formspec_place's parameter name
    const rawPages = project.listPages();
    const pages = rawPages.map(({ id, ...rest }) => ({ page_id: id, ...rest }));
    const componentTree = (project.component as any)?.tree;
    const componentNodes: Array<{ component: string; id?: string; props?: Record<string, unknown> }> = [];
    if (componentTree?.children) {
      const walk = (node: any) => {
        if (!node) return;
        if (node.component && node.component !== 'Stack' && node.component !== 'Page') {
          componentNodes.push({
            component: node.component,
            ...(node.id ? { id: node.id } : {}),
            ...(node.props ? { props: node.props } : {}),
          });
        }
        if (node.children) {
          for (const child of node.children) walk(child);
        }
      };
      walk(componentTree);
    }
    const statistics = project.statistics();
    // Override componentNodeCount to match the filtered array (excludes layout wrappers)
    if (componentNodes.length > 0) {
      statistics.componentNodeCount = componentNodes.length;
    }
    return {
      statistics,
      fieldPaths: project.fieldPaths(),
      pages: pages.length > 0 ? pages : undefined,
      componentNodes: componentNodes.length > 0 ? componentNodes : undefined,
    };
  });
}

// ── formspec_search ─────────────────────────────────────────────

export function handleSearch(
  registry: ProjectRegistry,
  projectId: string,
  filter: Partial<ItemFilter>,
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);
    return { items: project.searchItems(filter as ItemFilter) };
  });
}

// ── formspec_trace: trace + changelog ───────────────────────────

export function handleTrace(
  registry: ProjectRegistry,
  projectId: string,
  mode: 'trace' | 'changelog',
  params: { expression_or_field?: string; from_version?: string },
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);

    if (mode === 'changelog') {
      return project.previewChangelog();
    }

    // trace mode — distinguish field reference from expression
    const raw = params.expression_or_field!;

    // A bare field path: "qty", "contact.email", "$qty", "$contact.email"
    // Matches an optional $ prefix followed by an identifier with optional dot-separated segments
    const fieldPathMatch = raw.match(/^\$?([\w][\w\d]*(?:\.[\w][\w\d]*)*)$/);

    if (fieldPathMatch) {
      const fieldPath = fieldPathMatch[1];
      return { type: 'field', input: fieldPath, dependents: project.fieldDependents(fieldPath) };
    }
    return { type: 'expression', input: raw, dependencies: project.expressionDependencies(raw) };
  });
}

// ── formspec_preview: preview + validate + sample_data + normalize ──

export function handlePreview(
  registry: ProjectRegistry,
  projectId: string,
  mode: 'preview' | 'validate' | 'sample_data' | 'normalize',
  params: { scenario?: Record<string, unknown>; response?: Record<string, unknown> },
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);
    switch (mode) {
      case 'validate':
        return validateResponse(project, params.response!);
      case 'sample_data':
        return project.generateSampleData(params.scenario);
      case 'normalize':
        return project.normalizeDefinition();
      case 'preview':
      default:
        return previewForm(project, params.scenario ?? params.response);
    }
  });
}

// ── Registration ────────────────────────────────────────────────────

export function registerQueryTools(server: McpServer, registry: ProjectRegistry): void {
  server.registerTool('formspec_describe', {
    title: 'Describe',
    description: 'Introspect the form. mode="structure": returns form overview (statistics, field paths, pages). mode="audit": runs diagnostics. mode="shapes": lists all cross-field validation shapes with human-readable descriptions.',
    inputSchema: {
      project_id: z.string(),
      mode: z.enum(['structure', 'audit', 'shapes']).optional().default('structure'),
      target: z.string().optional(),
    },
    annotations: READ_ONLY,
  }, async ({ project_id, mode, target }) => {
    return handleDescribe(registry, project_id, mode ?? 'structure', target);
  });

  server.registerTool('formspec_search', {
    title: 'Search',
    description: 'Search for items by type, data type, label, or extension.',
    inputSchema: {
      project_id: z.string(),
      filter: z.object({ type: z.enum(['group', 'field', 'display']).optional(), dataType: z.string().optional(), label: z.string().optional(), hasExtension: z.string().optional() }),
    },
    annotations: READ_ONLY,
  }, async ({ project_id, filter }) => {
    return handleSearch(registry, project_id, filter);
  });

  server.registerTool('formspec_trace', {
    title: 'Trace',
    description: 'Analyze dependencies or view changelog.',
    inputSchema: {
      project_id: z.string(),
      mode: z.enum(['trace', 'changelog']).optional().default('trace'),
      expression_or_field: z.string().optional(),
      from_version: z.string().optional(),
    },
    annotations: READ_ONLY,
  }, async ({ project_id, mode, expression_or_field, from_version }) => {
    return handleTrace(registry, project_id, mode ?? 'trace', { expression_or_field, from_version });
  });

  server.registerTool('formspec_preview', {
    title: 'Preview',
    description: 'Preview, validate, generate sample data, or normalize the form definition. mode="preview" shows field visibility/values. mode="validate" checks a response. mode="sample_data" generates plausible values. mode="normalize" returns a cleaned-up definition.',
    inputSchema: {
      project_id: z.string(),
      mode: z.enum(['preview', 'validate', 'sample_data', 'normalize']).optional().default('preview'),
      scenario: z.record(z.string(), z.unknown()).optional().describe('Field values to inject for preview mode. Takes precedence over response.'),
      response: z.record(z.string(), z.unknown()).optional().describe('For validate mode: the response to validate. For preview mode: used as scenario fallback when scenario is not provided.'),
    },
    annotations: READ_ONLY,
  }, async ({ project_id, mode, scenario, response }) => {
    return handlePreview(registry, project_id, mode ?? 'preview', { scenario, response });
  });
}
