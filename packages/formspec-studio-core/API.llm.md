# formspec-studio-core — API Reference

*Auto-generated from TypeScript declarations — do not hand-edit.*

Pure TypeScript library for creating and editing Formspec artifact bundles. Every edit is a serializable Command dispatched against a Project. No framework dependencies, no singletons, no side effects.

formspec-studio-core

Document-agnostic semantic authoring API for Formspec.
Project composes IProjectCore (from formspec-core) and exposes
51 behavior-driven helper methods for form authoring.

Consumers import types from THIS package — never from formspec-core.

## `previewForm(project: Project, scenario?: Record<string, unknown>): {
    visibleFields: string[];
    hiddenFields: {
        path: string;
        hiddenBy?: string;
    }[];
    currentValues: Record<string, unknown>;
    requiredFields: string[];
    pages: {
        id: string;
        title: string;
        validationErrors: number;
        validationWarnings: number;
        status: 'active' | 'complete' | 'incomplete' | 'unreachable';
    }[];
    validationState: Record<string, {
        severity: 'error' | 'warning' | 'info';
        message: string;
    }>;
}`

Preview — simulate respondent experience.
Creates a FormEngine from the project's exported definition,
optionally replays scenario values, and returns a snapshot.

All paths in the returned object (visibleFields, hiddenFields, currentValues,
requiredFields, validationState keys) use 0-based indexing for repeat group
instances (e.g. `items[0].field`). Note that the engine's ValidationReport
uses 1-based indexing externally; this function normalizes those back to 0-based
for consistency.

## `validateResponse(project: Project, response: Record<string, unknown>): ValidationReport`

Validate a response document against the current form definition.
Returns a ValidationReport from formspec-engine.

## `resolveFieldType(type: string): ResolvedFieldType`

## `resolveWidget(widget: string): string`

## `widgetHintFor(aliasOrComponent: string): string | undefined`

## `isTextareaWidget(widget: string): boolean`

## `FIELD_TYPE_MAP: Record<string, {
    dataType: string;
    defaultWidget: string;
    defaultWidgetHint?: string;
    constraintExpr?: string;
}>`

## `WIDGET_ALIAS_MAP: Record<string, string>`

#### interface `ResolvedFieldType`

- **defaultWidgetHint** (`string`): Spec-normative default widgetHint for this dataType (e.g. "textarea" for text).

#### interface `HelperWarning`

Structured warning — prefer over prose strings for programmatic consumers

- **code**: `string`
- **message**: `string`
- **detail?**: `object`

#### interface `HelperResult`

Return type for all helper methods

- **summary**: `string`
- **action**: `{
        helper: string;
        params: Record<string, unknown>;
    }`
- **affectedPaths**: `string[]`
- **createdId?**: `string`
- **groupKey?**: `string`
- **warnings?**: `HelperWarning[]`

#### interface `ChoiceOption`

Choice option for inline options or defineChoices

- **value**: `string`
- **label**: `string`

#### interface `FieldProps`

Field properties for addField / addScreenField

- **placeholder?**: `string`
- **hint?**: `string`
- **description?**: `string`
- **ariaLabel?**: `string`
- **choices?**: `ChoiceOption[]`
- **choicesFrom?**: `string`
- **widget?**: `string`
- **page?**: `string`
- **required?**: `boolean`
- **readonly?**: `boolean`
- **initialValue?**: `unknown`
- **insertIndex?**: `number`
- **parentPath?**: `string`

#### interface `ContentProps`

Content properties for addContent

- **page?**: `string`
- **parentPath?**: `string`
- **insertIndex?**: `number`

#### interface `GroupProps`

Group properties

- **display?**: `'stack' | 'dataTable'`
- **page?**: `string`
- **parentPath?**: `string`
- **insertIndex?**: `number`

#### interface `RepeatProps`

Repeat group configuration

- **min?**: `number`
- **max?**: `number`
- **addLabel?**: `string`
- **removeLabel?**: `string`

#### interface `BranchPath`

Branch path — one arm of a conditional branch

- **when**: `string | number | boolean`
- **show**: `string | string[]`
- **mode?**: `'equals' | 'contains'`

#### interface `PlacementOptions`

Placement options for placeOnPage

- **span?**: `number`

#### interface `FlowProps`

Flow configuration

- **showProgress?**: `boolean`
- **allowSkip?**: `boolean`

#### interface `ValidationOptions`

Validation options for addValidation

- **timing?**: `'continuous' | 'submit' | 'demand'`
- **severity?**: `'error' | 'warning' | 'info'`
- **code?**: `string`
- **activeWhen?**: `string`

#### interface `InstanceProps`

Named external data source (secondary instance)

- **source?**: `string`
- **data?**: `unknown`
- **schema?**: `object`
- **static?**: `boolean`
- **readonly?**: `boolean`
- **description?**: `string`

#### interface `MetadataChanges`

Metadata changes for setMetadata — split between title, presentation, and definition handlers

- **title?**: `string | null`
- **name?**: `string | null`
- **description?**: `string | null`
- **url?**: `string | null`
- **version?**: `string | null`
- **status?**: `'draft' | 'active' | 'retired' | 'unknown' | null`
- **date?**: `string | null`
- **versionAlgorithm?**: `string | null`
- **nonRelevantBehavior?**: `'empty' | 'suppress' | null`
- **derivedFrom?**: `string | null`
- **density?**: `'compact' | 'comfortable' | 'spacious' | null`
- **labelPosition?**: `'top' | 'left' | 'inline' | 'hidden' | null`
- **pageMode?**: `'tabs' | 'wizard' | 'accordion' | null`
- **defaultCurrency?**: `string | null`

#### interface `ItemChanges`

Changes for updateItem — each key routes to a different handler

- **label?**: `string | null`
- **hint?**: `string | null`
- **description?**: `string | null`
- **placeholder?**: `string`
- **ariaLabel?**: `string`
- **options?**: `ChoiceOption[] | null`
- **choicesFrom?**: `string`
- **currency?**: `string | null`
- **precision?**: `number | null`
- **initialValue?**: `unknown`
- **prePopulate?**: `unknown`
- **dataType?**: `string`
- **required?**: `boolean | string | null`
- **constraint?**: `string | null`
- **constraintMessage?**: `string | null`
- **calculate?**: `string | null`
- **relevant?**: `string | null`
- **readonly?**: `boolean | string | null`
- **default?**: `string | null`
- **repeatable?**: `boolean`
- **minRepeat?**: `number | null`
- **maxRepeat?**: `number | null`
- **widget?**: `string | null`
- **style?**: `Record<string, unknown>`
- **page?**: `string`
- **prefix?**: `string | null`
- **suffix?**: `string | null`
- **semanticType?**: `string | null`

#### type `LayoutArrangement`

Layout arrangement for applyLayout

```ts
type LayoutArrangement = 'columns-2' | 'columns-3' | 'columns-4' | 'card' | 'sidebar' | 'inline';
```

#### class `HelperError`

Thrown by helpers when pre-validation fails

##### `constructor(code: string, message: string, detail?: object | undefined)`

## `createProject(options?: CreateProjectOptions): Project`

#### class `Project`

Behavior-driven authoring API for Formspec.
Composes an IProjectCore and exposes form-author-friendly helper methods.
All authoring methods return HelperResult.

For raw project access (dispatch, state, queries), use formspec-core directly.

##### `constructor(core: IProjectCore)`

- **(get) effectiveComponent** (`Readonly<ComponentDocument>`): Returns the effective component document — authored if it has a tree, otherwise merged with generated.

##### `fieldPaths(): string[]`

##### `itemAt(path: string): FormItem | undefined`

##### `bindFor(path: string): Record<string, unknown> | undefined`

##### `variableNames(): string[]`

##### `instanceNames(): string[]`

##### `statistics(): ProjectStatistics`

##### `commandHistory(): readonly LogEntry[]`

##### `export(): ProjectBundle`

##### `diagnose(): Diagnostics`

##### `componentFor(fieldKey: string): Record<string, unknown> | undefined`

##### `searchItems(filter: ItemFilter): ItemSearchResult[]`

##### `parseFEL(expression: string, context?: FELParseContext): FELParseResult`

##### `felFunctionCatalog(): FELFunctionEntry[]`

##### `availableReferences(context?: string | FELParseContext): FELReferenceSet`

##### `expressionDependencies(expression: string): string[]`

##### `fieldDependents(fieldPath: string): FieldDependents`

##### `diffFromBaseline(fromVersion?: string): Change[]`

##### `previewChangelog(): FormspecChangelog`

##### `registryDocuments(): unknown[]`

Returns raw registry documents for passing to rendering consumers (e.g. <formspec-render>).

##### `moveLayoutNode(sourceNodeId: string, targetParentNodeId: string, targetIndex: number): HelperResult`

Move a component tree node to a new parent/position.

##### `moveItems(moves: Array<{
        sourcePath: string;
        targetParentPath?: string;
        targetIndex: number;
    }>): HelperResult`

Batch-move multiple definition items atomically (e.g. multi-select DnD).

##### `undo(): boolean`

##### `redo(): boolean`

##### `onChange(listener: ChangeListener): () => void`

##### `loadBundle(bundle: Partial<ProjectBundle>): void`

Import a project bundle. The import is undoable like any other edit.

##### `mapField(sourcePath: string, targetPath: string, mappingId?: string): HelperResult`

Add a mapping rule from a form field to an output target.

##### `unmapField(sourcePath: string, mappingId?: string): HelperResult`

Remove all mapping rules for a given source path.

##### `addField(path: string, label: string, type: string, props?: FieldProps): HelperResult`

Add a data collection field.
Resolves type alias → { dataType, defaultWidget } via the Field Type Alias Table.
Widget in props resolved via the Widget Alias Table before dispatch.

##### `addGroup(path: string, label: string, props?: GroupProps): HelperResult`

Add a group/section container.

##### `addContent(path: string, body: string, kind?: 'heading' | 'instructions' | 'paragraph' | 'alert' | 'banner' | 'divider', props?: ContentProps): HelperResult`

Add display content — non-data element.

##### `showWhen(target: string, condition: string): HelperResult`

Conditional visibility — dispatches definition.setBind { relevant: condition }

##### `readonlyWhen(target: string, condition: string): HelperResult`

Readonly condition — dispatches definition.setBind { readonly: condition }

##### `require(target: string, condition?: string): HelperResult`

Required rule — dispatches definition.setBind { required: condition ?? 'true' }

##### `calculate(target: string, expression: string): HelperResult`

Calculated value — dispatches definition.setBind { calculate: expression }

##### `branch(on: string, paths: BranchPath[], otherwise?: string | string[]): HelperResult`

Branching — show different fields based on an answer.
Auto-detects mode for multiChoice fields (uses selected() not equals).

##### `addValidation(target: string, rule: string, message: string, options?: ValidationOptions): HelperResult`

Cross-field validation — adds a shape rule.

##### `removeValidation(shapeId: string): HelperResult`

Remove a validation shape by ID.

##### `updateValidation(shapeId: string, changes: {
        rule?: string;
        message?: string;
        timing?: 'continuous' | 'submit' | 'demand';
        severity?: 'error' | 'warning' | 'info';
        code?: string;
        activeWhen?: string;
    }): HelperResult`

Update a validation shape's rule, message, or options.

##### `removeItem(path: string): HelperResult`

Remove item — full reference cleanup before delete.
Collects ALL dependents BEFORE mutations, then dispatches cleanup + delete atomically.

##### `updateItem(path: string, changes: ItemChanges): HelperResult`

Update any property of an existing item — fan-out helper.

##### `moveItem(path: string, targetParentPath?: string, targetIndex?: number): HelperResult`

Move item to a new parent or position.

##### `renameItem(path: string, newKey: string): HelperResult`

Rename item — FEL reference rewriting handled inside the handler.

##### `reorderItem(path: string, direction: 'up' | 'down'): HelperResult`

Reorder item within its parent (swap with neighbor).

##### `setMetadata(changes: MetadataChanges): HelperResult`

Form-level metadata setter.

##### `defineChoices(name: string, options: ChoiceOption[]): HelperResult`

Define a reusable named option set.

##### `makeRepeatable(target: string, props?: RepeatProps): HelperResult`

Make a group repeatable with optional cardinality constraints.

##### `copyItem(path: string, deep?: boolean, targetPath?: string): HelperResult`

Copy a field or group. If targetPath is provided, places the clone under that group.

##### `wrapItemsInGroup(paths: string[], label?: string): HelperResult`

Wrap existing items in a new group container.

##### `wrapInLayoutComponent(path: string, component: 'Card' | 'Stack' | 'Collapsible'): HelperResult`

Wrap an item node in a layout component.

##### `batchDeleteItems(paths: string[]): HelperResult`

Batch delete multiple items atomically.

##### `batchDuplicateItems(paths: string[]): HelperResult`

Batch duplicate multiple items atomically.

##### `addSubmitButton(label?: string, pageId?: string): HelperResult`

Add a submit button.

##### `addPage(title: string, description?: string, id?: string): HelperResult`

Add a page — creates both a definition group (logical container) and a
theme page (rendering slot), wired together via regions.
Promotes to wizard mode if not already paged.

##### `removePage(pageId: string): HelperResult`

Remove a page and its associated definition group (if created by addPage).

##### `reorderPage(pageId: string, direction: 'up' | 'down'): HelperResult`

Reorder a page.

##### `movePageToIndex(pageId: string, targetIndex: number): HelperResult`

Move a page to an arbitrary zero-based index in one atomic undo step.

##### `listPages(): Array<{
        id: string;
        title: string;
        description?: string;
        groupPath?: string;
    }>`

List all pages with their id, title, description, and primary group path.

##### `updatePage(pageId: string, changes: {
        title?: string;
        description?: string;
    }): HelperResult`

Update a page's title or description.

##### `placeOnPage(target: string, pageId: string, options?: PlacementOptions): HelperResult`

Assign an item to a page.

##### `unplaceFromPage(target: string, pageId: string): HelperResult`

Remove item from page assignment.

##### `setFlow(mode: 'single' | 'wizard' | 'tabs', props?: FlowProps): HelperResult`

Set flow mode.

##### `applyLayout(targets: string | string[], arrangement: LayoutArrangement): HelperResult`

Apply spatial layout to targets.

##### `applyStyle(path: string, properties: Record<string, unknown>): HelperResult`

Apply style overrides to a specific field.

##### `applyStyleAll(target: 'form' | {
        type: 'group' | 'field' | 'display';
    } | {
        dataType: string;
    }, properties: Record<string, unknown>): HelperResult`

Apply style to form-level defaults or type selectors.

##### `setToken(key: string, value: string | null): HelperResult`

Set or delete a single theme token (null = delete).

##### `setThemeDefault(property: string, value: unknown): HelperResult`

Set a default theme property (e.g. labelPosition, widget, cssClass).

##### `setBreakpoint(name: string, minWidth: number | null): HelperResult`

Set or delete a responsive breakpoint (null minWidth = delete).

##### `addThemeSelector(match: Record<string, unknown>, apply: Record<string, unknown>): HelperResult`

Add a theme selector rule.

##### `updateThemeSelector(index: number, changes: {
        match?: Record<string, unknown>;
        apply?: Record<string, unknown>;
    }): HelperResult`

Update a theme selector rule by index.

##### `deleteThemeSelector(index: number): HelperResult`

Delete a theme selector rule by index.

##### `reorderThemeSelector(index: number, direction: 'up' | 'down'): HelperResult`

Reorder a theme selector rule.

##### `setItemOverride(itemKey: string, property: string, value: unknown): HelperResult`

Set a per-item theme override (e.g. labelPosition for a specific field).

##### `clearItemOverrides(itemKey: string): HelperResult`

Clear all per-item theme overrides for an item.

##### `addRegion(pageId: string, span?: number): HelperResult`

Add an empty region to a page.

##### `updateRegion(pageId: string, regionIndex: number, property: string, value: unknown): HelperResult`

Update a region property by index.

##### `deleteRegion(pageId: string, regionIndex: number): HelperResult`

Delete a region from a page by index.

##### `reorderRegion(pageId: string, regionIndex: number, direction: 'up' | 'down'): HelperResult`

Reorder a region within a page by index.

##### `setRegionKey(pageId: string, regionIndex: number, newKey: string): HelperResult`

Set the field-key assignment for a region by index.

##### `renamePage(pageId: string, newId: string): HelperResult`

Rename a page's ID.

##### `setItemWidth(pageId: string, itemKey: string, width: number): HelperResult`

Set the width (grid span) of an item on a page.

##### `setItemOffset(pageId: string, itemKey: string, offset: number | undefined): HelperResult`

Set the offset (grid start) of an item on a page.

##### `setItemResponsive(pageId: string, itemKey: string, breakpoint: string, overrides: {
        width?: number;
        offset?: number;
        hidden?: boolean;
    } | undefined): HelperResult`

Set responsive breakpoint overrides for an item on a page.

##### `removeItemFromPage(pageId: string, itemKey: string): HelperResult`

Remove an item from a page.

##### `reorderItemOnPage(pageId: string, itemKey: string, direction: 'up' | 'down'): HelperResult`

Reorder an item within a page (by key, not index).

##### `moveItemOnPageToIndex(pageId: string, itemKey: string, targetIndex: number): HelperResult`

Move an item to an arbitrary position on a page by target index.

##### `addLayoutNode(parentNodeId: string, component: string): HelperResult`

Add a layout-only node to the component tree.

##### `unwrapLayoutNode(nodeId: string): HelperResult`

Unwrap a layout container, promoting its children.

##### `deleteLayoutNode(nodeId: string): HelperResult`

Delete a layout node from the component tree.

##### `updateOptionSet(name: string, property: string, value: unknown): HelperResult`

Update a property on an option set.

##### `deleteOptionSet(name: string): HelperResult`

Delete an option set by name.

##### `setMappingProperty(property: string, value: unknown, mappingId?: string): HelperResult`

Set a mapping document root property (e.g. version, direction, autoMap).

##### `setMappingTargetSchema(property: string, value: unknown, mappingId?: string): HelperResult`

Set a property on the mapping's target structure descriptor.

##### `addMappingRule(params: {
        sourcePath?: string;
        targetPath?: string;
        transform?: string;
        insertIndex?: number;
        mappingId?: string;
    }): HelperResult`

Add a mapping rule with optional transform parameters.

##### `updateMappingRule(index: number, property: string, value: unknown, mappingId?: string): HelperResult`

Update a property of an existing mapping rule.

##### `removeMappingRule(index: number, mappingId?: string): HelperResult`

Remove a mapping rule by index.

##### `clearMappingRules(mappingId?: string): HelperResult`

Clear all mapping rules.

##### `reorderMappingRule(index: number, direction: 'up' | 'down', mappingId?: string): HelperResult`

Reorder a mapping rule.

##### `setMappingAdapter(format: string, config: unknown): HelperResult`

Set configuration for a specific wire-format adapter (JSON, XML, CSV).

##### `updateMappingDefaults(defaults: Record<string, unknown>): HelperResult`

Update the top-level mapping defaults.

##### `autoGenerateMappingRules(params?: {
        scopePath?: string;
        priority?: number;
        replace?: boolean;
    }): HelperResult`

Auto-generate mapping rules for every field in the form.

##### `previewMapping(params: import('./types.js').MappingPreviewParams): import('./types.js').MappingPreviewResult`

Run a mapping preview and return the projected output.

##### `createMapping(id: string, options?: {
        targetSchema?: Record<string, unknown>;
    }): HelperResult`

Create a new named mapping document and select it.

##### `deleteMapping(id: string): HelperResult`

Delete a named mapping document. Throws if it is the last mapping.

##### `renameMapping(oldId: string, newId: string): HelperResult`

Rename a mapping document. Throws if the new ID already exists.

##### `selectMapping(id: string): HelperResult`

Select the active mapping document by ID.

##### `autoGeneratePages(): HelperResult`

Auto-generate pages from definition groups.

##### `addVariable(name: string, expression: string, scope?: string): HelperResult`

Add a named FEL variable.

##### `updateVariable(name: string, expression: string): HelperResult`

Update a variable's expression.

##### `removeVariable(name: string): HelperResult`

Remove a variable — warns about dangling references.

##### `renameVariable(name: string, newName: string): HelperResult`

Rename a variable — Future Work, handler not implemented.

##### `addInstance(name: string, props: InstanceProps): HelperResult`

Add a named external data source.

##### `updateInstance(name: string, changes: Partial<InstanceProps>): HelperResult`

Update instance properties.

##### `renameInstance(name: string, newName: string): HelperResult`

Rename an instance — rewrites FEL references.

##### `removeInstance(name: string): HelperResult`

Remove an instance.

##### `setScreener(enabled: boolean): HelperResult`

Enable/disable screener.

##### `addScreenField(key: string, label: string, type: string, props?: FieldProps): HelperResult`

Add a screener question.

##### `removeScreenField(key: string): HelperResult`

Remove a screener question.

##### `addScreenRoute(condition: string, target: string, label?: string, message?: string): HelperResult`

Add a screener routing rule.

##### `updateScreenRoute(routeIndex: number, changes: {
        condition?: string;
        target?: string;
        label?: string;
        message?: string;
    }): HelperResult`

Update a screener route.

##### `reorderScreenRoute(routeIndex: number, direction: 'up' | 'down'): HelperResult`

Reorder a screener route.

##### `removeScreenRoute(routeIndex: number): HelperResult`

Remove a screener route.

#### interface `ProjectSnapshot`

Read-only snapshot of the project's authored artifacts.
This is what `project.state` returns — the four editable artifacts
without internal bookkeeping (extensions, versioning, generated layout).

- **definition**: `FormDefinition`
- **component**: `ComponentDocument`
- **theme**: `ThemeDocument`
- **mappings**: `Record<string, MappingDocument>`
- **selectedMappingId?**: `string`

#### interface `CreateProjectOptions`

Options for creating a new Project via `createProject()`.
Simpler than core's ProjectOptions — no middleware, no raw ProjectState.

- **seed** (`Partial<ProjectBundle>`): Partial bundle to seed the project with.
- **registries** (`unknown[]`): Extension registry documents to load.
- **maxHistoryDepth** (`number`): Maximum undo snapshots (default: 50).

#### type `ChangeListener`

Callback invoked after every state change.
Intentionally narrower than core's ChangeListener — consumers subscribe
for re-render notifications, they don't inspect command internals.

```ts
type ChangeListener = () => void;
```

