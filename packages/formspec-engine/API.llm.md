# formspec-engine — API Reference

*Auto-generated from TypeScript declarations — do not hand-edit.*

Core form state management engine. Parses a FormspecDefinition and builds a reactive signal network for field values, relevance, validation, repeat groups, computed variables, and response serialization. Includes FEL expression compilation, definition assembly, and bidirectional runtime mapping.

#### interface `FormspecItem`

A single item in a Formspec definition tree: a field (data-bearing), group (container), or display (read-only content).

- **key**: `string`
- **type**: `"field" | "group" | "display"`
- **label**: `string`
- **dataType?**: `"string" | "text" | "integer" | "decimal" | "number" | "boolean" | "date" | "dateTime" | "time" | "uri" | "attachment" | "choice" | "multiChoice" | "money"`
- **currency?**: `string`
- **description?**: `string`
- **hint?**: `string`
- **repeatable?**: `boolean`
- **minRepeat?**: `number`
- **maxRepeat?**: `number`
- **children?**: `FormspecItem[]`
- **options?**: `{
        value: string;
        label: string;
    }[]`
- **optionSet?**: `string`
- **initialValue?**: `any`
- **presentation?**: `any`
- **prePopulate?**: `{
        instance: string;
        path: string;
        editable?: boolean;
    }`
- **labels?**: `Record<string, string>`
- **relevant?**: `string`
- **required?**: `string | boolean`
- **calculate?**: `string`
- **readonly?**: `string | boolean`
- **constraint?**: `string`
- **message?**: `string`

#### interface `FormspecBind`

A bind configuration that attaches FEL-driven logic (relevance, required, calculate, readonly, constraint) to a field path.

- **path**: `string`
- **relevant?**: `string`
- **required?**: `string | boolean`
- **calculate?**: `string`
- **readonly?**: `string | boolean`
- **constraint?**: `string`
- **constraintMessage?**: `string`
- **default?**: `any`
- **whitespace?**: `'preserve' | 'trim' | 'normalize' | 'remove'`
- **excludedValue?**: `'preserve' | 'null'`
- **nonRelevantBehavior?**: `'remove' | 'empty' | 'keep'`
- **disabledDisplay?**: `'hidden' | 'protected'`
- **precision?**: `number`
- **remoteOptions?**: `string`

#### interface `FormspecOption`

A selectable option for choice/multiChoice fields, consisting of a machine-readable value and a display label.

- **value**: `string`
- **label**: `string`

#### interface `RemoteOptionsState`

Loading/error state for a field whose options are fetched from a remote URL via the `remoteOptions` bind.

- **loading**: `boolean`
- **error**: `string | null`

#### interface `FormspecShape`

A cross-field validation rule evaluated against one or more target paths.
Shapes support composition operators (and/or/not/xone) and timing modes (continuous, submit, demand).

- **id**: `string`
- **target**: `string`
- **severity?**: `"error" | "warning" | "info"`
- **constraint?**: `string`
- **message**: `string`
- **code?**: `string`
- **activeWhen?**: `string`
- **timing?**: `"continuous" | "submit" | "demand"`
- **and?**: `string[]`
- **or?**: `string[]`
- **not?**: `string`
- **xone?**: `string[]`
- **context?**: `Record<string, string>`

#### interface `FormspecVariable`

A named computed variable defined by a FEL expression, scoped to a specific item or the entire definition ('#').

- **name**: `string`
- **expression**: `string`
- **scope?**: `string`

#### interface `FormspecInstance`

A named data instance that provides external data for pre-population and FEL `instance()` lookups.

- **description?**: `string`
- **source?**: `string`
- **static?**: `boolean`
- **data?**: `any`
- **schema?**: `Record<string, string>`
- **readonly?**: `boolean`

#### interface `FormspecDefinition`

The top-level Formspec definition document describing a complete form.
Contains the item tree, bind constraints, shape rules, variables, instances, option sets,
and optional screener/migration/presentation configuration.

- **$formspec**: `string`
- **url**: `string`
- **version**: `string`
- **title**: `string`
- **items**: `FormspecItem[]`
- **binds?**: `FormspecBind[]`
- **shapes?**: `FormspecShape[]`
- **variables?**: `FormspecVariable[]`
- **instances?**: `Record<string, FormspecInstance>`
- **optionSets?**: `Record<string, FormspecOption[]>`
- **nonRelevantBehavior?**: `'remove' | 'empty' | 'keep'`
- **formPresentation?**: `any`
- **screener?**: `{
        routes: Array<{
            condition?: string;
            target: string;
            label?: string;
        }>;
    }`
