# Formspec MCP Server — Design Spec

**Date:** 2026-03-14
**Status:** Draft (rev 7 — two-phase creation model)
**Branch:** studiofixes

---

## Purpose

`formspec-mcp` is a Model Context Protocol server that exposes Formspec's authoring helpers as tools to LLM clients (Claude Desktop, Claude Code, or any MCP-compatible client).

The server is **thin by design**: it manages project sessions, translates tool calls into `Project` method calls, and owns query formatting. It owns no form construction semantics. All form-building logic lives in `formspec-studio-core`'s `Project` class (51+ helper methods) and is reusable by any consumer.

---

## Context

The `pages.*` command namespace (ADR-0039) is already implemented and available. All page management tools route to these commands directly.

**Note on the existing `formspec-mcp` package:** The current package contains a different architecture (4 AI-provider-based tools: `list_templates`, `analyze_form`, `propose_form`, `edit_form`) that requires Anthropic/OpenAI/Gemini API keys. This spec replaces that package entirely. All existing source files in `packages/formspec-mcp/src/` are deleted. The `@ai-sdk/*` and `ai` dependencies are removed.

---

## Goals

- Let an LLM build, edit, and inspect Formspec forms through natural language
- Hide the three-tier artifact architecture (definition/component/theme) from the tool surface entirely
- Tools describe what the form *does*, not what the schema contains
- Work with Claude Desktop and Claude Code with zero configuration
- Studio-core helpers are reusable by CLI tools, visual builders, and tests — not just MCP

## Non-Goals

- Server-driven LLM generation (future: `formspec-mcp-generation` package)
- Output mapping to external systems (CRM, ERP) — mapping document out of scope
- Customer fork/variant model — out of scope
- TypeScript type export as a file artifact — CLI concern, future
- Naming policy enforcement — future project config
- Multi-client concurrent access — stdio transport, single client per process
- Crash recovery beyond SIGTERM auto-save — see Session Model

---

## Architecture

```
packages/formspec-mcp/
  src/
    server.ts       — MCP server entry, tool registration, SIGTERM handler
    projects.ts     — in-memory project registry
    tools/
      bootstrap.ts  — draft_definition/draft_component/draft_theme/validate_draft/load_draft
      lifecycle.ts  — create/open/save/list/publish/undo/redo
      structure.ts  — field/content/group/page/remove_page/move_page/place/unplace/repeat/update/remove/copy/metadata/submit_button
      flow.ts       — flow/branch/move/rename
      behavior.ts   — show_when/readonly_when/require/calculate/add_rule
      presentation.ts — layout/style/style_all
      data.ts       — define_choices/variable/update_variable/remove_variable/rename_variable/instance/update_instance/rename_instance/remove_instance
      screener.ts   — screener/screen_field/screen_route/update_screen_route/reorder_screen_route/remove_screen_field/remove_screen_route
      query.ts      — preview/audit/describe/trace/validate_response/search/changelog
      fel.ts        — fel_context/fel_functions/fel_check
    index.ts
  tests/
    bootstrap.test.ts
    lifecycle.test.ts
    structure.test.ts
    behavior.test.ts
    query.test.ts
  package.json
  tsconfig.json
  vitest.config.ts
```

**`formspec-mcp`** depends on `formspec-studio-core` (for `Project`, `createProject()`, and all helper methods) and `formspec-engine` (for `preview` and `validate_response` evaluation). It never imports from `formspec-core`. The server maintains a `Map<string, Project>` keyed by `project_id`.

**Query formatters** (`audit`, `describe`, `trace`, `search`, `changelog`, `preview`, `validate_response`, `fel_context`, `fel_functions`, `fel_check`) live here, not in studio-core. These are thin wrappers that call a single `Project` method and format the result for LLM consumption. They have no reuse value outside MCP.

**Dependencies (`packages/formspec-mcp/package.json`):**
- `@modelcontextprotocol/sdk` — MCP server protocol
- `formspec-studio-core` — project management and helpers
- `formspec-engine` — FormEngine evaluation (for preview and validate_response)
- `ajv` — JSON Schema validation (bootstrap phase artifact validation)
- `zod` — tool input schema validation
- `uuid` — project_id generation

