# formspec-studio-core — API Reference

*Auto-generated from TypeScript declarations — do not hand-edit.*

Pure TypeScript library for creating and editing Formspec artifact bundles. Every edit is a serializable Command dispatched against a Project. No framework dependencies, no singletons, no side effects.

formspec-studio-core

Pure TypeScript library for creating and editing Formspec artifact bundles.
Every edit is a serializable {@link Command} dispatched against a {@link Project}.

Entry point: call {@link createProject} to get a new {@link Project} instance,
then use `project.dispatch(command)` to apply mutations.

No framework dependencies, no singletons, no side effects.

## `registerHandler(type: string, handler: CommandHandler): void`

Register a command handler for a given command type.

Called at module load time by each handler module (self-registration pattern).
If a handler for the same type is already registered, it is silently replaced.

## `getHandler(type: string): CommandHandler`

Look up the handler for a command type.

#### type `CommandHandler`

A function that applies a command's payload to a cloned project state.

Handlers receive a mutable clone of {@link ProjectState} and mutate it in-place.
They return a {@link CommandResult} (plus any command-specific extra fields)
indicating what side effects are needed (e.g. component tree rebuild).

```ts
type CommandHandler = (state: ProjectState, payload: unknown) => CommandResult & Record<string, unknown>;
```

Handlers for definition bind management and field configuration commands.

**Binds** in Formspec are declarative rules that connect a field (identified by
a dot-path) to dynamic behaviors: calculated values, relevance conditions,
required/readonly state, validation constraints, default values, and various
processing directives. Each bind entry targets a single path and carries one
or more property expressions (typically FEL strings). The binds array lives at
`definition.binds` and is the primary mechanism for making fields reactive.

This module also registers handlers for direct field/item property editing
(data type, options, extensions) which operate on the `definition.items` tree
rather than the binds array.

definition-binds

Handlers for definition-level metadata commands.

Form metadata consists of top-level descriptive properties on the definition
document: `title`, `name`, `description`, `url`, `version`, `status`, `date`,
`derivedFrom`, `versionAlgorithm`, and `nonRelevantBehavior`. These properties
identify and describe the form but do not affect field structure, binds, or
runtime behavior.

Currently only the `definition.setFormTitle` command is implemented here.
Other metadata properties (url, version, name, description, status, date, etc.)
are handled by the generic `definition.setDefinitionProperty` command registered
elsewhere.

definition-metadata

