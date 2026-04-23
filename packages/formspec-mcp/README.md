# formspec-mcp

MCP server that exposes Formspec form authoring as **49 tools** on the default **stdio** entrypoint (`server.ts`): **43** tools from `createFormspecServer()` plus **6** Node-only tools (`formspec_draft`, `formspec_load`, `formspec_open`, `formspec_save`, `formspec_list`, `formspec_publish`) from `registerNodeTools()`. Embeddings that call `createFormspecServer()` alone get the **43** authoring tools (no filesystem bootstrap tools).

Thin wrapper around `formspec-studio-core` — all business logic lives there; this package adapts it to the [Model Context Protocol](https://modelcontextprotocol.io/) over stdio.

## Install & Run

```bash
# Build
npm run build

# Run (stdio transport)
npm start
# or
npx formspec-mcp
```

The server locates `schemas/` at startup. It tries `cwd/schemas`, then `../../schemas` for the monorepo layout. Fatal exit if not found.

## Connect to Claude Desktop / Claude Code

Add to your MCP config:

```json
{
  "mcpServers": {
    "formspec": {
      "command": "node",
      "args": ["/path/to/formspec/packages/formspec-mcp/dist/index.js"]
    }
  }
}
```

## Architecture

```
MCP Client (Claude)
    |
    v
server.ts          stdio transport + init; calls createFormspecServer + registerNodeTools
    |
    v
create-server.ts   43 tool registrations (browser-safe authoring)
node-tools.ts      6 tool registrations (Node: draft, load, open, save, list, publish) + 3 schema resources
    |
    v
ProjectRegistry    Session manager (max 20 projects, two-phase lifecycle)
    |
    v
tools/*.ts         Handlers — parse input, delegate, format output
    |
    v
formspec-studio-core   Project class + authoring helpers
    |
    v
formspec-engine    FEL evaluation, validation, schema checking
```

## Two-Phase Lifecycle

Projects start in **bootstrap** and transition to **authoring**.

**Bootstrap** — submit raw JSON artifacts via `formspec_draft`, then call `formspec_load` to validate and transition. Call `formspec_load` immediately (without drafting) to start with an empty authoring project.

**Authoring** — use structured tools (`formspec_field`, `formspec_page`, `formspec_behavior`, etc.) to mutate the project through studio-core helpers.

The registry enforces phase isolation. Calling an authoring tool on a bootstrap project (or vice versa) returns a `WRONG_PHASE` error. Once loaded, a project cannot return to bootstrap.

## Tools (49 on stdio — 43 from `createFormspecServer` + 6 Node-only)

### Guide (1)

| Tool | Purpose |
|------|---------|
| `formspec_guide` | Start a conversational intake questionnaire before authoring. Call this first for new forms or targeted modifications. |

### Bootstrap / disk (6) — `registerNodeTools` only

| Tool | Purpose |
|------|---------|
| `formspec_draft` | Submit a raw JSON artifact (definition, component, or theme) for schema validation |
| `formspec_load` | Validate all drafts and transition bootstrap → authoring |
| `formspec_open` | Open a formspec project from a directory on disk |
| `formspec_save` | Write all artifacts to disk |
| `formspec_list` | List open projects (optionally include autosaved snapshots) |
| `formspec_publish` | Export versioned bundle — blocked if errors exist |

### Lifecycle & history (4)

| Tool | Purpose |
|------|---------|
| `formspec_create` | Create a new project in bootstrap phase |
| `formspec_undo` | Undo the last authoring operation |
| `formspec_redo` | Redo the last undone operation |
| `formspec_lifecycle` | Combined lifecycle / export / status actions (see tool description) |

Disk **open** / **save** / **list** / **publish** are the Node-only tools in the table above (`formspec_open`, `formspec_save`, `formspec_list`, `formspec_publish`).

### Changesets (5)

| Tool | Purpose |
|------|---------|
| `formspec_changeset_open` | Open a changeset recording bracket |
| `formspec_changeset_close` | Close the current bracket |
| `formspec_changeset_list` | List changesets |
| `formspec_changeset_accept` | Accept a changeset |
| `formspec_changeset_reject` | Reject a changeset |

### Structure (9)

| Tool | Purpose |
|------|---------|
| `formspec_field` | Add data-collecting fields. Supports batch via `items[]`. |
| `formspec_content` | Add display elements (heading, paragraph, divider, banner). Supports batch via `items[]`. |
| `formspec_group` | Add a logical group container. Supports batch via `items[]`. |
| `formspec_submit_button` | Add a submit button to the form or a specific page |
| `formspec_update` | Modify properties on existing items or form metadata. Supports batch. |
| `formspec_edit` | Structural mutations: remove, move, rename, or copy items |
| `formspec_structure_batch` | Run multiple structure operations in one call |
| `formspec_page` | Add, remove, reorder, or list pages |
| `formspec_place` | Assign (`place`) or unassign (`unplace`) items to pages |

### Behavior & flow (3)

| Tool | Purpose |
|------|---------|
| `formspec_behavior` | Field logic: `show_when`, `readonly_when`, `require`, `calculate`, `add_rule` (FEL). Batch via `items[]`. |
| `formspec_behavior_expanded` | Extended behavior surface (see tool schema) |
| `formspec_flow` | Navigation mode (`set_mode`: single/wizard/tabs) or conditional branching (`branch`) |

### Presentation & components (4)

| Tool | Purpose |
|------|---------|
| `formspec_style` | Layout arrangements, per-item style, or bulk style by type |
| `formspec_theme` | Theme document mutations |
| `formspec_component` | Component tree / component document |
| `formspec_widget` | Widget-level authoring |

### Data & screener (2)

| Tool | Purpose |
|------|---------|
| `formspec_data` | Choice lists, variables, external data instances |
| `formspec_screener` | Screener document: items, phases, routes, lifecycle |

### Query & preview (4)

| Tool | Purpose |
|------|---------|
| `formspec_describe` | Introspect structure or run diagnostics (`mode`) |
| `formspec_search` | Find items by type, dataType, label, or extension |
| `formspec_trace` | FEL dependency trace or changelog mode |
| `formspec_preview` | Render preview or validate a response object |

### FEL (2)

| Tool | Purpose |
|------|---------|
| `formspec_fel` | References at path, stdlib catalog, expression validation, condition-group lift (`lift_condition_group`) |
| `formspec_fel_trace` | Deeper FEL trace / analysis |

### Quality & docs (2)

| Tool | Purpose |
|------|---------|
| `formspec_audit` | Audit / diagnostics helpers |
| `formspec_changelog` | Changelog-oriented queries |

### Extensions & semantics (4)

| Tool | Purpose |
|------|---------|
| `formspec_locale` | Locale strings and metadata |
| `formspec_ontology` | Ontology bindings on items |
| `formspec_reference` | Bound references (URIs) on fields |
| `formspec_composition` | Composition / layout composition helpers |

### Mapping & migration (2)

| Tool | Purpose |
|------|---------|
| `formspec_mapping` | Mapping document rules and adapter |
| `formspec_migration` | Definition migrations |

### Responses (1)

| Tool | Purpose |
|------|---------|
| `formspec_response` | Test / sample responses for preview |

> **Tool count:** `tests/tool-registration.test.ts` asserts **43** names on `createFormspecServer(registry)` alone. Adding `registerNodeTools(server, registry)` in `server.ts` registers the **6** bootstrap/disk tools above → **49** for the CLI.

## Schema Resources

Three MCP resources expose the Formspec JSON Schemas:

| URI | Schema |
|-----|--------|
| `formspec://schema/definition` | Definition schema |
| `formspec://schema/component` | Component schema |
| `formspec://schema/theme` | Theme schema |

Read these before submitting JSON via `formspec_draft`.

## Error Handling

All tools return structured errors:

```json
{
  "code": "ITEM_NOT_FOUND",
  "message": "No item at path 'foo.bar'",
  "detail": { "path": "foo.bar" }
}
```

Error codes by category:

- **Bootstrap**: `DRAFT_SCHEMA_ERROR`, `DRAFT_INVALID`, `DRAFT_INCOMPLETE`
- **Lifecycle**: `PROJECT_NOT_FOUND`, `WRONG_PHASE`, `TOO_MANY_PROJECTS`, `LOAD_FAILED`, `SAVE_FAILED`, `PUBLISH_BLOCKED`
- **Authoring**: `ITEM_NOT_FOUND`, `FIELD_NOT_FOUND`, `GROUP_NOT_FOUND`, `VARIABLE_NOT_FOUND`, `INSTANCE_NOT_FOUND`, `DUPLICATE_KEY`, `INVALID_PATH`, `PARENT_NOT_GROUP`, `ROUTE_OUT_OF_BOUNDS`, `ROUTE_MIN_COUNT`, `INVALID_WIDGET`
- **Batch**: `BATCH_ALL_FAILED` (partial failures return a normal response with per-item results)
- **General**: `COMMAND_FAILED`

## Testing

```bash
npm test              # vitest run
npm run test:watch    # vitest (watch mode)
```

Vitest covers bootstrap, lifecycle, structure, behavior, query, registry, changesets, expanded tools, and integration paths (`tests/*.test.ts`).

## File Structure

```
src/
  index.ts           Shebang entry point
  server.ts          stdio transport, engine init, registerNodeTools + schema resources
  create-server.ts   createFormspecServer() — 43 browser-safe tool registrations
  node-tools.ts      registerNodeTools (6) + registerSchemaResources (3)
  mcpb-entry.ts      Alternate entry (shares node-tools registration pattern)
  registry.ts        ProjectRegistry — session management
  schemas.ts         Schema loading singleton
  errors.ts          Error formatting, wrapCall, resolveProject, etc.
  annotations.ts     Tool hint constants (READ_ONLY, DESTRUCTIVE, etc.)
  tool-schemas.ts    Shared Zod fragments
  dispatch.ts        Shared dispatch helpers (where used)
  batch.ts           Batch execution helper
  tools/
    guide.ts         Intake questionnaire
    bootstrap.ts     Draft/load validation handlers
    lifecycle.ts     Create, save handlers; undo/redo helpers
    structure.ts     Fields, groups, pages, placement (+ optional registerStructureTools)
    structure-batch.ts
    behavior.ts      Visibility, required, calculate, rules
    behavior-expanded.ts
    flow.ts          Navigation mode, branching
    style.ts         Layout, styling
    data.ts          Choices, variables, instances
    screener.ts      Pre-form qualification
    query.ts         Describe, search, trace, preview
    fel.ts           FEL utilities + fel_trace registration
    widget.ts        Widget authoring
    audit.ts         Audit tool
    theme.ts         Theme tool
    component.ts     Component tree tool
    locale.ts        Locale tool
    ontology.ts      Ontology tool
    reference.ts     Reference bindings tool
    composition.ts   Composition tool
    response.ts      Response / preview samples
    mapping-expanded.ts
    migration.ts     Migration tool
    changelog.ts     Changelog tool
    publish.ts        Publish / lifecycle status (used by formspec_lifecycle)
    changeset.ts     Changeset bracket helpers
tests/
  helpers.ts         Test utilities + fixtures
  tool-registration.test.ts
  … (many *.test.ts)
```

## Graceful Shutdown

SIGTERM/SIGINT triggers best-effort autosave of all authoring projects to their source paths, then exits cleanly.