**Transport:** stdio. Works with Claude Desktop, Claude Code, and any MCP-compatible client.

**Primary workflow — two phases:**

1. **Bootstrap (generate → validate → iterate).** The LLM generates raw JSON artifacts (definition, component, theme) guided by the JSON Schemas in `schemas/`. Each artifact is submitted individually via `draft_*` tools. The server validates each artifact against its schema and runs engine diagnostics. Errors are returned to the LLM, which fixes and resubmits until the artifact passes. Once all artifacts are valid, `load_draft` normalizes and loads them into a `Project`.

2. **Author (incremental edits via helpers).** Once the draft is loaded, all subsequent modifications use the `Project` helper method tools (field, content, group, show_when, calculate, etc.). The LLM never generates raw JSON again after the bootstrap phase — it works through the structured authoring API.

---

## Design Decisions

**1. Auto-save on shutdown.**
The in-memory registry does not persist across process exits. The server registers `SIGTERM` and `SIGINT` handlers that save all dirty projects to `~/.formspec/autosave/{project_id}/` before exit. On Claude Desktop restart, the user calls `open(~/.formspec/autosave/{project_id}/)` to recover work.

**2. Two-phase creation: generate JSON first, then author incrementally.**
LLMs generate raw JSON artifacts guided by `schemas/definition.json`, `schemas/component.json`, and `schemas/theme.json`. Each artifact is validated against its schema and by the engine's diagnostics. The LLM iterates on each artifact until it's valid. Once all artifacts pass, they're normalized and loaded into a `Project`. From that point forward, all edits use the structured helper methods — no more raw JSON. This separates the hard problem (generating a valid initial structure) from the easy problem (incremental refinement), and gives the LLM clear, actionable feedback at each step.

**3. Error protocol: MCP layer translates `Project` errors to wire format.**
`Project` helper methods pre-validate and throw `HelperError { code, message, detail }` on validation failure. The MCP tool layer wraps every `Project` call in try/catch:
- Catches `HelperError` → maps `code` + `detail` to `ToolError` wire format
- Catches any other `Error` → maps to `COMMAND_FAILED` with `detail.commandType` and `detail.handlerMessage`

Mutation tools that accept FEL expressions (`show_when`, `calculate`, `require`, `add_rule`, etc.) auto-validate and return `INVALID_FEL` directly — `fel_check` is a dry-run convenience, not a required pre-step.

---

## Bundle Format

Formspec project bundles are multi-file directories, one JSON file per artifact. This matches the existing format used throughout the codebase.

```
{name}/
  {name}.definition.json    — FormspecDefinition (required)
  {name}.component.json     — FormspecComponentDocument (required)
  {name}.theme.json         — FormspecThemeDocument (optional)
  {name}.mapping.json       — FormspecMappingDocument (optional)
```

**`save(project_id, path)`** writes `project.export()` (a `ProjectBundle`) to a directory at `path`. Each artifact is written as a separate file using the `{dirname}.{artifact}.json` naming convention. If the directory doesn't exist, it is created.

**`open(path)`** reads a bundle directory, creates a `Project` via `createProject()`, loads the bundle via `project.loadBundle()`, registers it in the **authoring phase** (skipping bootstrap — the artifacts are already valid on disk), and returns a `project_id`. Missing optional artifacts (theme, mapping) are omitted. **`open()` is idempotent:** if a project from the same `path` is already loaded in the registry, the existing `project_id` is returned. This enables reconnection after server restart.

**Error behavior for `open()`:** `LOAD_FAILED` is returned if the directory does not exist, contains no `*.definition.json` file, or any required JSON file is malformed. The error detail includes `path` and `reason`.

**`save(project_id)`** with no path defaults to the path the project was opened from. New projects (created via `create()`) require a path.

**Note on `generatedComponent`:** This field is auto-generated by the engine. It is not included in `ProjectBundle` and must not be submitted via `draft_component`.

---

## Session Model

