/** @filedesc MCP response helpers: error/success formatting and helper-call wrappers. */
import { HelperError, type HelperResult, type Project } from '@formspec-org/studio-core';
import type { ProjectRegistry } from './registry.js';
import { executeBatch, type BatchItem, type BatchResult } from './batch.js';

export type ToolError = {
  code: string;
  message: string;
  detail?: Record<string, unknown>;
} & Record<string, unknown>;

export function formatToolError(code: string, message: string, detail?: Record<string, unknown>): ToolError {
  const error: ToolError = { code, message };
  if (detail) error.detail = detail;
  return error;
}

/** MCP error response shape with structuredContent */
export function errorResponse(error: ToolError) {
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: JSON.stringify(error) }],
    structuredContent: error as Record<string, unknown>,
  };
}

/** MCP success response shape */
export function successResponse(result: unknown) {
  const text = typeof result === 'string' ? result : JSON.stringify(result);
  const structuredContent = (typeof result === 'object' && result !== null && !Array.isArray(result))
    ? (result as Record<string, unknown>)
    : undefined;

  return {
    content: [{ type: 'text' as const, text }],
    ...(structuredContent ? { structuredContent } : {}),
  };
}

type McpResponse = ReturnType<typeof successResponse> | ReturnType<typeof errorResponse>;

function isMcpResponse(val: unknown): val is McpResponse {
  return (
    val !== null &&
    val !== undefined &&
    typeof val === 'object' &&
    'content' in val &&
    Array.isArray((val as any).content)
  );
}

/**
 * Wraps a function call with uniform error handling.
 * Catches HelperError → maps to ToolError wire format.
 * Catches any other Error → maps to defaultCode (default: COMMAND_FAILED).
 * If fn() returns an already-formed MCP response ({ content: [...] }), passes it through.
 */
export function wrapCall(
  fn: () => unknown,
  defaultCode = 'COMMAND_FAILED',
): McpResponse {
  try {
    const result = fn();
    if (isMcpResponse(result)) return result;
    return successResponse(result);
  } catch (err) {
    if (err instanceof HelperError) {
      return errorResponse(formatToolError(err.code, err.message, err.detail as Record<string, unknown>));
    }
    if (err instanceof SyntaxError) {
      const message = `Invalid JSON: ${err.message}`;
      return errorResponse(formatToolError(defaultCode, message, {
        handlerMessage: err.message,
      }));
    }
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(formatToolError(defaultCode, message, {
      handlerMessage: message,
    }));
  }
}

/**
 * Safely resolves a project from the registry, returning { project, error }
 * instead of throwing. For batch handlers that need project resolution
 * separate from wrapCall.
 */
export function resolveProject(
  registry: ProjectRegistry,
  projectId: string,
): { project: Project | null; error: McpResponse | null } {
  try {
    return { project: registry.getProject(projectId), error: null };
  } catch (err) {
    if (err instanceof HelperError) {
      return { project: null, error: errorResponse(formatToolError(err.code, err.message, err.detail as Record<string, unknown>)) };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { project: null, error: errorResponse(formatToolError('COMMAND_FAILED', message)) };
  }
}

/**
 * Wraps a batch operation into an MCP response.
 * Uses successResponse when all succeed, marks isError when ALL fail.
 * Partial success returns a normal response with the failure details inside.
 */
export function wrapBatchCall(
  items: BatchItem[],
  fn: (item: BatchItem, index: number) => HelperResult,
): McpResponse {
  const result = executeBatch(items, fn);
  if (result.failed > 0 && result.succeeded === 0) {
    return errorResponse(formatToolError('BATCH_ALL_FAILED', `All ${result.failed} items failed`, {
      results: result.results as unknown as Record<string, unknown>,
    }));
  }
  return successResponse(result);
}
