/**
 * FEL tool (consolidated):
 *   action: 'context' | 'functions' | 'check' | 'validate' | 'autocomplete' | 'humanize'
 *
 * Also exports `handleFelTrace` — the `formspec_fel_trace` tool that returns a
 * structured evaluation trace suitable for LLM / explainer surfaces.
 */

import type { ProjectRegistry } from '../registry.js';
import { wrapCall } from '../errors.js';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { READ_ONLY } from '../annotations.js';

type FelAction = 'context' | 'functions' | 'check' | 'validate' | 'autocomplete' | 'humanize';

interface FelParams {
  action: FelAction;
  path?: string;         // for context scoping
  expression?: string;   // for check/validate/autocomplete/humanize
  context_path?: string; // for check/validate/autocomplete scoping
}

export function handleFel(
  registry: ProjectRegistry,
  projectId: string,
  params: FelParams,
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'context': {
        return project.availableReferences(params.path);
      }
      case 'functions': {
        return project.felFunctionCatalog();
      }
      case 'check': {
        const context = params.context_path ? { targetPath: params.context_path } : undefined;
        return project.parseFEL(params.expression!, context);
      }
      case 'validate': {
        return project.validateFELExpression(params.expression!, params.context_path);
      }
      case 'autocomplete': {
        return project.felAutocompleteSuggestions(params.expression ?? '', params.context_path);
      }
      case 'humanize': {
        const humanized = project.humanizeFELExpression(params.expression!);
        const response: Record<string, unknown> = { humanized, original: params.expression };
        if (!humanized.supported) {
          response.note = 'Humanize currently supports simple binary comparisons only (e.g. "$field > value"). Complex expressions with function calls, boolean logic, or nesting are returned as-is.';
        }
        return response;
      }
    }
  });
}

// ── FEL trace ────────────────────────────────────────────────────────

interface FelTraceParams {
  expression: string;
  fields?: Record<string, unknown>;
}

export function handleFelTrace(
  registry: ProjectRegistry,
  projectId: string,
  params: FelTraceParams,
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);
    return project.traceFEL(params.expression, params.fields ?? {});
  });
}

export function registerFelTools(server: McpServer, registry: ProjectRegistry) {
  server.registerTool('formspec_fel', {
    title: 'FEL',
    description: 'FEL utilities: list available references, function catalog, validate/check an expression, get autocomplete suggestions, or humanize an expression to English.\n\nRepeat group references: Inside a repeat context, $siblingField resolves to the current instance. Use $group[*].field to aggregate across all instances (e.g., sum($items[*].amount)). Context variables: @current (current instance object), @index (0-based), @count (total instances). The context action returns scope: "local"|"global" annotations per reference.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['context', 'functions', 'check', 'validate', 'autocomplete', 'humanize']),
      path: z.string().optional(),
      expression: z.string().optional().describe('FEL expression (for check/validate/humanize) or partial input (for autocomplete)'),
      context_path: z.string().optional().describe('Field path for scope-aware validation and context-specific suggestions'),
    },
    annotations: READ_ONLY,
  }, async ({ project_id, action, path, expression, context_path }) => {
    return handleFel(registry, project_id, { action, path, expression, context_path });
  });

  server.registerTool('formspec_fel_trace', {
    title: 'FEL Trace',
    description: 'Evaluate a FEL expression with a structured trace of evaluation steps. Returns { value, diagnostics, trace }; each trace step has a `kind` (FieldResolved, FunctionCalled, BinaryOp, IfBranch, ShortCircuit) plus per-kind payload. Intended for explainer / LLM surfaces — the trace is human-readable, not a reprojected AST.',
    inputSchema: {
      project_id: z.string(),
      expression: z.string().describe('FEL expression to trace'),
      fields: z.record(z.string(), z.unknown()).optional().describe('Optional flat map of field name -> value injected into the evaluation environment.'),
    },
    annotations: READ_ONLY,
  }, async ({ project_id, expression, fields }) => {
    return handleFelTrace(registry, project_id, { expression, fields });
  });
}