```typescript
// projects.ts
import { createProject, type Project } from 'formspec-studio-core';

interface DraftState {
  definition?: object;      // raw JSON, pre-normalization
  component?: object;
  theme?: object;
  errors: Map<string, any[]>;  // artifact name → validation errors
}

interface ProjectEntry {
  project: Project | null;  // null during bootstrap phase
  draft: DraftState | null; // non-null during bootstrap, null after load_draft
  sourcePath?: string;      // set by open(), used by save() default
}

const registry = new Map<string, ProjectEntry>();

function newProject(registries?: object[]): string     // returns project_id (uuid v4)
function getProject(project_id: string): Project       // throws PROJECT_NOT_FOUND if missing; throws NOT_IN_BOOTSTRAP if still in draft phase
function getDraft(project_id: string): DraftState      // throws PROJECT_NOT_FOUND; throws NOT_IN_DRAFT if already loaded
function closeProject(project_id: string): void
```

Each project starts in the **bootstrap phase** (`project: null, draft: { ... }`). The LLM submits artifacts via `draft_*` tools. After `load_draft`, the entry transitions to the **authoring phase** (`project: Project, draft: null`). Helper method tools check for a non-null `project` and return `NOT_IN_BOOTSTRAP` if the project hasn't been loaded yet.

Projects persist in memory for the lifetime of the server process.

**Auto-save on shutdown:** `server.ts` registers `SIGTERM` and `SIGINT` handlers. On signal, all projects where `project.isDirty === true` are saved to `~/.formspec/autosave/{project_id}/` before the process exits.

**Reconnection:** `open(path)` is idempotent — if the path is already open, returns the existing `project_id`.

**Memory pressure:** The registry rejects `createProject()` when more than 20 projects are active, returning `TOO_MANY_PROJECTS`.

---

## Tool Catalog (64 tools)

### Bootstrap (5)

These tools support the initial generation phase. The LLM generates JSON artifacts one at a time, validates each, iterates until clean, then loads the full draft into a Project for incremental authoring.

| Tool | Description |
|------|-------------|
| `draft_definition(project_id, json)` | Submit a FormspecDefinition JSON object. Validates against `schemas/definition.json`. Returns `{ valid: true }` or `{ valid: false, errors[] }` with JSON Schema validation errors and engine diagnostics. Overwrites any previous definition draft for this project. |
| `draft_component(project_id, json)` | Submit a FormspecComponentDocument JSON object. Validates against `schemas/component.json`. Returns `{ valid: true }` or `{ valid: false, errors[] }`. Overwrites any previous component draft. |
| `draft_theme(project_id, json)` | Submit a FormspecThemeDocument JSON object. Validates against `schemas/theme.json`. Returns `{ valid: true }` or `{ valid: false, errors[] }`. Overwrites any previous theme draft. Optional — omit for unstyled forms. |
| `validate_draft(project_id)` | Run cross-artifact validation on all submitted drafts. Checks referential integrity (e.g., component references to definition items, theme selectors to valid paths). Returns `{ valid: true, summary }` or `{ valid: false, errors[] }`. Requires at least a definition draft. |
| `load_draft(project_id)` | Normalize all valid drafts and load them into the `Project`. Calls `normalizeDefinition()` and `project.loadBundle()`. Returns the project state summary (field count, pages, etc.). Fails with `DRAFT_INVALID` if any artifact has unresolved validation errors. After this call, the project transitions to the authoring phase — all further edits use helper method tools. |

**Bootstrap flow:**
1. `create()` — get a `project_id`
2. `draft_definition(project_id, {...})` — submit, get errors, fix, resubmit until valid
3. `draft_component(project_id, {...})` — same loop
4. `draft_theme(project_id, {...})` — optional, same loop
5. `validate_draft(project_id)` — cross-artifact check
6. `load_draft(project_id)` — transition to authoring phase
7. Use helper method tools (`field`, `show_when`, `calculate`, etc.) for refinement

**Schema resources:** The server exposes `schemas/definition.json`, `schemas/component.json`, and `schemas/theme.json` as MCP resources so the LLM can reference them when generating artifacts.

