/** @filedesc MCP tool for reference management: bound references on fields. */
import type { Project } from '@formspec-org/studio-core';
import type { ProjectRegistry } from '../registry.js';
import { wrapCall, errorResponse, formatToolError } from '../errors.js';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NON_DESTRUCTIVE } from '../annotations.js';
import { bracketMutation } from './changeset.js';

type ReferenceAction =
  | 'add_reference'
  | 'remove_reference'
  | 'list_references';

interface ReferenceEntry {
  fieldPath: string;
  uri: string;
  type?: string;
  description?: string;
}

interface ReferenceParams {
  action: ReferenceAction;
  field_path?: string;
  uri?: string;
  type?: string;
  description?: string;
}

export function handleReference(
  registry: ProjectRegistry,
  projectId: string,
  params: ReferenceParams,
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'add_reference': {
        const refs = getReferences(project);
        const entry: ReferenceEntry = {
          fieldPath: params.field_path!,
          uri: params.uri!,
        };
        if (params.type) entry.type = params.type;
        if (params.description) entry.description = params.description;
        refs.push(entry);
        setReferences(project, refs);
        return {
          summary: `Reference added: ${params.uri} on ${params.field_path}`,
          affectedPaths: [params.field_path!],
          warnings: [],
        };
      }

      case 'remove_reference': {
        const refs = getReferences(project);
        const filtered = refs.filter(
          r => !(r.fieldPath === params.field_path && r.uri === params.uri),
        );
        setReferences(project, filtered);
        return {
          summary: `Reference removed from ${params.field_path}: ${params.uri}`,
          affectedPaths: params.field_path ? [params.field_path] : [],
          warnings: [],
        };
      }

      case 'list_references': {
        const refs = getReferences(project);
        return { references: refs };
      }

      default:
        return errorResponse(formatToolError(
          'COMMAND_FAILED',
          `Unknown reference action: ${(params as any).action}`,
        ));
    }
  });
}

// ── Internal helpers ─────────────────────────────────────────────────

const REFERENCES_EXT_KEY = 'x-formspec-references';

function getReferences(project: Project): ReferenceEntry[] {
  const def = project.definition;
  const ext = def.extensions;
  if (!ext) return [];
  return ((ext as Record<string, unknown>)[REFERENCES_EXT_KEY] as ReferenceEntry[] | undefined) ?? [];
}

/** Persists references via `definition.setDefinitionProperty` so undo/redo and history stay coherent. */
function setReferences(project: Project, refs: ReferenceEntry[]): void {
  const ext = project.definition.extensions;
  const base: Record<string, unknown> =
    ext && typeof ext === 'object' ? { ...(ext as Record<string, unknown>) } : {};
  if (refs.length === 0) {
    delete base[REFERENCES_EXT_KEY];
  } else {
    base[REFERENCES_EXT_KEY] = refs;
  }
  const value = Object.keys(base).length === 0 ? null : base;
  project.setDefinitionExtensions(value);
}

export function registerReference(server: McpServer, registry: ProjectRegistry) {
  server.registerTool('formspec_reference', {
    title: 'Reference',
    description: 'Manage bound references on fields. Actions: add_reference (bind an external resource URI), remove_reference, list_references.',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['add_reference', 'remove_reference', 'list_references']),
      field_path: z.string().optional().describe('Field path to bind reference to'),
      uri: z.string().optional().describe('Reference URI'),
      type: z.string().optional().describe('Reference type (e.g. "fhir-valueset", "snomed")'),
      description: z.string().optional().describe('Human-readable description of the reference'),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, action, field_path, uri, type, description }) => {
    if (action === 'list_references') {
      return handleReference(registry, project_id, { action, field_path, uri, type, description });
    }
    return bracketMutation(registry, project_id, 'formspec_reference', () =>
      handleReference(registry, project_id, { action, field_path, uri, type, description }),
    );
  });
}
