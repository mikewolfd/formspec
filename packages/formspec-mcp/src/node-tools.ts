/** @filedesc Shared Node.js-only tool registrations and schema resources for server.ts and mcpb-entry.ts. */
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { ProjectRegistry } from './registry.js';
import { getSchemaText } from './schemas.js';
import { NON_DESTRUCTIVE, FILESYSTEM_IO, READ_ONLY } from './annotations.js';

import { handleDraft, handleLoad } from './tools/bootstrap.js';
import * as lifecycle from './tools/lifecycle.js';

export function registerSchemaResources(server: McpServer): void {
  const schemas = [
    { name: 'schema-definition', uri: 'formspec://schema/definition', key: 'definition' as const },
    { name: 'schema-component', uri: 'formspec://schema/component', key: 'component' as const },
    { name: 'schema-theme', uri: 'formspec://schema/theme', key: 'theme' as const },
  ];
  for (const { name, uri, key } of schemas) {
    server.resource(name, uri, { mimeType: 'application/schema+json' }, async (uriRef) => ({
      contents: [{ uri: uriRef.href, mimeType: 'application/schema+json', text: getSchemaText(key) }],
    }));
  }
}

export function registerNodeTools(server: McpServer, registry: ProjectRegistry): void {
  server.registerTool('formspec_draft', {
    title: 'Draft Artifact',
    description: 'Submit a raw JSON artifact for schema validation during bootstrap phase.',
    inputSchema: {
      project_id: z.string(),
      type: z.enum(['definition', 'component', 'theme']),
      json: z.record(z.string(), z.unknown()),
    },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id, type, json }) => {
    return handleDraft(registry, project_id, type, json);
  });

  server.registerTool('formspec_load', {
    title: 'Load Draft',
    description: 'Validate all drafted artifacts and transition to authoring phase.',
    inputSchema: { project_id: z.string() },
    annotations: NON_DESTRUCTIVE,
  }, async ({ project_id }) => {
    return handleLoad(registry, project_id);
  });

  server.registerTool('formspec_open', {
    title: 'Open Project',
    description: 'Open a formspec project from a directory on disk.',
    inputSchema: { path: z.string() },
    annotations: FILESYSTEM_IO,
  }, async ({ path }) => {
    return lifecycle.handleOpen(registry, path);
  });

  server.registerTool('formspec_save', {
    title: 'Save Project',
    description: 'Save project artifacts to disk. For newly created projects, a path parameter is required (the project has no default save location). Use formspec_publish to export the bundle inline without a disk path.',
    inputSchema: {
      project_id: z.string(),
      path: z.string().optional(),
    },
    annotations: FILESYSTEM_IO,
  }, async ({ project_id, path }) => {
    return lifecycle.handleSave(registry, project_id, path);
  });

  server.registerTool('formspec_list', {
    title: 'List Projects',
    description: 'List all open projects.',
    inputSchema: { include_autosaved: z.boolean().optional() },
    annotations: READ_ONLY,
  }, async ({ include_autosaved }) => {
    return lifecycle.handleList(registry, include_autosaved);
  });

  server.registerTool('formspec_publish', {
    title: 'Publish',
    description: 'Validate and export a finalized project bundle. When path is provided, writes individual artifact files (definition, component, theme, mappings) to the directory.',
    inputSchema: {
      project_id: z.string(),
      version: z.string(),
      summary: z.string().optional(),
      path: z.string().optional().describe('Directory to write artifact files to. If omitted, bundle is returned inline only.'),
    },
    annotations: FILESYSTEM_IO,
  }, async ({ project_id, version, summary, path }) => {
    return lifecycle.handleExportBundle(registry, project_id, version, summary, path);
  });
}