### Project lifecycle (7)
| Tool | Description |
|------|-------------|
| `create(registries?)` | Start a new form project. Returns `project_id`. The project starts in bootstrap phase — use `draft_*` tools to submit JSON artifacts, then `load_draft` to transition to authoring. |
| `open(path)` | Load a form bundle directory from disk. Idempotent: if path is already open, returns existing `project_id`. |
| `save(project_id, path?)` | Write the current bundle to disk. Defaults to the path it was opened from. |
| `list()` | List all active in-memory projects with title, field count, and dirty flag. |
| `publish(project_id, version, summary?)` | Publish a versioned release. Calls `project.diagnose()` first; returns `PUBLISH_BLOCKED` with full `Diagnostics` if `counts.error > 0`. |
| `undo(project_id)` | Undo the last authoring operation. No-op if `project.canUndo` is false. |
| `redo(project_id)` | Redo the last undone operation. No-op if `project.canRedo` is false. |

### Structure (14)
| Tool | Description |
|------|-------------|
| `field(project_id, path, label, type, props?)` | Add a data-collecting element. Calls `project.addField()`. `type` accepts aliases from the Field Type Alias Table. `props`: placeholder, hint, description, ariaLabel, choices, choices_from, format, widget, page, required (boolean), readonly (boolean), initialValue. For conditional required/readonly, chain with `require()` / `readonly_when()`. |
| `content(project_id, path, body, kind?)` | Add a display element. Calls `project.addContent()`. `kind`: heading \| instructions \| alert \| divider. (`'image'` is not supported — no Image component in component schema.) |
| `group(project_id, path, label, props?)` | Create a named container for related fields. Calls `project.addGroup()`. `props`: collapsible, display (stack\|dataTable). |
| `repeat(project_id, target, props?)` | Allow multiple instances of a group. Calls `project.makeRepeatable()`. `props`: min, max, add_label, remove_label. |
| `page(project_id, title, description?)` | Add a step to a wizard or tabs layout. Calls `project.addPage()`. Returns `{ page_id }` from `affectedPaths[0]`. |
| `remove_page(project_id, page_id)` | Remove a page. Calls `project.removePage()`. |
| `move_page(project_id, page_id, direction)` | Reorder a page. Calls `project.reorderPage()`. `direction`: `'up' \| 'down'` (swaps with neighbor). No-op at boundary. |
| `place(project_id, target, page_id, options?)` | Assign a field or group to a specific page. Calls `project.placeOnPage()`. `options.span`: column span. |
| `unplace(project_id, target, page_id)` | Remove a field or group from a page assignment (does not delete the item). Calls `project.unplaceFromPage()`. |
| `update(project_id, path, changes)` | Change any property of an existing element. Calls `project.updateItem()`. Accepted keys: label, hint, description, placeholder, ariaLabel, options, choices_from, currency, precision, initialValue, dataType, required (FEL string), constraint, constraintMessage, calculate, relevant, readonly (FEL string), format, widget, style, page. Unknown keys return `INVALID_KEY`. |
| `remove(project_id, path)` | Delete a field, group, or content element. Calls `project.removeItem()`. Cleans up binds, shapes, and variables before deleting. Mapping rule references not cleaned — run `audit()` afterward. |
| `copy(project_id, path, deep?)` | Copy a field or group. Calls `project.copyItem()`. Inserts clone immediately after the original. Returns new path in `affectedPaths[0]`. `deep: false` (default): copies item structure; `warnings` lists omitted binds/shapes. `deep: true`: also copies bind entries and shape rules with path rewriting. |
| `metadata(project_id, changes)` | Set form-level metadata. Calls `project.setMetadata()`. Accepted: title, name, description, url, version, status, date, versionAlgorithm, nonRelevantBehavior, derivedFrom, density, labelPosition, pageMode, defaultCurrency. |
| `submit_button(project_id, label?, page_id?)` | Add a SubmitButton component. Calls `project.addSubmitButton()`. Returns component node ID in `affectedPaths[0]`. |