- **migrations?**: `Array<{
        fromVersion: string;
        changes: Array<{
            type: string;
            [key: string]: any;
        }>;
    }>`

#### interface `ValidationResult`

A single validation finding (error, warning, or info) targeting a specific field path.

- **severity**: `"error" | "warning" | "info"`
- **path**: `string`
- **message**: `string`
- **constraintKind**: `"required" | "type" | "cardinality" | "constraint" | "shape" | "external"`
- **code**: `string`
- **source?**: `"bind" | "shape"`
- **shapeId?**: `string`
- **constraint?**: `string`
- **context?**: `Record<string, any>`

#### interface `ValidationReport`

Aggregated validation output for the entire form, including all bind-level and shape-level results.
A report is `valid` when it contains zero errors; warnings and infos do not affect validity.

- **valid**: `boolean`
- **results**: `ValidationResult[]`
- **counts**: `{
        error: number;
        warning: number;
        info: number;
    }`
- **timestamp**: `string`

#### interface `FormEngineRuntimeContext`

Runtime configuration injected into the engine to control time, locale, timezone, and deterministic seeding.

- **now?**: `(() => EngineNowInput) | EngineNowInput`
- **locale?**: `string`
- **timeZone?**: `string`
- **seed?**: `string | number`

#### interface `FormEngineDiagnosticsSnapshot`

A complete point-in-time snapshot of engine state for debugging: all values, MIP states, dependencies, and validation.

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
- **dependencies**: `Record<string, string[]>`
- **validation**: `ValidationReport`
- **runtimeContext**: `{
        now: string;
        locale?: string;
        timeZone?: string;
        seed?: string | number;
    }`

#### interface `EngineReplayApplyResult`

The result of applying a single replay event, including success/failure status and optional output.

- **ok**: `boolean`
- **event**: `EngineReplayEvent`
- **output?**: `any`
- **error?**: `string`

#### interface `EngineReplayResult`

Aggregate result of replaying a sequence of events, with per-event results and any errors encountered.

- **applied**: `number`
- **results**: `EngineReplayApplyResult[]`
- **errors**: `Array<{
        index: number;
        event: EngineReplayEvent;
        error: string;
    }>`

#### interface `ComponentObject`

A node in the component tree describing which UI component to render, with optional binding, conditional visibility, and children.

- **component**: `string`
- **bind?**: `string`
- **when?**: `string`
- **style?**: `Record<string, any>`
- **children?**: `ComponentObject[]`

#### interface `ComponentDocument`

A Formspec Component Document that defines the UI component tree, breakpoints, tokens,
and custom component specifications for rendering a specific definition.

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

#### type `EngineNowInput`

Accepted input types for the engine's "now" provider: a Date object, an ISO string, or a Unix timestamp.

```ts
type EngineNowInput = Date | string | number;
```

#### type `EngineReplayEvent`

A discriminated union of events that can be replayed against a FormEngine instance (setValue, repeat operations, validation, response).

#### class `FormEngine`

Central reactive form state manager for Formspec definitions.

FormEngine parses a {@link FormspecDefinition} and builds a network of Preact signals
representing field values, relevance (visibility), required/readonly state, validation
results, repeat group counts, option lists, and computed variables. All signals update
automatically when dependencies change.

Key capabilities:
- **FEL compilation** with caching and dependency tracking for calculated fields, constraints, and shapes.
- **Bind constraint evaluation** (field-level: required, readonly, calculate, constraint, relevance).
- **Shape evaluation** (cross-field rules with composition operators, supporting continuous/submit/demand timing).
- **Repeat group lifecycle** (add/remove instances with automatic signal initialization and cleanup).
- **Response serialization** honoring nonRelevantBehavior settings.
- **Diagnostics snapshots** for debugging.
- **Event replay** for testing and deterministic reproduction.
- **Version migrations** for evolving definitions.
- **Remote options** fetching from bind-configured URLs.
- **Screener evaluation** for conditional form routing.

##### `constructor(definition: FormspecDefinition, runtimeContext?: FormEngineRuntimeContext)`

Creates a new FormEngine from a Formspec definition.

Initializes all reactive signals, resolves option sets, loads instance data,
compiles bind expressions, fetches remote options, and wires up shape evaluation.

