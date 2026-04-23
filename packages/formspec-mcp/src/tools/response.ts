/** @filedesc MCP tool for response testing: set_test_response, get_test_response, clear_test_responses, validate_response. */
import type { ProjectRegistry } from '../registry.js';
import { wrapCall } from '../errors.js';
import { validateResponse } from '@formspec-org/studio-core';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NON_DESTRUCTIVE } from '../annotations.js';

type ResponseAction = 'set_test_response' | 'get_test_response' | 'clear_test_responses' | 'validate_response';

interface ResponseParams {
  action: ResponseAction;
  field?: string;
  value?: unknown;
  response?: Record<string, unknown>;
}

function getTestData(registry: ProjectRegistry, projectId: string): Record<string, unknown> {
  const entry = registry.getEntry(projectId);
  if (!entry.testResponses) entry.testResponses = {};
  return entry.testResponses;
}

export function handleResponse(
  registry: ProjectRegistry,
  projectId: string,
  params: ResponseParams,
) {
  return wrapCall(() => {
    registry.getProject(projectId);

    switch (params.action) {
      case 'set_test_response': {
        const data = getTestData(registry, projectId);
        data[params.field!] = params.value;
        return {
          field: params.field,
          value: params.value,
          summary: `Set test response for '${params.field}'`,
        };
      }

      case 'get_test_response': {
        const data = getTestData(registry, projectId);
        if (params.field) {
          return {
            field: params.field,
            value: data[params.field] ?? null,
          };
        }
        return { response: data };
      }

      case 'clear_test_responses': {
        const entry = registry.getEntry(projectId);
        entry.testResponses = {};
        return { summary: 'Cleared all test responses' };
      }

      case 'validate_response': {
        const data = getTestData(registry, projectId);
        const response = params.response ?? data;
        return validateResponse(registry.getProject(projectId), response);
      }
    }
  });
}

/** Clear test responses for a project (call on close). Exported for testing. */
export function clearTestResponsesForProject(registry: ProjectRegistry, projectId: string): void {
  const entry = registry.getEntry(projectId);
  entry.testResponses = {};
}

export function registerResponse(server: McpServer, registry: ProjectRegistry): void {
  server.registerTool('formspec_response', {
    title: 'Response',
    description: 'Manage test responses for form validation testing. Set field values, retrieve test data, clear responses, or validate a response against the form definition.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['set_test_response', 'get_test_response', 'clear_test_responses', 'validate_response']),
      field: z.string().optional().describe('Field path (for set_test_response, get_test_response)'),
      value: z.unknown().optional().describe('Field value (for set_test_response)'),
      response: z.record(z.string(), z.unknown()).optional().describe('Full response object to validate (for validate_response)'),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, action, field, value, response }) => {
    return handleResponse(registry, project_id, { action, field, value, response });
  });
}