### Flow and form shape (4)
| Tool | Description |
|------|-------------|
| `flow(project_id, mode, props?)` | Set how the form is navigated. Calls `project.setFlow()`. `mode`: single \| wizard \| tabs. `props`: showProgress, allowSkip. |
| `branch(project_id, on, paths, otherwise?)` | Show different fields depending on an answer. Calls `project.showWhen()` per branch arm with generated FEL. `on`: field path. `paths`: `{ when, show, mode? }[]`. Mode auto-detects multiChoice fields (uses `selected(on, when)` not `contains()`). `otherwise`: path(s) visible when no branch matches — NOTE: also visible when `on` is unset/empty. |
| `move(project_id, path, targetPath?, index?)` | Reorder or reparent a field or group. Calls `project.moveItem()`. |
| `rename(project_id, path, newKey)` | Rename a field key. Calls `project.renameItem()`. The handler rewrites all FEL references internally. |

### Behavior (5)
| Tool | Description |
|------|-------------|
| `show_when(project_id, target, condition)` | Make a field, group, or page visible only when the FEL condition is true. Calls `project.showWhen()`. |
| `readonly_when(project_id, target, condition)` | Lock a field when condition is true. Calls `project.readonlyWhen()`. |
| `require(project_id, target, condition?)` | Mark as required always (no condition), or only when condition is true. Calls `project.require()`. |
| `calculate(project_id, target, expression)` | Derive a field's value from a FEL expression. Calls `project.calculate()`. |
| `add_rule(project_id, target, rule, message, options?)` | Enforce a data quality rule. Calls `project.addValidation()`. `options`: timing, severity (error blocks submission; warning/info are advisory), code, activeWhen. |

### Presentation (3)
| Tool | Description |
|------|-------------|
| `layout(project_id, target, arrangement)` | Arrange fields spatially. Calls `project.applyLayout()`. `arrangement`: columns-2, columns-3, columns-4, card, sidebar, inline. |
| `style(project_id, path, properties)` | Set visual presentation for a specific field path. Calls `project.applyStyle()`. |
| `style_all(project_id, properties, target_type?, target_data_type?)` | Set presentation for form-level or by type/dataType. Calls `project.applyStyleAll()`. Omit targeting params for form-level. |

### Data (9)
| Tool | Description |
|------|-------------|
| `define_choices(project_id, name, options[])` | Define a reusable named option list. Calls `project.defineChoices()`. Referenced by fields via `choices_from`. |
| `variable(project_id, name, expression, scope?)` | Define a named FEL variable. Calls `project.addVariable()`. |
| `update_variable(project_id, name, expression)` | Update a variable's expression. Calls `project.updateVariable()`. |
| `remove_variable(project_id, name)` | Delete a named variable. Calls `project.removeVariable()`. |
| `rename_variable(project_id, name, newName)` | Rename a variable and rewrite all `$name` FEL references. Calls `project.renameVariable()`. |
| `instance(project_id, name, props)` | Declare a named external data source. Calls `project.addInstance()`. |
| `update_instance(project_id, name, changes)` | Update instance properties. Calls `project.updateInstance()`. |
| `rename_instance(project_id, name, newName)` | Rename an instance and rewrite all `@instance('name')` FEL references. Calls `project.renameInstance()`. |
| `remove_instance(project_id, name)` | Remove an instance. Calls `project.removeInstance()`. FEL references not cleaned — run `audit()`. |

### Screener (7)
| Tool | Description |
|------|-------------|
| `screener(project_id, enabled)` | Enable or disable the pre-form screener. Calls `project.setScreener()`. |
| `screen_field(project_id, key, label, type, props?)` | Add a qualifying question. Calls `project.addScreenField()`. Same aliases and props as `field`. |
| `remove_screen_field(project_id, key)` | Remove a qualifying question. Calls `project.removeScreenField()`. |
| `screen_route(project_id, condition, target, label?)` | Add a routing rule. Calls `project.addScreenRoute()`. |
| `update_screen_route(project_id, route_index, changes)` | Update a routing rule's condition, target, or label. Calls `project.updateScreenRoute()`. `changes`: `{ condition?, target?, label? }`. |
| `reorder_screen_route(project_id, route_index, direction)` | Swap a routing rule with its neighbor. Calls `project.reorderScreenRoute()`. `direction`: `'up' \| 'down'`. |
| `remove_screen_route(project_id, route_index)` | Remove a routing rule by zero-based index. Calls `project.removeScreenRoute()`. Cannot remove the last remaining route — returns `ROUTE_MIN_COUNT`. |