- **signals** (`Record<string, any>`): Reactive signals holding current field values, keyed by full dotted path (e.g. `"group[0].field"`).
- **relevantSignals** (`Record<string, Signal<boolean>>`): Reactive boolean signals indicating whether each field/group is currently relevant (visible).
- **requiredSignals** (`Record<string, Signal<boolean>>`): Reactive boolean signals indicating whether each field is currently required.
- **readonlySignals** (`Record<string, Signal<boolean>>`): Reactive boolean signals indicating whether each field is currently readonly.
- **errorSignals** (`Record<string, Signal<string | null>>`): Reactive signals holding the first error message (or null) for each field, derived from validationResults.
- **validationResults** (`Record<string, Signal<ValidationResult[]>>`): Reactive signals holding bind-level validation results for each field path.
- **shapeResults** (`Record<string, Signal<ValidationResult[]>>`): Reactive signals holding shape-level validation results, keyed by shape ID.
- **repeats** (`Record<string, Signal<number>>`): Reactive signals holding the current instance count for each repeatable group path.
- **optionSignals** (`Record<string, Signal<FormspecOption[]>>`): Reactive signals holding the resolved option lists for choice/multiChoice fields.
- **optionStateSignals** (`Record<string, Signal<RemoteOptionsState>>`): Reactive signals holding the loading/error state for fields with remote options.
- **variableSignals** (`Record<string, Signal<any>>`): Reactive signals holding computed variable values, keyed by `"scope:name"` (e.g. `"#:totalDirect"`).
- **instanceData** (`Record<string, any>`): Static instance data loaded from the definition's `instances` section, keyed by instance name.
- **dependencies** (`Record<string, string[]>`): Dependency graph mapping each field path to the paths it depends on, built during FEL compilation.
- **structureVersion** (`Signal<number>`): Monotonically increasing counter that increments whenever repeat instances are added or removed, enabling reactive UI rebuilds.
- **(get) formPresentation** (`any`): Returns the definition's `formPresentation` block (layout, wizard, default currency, etc.), or null if absent.

##### `setRuntimeContext(context?: FormEngineRuntimeContext): void`

Updates the engine's runtime context (now provider, locale, timezone, seed).
Only explicitly provided keys are changed; omitted keys are left as-is.

##### `getOptions(path: string): FormspecOption[]`

Returns the current resolved options array for a choice/multiChoice field.

##### `getOptionsSignal(path: string): Signal<FormspecOption[]> | undefined`

Returns the reactive signal holding the options array for a field, or undefined if no options exist.

##### `getOptionsState(path: string): RemoteOptionsState`

Returns the current loading/error state for a field's remote options.

##### `getOptionsStateSignal(path: string): Signal<RemoteOptionsState> | undefined`

Returns the reactive signal holding the remote options loading/error state, or undefined.

##### `waitForRemoteOptions(): Promise<void>`

Waits for all in-flight remote options fetches to settle (resolve or reject).

##### `getInstanceData(name: string, path?: string): any`

Retrieves data from a named instance, optionally navigating to a nested path.
Used by FEL's `instance()` function and the pre-population system.

##### `getDisabledDisplay(path: string): 'hidden' | 'protected'`

Returns the disabledDisplay mode for a field path from its bind configuration.
- `"hidden"` (default): the field wrapper is display:none when non-relevant.
- `"protected"`: the field remains visible but grayed out / disabled when non-relevant.

##### `getVariableValue(name: string, scopePath: string): any`

Resolves a computed variable by name using lexical scope lookup.
Searches from the given scope path upward through ancestor scopes to the global scope (`#`).

##### `addRepeatInstance(itemName: string): number | undefined`

Adds a new repeat instance to a repeatable group, initializing all child signals.
Does not enforce maxRepeat; exceeding the maximum produces a validation error instead.

##### `removeRepeatInstance(itemName: string, index: number): void`

Removes a repeat instance at the given index, shifting subsequent instances down.
Does not enforce minRepeat; going below the minimum produces a validation error instead.

##### `compileExpression(expression: string, currentItemName?: string): () => any`

Compiles a FEL expression into a callable function that evaluates against the engine's current state.
Results are cached; subsequent calls with the same expression and context return the cached function.

##### `setValue(name: string, value: any): void`

Sets a field's value, applying whitespace transforms, type coercion, and precision enforcement
as configured by the field's bind and data type.

