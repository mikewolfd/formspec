/**
 * @filedesc MCP Server CLI entry — extends the browser-safe server with Node.js-only tools
 * (filesystem I/O, schema validation) and connects via stdio transport.
 */

import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

declare var __dirname: string | undefined;
const thisDir = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

import { ProjectRegistry } from './registry.js';
import { initSchemas, initSchemaTexts } from './schemas.js';
import * as lifecycle from './tools/lifecycle.js';
import { createFormspecServer } from './create-server.js';
import { registerSchemaResources, registerNodeTools } from './node-tools.js';
import { initFormspecEngine, initFormspecEngineTools } from '@formspec-org/engine';

export { createFormspecServer } from './create-server.js';

export async function main() {
  const schemaDirs = [
    resolve(thisDir, '../lib/schemas'),
    resolve(thisDir, '../schemas'),
    resolve(thisDir, '../../schemas'),
    resolve(process.cwd(), 'schemas'),
    resolve(process.cwd(), 'lib/schemas'),
  ];
  console.error('[formspec-mcp] thisDir:', thisDir);
  console.error('[formspec-mcp] cwd:', process.cwd());
  console.error('[formspec-mcp] Searching for schemas in:', schemaDirs.join(', '));
  const actualSchemasDir = schemaDirs.find(d => existsSync(d));
  if (!actualSchemasDir) {
    console.error('[formspec-mcp] Fatal: schemas/ directory not found in any of:', schemaDirs.join(', '));
    process.exit(1);
  }
  console.error('[formspec-mcp] Found schemas at:', actualSchemasDir);

  await initFormspecEngine();
  await initFormspecEngineTools();
  initSchemas(actualSchemasDir);
  initSchemaTexts(actualSchemasDir);

  const registry = new ProjectRegistry();
  const server = createFormspecServer(registry);

  registerSchemaResources(server);
  registerNodeTools(server, registry);

  const shutdown = async () => {
    for (const { id, sourcePath } of registry.authoringProjects()) {
      if (!sourcePath) continue;
      try {
        lifecycle.handleSave(registry, id, sourcePath);
      } catch { /* best-effort autosave */ }
    }
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[formspec-mcp] Server ready');
  process.stdin.resume();
}