### Understanding (7)
| Tool | Description |
|------|-------------|
| `preview(project_id, scenario?)` | Simulate a respondent's experience. Returns visible/hidden fields, calculated values, required state, page progression, and validation state. Uses FormEngine evaluation. |
| `audit(project_id)` | Runs `project.diagnose()` and formats results by severity. |
| `describe(project_id, target?)` | Without `target`: project statistics + field paths. With `target`: field label, type, widget, bind expressions, page assignment. |
| `trace(project_id, expression_or_field)` | Dependency graph for an expression or field. Calls `project.expressionDependencies()` or `project.fieldDependents()`. |
| `validate_response(project_id, response)` | Validate a response document. Returns `ValidationReport` (see helpers spec for type). |
| `search(project_id, filter)` | Find fields matching criteria. `filter`: `{ type?, dataType?, label?, hasExtension? }`. |
| `changelog(project_id, fromVersion?)` | Changes since last published version. Returns breaking \| compatible \| cosmetic classification. |

### FEL assistance (3)
| Tool | Description |
|------|-------------|
| `fel_context(project_id, path?)` | Available references at this path. Returns `project.availableReferences(path)`. |
| `fel_functions(project_id)` | All available FEL functions with signatures. |
| `fel_check(project_id, expression, context_path?)` | Validate a FEL expression. Returns `{ valid, errors, references, functions }`. Note: mutation tools that accept FEL expressions (`show_when`, `calculate`, `require`, `add_rule`, etc.) auto-validate and return `INVALID_FEL` directly — `fel_check` is a dry-run convenience, not a required pre-step. |

### Escape hatch (0)

Removed. Raw JSON generation happens only during the bootstrap phase via `draft_*` tools, which validate and constrain the input. After `load_draft`, all mutations go through `Project` helper methods.

---

## Error Handling

All tools return structured errors — never generic strings.

```typescript
interface ToolError {
  code: string;
  message: string;
  detail?: {
    path?: string;
    similarPaths?: string[];      // PATH_NOT_FOUND: fuzzy-matched existing paths (top 3-5)
    expression?: string;
    parseError?: {
      message: string;            // Chevrotain error message (may use internal token names)
      offset?: number;            // character position (more reliable than line for single-line expressions)
      errorType?: string;         // Chevrotain exception name: 'MismatchedTokenException' | 'NoViableAltException' | 'NotAllInputParsedException'
      // Note: line/column are omitted — line is always 1 for single-expression strings,
      // and column is undefined for EOF errors (unclosed parens, trailing dot).
    };
    diagnostics?: Diagnostics;    // for PUBLISH_BLOCKED
    validKeys?: string[];          // for INVALID_KEY
    validTypes?: string[];         // for INVALID_TYPE
    validWidgets?: string[];       // for INVALID_WIDGET
    validFormats?: string[];       // for INVALID_FORMAT
    commandType?: string;          // for COMMAND_FAILED: which handler failed
    handlerMessage?: string;       // for COMMAND_FAILED: raw error message from handler
    currentRouteCount?: number;    // for ROUTE_MIN_COUNT
    routes?: object[];             // for ROUTE_MIN_COUNT: current route list
  }
}
```

**Error codes:**