##### `getValidationReport(options?: {
        mode?: 'continuous' | 'submit';
    }): ValidationReport`

Builds and returns the current validation report, aggregating bind-level and shape-level results.
In `"continuous"` mode (default), only continuous-timing shapes are included.
In `"submit"` mode, submit-timing shapes are also evaluated.
Non-relevant fields are excluded from the report.

##### `evaluateShape(shapeId: string): ValidationResult[]`

Evaluates a specific shape by ID on demand, returning any resulting validation findings.
Typically used for demand-timing shapes that are not automatically evaluated.

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

Serializes the current form state into a Formspec response document.
Respects nonRelevantBehavior settings (remove, empty, or keep) when building the data tree.
Includes a full validation report and metadata (definitionUrl, definitionVersion, status, authored timestamp).

##### `getDiagnosticsSnapshot(options?: {
        mode?: 'continuous' | 'submit';
    }): FormEngineDiagnosticsSnapshot`

Captures a complete point-in-time snapshot of the engine's internal state for debugging.
Includes all field values, MIP states (relevant/required/readonly/error), dependency graph,
repeat counts, validation report, and runtime context.

##### `applyReplayEvent(event: EngineReplayEvent): EngineReplayApplyResult`

Applies a single replay event to the engine, dispatching to the appropriate method.
Catches errors and returns them in the result rather than throwing.

##### `replay(events: EngineReplayEvent[], options?: {
        stopOnError?: boolean;
    }): EngineReplayResult`

Replays a sequence of events against the engine in order, for deterministic state reproduction.

##### `getDefinition(): FormspecDefinition`

Returns the loaded Formspec definition document.

##### `setLabelContext(context: string | null): void`

Sets the active label context key, used by {@link getLabel} to select alternate label strings.

##### `getLabel(item: FormspecItem): string`

Returns the label for an item, honoring the current label context if one is set.
Falls back to the item's default `label` property when no context match is found.

##### `evaluateScreener(): {
        target: string;
        label?: string;
    } | null`

Evaluates the definition's screener routes against the current form state.
Returns the first route whose condition is truthy (or unconditional), or null if no route matches.
Used for conditional form routing before the main form is presented.

##### `migrateResponse(responseData: Record<string, any>, fromVersion: string): Record<string, any>`

Applies version migrations to response data, transforming it from `fromVersion` to the current definition version.
Supports rename, remove, add, and FEL-based transform operations as defined in the definition's `migrations` array.

## `assembleDefinition(definition: FormspecDefinition, resolver: DefinitionResolver): Promise<AssemblyResult>`

Assembles a {@link FormspecDefinition} by recursively resolving all `$ref` inclusions.
Produces a self-contained definition with no external references, suitable for runtime use.
Assembly is intended to run at publish time (when a definition transitions from "draft" to "active").
Detects circular references and key collisions, and rewrites bind/shape paths with keyPrefix when specified.

## `assembleDefinitionSync(definition: FormspecDefinition, resolver: (url: string, version?: string) => FormspecDefinition): AssemblyResult`

Synchronous variant of {@link assembleDefinition} for use when all referenced definitions
are available in-memory (e.g. during testing or pre-cached scenarios).

#### interface `AssemblyProvenance`

Provenance record for a single `$ref` inclusion resolved during definition assembly, tracking origin URL, version, prefix, and fragment.

- **url**: `string`
- **version**: `string`
- **keyPrefix?**: `string`
- **fragment?**: `string`

#### interface `AssemblyResult`

The output of definition assembly: a self-contained definition with all `$ref` inclusions inlined, plus provenance records.

- **definition**: `FormspecDefinition`
- **assembledFrom**: `AssemblyProvenance[]`

#### type `DefinitionResolver`

A function that resolves a `(url, version?)` pair to a {@link FormspecDefinition}.
Implementations may resolve from an in-memory registry, local filesystem, or network fetch.
May return synchronously or asynchronously.

```ts
type DefinitionResolver = (url: string, version?: string) => FormspecDefinition | Promise<FormspecDefinition>;
```

#### interface `RuntimeMappingResult`

The result of executing a mapping operation, including the transformed output, rule count, and any diagnostics.

- **direction**: `MappingDirection`
- **output**: `any`
- **appliedRules**: `number`
- **diagnostics**: `string[]`

#### type `MappingDirection`

The direction of a mapping operation: `"forward"` maps Formspec data to an external format, `"reverse"` maps back.

```ts
type MappingDirection = 'forward' | 'reverse';
```

#### class `RuntimeMappingEngine`

Bidirectional data transform engine driven by a Formspec mapping document.

Rules are priority-ordered and support conditions, transform types (drop, constant, valueMap,
coerce, preserve), and per-rule reverse overrides. Forward mapping transforms Formspec response
data into an external format; reverse mapping transforms external data back into Formspec shape.

##### `constructor(mappingDocument: any)`

Creates a RuntimeMappingEngine from a mapping document.

##### `forward(source: any): RuntimeMappingResult`

Executes a forward mapping: transforms Formspec response data into an external format.
Applies document defaults before processing rules.

##### `reverse(source: any): RuntimeMappingResult`

Executes a reverse mapping: transforms external-format data back into Formspec response shape.
Uses each rule's `reverse` override when available, otherwise swaps source/target paths.

