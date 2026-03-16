# formspec-mcp

MCP server that exposes Formspec form authoring as 27 tools. Thin wrapper around `formspec-studio-core` — all business logic lives there; this package adapts it to the [Model Context Protocol](https://modelcontextprotocol.io/) over stdio.

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
server.ts          27 tool registrations + 3 schema resources
    |
    v
ProjectRegistry    Session manager (max 20 projects, two-phase lifecycle)
    |
    v
tools/*.ts         Thin handlers — parse input, delegate, format output
    |
    v
formspec-studio-core   51 authoring methods (Project class)
    |
    v
formspec-engine    FEL evaluation, validation, schema checking
```

## Two-Phase Lifecycle

Projects start in **bootstrap** and transition to **authoring**.

**Bootstrap** — submit raw JSON artifacts via `formspec_draft`, then call `formspec_load` to validate and transition. Call `formspec_load` immediately (without drafting) to start with an empty authoring project.

**Authoring** — use structured tools (`formspec_field`, `formspec_page`, `formspec_behavior`, etc.) to mutate the project through studio-core helpers.

The registry enforces phase isolation. Calling an authoring tool on a bootstrap project (or vice versa) returns a `WRONG_PHASE` error. Once loaded, a project cannot return to bootstrap.

## Tools (27)

### Guide (1)

| Tool | Purpose |
|------|---------|
| `formspec_guide` | Start a conversational intake questionnaire before authoring. Call this first for new forms or targeted modifications. |

### Bootstrap (2)

| Tool | Purpose |
|------|---------|
| `formspec_draft` | Submit a raw JSON artifact (definition, component, or theme) for schema validation |
| `formspec_load` | Validate all drafts and transition bootstrap → authoring |

### Lifecycle (7)

| Tool | Purpose |
|------|---------|
| `formspec_create` | Create a new project in bootstrap phase |
| `formspec_open` | Load from disk (`*.definition.json` + siblings) |
| `formspec_save` | Write all artifacts to disk |
| `formspec_list` | List open projects (optionally include autosaved snapshots) |
| `formspec_publish` | Export versioned bundle — blocked if errors exist |
| `formspec_undo` | Undo the last authoring operation |
| `formspec_redo` | Redo the last undone operation |

### Structure (8)

| Tool | Purpose |
|------|---------|
| `formspec_field` | Add data-collecting fields (string, number, choice, date, etc.). Supports batch via `items[]`. |
| `formspec_content` | Add display elements (heading, paragraph, divider, banner). Supports batch via `items[]`. |
| `formspec_group` | Add a logical group container. Include `props.repeat` to make it repeatable. Supports batch via `items[]`. |
| `formspec_submit_button` | Add a submit button to the form or a specific page |
| `formspec_update` | Modify properties on existing items (`target="item"`) or form metadata (`target="metadata"`) |
| `formspec_edit` | Structural mutations: remove, move, rename, or copy items |
| `formspec_page` | Add, remove, or reorder pages (theme-tier) |
| `formspec_place` | Assign (`place`) or unassign (`unplace`) items to pages |

### Behavior (1)

| Tool | Purpose |
|------|---------|
| `formspec_behavior` | Set field logic: `show_when`, `readonly_when`, `require`, `calculate`, `add_rule`. All accept FEL expressions. Supports batch via `items[]`. |

### Flow (1)

| Tool | Purpose |
|------|---------|
| `formspec_flow` | Set navigation mode (`set_mode`: single/wizard/tabs) or add conditional branching (`branch`) |

### Presentation (1)

| Tool | Purpose |
|------|---------|
| `formspec_style` | Apply layout arrangements (`layout`), per-item style properties (`style`), or bulk style by type/dataType (`style_all`) |

### Data (1)

| Tool | Purpose |
|------|---------|
| `formspec_data` | Manage reusable choice lists (`choices`), computed variables (`variable`), and external data instances (`instance`) |

### Screener (1)

| Tool | Purpose |
|------|---------|
| `formspec_screener` | Enable/disable the pre-form screener; add/remove screening fields; manage routing rules |

### Query (3)

| Tool | Purpose |
|------|---------|
| `formspec_describe` | Introspect form structure (`mode="structure"`) or run diagnostics (`mode="audit"`) |
| `formspec_search` | Find items by type, dataType, label, or extension |
| `formspec_trace` | Trace FEL dependencies for an expression or field (`mode="trace"`), or generate a changelog (`mode="changelog"`) |
| `formspec_preview` | Render form state with optional scenario data (`mode="preview"`), or validate a response object (`mode="validate"`) |

### FEL (1)

| Tool | Purpose |
|------|---------|
| `formspec_fel` | FEL utilities: list available references at a path (`context`), list ~40 stdlib functions (`functions`), or validate an expression (`check`) |

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

7 test files covering bootstrap, lifecycle, structure, behavior, query, and registry. Tests use helper factories (`registryWithProject()`, `registryInBootstrap()`) and minimal document fixtures.

## File Structure

```
src/
  index.ts          Shebang entry point
  server.ts         Tool registrations + stdio transport (27 tools)
  registry.ts       ProjectRegistry — session management
  schemas.ts        Schema loading singleton
  errors.ts         Error formatting + wrapHelperCall + wrapBatchCall
  annotations.ts    Tool hint constants (READ_ONLY, DESTRUCTIVE, etc.)
  batch.ts          Batch execution helper
  tools/
    guide.ts        Conversational intake questionnaire (1 tool)
    bootstrap.ts    Draft submission + validation (2 tools)
    lifecycle.ts    Create, open, save, publish (7 tools)
    structure.ts    Fields, groups, pages, placement (8 tools)
    behavior.ts     Visibility, required, calculate, rules (1 tool)
    flow.ts         Navigation mode, branching (1 tool)
    style.ts        Layout, styling (1 tool)
    data.ts         Choices, variables, instances (1 tool)
    screener.ts     Pre-form qualification (1 tool)
    query.ts        Describe, search, trace, preview (4 tools)
    fel.ts          Expression language utilities (1 tool)
tests/
  helpers.ts        Test utilities + fixtures
  bootstrap.test.ts
  lifecycle.test.ts
  structure.test.ts
  behavior.test.ts
  query.test.ts
  registry.test.ts
```

## Graceful Shutdown

SIGTERM/SIGINT triggers best-effort autosave of all authoring projects to their source paths, then exits cleanly.