| Code | When |
|------|------|
| `PROJECT_NOT_FOUND` | `project_id` does not exist in the registry |
| `TOO_MANY_PROJECTS` | Registry limit (20) reached |
| `PATH_NOT_FOUND` | Item doesn't exist at the given path. `detail.similarPaths` lists fuzzy-matched existing paths for self-correction. |
| `INVALID_PATH` | Path syntax is malformed |
| `PAGE_NOT_FOUND` | `page_id` does not exist |
| `VARIABLE_NOT_FOUND` | Variable name does not exist |
| `ROUTE_OUT_OF_BOUNDS` | `route_index` is out of bounds |
| `ROUTE_MIN_COUNT` | Attempted to delete the last remaining screener route. `detail.currentRouteCount` and `detail.routes` provided. |
| `INVALID_TYPE` | Unknown `type` alias. `detail.validTypes` lists the alias table. |
| `INVALID_KEY` | Key in `update()` is not in `ItemChanges`. `detail.validKeys` lists all accepted keys. |
| `INVALID_WIDGET` | Unknown widget alias or component name. `detail.validWidgets` lists the Widget Alias Table. |
| `INVALID_FORMAT` | Unknown `format` value. `detail.validFormats` lists valid values. |
| `DUPLICATE_KEY` | An item with that key already exists at the target path |
| `INVALID_FEL` | FEL expression parse error. `detail.expression`, `detail.parseError.message`, `detail.parseError.offset`, `detail.parseError.errorType` provided. Mutation tools auto-validate FEL and return this error directly. |
| `PUBLISH_BLOCKED` | `project.diagnose()` returned errors. `detail.diagnostics` contains the full `Diagnostics` object. |
| `COMMAND_FAILED` | A helper method's internal command dispatch threw. `detail.commandType` and `detail.handlerMessage` provided. |
| `DRAFT_INVALID` | `load_draft` called but one or more artifacts have unresolved validation errors. `detail.artifacts` lists which artifacts are invalid. |
| `DRAFT_MISSING` | `load_draft` called but no definition draft has been submitted. |
| `DRAFT_SCHEMA_ERROR` | `draft_*` artifact failed JSON Schema validation. `detail.errors[]` contains AJV validation errors with JSON Pointer paths. |
| `NOT_IN_BOOTSTRAP` | A `draft_*` tool was called after `load_draft` — project is already in authoring phase. |
| `INVALID_INPUT` | Tool input failed schema validation. |
| `SAVE_FAILED` | File system write error during `save()`. |
| `LOAD_FAILED` | Directory not found, missing definition file, or invalid JSON during `open()`. `detail.path` and `detail.reason` provided. |

MCP error format: `{ isError: true, content: [{ type: 'text', text: JSON.stringify(toolError) }] }`.

---

## Future Work

**`formspec-mcp-generation` (separate package)**
Server-driven generation with an optional `GenerationProvider` interface. Excluded to keep `formspec-mcp` AI-provider-free.

**Pages advanced layout**
Several `pages.*` commands exist but are not exposed as tools: `pages.autoGenerate` (auto-creates pages from group structure), `pages.reorderRegion` (reorders items within a page region), `pages.setRegionProperty` (sets `span`/`start` on a region), `pages.setPageProperty` (generic page property setter). These enable full grid layout authoring. Deferred to v1.1.

**`audit()` extended checks**
Unreachable branches, unconstrained free-text fields, conditional dead ends. Deferred to v1.1.

**Mapping rule cleanup on `remove`**
`remove` does not clean up mapping rule references to deleted fields. Run `audit()` afterward. A `cleanup_mapping` helper is deferred.

**Fragment export/import**
Export a group (with fields, binds, shapes) as a reusable template across projects.

---

## Verification

```bash
# Build MCP server
cd packages/formspec-mcp && npm run build

# Unit tests — MCP tool handlers
cd packages/formspec-mcp && npx vitest run

# Integration test — MCP server
cd packages/formspec-mcp && node dist/index.js
# Test with: npx @modelcontextprotocol/inspector dist/index.js
```

