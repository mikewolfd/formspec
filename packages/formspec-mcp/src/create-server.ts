/**
 * @filedesc Browser-safe MCP server factory — registers authoring tools without Node.js dependencies.
 *
 * This module intentionally avoids importing lifecycle.ts, bootstrap.ts, and schemas.ts
 * which depend on node:fs/node:path. Tools that require filesystem access (open, save,
 * draft, load) are registered in server.ts / node-tools.ts instead.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { ProjectRegistry } from './registry.js';

import { registerGuide } from './tools/guide.js';
import { registerLifecycleTools } from './tools/lifecycle.js';
import { registerStructureTools } from './tools/structure.js';
import { registerStructureBatch } from './tools/structure-batch.js';
import { registerBehavior } from './tools/behavior.js';
import { registerFlow } from './tools/flow.js';
import { registerStyle } from './tools/style.js';
import { registerData } from './tools/data.js';
import { registerScreener } from './tools/screener.js';
import { registerQueryTools } from './tools/query.js';
import { registerFelTools } from './tools/fel.js';
import { registerWidget } from './tools/widget.js';
import { registerAudit } from './tools/audit.js';
import { registerTheme } from './tools/theme.js';
import { registerComponent } from './tools/component.js';
import { registerLocale } from './tools/locale.js';
import { registerOntology } from './tools/ontology.js';
import { registerReference } from './tools/reference.js';
import { registerBehaviorExpanded } from './tools/behavior-expanded.js';
import { registerComposition } from './tools/composition.js';
import { registerResponse } from './tools/response.js';
import { registerMapping } from './tools/mapping-expanded.js';
import { registerMigration } from './tools/migration.js';
import { registerChangelog } from './tools/changelog.js';
import { registerLifecycle } from './tools/publish.js';
import { registerChangesetTools } from './tools/changeset.js';

/**
 * Create an McpServer with browser-safe authoring tools registered.
 *
 * Excludes filesystem-dependent tools (open, save, draft, load).
 * Includes: guide, create (inline), undo/redo (inline), all structure/behavior/flow/
 * style/data/screener/query/fel tools.
 *
 * Does NOT connect any transport or set up shutdown hooks.
 */
export function createFormspecServer(registry: ProjectRegistry): McpServer {
  const server = new McpServer({ name: 'formspec-mcp', version: '0.2.0' });

  // Guide + lifecycle (create, undo, redo)
  registerGuide(server, registry);
  registerLifecycleTools(server, registry);

  // Structure (field, content, group, submit_button, update, edit, page, place)
  registerStructureTools(server, registry);
  registerStructureBatch(server, registry);

  // Behavior, flow, style, data, screener
  registerBehavior(server, registry);
  registerFlow(server, registry);
  registerStyle(server, registry);
  registerData(server, registry);
  registerScreener(server, registry);

  // Query (describe, search, trace, preview)
  registerQueryTools(server, registry);

  // FEL (fel, fel_trace)
  registerFelTools(server, registry);

  // Widget, audit, theme, component, locale, ontology, reference
  registerWidget(server, registry);
  registerAudit(server, registry);
  registerTheme(server, registry);
  registerComponent(server, registry);
  registerLocale(server, registry);
  registerOntology(server, registry);
  registerReference(server, registry);

  // Expanded tools (behavior_expanded, composition, response, mapping, migration)
  registerBehaviorExpanded(server, registry);
  registerComposition(server, registry);
  registerResponse(server, registry);
  registerMapping(server, registry);
  registerMigration(server, registry);

  // Changelog + lifecycle status
  registerChangelog(server, registry);
  registerLifecycle(server, registry);

  // Changeset management (open, close, list, accept, reject)
  registerChangesetTools(server, registry);

  return server;
}