## `resolveItemLocation(state: ProjectState, path: string): {
    parent: FormspecItem[];
    index: number;
    item: FormspecItem;
} | undefined`

Resolve a dot-separated item path to its location within the definition item tree.

Walks the `state.definition.items` hierarchy following each segment of the
dot-path through nested `children` arrays. Returns the parent array containing
the target item, the item's index within that array, and the item itself.

Used by virtually every definition-item handler (`deleteItem`, `renameItem`,
`moveItem`, `reorderItem`, `duplicateItem`) to locate an item before mutating it.

## `createProject(options?: ProjectOptions): Project`

Factory function for creating a new {@link Project} instance.
Preferred over direct constructor usage for API consistency.

#### class `Project`

Central editing surface for a Formspec artifact bundle.

A Project manages four co-evolving artifacts (definition, component, theme, mapping)
plus extension registries and version history. Every mutation flows through a
command-dispatch pipeline:

  1. Middleware chain (may transform or reject the command)
  2. State clone + handler execution on the clone
  3. Component tree rebuild (if the handler signals structural change)
  4. Cross-artifact normalization (URL sync, breakpoint sync, sort invariants)
  5. History snapshot push (capped by `maxHistoryDepth`, pruned oldest-first)
  6. Change listener notification

Key invariants:
- State is never mutated in place; handlers operate on a `structuredClone`.
- Undo/redo swap full snapshots, so every state transition is atomic.
- Queries (fieldPaths, statistics, diagnose, etc.) are pure reads with no caching;
  the consumer decides when to call them.
- No UI state (selection, panel visibility) lives here -- that belongs to the consumer.
- Each Project instance is fully independent; no shared global state.

##### `constructor(options?: ProjectOptions)`

Create a new Project instance.

- **(get) state** (`Readonly<ProjectState>`): Current project state. Treat as immutable -- all mutations go through
{@link dispatch} or {@link batch}.
- **(get) definition** (`Readonly<FormspecDefinition>`): The form's structure and behavior: items, binds, shapes, variables, etc.
- **(get) component** (`Readonly<FormspecComponentDocument>`): The parallel UI tree: widget assignments, layout containers, responsive overrides.
- **(get) theme** (`Readonly<FormspecThemeDocument>`): Visual presentation: design tokens, defaults, selector overrides, breakpoints.
- **(get) mapping** (`Readonly<FormspecMappingDocument>`): Bidirectional transforms between form responses and external schemas.
- **(get) canUndo** (`boolean`): Whether there is at least one state snapshot on the undo stack.
- **(get) canRedo** (`boolean`): Whether there is at least one state snapshot on the redo stack.
- **(get) log** (`readonly LogEntry[]`): Full command log. Serializable -- can be persisted and replayed on a
fresh project to reconstruct state.

##### `fieldPaths(): string[]`

All leaf field paths in the definition item tree, in document order.
Paths use dot-notation (e.g., `"contact.email"`). Groups are traversed
but not included -- only items with `type === 'field'` appear.

##### `itemAt(path: string): FormspecItem | undefined`

Resolve an item by its dot-path within the definition tree.
Walks the item hierarchy segment by segment; returns `undefined` if any
segment is not found or if a non-group item is encountered mid-path.

##### `statistics(): ProjectStatistics`

Compute form complexity metrics by walking the item tree.
Counts fields, groups, display items, and measures maximum nesting depth.
Also reports bind, shape, and variable counts from the definition.

##### `instanceNames(): string[]`

All instance names declared in the definition's `instances` map.
Instances are external data sources referenceable in FEL via `@instance()`.

##### `variableNames(): string[]`

All variable names declared in the definition.
Variables are named FEL expressions referenceable via `@variableName`.

##### `optionSetUsage(name: string): string[]`

Find all field paths that reference a given named option set.
Walks the item tree looking for items whose `optionSet` property
matches the provided name.

##### `searchItems(filter: ItemFilter): FormspecItem[]`

Search definition items by type, dataType, label substring, or extension usage.
All filter criteria are AND-ed: an item must match every specified filter field.

##### `effectivePresentation(fieldKey: string): Record<string, unknown>`

Resolve the effective presentation for a field through the theme cascade.
Applies three tiers in order (later tiers override earlier):
  1. Theme defaults (global fallback)
  2. Matching selectors (by item type/dataType, in document order)
  3. Per-item overrides (keyed by field path)

##### `bindFor(path: string): Record<string, unknown> | undefined`

Get the effective bind properties for a field path.
Looks up the bind entry whose `path` matches, then returns all bind
properties (calculate, relevant, required, readonly, constraint, etc.)
excluding the path itself.

##### `componentFor(fieldKey: string): Record<string, unknown> | undefined`

Find the component tree node bound to a field key.
Performs a breadth-first search of the component tree looking for a node
whose `bind` property matches the given key.

##### `resolveExtension(name: string): Record<string, unknown> | undefined`

Resolve an extension name against all loaded registries.
Searches registries in order, returning the first catalog entry whose name matches.

##### `unboundItems(): string[]`

Find definition fields that have no corresponding node in the component tree.
These fields fall back to Tier 2/1 rendering (auto-generated from definition structure).

##### `resolveToken(key: string): string | number | undefined`

Resolve a design token value through the two-tier cascade.
Checks component tokens (Tier 3) first, then theme tokens (Tier 2).
Platform defaults (Tier 1) are not handled here -- the consumer provides those.

##### `allDataTypes(): DataTypeInfo[]`

Enumerate all valid data types: the 13 core types plus any dataType extensions
from loaded registries. Used by editors for field type selection UI.

##### `parseFEL(expression: string): FELParseResult`

Parse and validate a FEL expression without saving it to project state.
Extracts field references and function calls via lightweight regex scanning.
Intended for expression editor inline validation and autocomplete support.

##### `felFunctionCatalog(): FELFunctionEntry[]`

Enumerate the full FEL function catalog: built-in functions plus extension
functions from loaded registries. Used by editors for autocomplete and
function documentation popups.

##### `availableReferences(contextPath?: string): FELReferenceSet`

Scope-aware list of valid FEL references at a given path.
Always includes all fields, variables, and instances. When `contextPath`
points to a repeatable group, also includes `@current`, `@index`, `@count`.
Used by expression editors for autocomplete and reference validation.

##### `allExpressions(): ExpressionLocation[]`

Enumerate all FEL expressions in the project with their artifact locations.
Scans bind properties (calculate, relevant, required, readonly, constraint),
shape constraints and activeWhen guards, and variable expressions.

##### `expressionDependencies(expression: string): string[]`

List all field paths that a FEL expression references.
Delegates to the regex-based field reference extractor.

##### `fieldDependents(fieldPath: string): FieldDependents`

Reverse lookup: find all binds, shapes, variables, and mapping rules that
reference a given field. Uses substring matching on `$fieldPath` within
FEL expression strings.

##### `variableDependents(variableName: string): string[]`

Find all bind paths whose FEL expressions reference a given variable.
Uses substring matching on `@variableName` within bind expression strings.

##### `dependencyGraph(): DependencyGraph`

Build a full dependency graph across all FEL expressions in the project.
Nodes represent fields, variables, and shapes. Edges represent FEL references
from bind properties and variable expressions. Cycles are reported but not
currently detected (the `cycles` array is always empty).

##### `listRegistries(): RegistrySummary[]`

Enumerate loaded extension registries with summary metadata.

##### `browseExtensions(filter?: ExtensionFilter): Record<string, unknown>[]`

Browse extension entries across all loaded registries with optional filtering.
Filter criteria (category, status, namePattern) are AND-ed.

##### `diffFromBaseline(fromVersion?: string): Change[]`

Compute a structured diff from a baseline (or a specific published version)
to the current definition state. Compares item keys to detect additions and
removals, classifying removals as breaking and additions as compatible.

##### `previewChangelog(): FormspecChangelog`

Preview what the changelog would look like without committing to a publish.
Computes a diff from the baseline, determines the aggregate semver impact
(breaking > compatible > cosmetic), and packages it as a {@link FormspecChangelog}.

##### `diagnose(): Diagnostics`

On-demand multi-pass validation of the current project state.
Not continuously computed -- the consumer decides when to call it
(on save, on panel open, on a debounce timer, etc.).

Current passes:
- **extensions**: Walks all items for `x-` properties not resolvable against loaded registries
  (produces `UNRESOLVED_EXTENSION` errors).
- **consistency**: Detects orphan component binds (bound to nonexistent fields,
  `ORPHAN_COMPONENT_BIND` warnings) and stale mapping rule source paths
  (`STALE_MAPPING_SOURCE` warnings).

##### `export(): ProjectBundle`

Serialize the four core artifacts as standalone JSON-serializable documents.
Returns a deep clone so the caller can freely mutate the result without
affecting project state. Extensions and versioning state are excluded.

##### `undo(): boolean`

Restore the most recent pre-command state snapshot.
Pushes the current state onto the redo stack, pops from the undo stack,
and notifies listeners with source `'undo'`.

##### `redo(): boolean`

Re-apply the most recently undone state.
Pushes the current state onto the undo stack, pops from the redo stack,
and notifies listeners with source `'redo'`.

##### `onChange(listener: ChangeListener): () => void`

Subscribe to state changes. The listener is called after every dispatch,
batch, undo, or redo with the new state and a change event describing
what triggered the transition.

##### `dispatch(command: AnyCommand): CommandResult`

Apply a single command through the full dispatch lifecycle.

Lifecycle:
  1. Build middleware chain wrapping the core handler.
  2. Clone state, execute handler on clone, push history snapshot.
  3. If `result.clearHistory`, wipe undo/redo stacks and log.
  4. If `result.rebuildComponentTree`, sync component tree to definition.
  5. Run cross-artifact normalization.
  6. Notify all change listeners.

If the handler throws, state is unchanged (the clone is discarded).

##### `batch(commands: AnyCommand[]): CommandResult[]`

Apply multiple commands as one atomic operation.
All commands execute sequentially on a single state clone, producing one
undo entry and one change notification. The component tree is rebuilt if
any command's result signals it. Middleware is bypassed -- commands go
directly to their handlers.

Commands in a batch are independent: if a command needs results from an
earlier command in the same batch, use sequential {@link dispatch} calls instead.

#### interface `FormspecComponentDocument`

Minimal component document shape for studio-core.

Represents the Tier 3 (Component) artifact: a parallel UI tree declaring which
widget renders each field, layout containers, responsive overrides, and custom
component templates. Open-ended (`[key: string]: unknown`) to allow spec evolution.

- **url** (`string`): Canonical URL identifying this component document.
- **targetDefinition** (`{
        url: string;
    }`): Reference to the definition this component document targets.
- **tree** (`unknown`): The component tree: layout containers and widget bindings.
- **tokens** (`Record<string, unknown>`): Design token overrides scoped to the component tier.
- **breakpoints** (`Record<string, number>`): Named viewport breakpoints (e.g. `{ sm: 640, md: 1024 }`).
- **customComponents** (`Record<string, unknown>`): Custom component template definitions.

#### interface `FormspecThemeDocument`

Minimal theme document shape for studio-core.

Represents the Tier 2 (Theme) artifact: visual presentation tokens, form-wide
defaults, selector-based overrides, per-item overrides, page layout, and external
stylesheets. The cascade order is: defaults -> selectors (document order) -> items.

- **url** (`string`): Canonical URL identifying this theme document.
- **targetDefinition** (`{
        url: string;
        compatibleVersions?: string;
    }`): Reference to the target definition, with optional semver compatibility range.
- **tokens** (`Record<string, unknown>`): Design tokens (colors, spacing, typography, etc.).
- **defaults** (`Record<string, unknown>`): Form-wide default presentation values (cascade level 1).
- **selectors** (`unknown[]`): Selector-based overrides matching items by type/dataType (cascade level 2).
- **items** (`Record<string, unknown>`): Per-item presentation overrides keyed by item name (cascade level 3).
- **pages** (`unknown[]`): Page layout definitions (12-column grid regions).
- **breakpoints** (`Record<string, number>`): Named viewport breakpoints.
- **stylesheets** (`string[]`): External stylesheet URLs to load.

#### interface `FormspecMappingDocument`

Minimal mapping document shape for studio-core.

Represents the Mapping artifact: bidirectional transforms between Formspec
responses and external schemas (JSON, XML, CSV). Contains field-level rules
(preserve, expression, coerce, valueMap, flatten, nest, etc.) and adapter config.

- **url** (`string`): Canonical URL identifying this mapping document.
- **definitionRef** (`string`): URL of the definition this mapping targets.
- **direction** (`string`): Transform direction: `'inbound'`, `'outbound'`, or `'bidirectional'`.
- **rules** (`unknown[]`): Ordered list of field-level mapping rules.
- **targetSchema** (`Record<string, unknown>`): Schema definition for the external target format.

#### interface `ExtensionsState`

Read-only extension state loaded into a project.

Registries provide custom data types, FEL functions, constraints, and properties.
They are reference data -- the project loads them but does not author them.

- **registries** (`LoadedRegistry[]`): All extension registries currently loaded into the project.

#### interface `LoadedRegistry`

A single extension registry that has been fetched and indexed.

- **url** (`string`): Canonical URL of the registry document.
- **document** (`unknown`): The raw registry document as loaded.
- **catalog** (`ResolvedCatalog`): Pre-indexed catalog for fast extension lookup by name.

#### interface `ResolvedCatalog`

Pre-indexed catalog derived from a registry document.
Entries are keyed by extension name for O(1) lookup during validation and authoring.

- **entries** (`Map<string, unknown>`): Map from extension name to its registry entry.

#### interface `VersioningState`

Tracks the definition's version history.

Enables changelog generation (structured diff with semver impact classification)
and version publishing. The baseline is compared against the current definition
to compute pending changes.

- **baseline** (`FormspecDefinition`): Snapshot of the definition at the last publish (or project creation).
- **releases** (`VersionRelease[]`): Ordered release history, oldest first.

#### interface `VersionRelease`

A published version of the definition, including its changelog and frozen snapshot.

- **version** (`string`): Semver version string (e.g. `"1.2.0"`).
- **publishedAt** (`string`): ISO 8601 timestamp of when this version was published.
- **changelog** (`unknown`): Structured diff from the previous version.
- **snapshot** (`FormspecDefinition`): Frozen definition snapshot at this version.

#### interface `ProjectState`

The complete state of a studio project.

Contains four editable Formspec artifacts (definition, component, theme, mapping)
plus two supporting subsystems (extensions, versioning). No UI state (selection,
panel visibility, viewport) lives here -- that belongs to the consumer.

Mutations happen exclusively through dispatched commands; never mutate directly.

- **definition** (`FormspecDefinition`): The form's structure and behavior: items, binds, shapes, variables, etc.
- **component** (`FormspecComponentDocument`): The parallel UI tree: widget bindings, layout containers, responsive overrides.
- **theme** (`FormspecThemeDocument`): Visual presentation: tokens, defaults, selectors, page layout.
- **mapping** (`FormspecMappingDocument`): Bidirectional transforms between responses and external schemas.
- **extensions** (`ExtensionsState`): Loaded extension registries providing custom types, functions, and constraints.
- **versioning** (`VersioningState`): Baseline snapshot and release history for changelog generation.

#### interface `Command`

A serializable edit operation dispatched against a Project.

Every mutation to project state is expressed as a command. Commands can be
logged, replayed, transmitted, and persisted -- enabling undo/redo, collaboration,
and audit trails.

- **type** (`T`): Discriminant identifying which handler processes this command.
- **payload** (`P`): Command-specific data (e.g. the item to add, the path to remove).
- **id** (`string`): Optional client-generated ID for correlation (not used by the engine).

#### interface `CommandResult`

Result returned by every command handler after mutating state.

Tells the Project (and consumers) what side effects are needed.

- **rebuildComponentTree** (`boolean`): Whether the component tree needs rebuilding (e.g. after structural item changes).
- **clearHistory** (`boolean`): If true, discard all undo/redo history (e.g. after a full project replacement).

#### interface `LogEntry`

A timestamped record of a dispatched command.

The full command log is serializable and can be persisted then replayed
on a fresh project to reconstruct state.

- **command** (`AnyCommand`): The command that was dispatched.
- **timestamp** (`number`): Epoch milliseconds when the command was dispatched.

#### interface `ProjectOptions`

Configuration for creating a new Project instance via `createProject()`.

- **seed** (`Partial<ProjectState>`): Partial initial state. Omitted fields get sensible defaults (empty definition
with a generated URL, blank component/theme/mapping documents, no extensions).
- **registries** (`unknown[]`): Extension registry documents to load at creation time.
- **maxHistoryDepth** (`number`): Maximum number of undo snapshots to retain (default: 50). Oldest pruned first.
- **middleware** (`Middleware[]`): Middleware functions inserted into the dispatch pipeline.

#### interface `ChangeEvent`

Describes a state change that just occurred. Passed to {@link ChangeListener} callbacks.

- **command** (`AnyCommand`): The command that triggered this change.
- **result** (`CommandResult`): The result returned by the command handler.
- **source** (`string`): How the change originated: `'dispatch'`, `'undo'`, `'redo'`, or `'batch'`.

#### interface `ProjectStatistics`

Aggregate complexity metrics for a project.
Returned by `Project.statistics()` for dashboards and heuristic checks.

- **fieldCount** (`number`): Number of leaf field items in the definition.
- **groupCount** (`number`): Number of group (repeatable/non-repeatable) items.
- **displayCount** (`number`): Number of display (read-only output) items.
- **maxNestingDepth** (`number`): Deepest nesting level of groups within groups.
- **bindCount** (`number`): Total number of bind entries (calculate, relevant, required, readonly, constraint).
- **shapeCount** (`number`): Number of cross-field validation shapes.
- **variableCount** (`number`): Number of named FEL variables.
- **expressionCount** (`number`): Total FEL expressions across all artifacts.
- **componentNodeCount** (`number`): Number of nodes in the component tree.
- **mappingRuleCount** (`number`): Number of mapping rules.

#### interface `ProjectBundle`

The four exportable artifacts as a single bundle.
Used for serialization, export, and project snapshot operations.

- **definition** (`FormspecDefinition`): The form definition artifact.
- **component** (`FormspecComponentDocument`): The component (UI tree) artifact.
- **theme** (`FormspecThemeDocument`): The theme (presentation) artifact.
- **mapping** (`FormspecMappingDocument`): The mapping (data transform) artifact.

#### interface `ItemFilter`

Criteria for searching definition items via `Project.searchItems()`.
All fields are optional; when multiple are set they are AND-combined.

- **type** (`'field' | 'group' | 'display'`): Filter by item kind.
- **dataType** (`string`): Filter by data type name (exact match).
- **label** (`string`): Filter by label text (substring match).
- **hasExtension** (`string`): Filter to items that declare this extension name.

#### interface `DataTypeInfo`

Describes a data type available in the project.
Includes the 13 core types plus any extension-provided types from loaded registries.

- **name** (`string`): The data type name (e.g. `'string'`, `'x-formspec-url'`).
- **source** (`'core' | 'extension'`): Whether this type is built-in or provided by an extension registry.
- **baseType** (`string`): For extension data types, the core type it extends.
- **registryUrl** (`string`): URL of the registry that provides this extension type.

#### interface `RegistrySummary`

Summary of a loaded extension registry for display purposes.

- **url** (`string`): Canonical URL of the registry.
- **entryCount** (`number`): Number of extension entries in this registry.

#### interface `ExtensionFilter`

Criteria for filtering extension entries within loaded registries.

- **category** (`'dataType' | 'function' | 'constraint' | 'property' | 'namespace'`): Filter by extension category.
- **status** (`'draft' | 'stable' | 'deprecated' | 'retired'`): Filter by lifecycle status.
- **namePattern** (`string`): Filter by name (substring or glob match).

#### interface `FELParseResult`

Result of parsing and validating a FEL expression via `Project.parseFEL()`.
Enables inline validation and autocomplete in expression editors.

- **valid** (`boolean`): Whether the expression is syntactically and semantically valid.
- **errors** (`Diagnostic[]`): Parse or validation errors found in the expression.
- **references** (`string[]`): Field/variable paths referenced by the expression.
- **functions** (`string[]`): FEL function names called in the expression.
- **ast** (`unknown`): The parsed AST, present only when `valid` is true.

#### interface `FELReferenceSet`

Scope-aware set of valid references available at a given path.

Returned by `Project.availableReferences()`. Includes repeat-group context
refs (`@current`, `@index`, `@count`) when inside a repeat, and mapping
context refs (`@source`, `@target`) when inside a mapping expression.

- **fields** (`{
        path: string;
        dataType: string;
        label?: string;
    }[]`): Fields that can be referenced, with their data type and optional label.
- **variables** (`{
        name: string;
        expression: string;
    }[]`): Named variables declared in the definition.
- **instances** (`{
        name: string;
        source?: string;
    }[]`): External data source instances.
- **contextRefs** (`string[]`): Context-specific references (e.g. `@current`, `@index`, `@source`).

#### interface `FELFunctionEntry`

A FEL function available in the project.
Combines built-in stdlib functions with extension-provided functions.

- **name** (`string`): Function name as used in FEL expressions.
- **category** (`string`): Functional category (e.g. `'aggregate'`, `'string'`, `'date'`).
- **source** (`'builtin' | 'extension'`): Whether this function is built-in or provided by an extension.
- **registryUrl** (`string`): URL of the registry providing this function, if extension-sourced.

#### interface `ExpressionLocation`

Location of a FEL expression within the project's artifacts.
Returned by `Project.allExpressions()` for cross-artifact expression indexing.

- **expression** (`string`): The FEL expression string.
- **artifact** (`'definition' | 'component' | 'mapping'`): Which artifact contains this expression.
- **location** (`string`): Human-readable location descriptor (e.g. `'binds.age.calculate'`).

#### interface `DependencyGraph`

Full dependency graph across all FEL expressions in the project.

Nodes are fields, variables, or shapes. Edges indicate that one node's
expression references another. Cycles are detected and reported separately.

- **nodes** (`{
        id: string;
        type: 'field' | 'variable' | 'shape';
    }[]`): All nodes participating in FEL dependency relationships.
- **edges** (`{
        from: string;
        to: string;
        via: string;
    }[]`): Directed edges: `from` references `to` via the named expression property.
- **cycles** (`string[][]`): Groups of node IDs forming circular dependency chains.

#### interface `FieldDependents`

Reverse lookup: everything that depends on a specific field.
Returned by `Project.fieldDependents()`.

- **binds** (`{
        path: string;
        property: string;
    }[]`): Bind entries whose expressions reference this field.
- **shapes** (`{
        id: string;
        property: string;
    }[]`): Shape rules whose expressions reference this field.
- **variables** (`string[]`): Variable names whose expressions reference this field.
- **mappingRules** (`number[]`): Indices of mapping rules that reference this field.

#### interface `Diagnostic`

A single diagnostic message produced during project validation.
Used across structural, expression, extension, and consistency checks.

- **artifact** (`'definition' | 'component' | 'theme' | 'mapping'`): Which artifact produced this diagnostic.
- **path** (`string`): JSON-pointer-style path to the problematic element.
- **severity** (`'error' | 'warning' | 'info'`): Severity level.
- **code** (`string`): Machine-readable diagnostic code (e.g. `'UNRESOLVED_EXTENSION'`).
- **message** (`string`): Human-readable description of the issue.

#### interface `Diagnostics`

Grouped diagnostic results from `Project.diagnostics()`.

Diagnostics are categorized by check type and include aggregate severity counts
for quick status display.

- **structural** (`Diagnostic[]`): Schema and structural validity issues.
- **expressions** (`Diagnostic[]`): FEL parse errors, unresolved references, and type mismatches.
- **extensions** (`Diagnostic[]`): Unresolved extensions and registry-related issues.
- **consistency** (`Diagnostic[]`): Cross-artifact consistency problems (e.g. component refs to missing items).
- **counts** (`{
        error: number;
        warning: number;
        info: number;
    }`): Aggregate counts by severity across all categories.

#### interface `Change`

A single change detected between two definition versions.
Part of a {@link FormspecChangelog}.

- **type** (`'added' | 'removed' | 'modified' | 'moved' | 'renamed'`): Kind of change: structural addition/removal, modification, relocation, or rename.
- **target** (`'item' | 'bind' | 'shape' | 'optionSet' | 'dataSource' | 'screener' | 'migration' | 'metadata'`): Which definition element was affected.
- **path** (`string`): Dot-path to the affected element.
- **impact** (`'breaking' | 'compatible' | 'cosmetic'`): Semver impact classification: breaking changes require a major bump.
- **description** (`string`): Human-readable description of the change.
- **before** (`unknown`): Previous value (for modified/removed changes).
- **after** (`unknown`): New value (for modified/added changes).

#### interface `FormspecChangelog`

Structured diff between two definition versions.

Generated by comparing the versioning baseline against the current definition,
or between two published releases. Includes an overall semver impact classification
derived from the highest-impact individual change.

- **definitionUrl** (`string`): URL of the definition these changes apply to.
- **fromVersion** (`string`): Version string of the earlier snapshot.
- **toVersion** (`string`): Version string of the later snapshot.
- **semverImpact** (`'breaking' | 'compatible' | 'cosmetic'`): Overall semver impact (the maximum across all individual changes).
- **changes** (`Change[]`): Individual changes detected between the two versions.

#### type `AnyCommand`

A command with any type and payload -- used when the specific command type is not known statically.

```ts
type AnyCommand = Command;
```

#### type `Middleware`

A function that wraps the command dispatch pipeline.

Middleware sees the current (read-only) state and the command being dispatched.
It must call `next(command)` to continue the pipeline, or may short-circuit,
transform the command, or perform side effects before/after.

```ts
type Middleware = (state: Readonly<ProjectState>, command: AnyCommand, next: (command: AnyCommand) => CommandResult) => CommandResult;
```

#### type `ChangeListener`

Callback invoked after every state change (dispatch, undo, redo, batch).

```ts
type ChangeListener = (state: Readonly<ProjectState>, event: ChangeEvent) => void;
```