**Critical test coverage:**
- `draft_definition()` — schema validation errors include JSON Pointer paths; valid definition returns `{ valid: true }`
- `draft_component()` — rejects component referencing items not in definition draft
- `validate_draft()` — catches cross-artifact reference errors (component → definition, theme → definition)
- `load_draft()` — fails with `DRAFT_INVALID` when errors exist; succeeds and transitions to authoring phase
- `load_draft()` — authoring tools work after load; draft tools return `NOT_IN_BOOTSTRAP`
- `draft_*()` after `load_draft()` — returns `NOT_IN_BOOTSTRAP`
- `update()` — routing table exhaustiveness (every `ItemChanges` key to correct handler; unknown → `INVALID_KEY`)
- `field()` — all 22 aliases resolve to correct dataType + defaultWidget
- `branch()` — multiChoice auto-detection uses `selected(on, when)` not `contains()`; `otherwise` visible when field unset
- `branch()` — FEL expression validity for all `when` literal types (string, number, boolean)
- `copy(deep: false)` — `warnings` populated with bind/shape counts; `deep: true` — binds and shapes copied with rewritten paths
- `metadata()` — each property routes to correct helper; `submitMode`/`language` rejected as `INVALID_KEY`
- `move_page()` — no-op at boundary; correct neighbor swap
- `update_screen_route()` — each changes key dispatches to `definition.setRouteProperty`
- `publish()` — blocked when diagnose returns errors; passes when clean
- `preview()` / `validate_response()` — FormEngine instantiation; full return type coverage
- `save()` / `open()` — round-trip produces identical state; `open()` idempotency
- `PATH_NOT_FOUND` — `similarPaths` fuzzy-match returns correct candidates

---

## Revision History

| Rev | Date | Summary |
|-----|------|---------|
| 1 | 2026-03-14 | Initial draft |
| 2 | 2026-03-14 | MCP design spec rewrite incorporating pre-implementation review |
| 3 | 2026-03-14 | Corrects factual errors; documents authoring-vocabulary mappings |
| 4 | 2026-03-14 | HelperResult type, evaluation-helpers split, removeItem 5-step algorithm, query formatters to MCP layer, widget alias table, branch() multiChoice, ItemChanges additions, FieldProps boolean-only required/readonly, style/style_all split, PATH_NOT_FOUND similarPaths, SIGTERM auto-save v1, open() idempotency, rating/slider aliases, rename_variable, copy deep flag, metadata/submit_button, previewForm expanded return, COMMAND_FAILED detail, error code additions |
| 5 | 2026-03-14 | Codebase-validated gap fixes: error protocol documented (Design Decision #6, HelperError); `'image'` removed from addContent kind (no Image component in schema); RepeatProps add/remove_label resolved to component.setNodeProperty; applyLayout 'inline' resolved to Stack { direction: 'horizontal' }; update_screen_route and reorder_screen_route promoted to v1 (definition.setRouteProperty and definition.reorderRoute confirmed); INVALID_FEL detail: offset+errorType replace unreliable line/column; affectedPaths contract documented (form-level ops → []); choices tool renamed define_choices; branch() multiChoice mode corrected to selected(on,when) not contains(); move_page and unplace tools added (pages.reorderPages and pages.unassignItem confirmed); metadata() routing corrected to setDefinitionProperty/setFormTitle/setFormPresentation, submitMode/language removed (not in schema); copy() inline-property copy behavior documented; HelperResult.warnings added |
| 5.1 | 2026-03-14 | Split from formspec-mcp-design.md into two documents: this file (MCP server) and formspec-studio-core-helpers.md (helpers module) |
| 6 | 2026-03-15 | Updated for studio-core API: all tool descriptions now reference `Project` helper methods instead of raw command types. `formspec-core` is never imported — all access through `formspec-studio-core`. Session model uses `ProjectBundle` not `ProjectState`. Removed `dispatch` escape hatch — all mutations go through helper methods. |
| 7 | 2026-03-15 | Two-phase creation model: bootstrap (LLM generates JSON artifacts → schema validation → engine diagnostics → iterate until clean) then author (incremental edits via helper methods). Added 5 bootstrap tools (`draft_definition`, `draft_component`, `draft_theme`, `validate_draft`, `load_draft`). Removed `seed` parameter from `create()`. Session model tracks draft vs. authoring phase per project. Schema resources exposed via MCP. New error codes: `DRAFT_INVALID`, `DRAFT_MISSING`, `DRAFT_SCHEMA_ERROR`, `NOT_IN_BOOTSTRAP`. |
