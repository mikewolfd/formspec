/** @filedesc MCP tool for ontology management: concept bindings and vocabulary URLs. */
import type { ProjectRegistry } from '../registry.js';
import { wrapCall, errorResponse, formatToolError } from '../errors.js';
import type { FormItem } from '@formspec-org/types';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NON_DESTRUCTIVE } from '../annotations.js';
import { bracketMutation } from './changeset.js';

type OntologyAction =
  | 'bind_concept'
  | 'remove_concept'
  | 'list_concepts'
  | 'set_vocabulary';

interface OntologyParams {
  action: OntologyAction;
  path?: string;
  concept?: string;
  vocabulary?: string;
}

interface OntologyBinding {
  concept?: string;
  vocabulary?: string;
}

export function handleOntology(
  registry: ProjectRegistry,
  projectId: string,
  params: OntologyParams,
) {
  return wrapCall(() => {
    const project = registry.getProject(projectId);

    switch (params.action) {
      case 'bind_concept': {
        const item = project.itemAt(params.path!);
        if (!item) {
          return errorResponse(formatToolError(
            'PATH_NOT_FOUND',
            `Item not found at path: ${params.path}`,
          ));
        }
        const existing = getOntologyBinding(item);
        const binding: OntologyBinding = {
          ...existing,
          concept: params.concept!,
        };
        if (params.vocabulary) {
          binding.vocabulary = params.vocabulary;
        }
        setOntologyBinding(project, params.path!, binding);
        return {
          summary: `Ontology concept bound to ${params.path}: ${params.concept}`,
          affectedPaths: [params.path!],
          warnings: [],
        };
      }

      case 'remove_concept': {
        const item = project.itemAt(params.path!);
        if (!item) {
          return errorResponse(formatToolError(
            'PATH_NOT_FOUND',
            `Item not found at path: ${params.path}`,
          ));
        }
        const existing = getOntologyBinding(item);
        if (existing) {
          delete existing.concept;
          if (Object.keys(existing).length === 0) {
            removeOntologyBinding(project, params.path!);
          } else {
            setOntologyBinding(project, params.path!, existing);
          }
        }
        return {
          summary: `Ontology concept removed from ${params.path}`,
          affectedPaths: [params.path!],
          warnings: [],
        };
      }

      case 'list_concepts': {
        const concepts: Array<{ path: string; concept?: string; vocabulary?: string }> = [];
        walkItems(project.definition.items, '', (item, path) => {
          const binding = getOntologyBinding(item);
          if (binding?.concept) {
            concepts.push({ path, ...binding });
          }
        });
        return { concepts };
      }

      case 'set_vocabulary': {
        const item = project.itemAt(params.path!);
        if (!item) {
          return errorResponse(formatToolError(
            'PATH_NOT_FOUND',
            `Item not found at path: ${params.path}`,
          ));
        }
        const existing = getOntologyBinding(item) ?? {};
        existing.vocabulary = params.vocabulary!;
        setOntologyBinding(project, params.path!, existing);
        return {
          summary: `Vocabulary set on ${params.path}: ${params.vocabulary}`,
          affectedPaths: [params.path!],
          warnings: [],
        };
      }

      default:
        return errorResponse(formatToolError(
          'COMMAND_FAILED',
          `Unknown ontology action: ${params.action}`,
        ));
    }
  });
}

// ── Internal helpers ─────────────────────────────────────────────────

const ONTOLOGY_EXT_KEY = 'x-formspec-ontology';

function getOntologyBinding(item: FormItem): OntologyBinding | undefined {
  const ext = (item as any).extensions;
  if (!ext) return undefined;
  return ext[ONTOLOGY_EXT_KEY] as OntologyBinding | undefined;
}

function setOntologyBinding(project: any, path: string, binding: OntologyBinding): void {
  // Use definition.setItemProperty handler to set the extension on the item
  project.setItemExtension(path, ONTOLOGY_EXT_KEY, binding);
}

function removeOntologyBinding(project: any, path: string): void {
  project.setItemExtension(path, ONTOLOGY_EXT_KEY, undefined);
}

function walkItems(
  items: FormItem[],
  prefix: string,
  fn: (item: FormItem, path: string) => void,
): void {
  for (const item of items) {
    const path = prefix ? `${prefix}.${item.key}` : item.key;
    fn(item, path);
    if (item.children) {
      walkItems(item.children, path, fn);
    }
  }
}

export function registerOntology(server: McpServer, registry: ProjectRegistry) {
  server.registerTool('formspec_ontology', {
    title: 'Ontology',
    description: 'Manage semantic concept bindings on fields. Actions: bind_concept (associate a concept URI), remove_concept, list_concepts, set_vocabulary (set vocabulary URL for field options).',
    inputSchema: {
      project_id: z.string(),
      action: z.enum(['bind_concept', 'remove_concept', 'list_concepts', 'set_vocabulary']),
      path: z.string().optional().describe('Field path to bind concept to'),
      concept: z.string().optional().describe('Concept URI (e.g. "https://schema.org/givenName")'),
      vocabulary: z.string().optional().describe('Vocabulary URL for field options'),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, action, path, concept, vocabulary }) => {
    if (action === 'list_concepts') {
      return handleOntology(registry, project_id, { action, path, concept, vocabulary });
    }
    return bracketMutation(registry, project_id, 'formspec_ontology', () =>
      handleOntology(registry, project_id, { action, path, concept, vocabulary }),
    );
  });
}
