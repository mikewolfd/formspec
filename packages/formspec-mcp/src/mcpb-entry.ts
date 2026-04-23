/**
 * @filedesc MCPB entry point — exports a configured McpServer for Claude Desktop's built-in Node.js runner.
 *
 * Unlike server.ts (which connects its own StdioServerTransport), this module
 * exports the server so the host environment can connect its own transport.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { ProjectRegistry } from './registry.js';
import { initSchemas, initSchemaTexts } from './schemas.js';
import { createFormspecServer } from './create-server.js';
import { registerSchemaResources, registerNodeTools } from './node-tools.js';

const schemaDirs = [
  resolve(process.cwd(), 'schemas'),
  resolve(process.cwd(), 'lib/schemas'),
  resolve(process.cwd(), '../../schemas'),
];

const actualSchemasDir = schemaDirs.find(d => existsSync(d));
if (actualSchemasDir) {
  initSchemas(actualSchemasDir);
  initSchemaTexts(actualSchemasDir);
}

const registry = new ProjectRegistry();
const server = createFormspecServer(registry);

if (actualSchemasDir) {
  registerSchemaResources(server);
}
registerNodeTools(server, registry);

export default server;
