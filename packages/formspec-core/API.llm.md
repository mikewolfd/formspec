# formspec-core — API Reference

*Auto-generated from TypeScript declarations — do not hand-edit.*

Raw form project state management: command dispatch, handler pipeline, undo/redo, and the IProjectCore abstraction. Framework-independent foundation for Formspec authoring tools.

formspec-core

Raw form project state management: command dispatch, handler pipeline,
undo/redo, and the IProjectCore abstraction.

Schema-derived document types come from formspec-types (re-exported here).
For the behavior-driven authoring API, use formspec-studio-core.

## `isAuthoredComponentDocument(doc: unknown): doc is ComponentState`

## `hasAuthoredComponentTree(doc: unknown): doc is ComponentState`

## `createComponentArtifact(url?: string): ComponentState`

## `createGeneratedLayoutDocument(url?: string, seed?: Partial<ComponentState> | null): GeneratedLayoutState`

## `splitComponentState(component: ComponentState | undefined, url?: string): {
    component: ComponentState;
    generatedComponent: GeneratedLayoutState;
}`

## `getEditableComponentDocument(state: Pick<ProjectState, 'component' | 'generatedComponent'>): ComponentState | GeneratedLayoutState`

## `getCurrentComponentDocument(state: Pick<ProjectState, 'component' | 'generatedComponent'>): ComponentState | GeneratedLayoutState`

Component property handlers.

These handlers implement the `component.*` property-mutation commands defined
in the API spec's "Component -- Node Properties", "Custom Components", and
"Document-Level" sections. They modify properties on individual tree nodes,
manage custom component templates, and set document-level tokens/breakpoints.

handlers/component-properties

## `componentPropertiesHandlers: Record<string, CommandHandler>`

Component tree structure handlers.

These handlers implement the `component.*` tree-manipulation commands defined
in the API spec's "Component -- Tree Structure" section. They operate on the
component document's `tree` -- a recursive node structure that describes how
definition items are laid out and rendered.

**Node referencing (NodeRef):**
Every tree node is addressed by a `NodeRef`, which is an object carrying
exactly one of:
- `{ bind: string }` -- for nodes bound to a definition item key (Input,
  Display, and some Special components).
- `{ nodeId: string }` -- for unbound layout/container nodes that receive a
  stable auto-generated ID.

**Parent/child relationships:**
The tree root is always a synthetic `Stack` node with `nodeId: 'root'`.
Layout and Container nodes may have `children`; Input and Display nodes
are leaf nodes. Nesting rules (component-spec S3.4) are enforced by
`addNode` and `moveNode` at a higher level; these handlers perform the
raw structural mutations.

handlers/component-tree

## `componentTreeHandlers: Record<string, CommandHandler>`

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

## `definitionBindsHandlers: Record<string, CommandHandler>`

Instance command handlers for Formspec Studio Core.

Instances are named external data sources declared in a form definition. FEL
expressions reference them via `@instance('name')` to read (or, when
`readonly: false`, write) data that lives outside the form's own item tree.
Common use cases include pre-populating fields from a patient record, looking
up reference data, or exposing a writable scratch-pad for intermediate
calculations.

Each instance can point to an external URI (`source`), carry inline `data`,
declare a JSON Schema for its structure, and be marked `static` (a caching
hint) or `readonly` (default `true`).

None of these commands affect the component tree, so all handlers return
`{ rebuildComponentTree: false }`.

definition-instances

## `definitionInstancesHandlers: Record<string, CommandHandler>`

Command handlers for definition item CRUD operations.

Registers handlers for: `definition.addItem`, `definition.deleteItem`,
`definition.renameItem`, `definition.moveItem`, `definition.reorderItem`,
and `definition.duplicateItem`.

All handlers mutate a cloned `ProjectState` in-place and return a
`CommandResult`. Most return `{ rebuildComponentTree: true }` to signal
that the component tree must be regenerated after the mutation.

## `definitionItemsHandlers: Record<string, CommandHandler>`

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

## `definitionMetadataHandlers: Record<string, CommandHandler>`

**Command: `definition.setFormTitle`**

Sets the human-readable title of the form definition. The title is a top-level
metadata property displayed to end users as the form's heading or name. It is
distinct from `name` (a machine-readable identifier) and `description` (a
longer explanatory text).

**Payload:**
- `title` -- The new title string for the form. An empty string is valid
  (clears the title display).

Migration command handlers for Formspec Core.

Migrations declare how to transform responses collected under a prior definition
version into the current version's structure. This enables backwards compatibility
when form definitions evolve: fields may be renamed, removed, split, merged, or
have their values recomputed.

The schema models migrations as `{ from: { [version]: MigrationDescriptor } }` --
a keyed map where the version string is the key. Each descriptor contains an
ordered `fieldMap` array of transform rules plus optional `defaults` for new fields.

None of these commands affect the component tree, so all handlers return
`{ rebuildComponentTree: false }`.

definition-migrations

## `definitionMigrationsHandlers: Record<string, CommandHandler>`

Option set command handlers for the Formspec Studio Core.

Option sets are named, reusable collections of selectable options (label/value pairs)
that can be shared across multiple choice-type fields (dropdowns, radio groups,
checkbox groups, etc.). Instead of duplicating the same list of options on every
field that needs them, authors declare a named option set once in
`definition.optionSets` and reference it by name from any field via the
`optionSet` property.

An option set can be defined in two forms:
- **Inline**: an array of `Option` objects (each with at least `value` and `label`),
  optionally including FEL-based visibility conditions per option.
- **External source**: a URI string pointing to a remote option list, with optional
  `valueField` and `labelField` mappings.

definition-optionsets

## `definitionOptionsetsHandlers: Record<string, CommandHandler>`

Page, form-presentation, definition-property, and group-ref command handlers.

Pages define the wizard / multi-step form structure. When page mode is enabled
the definition's `formPresentation.pages` array contains an ordered list of page
descriptors, each with a stable `key` and a user-facing `title`. Items are
assigned to pages, giving the form a paginated navigation flow.

This module also houses the general-purpose `definition.setDefinitionProperty`
handler for top-level definition metadata, `definition.setFormPresentation` for
presentation-level settings, and `definition.setGroupRef` for modular composition
via `$ref` on group items.

definition-pages

## `definitionPagesHandlers: Record<string, CommandHandler>`

Screener command handlers for the Formspec Studio Core.

The screener is a pre-form eligibility check mechanism -- a self-contained
routing subsystem with its own items, binds, and conditional routes. It
operates in its own scope, entirely separate from the main form's instance
data. The purpose of the screener is to collect a small set of answers
(screening questions) and then evaluate routing rules to determine which
form definition (or variant) the respondent should be directed to.

A screener consists of:
- **Items**: form fields presented to the respondent (same shape as main form
  items, but scoped to the screener).
- **Binds**: FEL-based bind expressions (calculate, relevant, required, etc.)
  that target screener item keys.
- **Routes**: an ordered list of condition/target pairs. Each route has a FEL
  `condition` expression evaluated against screener item values and a `target`
  URI pointing to the destination definition. Routes are evaluated in order;
  first match wins.

definition-screener

## `definitionScreenerHandlers: Record<string, CommandHandler>`

Command handlers for managing definition-level shapes (cross-field validation rules).

Shapes are form-level constraints defined in `definition.shapes`. Unlike
field-level bind constraints (required, constraint, readonly), shapes
express cross-field or form-wide validation rules. Each shape targets one
or more fields via a path expression (supporting wildcards like
`items[*].field`), contains a FEL constraint expression that must evaluate
to true for the form to be valid, and carries a human-readable message
with a severity level (`error`, `warning`, or `info`).

Shapes can be composed using boolean combinators (`and`, `or`, `xone`,
`not`) that reference other shapes by ID, enabling complex validation
logic to be built from smaller, reusable rules.

Shapes do not affect the component tree layout, so all handlers in this
module return `{ rebuildComponentTree: false }`.

definition-shapes

## `definitionShapesHandlers: Record<string, CommandHandler>`

Command handlers for managing definition-level variables.

Variables are form-level constants or computed values defined in the
`definition.variables` array. Each variable has a `name` and a FEL
(Formspec Expression Language) `expression` that can be referenced
from bind expressions, shape constraints, and other FEL contexts
throughout the form definition. An optional `scope` restricts
visibility to a specific section of the form.

Variables do not affect the component tree layout, so all handlers
in this module return `{ rebuildComponentTree: false }`.

definition-variables

## `definitionVariablesHandlers: Record<string, CommandHandler>`

## `resolveItemLocation(state: ProjectState, path: string): {
    parent: FormItem[];
    index: number;
    item: FormItem;
} | undefined`

Resolve a dot-separated item path to its location within the definition item tree.

Walks the `state.definition.items` hierarchy following each segment of the
dot-path through nested `children` arrays. Returns the parent array containing
the target item, the item's index within that array, and the item itself.

Used by virtually every definition-item handler (`deleteItem`, `renameItem`,
`moveItem`, `reorderItem`, `duplicateItem`) to locate an item before mutating it.

## `builtinHandlers: Readonly<Record<string, CommandHandler>>`

Mapping command handlers.

The Formspec mapping document defines bidirectional transforms between form
responses (source) and external data schemas (target).

All handlers return `{ rebuildComponentTree: false }` because mapping
mutations do not alter the definition item tree structure.

handlers/mapping

## `mappingHandlers: Record<string, CommandHandler>`

Cross-tier page command handlers.

All `pages.*` commands write primarily to Tier 2 (theme.pages) and
auto-sync Tier 1 (definition.formPresentation.pageMode) to keep
the two in lockstep. Users think "I want pages" -- these handlers
manage the tier plumbing internally.

handlers/pages

## `pagesHandlers: Record<string, CommandHandler>`

Project-level command handlers.

Project commands manage the project lifecycle: importing complete artifact
bundles, merging subforms, loading/unloading extension registries, and
publishing versioned releases.

handlers/project

## `projectHandlers: Record<string, CommandHandler>`

Theme command handlers.

The Formspec theme document controls visual presentation through a three-level
cascade that determines how each form item is rendered:

  - **Cascade Level 1 (Defaults)** -- Form-wide presentation baseline.
  - **Cascade Level 2 (Selectors)** -- Pattern-based overrides.
  - **Cascade Level 3 (Per-Item Overrides)** -- Highest-specificity level.

Also manages design tokens, breakpoints, and stylesheets.
Page layout is handled by the `pages.*` handlers.

All handlers return `{ rebuildComponentTree: false }` because theme mutations
do not alter the definition item tree structure.

handlers/theme

## `themeHandlers: Record<string, CommandHandler>`

Shared tree utilities for component handlers.

Both component-properties.ts and component-tree.ts operate on the same
component tree structure. This module centralizes the shared TreeNode type,
tree initialization, and Studio-generated marking to avoid duplication.

handlers/tree-utils

## `markStudioGeneratedComponent(component: ComponentState): void`

Mark a component document as Studio-generated internal state.

Studio-generated documents are not spec-valid serialized component documents;
they are internal authoring state used by the editor.

## `ensureTree(state: ProjectState): TreeNode`

Ensure the component document has a root tree node.

Initializes `component.tree` with a synthetic Stack root if absent and marks
the document as Studio-generated if it doesn't have an authored tree.

#### type `TreeNode`

Internal representation of a component tree node.

- `component` -- the component type name (built-in or custom).
- `bind` -- present when the node is bound to a definition item key.
- `nodeId` -- present on unbound nodes (layout, container).
- `children` -- child nodes; only meaningful for Layout and Container types.
- `style`, `accessibility`, `responsive` -- typed sub-objects for property handlers.
- Additional keys hold component-specific props.

#### class `HistoryManager`

Manages undo/redo stacks and command log.
Pure data structure — no knowledge of commands or state shape.

##### `constructor(maxDepth?: number)`

##### `push(snapshot: T): void`

##### `popUndo(current: T): T | null`

##### `popRedo(current: T): T | null`

##### `clear(): void`

##### `clearRedo(): void`

##### `appendLog(entry: LogEntry): void`

##### `clearLog(): void`

formspec-core

Raw form project state management: command dispatch, handler pipeline,
undo/redo, and the IProjectCore abstraction.

Schema-derived document types come from formspec-types (re-exported here).
For the behavior-driven authoring API, use formspec-studio-core.

Definition normalization utilities.

Converts legacy/alternative serialization shapes into the canonical forms
expected by the studio engine:

- `instances[]` (array with `name` property) → `instances{}` (object keyed by name)
- `binds{}` (object keyed by path) → `binds[]` (array with `path` property)

Safe to call on already-normalized definitions (idempotent).

normalization

## `normalizeDefinition(definition: FormDefinition): FormDefinition`

Normalize a definition by converting legacy shape forms to canonical forms.

Conversions applied:
- If `definition.instances` is an array, converts to object keyed by each
  item's `name` property. The `name` property is stripped from each value.
- If `definition.binds` is a non-array object, converts to array of
  `{ path, ...config }` entries where each key becomes the `path`.

Both conversions are idempotent: calling on already-normalized data is safe.

## `resolvePageStructure(state: PageStructureInput, definitionItemKeys: string[]): ResolvedPageStructure`

Resolves the current page structure from studio-managed internal state.

Reads `theme.pages` as the canonical source. No tier cascade —
Studio is the sole writer and keeps all documents consistent.

#### interface `ResolvedRegion`

Enriched region from theme.schema.json Region with existence check.
Schema source: theme.schema.json#/$defs/Region

- **key**: `string`
- **span**: `number`
- **start?**: `number`
- **responsive?**: `Record<string, {
        span?: number;
        start?: number;
        hidden?: boolean;
    }>`
- **exists**: `boolean`

#### interface `ResolvedPage`

Resolved page from theme.schema.json Page with enriched regions.
Schema source: theme.schema.json#/$defs/Page

- **id**: `string`
- **title**: `string`
- **description?**: `string`
- **regions**: `ResolvedRegion[]`

#### interface `PageDiagnostic`

- **code**: `'UNKNOWN_REGION_KEY' | 'PAGEMODE_MISMATCH'`
- **severity**: `'warning' | 'error'`
- **message**: `string`

#### interface `ResolvedPageStructure`

- **mode**: `'single' | 'wizard' | 'tabs'`
- **pages**: `ResolvedPage[]`
- **diagnostics**: `PageDiagnostic[]`
- **unassignedItems**: `string[]`
- **itemPageMap**: `Record<string, string>`

#### type `PageStructureInput`

The two document slices resolvePageStructure reads.

```ts
type PageStructureInput = {
    theme: Pick<ThemeDocument, 'pages'>;
    definition: Pick<FormDefinition, 'formPresentation' | 'items'>;
};
```

#### class `CommandPipeline`

Phase-aware command execution pipeline.

Clones state once, runs commands across phases with inter-phase
reconciliation (when any command in a phase signals rebuild), and
returns the new state plus all results. Middleware wraps the full plan.

##### `constructor(handlers: Readonly<Record<string, CommandHandler>>, middleware: Middleware[])`

##### `execute(state: ProjectState, phases: AnyCommand[][], reconcile: (clone: ProjectState) => void): {
        newState: ProjectState;
        results: CommandResult[];
    }`

#### interface `IProjectCore`

Abstraction over the raw project core.
Implemented by RawProject (formspec-core). Consumed by Project (formspec-studio-core).
This is the seam between the two packages.

##### `dispatch(command: AnyCommand): CommandResult`

##### `dispatch(command: AnyCommand[]): CommandResult[]`

##### `batch(commands: AnyCommand[]): CommandResult[]`

##### `batchWithRebuild(phase1: AnyCommand[], phase2: AnyCommand[]): CommandResult[]`

##### `undo(): boolean`

##### `redo(): boolean`

##### `resetHistory(): void`

##### `onChange(listener: ChangeListener): () => void`

##### `fieldPaths(): string[]`

##### `itemAt(path: string): FormItem | undefined`

##### `responseSchemaRows(): ResponseSchemaRow[]`

##### `statistics(): ProjectStatistics`

##### `instanceNames(): string[]`

##### `variableNames(): string[]`

##### `optionSetUsage(name: string): string[]`

##### `searchItems(filter: ItemFilter): ItemSearchResult[]`

##### `effectivePresentation(fieldKey: string): Record<string, unknown>`

##### `bindFor(path: string): Record<string, unknown> | undefined`

##### `componentFor(fieldKey: string): Record<string, unknown> | undefined`

##### `resolveExtension(name: string): Record<string, unknown> | undefined`

##### `unboundItems(): string[]`

##### `resolveToken(key: string): string | number | undefined`

##### `allDataTypes(): DataTypeInfo[]`

##### `parseFEL(expression: string, context?: FELParseContext): FELParseResult`

##### `felFunctionCatalog(): FELFunctionEntry[]`

##### `availableReferences(context?: string | FELParseContext): FELReferenceSet`

##### `allExpressions(): ExpressionLocation[]`

##### `expressionDependencies(expression: string): string[]`

##### `fieldDependents(fieldPath: string): FieldDependents`

##### `variableDependents(variableName: string): string[]`

##### `dependencyGraph(): DependencyGraph`

##### `listRegistries(): RegistrySummary[]`

##### `browseExtensions(filter?: ExtensionFilter): Record<string, unknown>[]`

##### `diffFromBaseline(fromVersion?: string): Change[]`

##### `previewChangelog(): FormspecChangelog`

##### `diagnose(): Diagnostics`

##### `previewMapping(params: import('./types.js').MappingPreviewParams): import('./types.js').MappingPreviewResult`

##### `export(): ProjectBundle`

#### type `FormspecCoreProject`

Authoring-time project session: co-edited definition / component / theme / mappings,
command dispatch, undo/redo, read-model queries, and export.

Implemented by {@link RawProject}. Higher layers (e.g. formspec-studio-core) should
depend on this type rather than the concrete class when only the contract is needed.

```ts
type FormspecCoreProject = IProjectCore;
```

#### type `CreateFormspecCoreProject`

Factory shape for {@link createRawProject}. Returns a {@link FormspecCoreProject}.

```ts
type CreateFormspecCoreProject = (options?: ProjectOptions) => FormspecCoreProject;
```

## `fieldDependents(state: ProjectState, fieldPath: string): FieldDependents`

Reverse lookup: find all binds, shapes, variables, and mapping rules that
reference a given field.

## `variableDependents(state: ProjectState, variableName: string): string[]`

Find all bind paths whose FEL expressions reference a given variable.

## `dependencyGraph(state: ProjectState): DependencyGraph`

Build a full dependency graph across all FEL expressions in the project.

## `diagnose(state: ProjectState, schemaValidator?: SchemaValidator): Diagnostics`

On-demand multi-pass validation of the current project state.

## `parseFEL(state: ProjectState, expression: string, context?: FELParseContext): FELParseResult`

Parse and validate a FEL expression without saving it to project state.

## `felFunctionCatalog(state: ProjectState): FELFunctionEntry[]`

Enumerate the full FEL function catalog: built-in plus extension functions.

## `availableReferences(state: ProjectState, context?: string | FELParseContext): FELReferenceSet`

Scope-aware list of valid FEL references at a given path.

## `allExpressions(state: ProjectState): ExpressionLocation[]`

Enumerate all FEL expressions in the project with their artifact locations.

## `expressionDependencies(_state: ProjectState, expression: string): string[]`

List all field paths that a FEL expression references.

## `fieldPaths(state: ProjectState): string[]`

All leaf field paths in the definition item tree, in document order.
Paths use dot-notation (e.g., `"contact.email"`). Groups are traversed
but not included -- only items with `type === 'field'` appear.

## `itemAt(state: ProjectState, path: string): FormItem | undefined`

Resolve an item by its dot-path within the definition tree.

## `responseSchemaRows(state: ProjectState): ResponseSchemaRow[]`

Build a flat list of rows describing the response schema for the current definition.

## `instanceNames(state: ProjectState): string[]`

All instance names declared in the definition's `instances` map.

## `variableNames(state: ProjectState): string[]`

All variable names declared in the definition.

## `optionSetUsage(state: ProjectState, name: string): string[]`

Find all field paths that reference a given named option set.

## `searchItems(state: ProjectState, filter: ItemFilter): ItemSearchResult[]`

Search definition items by type, dataType, label substring, or extension usage.
All filter criteria are AND-ed. Results include the full dot-notation path.

## `effectivePresentation(state: ProjectState, fieldKey: string): Record<string, unknown>`

Resolve the effective presentation for a field through the theme cascade.

## `bindFor(state: ProjectState, path: string): Record<string, unknown> | undefined`

Get the effective bind properties for a field path.

## `componentFor(state: ProjectState, fieldKey: string): Record<string, unknown> | undefined`

Find the component tree node bound to a field key.

## `unboundItems(state: ProjectState): string[]`

Find definition fields that have no corresponding node in the component tree.

## `resolveToken(state: ProjectState, key: string): string | number | undefined`

Resolve a design token value through the two-tier cascade.

## `allDataTypes(state: ProjectState): DataTypeInfo[]`

Enumerate all valid data types: the 13 core types plus any dataType extensions
from loaded registries.

## `previewMapping(state: ProjectState, params: MappingPreviewParams): MappingPreviewResult`

Executes a mapping transformation simulation (preview) using the current project state.
This is a pure query and does not modify the state.

## `resolvePageView(state: PageViewInput): PageStructureView`

Resolves the page structure into behavioral types for the Pages UI.

Pure function that wraps `resolvePageStructure` and translates schema vocabulary
(span, start, exists) to UI vocabulary (width, offset, status).

#### interface `PageView`

What PagesTab sees — no schema vocabulary.

- **id**: `string`
- **title**: `string`
- **description?**: `string`
- **items**: `PageItemView[]`

#### interface `PageItemView`

- **key**: `string`
- **label**: `string`
- **status**: `'valid' | 'broken'`
- **width**: `number`
- **offset?**: `number`
- **responsive**: `Record<string, {
        width?: number;
        offset?: number;
        hidden?: boolean;
    }>`
- **itemType**: `'field' | 'group' | 'display'`
- **childCount?**: `number`
- **repeatable?**: `boolean`

#### interface `PlaceableItem`

- **key**: `string`
- **label**: `string`
- **itemType**: `'field' | 'group' | 'display'`

#### interface `PageStructureView`

- **itemPageMap** (`Record<string, string>`): Maps each placed item key to the page ID it belongs to.

#### type `PageViewInput`

Minimal input: only the document slices resolvePageView actually reads.

```ts
type PageViewInput = {
    definition: Pick<FormDefinition, 'formPresentation' | 'items'>;
    theme: Pick<ThemeDocument, 'pages'> & {
        breakpoints?: Record<string, number>;
    };
};
```

## `listRegistries(state: ProjectState): RegistrySummary[]`

Enumerate loaded extension registries with summary metadata.

## `browseExtensions(state: ProjectState, filter?: ExtensionFilter): Record<string, unknown>[]`

Browse extension entries across all loaded registries with optional filtering.

## `resolveExtension(state: ProjectState, name: string): Record<string, unknown> | undefined`

Resolve an extension name against all loaded registries.

## `statistics(state: ProjectState): ProjectStatistics`

Compute form complexity metrics by walking the item tree.

## `flattenItems(items: FormItem[], prefix?: string, visited?: WeakSet<object>): FlattenedItem[]`

Flatten an item tree into comparable rows carrying both exact-path and rename-tolerant signatures.

## `diffFromBaseline(state: ProjectState, fromVersion?: string): Change[]`

Compute a structured diff from a baseline (or a specific published version)
to the current definition state.

## `previewChangelog(state: ProjectState): FormspecChangelog`

Preview what the changelog would look like without committing to a publish.

#### type `FlattenedItem`

```ts
type FlattenedItem = {
    path: string;
    parentPath: string;
    key: string;
    item: FormItem;
    snapshot: string;
    signature: string;
};
```

## `createRawProject(options?: ProjectOptions): RawProject`

Factory function for creating a new {@link RawProject} instance.

#### class `RawProject`

Central editing surface for a Formspec artifact bundle.

Manages four co-evolving artifacts (definition, component, theme, mapping)
plus extension registries and version history. Every mutation flows through a
command-dispatch pipeline. Queries are delegated to pure functions in `queries/`.

##### `constructor(options?: ProjectOptions)`

- **(get) mapping** (`Readonly<MappingDocument>`): Returns the mapping document for the currently selected integration.

##### `fieldPaths(): string[]`

##### `itemAt(path: string): FormItem | undefined`

##### `responseSchemaRows(): ResponseSchemaRow[]`

##### `statistics(): ProjectStatistics`

##### `instanceNames(): string[]`

##### `variableNames(): string[]`

##### `optionSetUsage(name: string): string[]`

##### `searchItems(filter: ItemFilter): ItemSearchResult[]`

##### `effectivePresentation(fieldKey: string): Record<string, unknown>`

##### `bindFor(path: string): Record<string, unknown> | undefined`

##### `componentFor(fieldKey: string): Record<string, unknown> | undefined`

##### `resolveExtension(name: string): Record<string, unknown> | undefined`

##### `unboundItems(): string[]`

##### `resolveToken(key: string): string | number | undefined`

##### `allDataTypes(): DataTypeInfo[]`

##### `parseFEL(expression: string, context?: FELParseContext): FELParseResult`

##### `felFunctionCatalog(): FELFunctionEntry[]`

##### `availableReferences(context?: string | FELParseContext): FELReferenceSet`

##### `allExpressions(): ExpressionLocation[]`

##### `expressionDependencies(expression: string): string[]`

##### `fieldDependents(fieldPath: string): FieldDependents`

##### `variableDependents(variableName: string): string[]`

##### `dependencyGraph(): DependencyGraph`

##### `listRegistries(): RegistrySummary[]`

##### `browseExtensions(filter?: ExtensionFilter): Record<string, unknown>[]`

##### `diffFromBaseline(fromVersion?: string): Change[]`

##### `previewChangelog(): FormspecChangelog`

##### `previewMapping(params: import('./types.js').MappingPreviewParams): import('./types.js').MappingPreviewResult`

##### `diagnose(): Diagnostics`

##### `export(): ProjectBundle`

##### `resetHistory(): void`

##### `undo(): boolean`

##### `redo(): boolean`

##### `onChange(listener: ChangeListener): () => void`

##### `dispatch(command: AnyCommand): CommandResult`

##### `dispatch(command: AnyCommand[]): CommandResult[]`

##### `batchWithRebuild(phase1: AnyCommand[], phase2: AnyCommand[]): CommandResult[]`

##### `clearRedo(): void`

##### `batch(commands: AnyCommand[]): CommandResult[]`

## `normalizeState(state: ProjectState): void`

Enforce cross-artifact invariants on a mutable state object.
Runs after every dispatch and batch cycle.
Undo/redo bypass this — snapshots were already normalized.

## `resolveThemeCascade(theme: ThemeCascadeInput, itemKey: string, itemType: string, itemDataType?: string): Record<string, ResolvedProperty>`

#### interface `ResolvedProperty`

- **value**: `unknown`
- **source**: `'default' | 'selector' | 'item-override'`
- **sourceDetail?**: `string`

#### type `ThemeCascadeInput`

The three cascade-relevant slices of a ThemeDocument.

```ts
type ThemeCascadeInput = Pick<ThemeDocument, 'defaults' | 'selectors' | 'items'>;
```

## `defaultComponentType(item: FormItem): string`

Determine the default component type for a definition item.
Maps item types to sensible widget defaults: field -> TextInput,
group -> Stack, display -> Text.

## `reconcileComponentTree(definition: FormDefinition, currentTree: unknown | undefined, theme: ThemeState): TreeNode`

Rebuild the component tree to mirror the definition item hierarchy.

Pure function — takes all inputs as arguments, returns the new tree root.
Preserves existing bound node properties (widget overrides, styles) and
unbound layout nodes (re-inserted at original positions).

The algorithm:
  1. Snapshot top-level layout wrappers with their full subtrees.
  2. Collect existing bound/display nodes by path, rebuild from definition.
  3. Page-aware distribution (wizard/tabs/single).
  4. Re-insert layout wrappers at original positions.

#### interface `ComponentState`

Component working state — content without required envelope metadata.
Handlers read/write tree, tokens, breakpoints, etc.

- **tree?**: `unknown`
- **targetDefinition?**: `{
        url: string;
    }`
- **tokens?**: `Record<string, unknown>`
- **breakpoints?**: `Record<string, number>`
- **components?**: `Record<string, unknown>`

#### interface `GeneratedLayoutState`

Studio-generated layout state with marker property.

- **'x-studio-generated'**: `true`

#### interface `ThemeState`

Theme working state — content without required envelope metadata.
Handlers read/write defaults, selectors, items, pages, etc.

- **targetDefinition?**: `{
        url: string;
        compatibleVersions?: string;
    }`
- **tokens?**: `Record<string, unknown>`
- **defaults?**: `Record<string, unknown>`
- **selectors?**: `unknown[]`
- **items?**: `Record<string, unknown>`
- **pages?**: `unknown[]`
- **breakpoints?**: `Record<string, number>`
- **stylesheets?**: `string[]`
- **extensions?**: `Record<string, unknown>`

#### interface `MappingState`

Mapping working state — content without required envelope metadata.
Handlers read/write rules, targetSchema, adapters, etc.

- **rules?**: `unknown[]`
- **targetSchema?**: `Record<string, unknown>`
- **definitionRef?**: `string`
- **definitionVersion?**: `string`
- **direction?**: `'forward' | 'reverse' | 'both'`
- **defaults?**: `Record<string, unknown>`
- **autoMap?**: `boolean`
- **conformanceLevel?**: `'core' | 'bidirectional' | 'extended'`
- **adapters?**: `Record<string, unknown>`

#### interface `ExtensionsState`

Read-only extension state loaded into a project.

Registries provide custom data types, FEL functions, constraints, and properties.
They are reference data -- the project loads them but does not author them.

- **registries** (`LoadedRegistry[]`): All extension registries currently loaded into the project.

#### interface `LoadedRegistry`

A single extension registry that has been fetched and indexed.
All fields are JSON-serializable — no Maps or class instances.

- **url** (`string`): Canonical URL of the registry document.
- **document** (`unknown`): The raw registry document as loaded.
- **entries** (`Record<string, unknown>`): Extension entries keyed by name. Plain object for JSON serializability.

#### interface `VersioningState`

Tracks the definition's version history.

Enables changelog generation (structured diff with semver impact classification)
and version publishing. The baseline is compared against the current definition
to compute pending changes.

- **baseline** (`FormDefinition`): Snapshot of the definition at the last publish (or project creation).
- **releases** (`VersionRelease[]`): Ordered release history, oldest first.

#### interface `VersionRelease`

A published version of the definition, including its changelog and frozen snapshot.

- **version** (`string`): Semver version string (e.g. `"1.2.0"`).
- **publishedAt** (`string`): ISO 8601 timestamp of when this version was published.
- **changelog** (`unknown`): Structured diff from the previous version.
- **snapshot** (`FormDefinition`): Frozen definition snapshot at this version.

#### interface `ProjectState`

The complete state of a studio project.

Contains four editable Formspec artifacts (definition, component, theme, mapping)
plus two supporting subsystems (extensions, versioning). No UI state (selection,
panel visibility, viewport) lives here -- that belongs to the consumer.

Mutations happen exclusively through dispatched commands; never mutate directly.

- **definition** (`FormDefinition`): The form's structure and behavior: items, binds, shapes, variables, etc.
- **component** (`ComponentState`): The authored Tier 3 component content.
- **generatedComponent** (`GeneratedLayoutState`): Studio-generated layout content for editor interactions and preview synthesis.
- **theme** (`ThemeState`): Visual presentation content: tokens, defaults, selectors, page layout.
- **mappings** (`Record<string, MappingState>`): Named mapping collection: rules, targetSchema, adapters, etc. keyed by unique ID.
- **selectedMappingId** (`string`): ID of the mapping currently being edited in the UI.
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
- **insertedPath** (`string`): Canonical path of a newly inserted item, returned by add-item style handlers.
- **newPath** (`string`): Canonical path after a move or rename operation.

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
- **schemaValidator** (`SchemaValidator`): Optional schema validator. A wrapper around formspec-engine `lintDocument()` is sufficient. When set, diagnose() runs structural validation and populates the structural diagnostics array. Omit in environments where schemas are not available (e.g. browser without bundled schemas).
- **handlers** (`Record<string, CommandHandler>`): Additional command handlers merged with builtins. Keys override builtins.

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
- **totalMappingRuleCount** (`number`): Total number of mapping rules across all integrations.
- **mappingCount** (`number`): Number of distinct mapping documents.
- **screenerFieldCount** (`number`): Number of fields in the screener (0 if no screener or disabled).
- **screenerRouteCount** (`number`): Number of routing rules in the screener (0 if no screener or disabled).

#### interface `ProjectBundle`

The four exportable artifacts as a single bundle.
Used for serialization, export, and project snapshot operations.

- **definition** (`FormDefinition`): The form definition artifact (schema-valid, with envelope metadata).
- **component** (`ComponentDocument`): The component (UI tree) artifact (schema-valid, with envelope metadata).
- **theme** (`ThemeDocument`): The theme (presentation) artifact.
- **mappings** (`Record<string, MappingDocument>`): Named collection of mapping (data transform) artifacts.

#### interface `ItemFilter`

Criteria for searching definition items via `Project.searchItems()`.
All fields are optional; when multiple are set they are AND-combined.

- **type** (`'field' | 'group' | 'display'`): Filter by item kind.
- **dataType** (`string`): Filter by data type name (exact match).
- **label** (`string`): Filter by label text (substring match).
- **hasExtension** (`string`): Filter to items that declare this extension name.

#### interface `ItemSearchResult`

A search result item augmented with its full dot-notation path.
The `path` disambiguates same-named items in different groups.

- **path** (`string`): Full dot-notation path (e.g. `"contact.email"`).

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

#### interface `FELMappingContext`

Mapping-editor context for expression parsing/autocomplete.

- **ruleIndex** (`number`): Optional mapping rule index in the current document.
- **direction** (`'forward' | 'reverse'`): Mapping transform direction.
- **sourcePath** (`string`): Source path context for the current rule/expression.
- **targetPath** (`string`): Target path context for the current rule/expression.

#### interface `MappingPreviewParams`

Configuration for running a mapping preview.

- **mappingId** (`string`): ID of the mapping to simulate. If omitted, uses the currently selected mapping.
- **sampleData** (`Record<string, unknown>`): The source data to transform (form response if forward, external data if reverse).
- **direction** (`'forward' | 'reverse'`): Transform direction: 'forward' (form->target) or 'reverse' (target->form).
- **ruleIndices** (`number[]`): Optional subset of rule indices to execute. If omitted, all rules are run.

#### interface `MappingPreviewResult`

Results of a mapping preview simulation.

- **output** (`unknown`): The transformed output data.
- **diagnostics** (`unknown[]`): Issues encountered during the transformation.
- **appliedRules** (`number`): Keys or indices of rules that were successfully applied.
- **direction** (`string`): Direction that was executed.

#### interface `FELParseContext`

Editor context for parsing FEL and assembling reference suggestions.

- **targetPath** (`string`): Definition path currently being edited (supports repeat-scope inference).
- **mappingContext** (`FELMappingContext`): Optional mapping-editor context for mapping-specific references.

#### interface `FELParseResult`

Result of parsing and validating a FEL expression via `Project.parseFEL()`.
Enables inline validation and autocomplete in expression editors.

- **valid** (`boolean`): Whether the expression is syntactically and semantically valid.
- **errors** (`Diagnostic[]`): Parse or validation errors found in the expression.
- **warnings** (`Diagnostic[]`): Warnings (non-fatal issues like unknown function names).
- **references** (`string[]`): Field paths referenced by the expression ($ references).
- **variables** (`string[]`): Variable names referenced by the expression (@ references).
- **functions** (`string[]`): FEL function names called in the expression.

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
- **signature** (`string`): Function signature (e.g. `'sum(array<number>) -> number'`).
- **description** (`string`): Human-readable description of what the function does.
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
- **variables** (`string[]`): Names of variables whose expressions reference this field.
- **mappingRules** (`string[]`): Identifiers of mapping rules that reference this field (format: `mappingId:index`).
- **screenerRoutes** (`number[]`): Indices of screener routes whose conditions reference this field.

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

#### interface `ResponseSchemaRow`

A single row in the response schema view.

Describes one item (field or group) from the definition in terms of its
JSON representation in a submitted form response. Rows are returned in
document order (depth-first) by `Project.responseSchemaRows()`.

- **path** (`string`): Full dotted path to this item (e.g. `"contact.email"`).
- **key** (`string`): The item's key (leaf segment of path).
- **label** (`string`): The item's label, or the key if no label is set.
- **depth** (`number`): Nesting depth: 0 for root items, 1 for children of root groups, etc.
- **jsonType** (`'string' | 'number' | 'boolean' | 'object' | 'array<object>'`): JSON type of the item's value in a form response:
- `"object"` for non-repeatable groups
- `"array<object>"` for repeatable groups
- `"number"` for fields with dataType `integer` or `decimal`
- `"boolean"` for fields with dataType `boolean`
- `"string"` for all other fields
- **required** (`boolean`): Whether any bind for this path has a `required` property.
- **calculated** (`boolean`): Whether any bind for this path has a `calculate` property.
- **conditional** (`boolean`): Whether any bind for this path has a `relevant` or `readonly` property.

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

#### type `CommandHandler`

A function that applies a command's payload to a cloned project state.
Handlers receive a mutable clone of ProjectState and mutate it in-place.
They return a CommandResult indicating what side effects are needed.

```ts
type CommandHandler = (state: ProjectState, payload: unknown) => CommandResult & Record<string, unknown>;
```

#### type `Middleware`

A function that wraps the command execution pipeline.

Middleware sees the current (read-only) state and the full command plan
(an array of phases, each phase being an array of commands). It must call
`next(commands)` to continue the pipeline, or may short-circuit, transform
the commands, or perform side effects before/after.

#### type `ChangeListener`

Callback invoked after every state change (dispatch, undo, redo, batch).

```ts
type ChangeListener = (state: Readonly<ProjectState>, event: ChangeEvent) => void;
```

## `analyzeFEL(expression: string): FELAnalysis`

## `normalizePathSegment(segment: string): string`

Remove repeat indices/wildcards from a path segment.

## `splitNormalizedPath(path: string): string[]`

Split a dotted path into normalized (index-free) segments.

## `itemLocationAtPath(items: T[], path: string): ItemLocation<T> | undefined`

Find the mutable parent/index/item triple for a dotted tree path.

## `getFELDependencies(expression: string): string[]`

## `normalizeIndexedPath: typeof wasmNormalizeIndexedPath`

## `itemAtPath: typeof wasmItemAtPath`

## `evaluateDefinition: typeof wasmEvaluateDefinition`

#### interface `TreeItemLike`

Basic tree item shape used by path traversal helpers.

- **key**: `string`
- **children?**: `T[]`

#### interface `ItemLocation`

Resolved mutable location of an item in a tree.

- **parent**: `T[]`
- **index**: `number`
- **item**: `T`

## `rewriteFELReferences(expression: string, options: FELRewriteOptions): string`

Rewrite FEL references using callback options (bridges to WASM rewrite).

## `getBuiltinFELFunctionCatalog(): FELBuiltinFunctionCatalogEntry[]`

## `validateExtensionUsage(items: unknown[], options: {
    resolveEntry: (name: string) => RegistryEntry | undefined;
}): ExtensionUsageIssue[]`

## `createSchemaValidator(_schemas?: SchemaValidatorSchemas): SchemaValidator`

## `rewriteFEL(expression: string, map: RewriteMap): string`

## `tokenizeFEL: typeof wasmTokenizeFEL`

## `rewriteMessageTemplate: typeof wasmRewriteMessageTemplate`

## `lintDocument: typeof wasmLintDocument`

## `parseRegistry: typeof wasmParseRegistry`

## `findRegistryEntry: typeof wasmFindRegistryEntry`

## `validateLifecycleTransition: typeof wasmValidateLifecycleTransition`

## `wellKnownRegistryUrl: typeof wasmWellKnownRegistryUrl`

## `generateChangelog: typeof wasmGenerateChangelog`

## `printFEL: typeof wasmPrintFEL`

#### interface `FELBuiltinFunctionCatalogEntry`

- **name**: `string`
- **category**: `string`
- **signature?**: `string`
- **description?**: `string`

#### interface `FELAnalysisError`

- **message**: `string`
- **offset?**: `number`
- **line?**: `number`
- **column?**: `number`

#### interface `FELAnalysis`

- **valid**: `boolean`
- **errors**: `FELAnalysisError[]`
- **references**: `string[]`
- **variables**: `string[]`
- **functions**: `string[]`
- **cst?**: `unknown`

#### interface `FELRewriteOptions`

- **rewriteFieldPath?**: `(path: string) => string`
- **rewriteCurrentPath?**: `(path: string) => string`
- **rewriteVariable?**: `(name: string) => string`
- **rewriteInstanceName?**: `(name: string) => string`
- **rewriteNavigationTarget?**: `(name: string, fn: 'prev' | 'next' | 'parent') => string`

#### interface `SchemaValidationError`

- **path**: `string`
- **message**: `string`
- **raw?**: `unknown`

#### interface `SchemaValidationResult`

- **documentType**: `DocumentType | null`
- **errors**: `SchemaValidationError[]`

#### interface `SchemaValidatorSchemas`

- **definition?**: `object`
- **theme?**: `object`
- **component?**: `object`
- **mapping?**: `object`
- **response?**: `object`
- **validation_report?**: `object`
- **validation_result?**: `object`
- **registry?**: `object`
- **changelog?**: `object`
- **fel_functions?**: `object`

#### interface `SchemaValidator`

##### `validate(document: unknown, documentType?: DocumentType | null): SchemaValidationResult`

#### interface `ExtensionUsageIssue`

- **path**: `string`
- **extension**: `string`
- **severity**: `'error' | 'warning' | 'info'`
- **code**: `'UNRESOLVED_EXTENSION' | 'EXTENSION_RETIRED' | 'EXTENSION_DEPRECATED'`
- **message**: `string`

#### interface `ValidateExtensionUsageOptions`

- **resolveEntry**: `(name: string) => RegistryEntry | undefined`

#### interface `AssemblyProvenance`

- **url**: `string`
- **version**: `string`
- **keyPrefix?**: `string`
- **fragment?**: `string`

#### interface `AssemblyResult`

- **definition**: `FormDefinition`
- **assembledFrom**: `AssemblyProvenance[]`

#### interface `RewriteMap`

- **fragmentRootKey**: `string`
- **hostGroupKey**: `string`
- **importedKeys**: `Set<string>`
- **keyPrefix**: `string`

#### interface `ComponentObject`

- **component**: `string`
- **bind?**: `string`
- **when?**: `string`
- **style?**: `Record<string, any>`
- **children?**: `ComponentObject[]`

#### interface `ComponentDocument`

- **$formspecComponent**: `string`
- **version**: `string`
- **targetDefinition**: `{
        url: string;
        compatibleVersions?: string;
    }`
- **url?**: `string`
- **name?**: `string`
- **title?**: `string`
- **description?**: `string`
- **breakpoints?**: `Record<string, number>`
- **tokens?**: `Record<string, any>`
- **components?**: `Record<string, any>`
- **tree**: `ComponentObject`

#### interface `RemoteOptionsState`

- **loading**: `boolean`
- **error**: `string | null`

#### interface `FormEngineRuntimeContext`

- **now?**: `(() => EngineNowInput) | EngineNowInput`
- **locale?**: `string`
- **timeZone?**: `string`
- **seed?**: `string | number`

#### interface `RegistryEntry`

- **name**: `string`
- **category?**: `string`
- **version?**: `string`
- **status?**: `string`
- **description?**: `string`
- **compatibility?**: `{
        formspecVersion?: string;
        mappingDslVersion?: string;
    }`
- **deprecationNotice?**: `string`
- **baseType?**: `string`
- **constraints?**: `{
        pattern?: string;
        maxLength?: number;
        [key: string]: any;
    }`
- **metadata?**: `Record<string, any>`

#### interface `PinnedResponseReference`

- **definitionUrl**: `string`
- **definitionVersion**: `string`

#### interface `FormEngineDiagnosticsSnapshot`

- **definition**: `{
        url: string;
        version: string;
        title: string;
    }`
- **timestamp**: `string`
- **structureVersion**: `number`
- **repeats**: `Record<string, number>`
- **values**: `Record<string, any>`
- **mips**: `Record<string, {
        relevant: boolean;
        required: boolean;
        readonly: boolean;
        error: string | null;
    }>`
- **validation**: `ValidationReport`
- **runtimeContext**: `{
        now: string;
        locale?: string;
        timeZone?: string;
        seed?: string | number;
    }`

#### interface `EngineReplayApplyResult`

- **ok**: `boolean`
- **event**: `EngineReplayEvent`
- **output?**: `any`
- **error?**: `string`

#### interface `EngineReplayResult`

- **applied**: `number`
- **results**: `EngineReplayApplyResult[]`
- **errors**: `Array<{
        index: number;
        event: EngineReplayEvent;
        error: string;
    }>`

#### interface `IFormEngine`

##### `setRuntimeContext(context: FormEngineRuntimeContext): void`

##### `getOptions(path: string): OptionEntry[]`

##### `getOptionsSignal(path: string): EngineSignal<OptionEntry[]> | undefined`

##### `getOptionsState(path: string): RemoteOptionsState`

##### `getOptionsStateSignal(path: string): EngineSignal<RemoteOptionsState> | undefined`

##### `waitForRemoteOptions(): Promise<void>`

##### `waitForInstanceSources(): Promise<void>`

##### `setInstanceValue(name: string, path: string | undefined, value: any): void`

##### `getInstanceData(name: string, path?: string): any`

##### `getDisabledDisplay(path: string): 'hidden' | 'protected'`

##### `getVariableValue(name: string, scopePath: string): any`

##### `addRepeatInstance(itemName: string): number | undefined`

##### `removeRepeatInstance(itemName: string, index: number): void`

##### `compileExpression(expression: string, currentItemName?: string): () => any`

##### `setValue(name: string, value: any): void`

##### `getValidationReport(options?: {
        mode?: 'continuous' | 'submit';
    }): ValidationReport`

##### `evaluateShape(shapeId: string): ValidationResult[]`

##### `isPathRelevant(path: string): boolean`

##### `getResponse(meta?: {
        id?: string;
        author?: {
            id: string;
            name?: string;
        };
        subject?: {
            id: string;
            type?: string;
        };
        mode?: 'continuous' | 'submit';
    }): any`

##### `getDiagnosticsSnapshot(options?: {
        mode?: 'continuous' | 'submit';
    }): FormEngineDiagnosticsSnapshot`

##### `applyReplayEvent(event: EngineReplayEvent): EngineReplayApplyResult`

##### `replay(events: EngineReplayEvent[], options?: {
        stopOnError?: boolean;
    }): EngineReplayResult`

##### `getDefinition(): FormDefinition`

##### `setLabelContext(context: string | null): void`

##### `getLabel(item: FormItem): string`

##### `dispose(): void`

##### `injectExternalValidation(results: Array<{
        path: string;
        severity: string;
        code: string;
        message: string;
        source?: string;
    }>): void`

##### `clearExternalValidation(path?: string): void`

##### `setRegistryEntries(entries: any[]): void`

##### `evaluateScreener(answers: Record<string, any>): {
        target: string;
        label?: string;
        extensions?: Record<string, any>;
    } | null`

##### `migrateResponse(responseData: Record<string, any>, fromVersion: string): Record<string, any>`

#### interface `MappingDiagnostic`

- **ruleIndex**: `number`
- **sourcePath?**: `string`
- **targetPath?**: `string`
- **errorCode**: `'COERCE_FAILURE' | 'UNMAPPED_VALUE' | 'FEL_RUNTIME' | 'PATH_NOT_FOUND' | 'INVALID_DOCUMENT' | 'ADAPTER_FAILURE' | 'VERSION_MISMATCH' | 'INVALID_FEL' | 'WASM_NOT_READY'`
- **message**: `string`

#### interface `RuntimeMappingResult`

- **direction**: `MappingDirection`
- **output**: `any`
- **appliedRules**: `number`
- **diagnostics**: `MappingDiagnostic[]`

#### interface `IRuntimeMappingEngine`

##### `forward(source: any): RuntimeMappingResult`

##### `reverse(source: any): RuntimeMappingResult`

#### type `DocumentType`

```ts
type DocumentType = 'definition' | 'theme' | 'component' | 'mapping' | 'response' | 'validation_report' | 'validation_result' | 'registry' | 'changelog' | 'fel_functions';
```

#### type `DefinitionResolver`

```ts
type DefinitionResolver = (url: string, version?: string) => FormDefinition | Promise<FormDefinition>;
```

#### type `EngineNowInput`

```ts
type EngineNowInput = Date | string | number;
```

#### type `EngineReplayEvent`

#### type `MappingDirection`

```ts
type MappingDirection = 'forward' | 'reverse';
```

#### interface `EngineSignal`

Writable reactive cell with a single `.value` — implemented by Preact signals or a custom runtime.

#### interface `EngineReactiveRuntime`

Pluggable batching + signal factory so FormEngine does not import `@preact/signals-core` directly.

##### `signal(initial: T): EngineSignal<T>`

##### `batch(fn: () => T): T`

## `isWasmReady(): boolean`

Whether the WASM module has been initialized and is ready for use.

## `initWasm(): Promise<void>`

Initialize the WASM module. Safe to call multiple times — subsequent calls
return the same promise. Resolves when WASM is ready; rejects on failure.

In Node.js, uses `initSync()` with bytes read from disk.
In browsers, the generated wasm-bindgen loader fetches the sibling `.wasm` asset via URL.

## `getWasmModule(): WasmModule`

Initialized runtime module — for `wasm-bridge-tools` only (ABI check).
Not re-exported from the public `wasm-bridge` barrel.

## `wasmEvalFEL(expression: string, fields?: Record<string, any>): any`

Evaluate a FEL expression with optional field values. Returns the evaluated result.

## `wasmEvalFELWithContext(expression: string, context: WasmFelContext): any`

Evaluate a FEL expression with full FormspecEnvironment context.

## `wasmPrepareFelExpression(optionsJson: string): string`

Normalize FEL source before evaluation (bare `$`, repeat qualifiers, repeat aliases).

## `wasmResolveOptionSetsOnDefinition(definitionJson: string): string`

Inline `optionSet` references from `optionSets` on a definition JSON document.

## `wasmApplyMigrationsToResponseData(definitionJson: string, responseDataJson: string, fromVersion: string, nowIso: string): string`

Apply `migrations` on a definition to flat response data (FEL transforms in Rust).

## `wasmCoerceFieldValue(itemJson: string, bindJson: string, definitionJson: string, valueJson: string): string`

Coerce an inbound field value (whitespace, numeric strings, money, precision).

## `wasmGetFELDependencies(expression: string): string[]`

Extract field path dependencies from a FEL expression. Returns an array of path strings.

## `wasmNormalizeIndexedPath(path: string): string`

Normalize a dotted path by stripping repeat indices.

## `wasmItemAtPath(items: unknown[], path: string): T | undefined`

Resolve an item in a nested item tree by dotted path.

## `wasmItemLocationAtPath(items: unknown[], path: string): {
    parentPath: string;
    index: number;
    item: T;
} | undefined`

Resolve an item's parent path, index, and value in a nested item tree.

## `wasmEvaluateDefinition(definition: unknown, data: Record<string, unknown>, context?: {
    nowIso?: string;
    trigger?: 'continuous' | 'submit' | 'demand' | 'disabled';
    previousValidations?: Array<{
        path: string;
        severity: string;
        constraintKind: string;
        code: string;
        message: string;
        source: string;
        shapeId?: string;
        context?: Record<string, unknown>;
    }>;
    previousNonRelevant?: string[];
    instances?: Record<string, unknown>;
    registryDocuments?: unknown[];
    /** Repeat row counts by group base path (authoritative for min/max repeat cardinality). */
    repeatCounts?: Record<string, number>;
}): {
    values: any;
    validations: any[];
    nonRelevant: string[];
    variables: any;
    required: Record<string, boolean>;
    readonly: Record<string, boolean>;
}`

Evaluate a Formspec definition against provided data.

## `wasmEvaluateScreener(definition: unknown, answers: Record<string, unknown>): {
    target: string;
    label?: string;
    message?: string;
    extensions?: Record<string, unknown>;
} | null`

Evaluate screener routes against an isolated answer payload.

## `wasmAnalyzeFEL(expression: string): {
    valid: boolean;
    errors: string[];
    references: string[];
    variables: string[];
    functions: string[];
}`

Analyze a FEL expression and return structural info.

#### interface `WasmFelContext`

FEL evaluation context for the richer WASM evaluator.

- **fields**: `Record<string, any>`
- **variables?**: `Record<string, any>`
- **mipStates?**: `Record<string, {
        valid?: boolean;
        relevant?: boolean;
        readonly?: boolean;
        required?: boolean;
    }>`
- **repeatContext?**: `{
        current: any;
        index: number;
        count: number;
        collection?: any[];
        parent?: WasmFelContext['repeatContext'];
    }`
- **instances?**: `Record<string, any>`
- **nowIso?**: `string`

#### type `WasmModule`

@filedesc Runtime WASM — init, accessors, and wrappers that use only the runtime `formspec_wasm_runtime` module.

```ts
type WasmModule = typeof import('../wasm-pkg-runtime/formspec_wasm_runtime.js');
```

## `resolveWasmAssetPathForNode(relativeToThisModule: string): Promise<string>`

Resolve a sibling `.wasm` path for Node `readFileSync`.
Vitest/vite-node can rewrite `import.meta.url` to a non-`file:` URL; fall back to the `formspec-engine` package root.

## `nodeFsModuleName`

@filedesc Node helpers to resolve sibling `.wasm` bytes when `import.meta.url` is not `file:` (e.g. Vitest).

## `nodeUrlModuleName`

## `nodePathModuleName`

## `nodeModuleModuleName`

## `isWasmToolsReady(): boolean`

Whether the tools WASM module has been initialized and is ready for use.

## `initWasmTools(): Promise<void>`

Initialize the tools WASM module (lazy-only paths: lint/registry/mapping/changelog/assembly).
Safe to call multiple times — subsequent calls return the same promise.

## `assertRuntimeToolsSplitAbiMatch(runtimeVersion: string, toolsVersion: string): void`

Validates paired runtime/tools split ABI strings (same contract as `formspecWasmSplitAbiVersion()` in WASM).
Exported for unit tests; `initWasmTools` uses this after loading the tools module.

## `getToolsWasmDynamicImportCountForTest(): number`

@internal Test helper — dynamic `import()` count for tools JS glue.

## `resetToolsWasmDynamicImportCountForTest(): void`

@internal Reset import counter (use only in isolated test processes).

## `wasmParseFEL(expression: string): boolean`

Parse a FEL expression and return whether it's valid.

## `wasmTokenizeFEL(expression: string): Array<{
    tokenType: string;
    text: string;
    start: number;
    end: number;
}>`

Tokenize a FEL expression and return positioned token records.

## `wasmExtractDependencies(expression: string): {
    fields: string[];
    contextRefs: string[];
    instanceRefs: string[];
    mipDeps: string[];
    hasSelfRef: boolean;
    hasWildcard: boolean;
    usesPrevNext: boolean;
}`

Extract full dependency info from a FEL expression.

## `wasmDetectDocumentType(doc: unknown): string | null`

Detect the document type of a Formspec JSON document.

## `wasmJsonPointerToJsonPath(pointer: string): string`

Convert a JSON Pointer into a JSONPath string.

## `wasmPlanSchemaValidation(doc: unknown, documentType?: string | null): {
    documentType: string | null;
    mode: 'unknown' | 'document' | 'component';
    componentTargets: Array<{
        pointer: string;
        component: string;
        node: any;
    }>;
    error?: string | null;
}`

Plan schema validation dispatch and component-node target enumeration.

## `wasmAssembleDefinition(definition: unknown, fragments: Record<string, unknown>): {
    definition: any;
    warnings: string[];
    errors: string[];
    assembledFrom?: Array<{
        url: string;
        version: string;
        keyPrefix?: string;
        fragment?: string;
    }>;
}`

Assemble a definition by resolving $ref inclusions.

## `wasmExecuteMapping(rules: unknown[], source: unknown, direction: 'forward' | 'reverse'): {
    direction: string;
    output: any;
    rulesApplied: number;
    diagnostics: any[];
}`

Execute a mapping transform.

## `wasmExecuteMappingDoc(doc: unknown, source: unknown, direction: 'forward' | 'reverse'): {
    direction: string;
    output: any;
    rulesApplied: number;
    diagnostics: any[];
}`

Execute a full mapping document (rules + defaults + autoMap).

## `wasmLintDocument(doc: unknown): {
    documentType: string | null;
    valid: boolean;
    diagnostics: any[];
}`

Lint a Formspec document.

## `wasmCollectFELRewriteTargets(expression: string): {
    fieldPaths: string[];
    currentPaths: string[];
    variables: string[];
    instanceNames: string[];
    navigationTargets: Array<{
        functionName: 'prev' | 'next' | 'parent';
        name: string;
    }>;
}`

Collect the rewriteable targets in a FEL expression.

## `wasmRewriteFELReferences(expression: string, rewrites: {
    fieldPaths?: Record<string, string>;
    currentPaths?: Record<string, string>;
    variables?: Record<string, string>;
    instanceNames?: Record<string, string>;
    navigationTargets?: Record<string, string>;
}): string`

Rewrite a FEL expression using explicit rewrite maps.

## `wasmRewriteFelForAssembly(expression: string, mapJson: string): string`

Rewrite FEL using definition-assembly `RewriteMap` JSON (fragment + host keys).

## `wasmRewriteMessageTemplate(message: string, rewrites: {
    fieldPaths?: Record<string, string>;
    currentPaths?: Record<string, string>;
    variables?: Record<string, string>;
    instanceNames?: Record<string, string>;
    navigationTargets?: Record<string, string>;
}): string`

Rewrite FEL expressions embedded in {{...}} interpolation segments.

## `wasmPrintFEL(expression: string): string`

Print a FEL expression AST back to normalized source.

## `wasmListBuiltinFunctions(): Array<{
    name: string;
    category: string;
    signature: string;
    description: string;
}>`

Return the builtin FEL function catalog exported by the Rust runtime.

## `wasmLintDocumentWithRegistries(doc: unknown, registries: unknown[]): {
    documentType: string | null;
    valid: boolean;
    diagnostics: any[];
}`

Lint a Formspec document with explicit registry documents.

## `wasmParseRegistry(registry: unknown): {
    publisher: {
        name?: string;
        url?: string;
        contact?: string;
    };
    published?: string;
    entryCount: number;
    validationIssues: any[];
}`

Parse and validate a registry document, returning summary metadata.

## `wasmFindRegistryEntry(registry: unknown, name: string, versionConstraint?: string): any | null`

Find the highest-version registry entry matching a name and version constraint.

## `wasmValidateLifecycleTransition(from: string, to: string): boolean`

Validate a lifecycle transition between two registry statuses.

## `wasmWellKnownRegistryUrl(baseUrl: string): string`

Construct a well-known registry URL from a base URL.

## `wasmGenerateChangelog(oldDefinition: unknown, newDefinition: unknown, definitionUrl: string): any`

Generate a structured changelog between two definitions.

## `wasmValidateExtensionUsage(items: unknown[], registryEntries: Record<string, unknown>): Array<{
    path: string;
    extension: string;
    severity: 'error' | 'warning' | 'info';
    code: 'UNRESOLVED_EXTENSION' | 'EXTENSION_RETIRED' | 'EXTENSION_DEPRECATED';
    message: string;
}>`

Validate enabled x-extension usage in an item tree against registry entries.

#### type `WasmToolsModule`

@filedesc Tools WASM — lazy init and wrappers for `formspec_wasm_tools` (lint, mapping, assembly, FEL authoring helpers).

```ts
type WasmToolsModule = typeof import('../wasm-pkg-tools/formspec_wasm_tools.js');
```

## `registerHandler(type: string, handler: CommandHandler): void`

Register a command handler for a given command type.

Called at module load time by each handler module (self-registration pattern).
If a handler for the same type is already registered, it is silently replaced.

## `getHandler(type: string): CommandHandler`

Look up the handler for a command type.

Component property handlers.

These handlers implement the `component.*` property-mutation commands defined
in the API spec's "Component -- Node Properties", "Custom Components", and
"Document-Level" sections. They modify properties on individual tree nodes,
manage custom component templates, and set document-level tokens/breakpoints.

handlers/component-properties

Component tree structure handlers.

These handlers implement the `component.*` tree-manipulation commands defined
in the API spec's "Component -- Tree Structure" section. They operate on the
component document's `tree` -- a recursive node structure that describes how
definition items are laid out and rendered.

**Node referencing (NodeRef):**
Every tree node is addressed by a `NodeRef`, which is an object carrying
exactly one of:
- `{ bind: string }` -- for nodes bound to a definition item key (Input,
  Display, and some Special components).
- `{ nodeId: string }` -- for unbound layout/container nodes that receive a
  stable auto-generated ID.

**Parent/child relationships:**
The tree root is always a synthetic `Stack` node with `nodeId: 'root'`.
Layout and Container nodes may have `children`; Input and Display nodes
are leaf nodes. Nesting rules (component-spec S3.4) are enforced by
`addNode` and `moveNode` at a higher level; these handlers perform the
raw structural mutations.

handlers/component-tree

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

Instance command handlers for Formspec Studio Core.

Instances are named external data sources declared in a form definition. FEL
expressions reference them via `@instance('name')` to read (or, when
`readonly: false`, write) data that lives outside the form's own item tree.
Common use cases include pre-populating fields from a patient record, looking
up reference data, or exposing a writable scratch-pad for intermediate
calculations.

Each instance can point to an external URI (`source`), carry inline `data`,
declare a JSON Schema for its structure, and be marked `static` (a caching
hint) or `readonly` (default `true`).

None of these commands affect the component tree, so all handlers return
`{ rebuildComponentTree: false }`.

definition-instances

Command handlers for definition item CRUD operations.

Registers handlers for: `definition.addItem`, `definition.deleteItem`,
`definition.renameItem`, `definition.moveItem`, `definition.reorderItem`,
and `definition.duplicateItem`.

All handlers mutate a cloned `ProjectState` in-place and return a
`CommandResult`. Most return `{ rebuildComponentTree: true }` to signal
that the component tree must be regenerated after the mutation.

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

Migration command handlers for Formspec Core.

Migrations declare how to transform responses collected under a prior definition
version into the current version's structure. This enables backwards compatibility
when form definitions evolve: fields may be renamed, removed, split, merged, or
have their values recomputed.

The schema models migrations as `{ from: { [version]: MigrationDescriptor } }` --
a keyed map where the version string is the key. Each descriptor contains an
ordered `fieldMap` array of transform rules plus optional `defaults` for new fields.

None of these commands affect the component tree, so all handlers return
`{ rebuildComponentTree: false }`.

definition-migrations

Option set command handlers for the Formspec Studio Core.

Option sets are named, reusable collections of selectable options (label/value pairs)
that can be shared across multiple choice-type fields (dropdowns, radio groups,
checkbox groups, etc.). Instead of duplicating the same list of options on every
field that needs them, authors declare a named option set once in
`definition.optionSets` and reference it by name from any field via the
`optionSet` property.

An option set can be defined in two forms:
- **Inline**: an array of `Option` objects (each with at least `value` and `label`),
  optionally including FEL-based visibility conditions per option.
- **External source**: a URI string pointing to a remote option list, with optional
  `valueField` and `labelField` mappings.

definition-optionsets

Page, form-presentation, definition-property, and group-ref command handlers.

Pages define the wizard / multi-step form structure. When page mode is enabled
the definition's `formPresentation.pages` array contains an ordered list of page
descriptors, each with a stable `key` and a user-facing `title`. Items are
assigned to pages, giving the form a paginated navigation flow.

This module also houses the general-purpose `definition.setDefinitionProperty`
handler for top-level definition metadata, `definition.setFormPresentation` for
presentation-level settings, and `definition.setGroupRef` for modular composition
via `$ref` on group items.

definition-pages

Screener command handlers for the Formspec Studio Core.

The screener is a pre-form eligibility check mechanism -- a self-contained
routing subsystem with its own items, binds, and conditional routes. It
operates in its own scope, entirely separate from the main form's instance
data. The purpose of the screener is to collect a small set of answers
(screening questions) and then evaluate routing rules to determine which
form definition (or variant) the respondent should be directed to.

A screener consists of:
- **Items**: form fields presented to the respondent (same shape as main form
  items, but scoped to the screener).
- **Binds**: FEL-based bind expressions (calculate, relevant, required, etc.)
  that target screener item keys.
- **Routes**: an ordered list of condition/target pairs. Each route has a FEL
  `condition` expression evaluated against screener item values and a `target`
  URI pointing to the destination definition. Routes are evaluated in order;
  first match wins.

definition-screener

Command handlers for managing definition-level shapes (cross-field validation rules).

Shapes are form-level constraints defined in `definition.shapes`. Unlike
field-level bind constraints (required, constraint, readonly), shapes
express cross-field or form-wide validation rules. Each shape targets one
or more fields via a path expression (supporting wildcards like
`items[*].field`), contains a FEL constraint expression that must evaluate
to true for the form to be valid, and carries a human-readable message
with a severity level (`error`, `warning`, or `info`).

Shapes can be composed using boolean combinators (`and`, `or`, `xone`,
`not`) that reference other shapes by ID, enabling complex validation
logic to be built from smaller, reusable rules.

Shapes do not affect the component tree layout, so all handlers in this
module return `{ rebuildComponentTree: false }`.

definition-shapes

Command handlers for managing definition-level variables.

Variables are form-level constants or computed values defined in the
`definition.variables` array. Each variable has a `name` and a FEL
(Formspec Expression Language) `expression` that can be referenced
from bind expressions, shape constraints, and other FEL contexts
throughout the form definition. An optional `scope` restricts
visibility to a specific section of the form.

Variables do not affect the component tree layout, so all handlers
in this module return `{ rebuildComponentTree: false }`.

definition-variables

Mapping command handlers.

The Formspec mapping document defines bidirectional transforms between form
responses (source) and external data schemas (target).

All handlers return `{ rebuildComponentTree: false }` because mapping
mutations do not alter the definition item tree structure.

handlers/mapping

Cross-tier page command handlers.

All `pages.*` commands write primarily to Tier 2 (theme.pages) and
auto-sync Tier 1 (definition.formPresentation.pageMode) to keep
the two in lockstep. Users think "I want pages" -- these handlers
manage the tier plumbing internally.

handlers/pages

Project-level command handlers.

Project commands manage the project lifecycle: importing complete artifact
bundles, merging subforms, loading/unloading extension registries, and
publishing versioned releases.

handlers/project

Theme command handlers.

The Formspec theme document controls visual presentation through a three-level
cascade that determines how each form item is rendered:

  - **Cascade Level 1 (Defaults)** -- Form-wide presentation baseline.
  - **Cascade Level 2 (Selectors)** -- Pattern-based overrides.
  - **Cascade Level 3 (Per-Item Overrides)** -- Highest-specificity level.

Also manages design tokens, breakpoints, and stylesheets.
Page layout is handled by the `pages.*` handlers.

All handlers return `{ rebuildComponentTree: false }` because theme mutations
do not alter the definition item tree structure.

handlers/theme

Shared tree utilities for component handlers.

Both component-properties.ts and component-tree.ts operate on the same
component tree structure. This module centralizes the shared TreeNode type,
tree initialization, and Studio-generated marking to avoid duplication.

handlers/tree-utils

Definition normalization utilities.

Converts legacy/alternative serialization shapes into the canonical forms
expected by the studio engine:

- `instances[]` (array with `name` property) → `instances{}` (object keyed by name)
- `binds{}` (object keyed by path) → `binds[]` (array with `path` property)

Safe to call on already-normalized definitions (idempotent).

normalization

