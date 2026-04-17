/**
 * FEL tool (consolidated):
 *   action: 'context' | 'functions' | 'check' | 'validate' | 'autocomplete' | 'humanize'
 *
 * Also exports `handleFelTrace` — the `formspec_fel_trace` tool that returns a
 * structured evaluation trace suitable for LLM / explainer surfaces.
 */

import type { ProjectRegistry } from '../registry.js';
import { HelperError } from '@formspec-org/studio-core';
import { errorResponse, successResponse, formatToolError } from '../errors.js';

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
  try {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'context': {
        const refs = project.availableReferences(params.path);
        return successResponse(refs);
      }
      case 'functions': {
        const catalog = project.felFunctionCatalog();
        return successResponse(catalog);
      }
      case 'check': {
        const context = params.context_path ? { targetPath: params.context_path } : undefined;
        const result = project.parseFEL(params.expression!, context);
        return successResponse(result);
      }
      case 'validate': {
        const result = project.validateFELExpression(params.expression!, params.context_path);
        return successResponse(result);
      }
      case 'autocomplete': {
        const suggestions = project.felAutocompleteSuggestions(params.expression ?? '', params.context_path);
        return successResponse(suggestions);
      }
      case 'humanize': {
        const humanized = project.humanizeFELExpression(params.expression!);
        const response: Record<string, unknown> = { humanized, original: params.expression };
        if (!humanized.supported) {
          response.note = 'Humanize currently supports simple binary comparisons only (e.g. "$field > value"). Complex expressions with function calls, boolean logic, or nesting are returned as-is.';
        }
        return successResponse(response);
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

// ── FEL trace ────────────────────────────────────────────────────────

interface FelTraceParams {
  expression: string;
  fields?: Record<string, unknown>;
}

/**
 * Evaluate a FEL expression and return a structured trace of evaluation steps.
 *
 * The trace is identical in shape to what Rust `fel_core::evaluate_with_trace`
 * produces — each step carries a PascalCase `kind` tag (`FieldResolved`,
 * `FunctionCalled`, `BinaryOp`, `IfBranch`, `ShortCircuit`) plus per-kind payload.
 * Intended for LLM / error-explainer surfaces.
 */
export function handleFelTrace(
  registry: ProjectRegistry,
  projectId: string,
  params: FelTraceParams,
) {
  try {
    const project = registry.getProject(projectId);
    const result = project.traceFEL(params.expression, params.fields ?? {});
    return successResponse(result);
  } catch (err) {
    if (err instanceof HelperError) {
      return errorResponse(formatToolError(err.code, err.message, err.detail as Record<string, unknown>));
    }
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(formatToolError('COMMAND_FAILED', message));
  }
}
