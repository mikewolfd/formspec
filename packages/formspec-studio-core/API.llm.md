# formspec-studio-core — API Reference

*Auto-generated from TypeScript declarations — do not hand-edit.*

Pure TypeScript library for creating and editing Formspec artifact bundles. Every edit is a serializable Command dispatched against a Project. No framework dependencies, no singletons, no side effects.

formspec-studio-core

Document-agnostic semantic authoring API for Formspec.
Project composes IProjectCore (from formspec-core) and exposes
51 behavior-driven helper methods for form authoring.

Consumers import types from THIS package — never from formspec-core.

## `isAuthoredComponentDocument(doc: unknown): doc is FormspecComponentDocument`

## `hasAuthoredComponentTree(doc: unknown): doc is FormspecComponentDocument`

## `createComponentArtifact(url?: string): FormspecComponentDocument`

## `createGeneratedLayoutDocument(url?: string, seed?: Partial<FormspecComponentDocument> | null): FormspecGeneratedLayoutDocument`

## `splitComponentState(component: FormspecComponentDocument | undefined, url?: string): {
    component: FormspecComponentDocument;
    generatedComponent: FormspecGeneratedLayoutDocument;
}`

## `getEditableComponentDocument(state: Pick<ProjectState, 'component' | 'generatedComponent'>): FormspecComponentDocument | FormspecGeneratedLayoutDocument`

## `getCurrentComponentDocument(state: Pick<ProjectState, 'component' | 'generatedComponent'>): FormspecComponentDocument | FormspecGeneratedLayoutDocument`

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

## `diffEvalResults(previous: EvalResult | null, next: EvalResult): EvalDelta`

#### interface `EvalValidation`

@filedesc Diffs batch evaluation snapshots into per-signal patch payloads.

- **path**: `string`
- **shapeId?**: `string`

#### interface `EvalResult`

- **values**: `Record<string, unknown>`
- **validations**: `EvalValidation[]`
- **nonRelevant**: `string[]`
- **variables**: `Record<string, unknown>`
- **required**: `Record<string, boolean>`
- **readonly**: `Record<string, boolean>`

#### interface `EvalDelta`

- **values**: `Record<string, unknown>`
- **removedValues**: `string[]`
- **relevant**: `Record<string, boolean>`
- **required**: `Record<string, boolean>`
- **readonly**: `Record<string, boolean>`
- **validations**: `Record<string, EvalValidation[]>`
- **removedValidationPaths**: `string[]`
- **shapeResults**: `Record<string, EvalValidation[]>`
- **removedShapeIds**: `string[]`
- **variables**: `Record<string, unknown>`
- **removedVariables**: `string[]`

#### type `FormspecItem`

```ts
type FormspecItem = FormItem;
```

#### type `FormspecBind`

```ts
type FormspecBind = FormBind & {
    remoteOptions?: string;
};
```

#### type `FormspecShape`

```ts
type FormspecShape = FormShape;
```

#### type `FormspecVariable`

```ts
type FormspecVariable = FormVariable;
```

#### type `FormspecInstance`

```ts
type FormspecInstance = FormInstance;
```

#### type `FormspecDefinition`

```ts
type FormspecDefinition = FormDefinition;
```

#### type `FormspecOption`

```ts
type FormspecOption = OptionEntry;
```

#### type `ValidationResult`

```ts
type ValidationResult = FormspecValidationResult;
```

#### type `ValidationReport`

```ts
type ValidationReport = FormspecValidationReport;
```

#### class `FormEngine`

##### `constructor(definition: FormDefinition, runtimeContext?: FormEngineRuntimeContext, registryEntries?: RegistryEntry[], reactiveRuntime?: EngineReactiveRuntime)`

##### `resolvePinnedDefinition(response: PinnedResponseReference, definitions: T[]): T`

##### `setRuntimeContext(context?: FormEngineRuntimeContext): void`

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

##### `injectExternalValidation(results: Array<{
        path: string;
        severity: string;
        code: string;
        message: string;
        source?: string;
    }>): void`

##### `clearExternalValidation(path?: string): void`

##### `dispose(): void`

##### `setRegistryEntries(entries: any[]): void`

##### `evaluateScreener(answers: Record<string, any>): {
        target: string;
        label?: string;
        extensions?: Record<string, any>;
    } | null`

##### `migrateResponse(responseData: Record<string, any>, fromVersion: string): Record<string, any>`

## `resolveOptionSetsOnDefinition(definition: FormDefinition): FormDefinition`

## `validateVariableDefinitionCycles(variableDefs: FormVariable[]): void`

## `validateCalculateBindCycles(bindConfigs: Record<string, EngineBindConfig>): void`

## `normalizeRemoteOptions(payload: any): OptionEntry[]`

## `makeValidationResult(result: Pick<ValidationResult, 'path' | 'severity' | 'constraintKind' | 'code' | 'message' | 'source'> & Partial<Pick<ValidationResult, 'shapeId' | 'context'>>): ValidationResult`

## `toValidationResult(result: EvalValidation): ValidationResult`

## `toValidationResults(results: EvalValidation[]): ValidationResult[]`

## `toRuntimeMappingResult(result: {
    direction: string;
    output: any;
    rulesApplied: number;
    diagnostics: any[];
}): RuntimeMappingResult`

## `emptyValueForItem(item: FormItem): any`

## `coerceInitialValue(item: FormItem, value: any): any`

## `coerceFieldValue(item: FormItem, bind: EngineBindConfig | undefined, definition: FormDefinition, value: any): any`

## `validateDataType(value: any, dataType: string): boolean`

## `cloneValue(value: T): T`

## `normalizeWasmValue(value: T): T`

## `toWasmContextValue(value: T): T`

## `deepEqual(left: unknown, right: unknown): boolean`

## `resolveNowProvider(now: FormEngineRuntimeContext['now']): () => Date`

## `coerceDate(value: RuntimeNowInput): Date`

## `toBasePath(path: string): string`

## `parseInstanceTarget(path: string): {
    instanceName: string;
    instancePath?: string;
} | null`

## `splitIndexedPath(path: string): string[]`

## `appendPath(base: string, segment: string): string`

## `parentPathOf(path: string): string`

## `getAncestorBasePaths(path: string): string[]`

## `getScopeAncestors(scopePath: string): string[]`

## `getNestedValue(target: any, path: string): any`

## `setNestedPathValue(target: Record<string, any>, path: string, value: any): void`

## `setExpressionContextValue(target: Record<string, any>, path: string, value: any): void`

## `setResponsePathValue(target: Record<string, any>, path: string, value: any): void`

## `replaceBareCurrentFieldRefs(expression: string, currentFieldName: string): string`

## `flattenObject(value: any, prefix?: string, output?: Record<string, any>): Record<string, any>`

## `buildGroupSnapshotForPath(prefix: string, signals: Record<string, EngineSignal<any>>): Record<string, any>`

## `buildRepeatCollection(groupPath: string, count: number, signals: Record<string, EngineSignal<any>>): any[]`

## `getRepeatAncestors(currentItemPath: string, repeats: Record<string, EngineSignal<number>>): Array<{
    groupPath: string;
    index: number;
    count: number;
}>`

## `isEmptyValue(value: unknown): boolean`

## `safeEvaluateExpression(expression: string, context: WasmFelContext): any`

## `extractInlineBind(item: FormItem, path: string): EngineBindConfig | null`

## `detectNamedCycle(graph: Map<string, Set<string>>, message: string): void`

## `topoSortKeys(nodes: T[], graph: Map<string, Set<string>>): T[]`

## `snapshotSignals(signals: Record<string, EngineSignal<any>>): Record<string, any>`

## `toFelIndexedPath(path: string): string`

## `buildRepeatValueAliases(valuesByPath: Record<string, any>): Array<[string, any[]]>`

## `toRepeatWildcardPath(alias: string): string`

## `escapeRegExp(value: string): string`

## `resolveQualifiedGroupRefs(expression: string, currentItemPath: string, repeatAncestors: Array<{
    groupPath: string;
    index: number;
    count: number;
}>): string`

Resolve $group.field qualified refs to sibling refs within repeat context.

When evaluating an expression for a field inside a repeat group (e.g., line_items[0].total),
a reference like $line_items.qty should resolve to the sibling field "qty" in the same
instance, not to a wildcard collecting all instances.

For nested repeats (e.g., orders[0].items[0].line_total), $items.qty resolves to the
innermost sibling, and $orders.discount_pct resolves to the enclosing group's concrete path.

## `resolveRelativeDependency(dep: string, parentPath: string, selfPath: string): string | null`

#### type `EngineBindConfig`

```ts
type EngineBindConfig = FormBind & {
    remoteOptions?: string;
    precision?: number;
    disabledDisplay?: 'hidden' | 'protected';
};
```

#### type `RuntimeNowInput`

```ts
type RuntimeNowInput = Date | string | number;
```

## `createFormEngine(definition: FormDefinition, context?: FormEngineRuntimeContext, registryEntries?: RegistryEntry[], reactiveRuntime?: EngineReactiveRuntime): FormEngine`

## `validateInstanceDataAgainstSchema(instanceName: string, data: unknown, schema: Record<string, unknown> | undefined): void`

@filedesc Validate instance JSON against optional per-instance schema (datatype strings).

## `patchValueSignalsFromWasm(options: {
    values: Record<string, unknown>;
    signals: Record<string, EngineSignal<any>>;
    data: Record<string, any>;
    fieldItems: Map<string, FormItem>;
    bindConfigs: Record<string, EngineBindConfig>;
    calculatedFields: Set<string>;
}): void`

## `patchDeltaSignalsFromWasm(rx: EngineReactiveRuntime, delta: EvalDelta, options: {
    relevantSignals: Record<string, EngineSignal<boolean>>;
    requiredSignals: Record<string, EngineSignal<boolean>>;
    readonlySignals: Record<string, EngineSignal<boolean>>;
    validationResults: Record<string, EngineSignal<ValidationResult[]>>;
    shapeResults: Record<string, EngineSignal<ValidationResult[]>>;
    variableSignals: Record<string, EngineSignal<any>>;
    variableSignalKeys: Map<string, string[]>;
    prePopulateReadonly: Set<string>;
}): void`

## `patchErrorSignalsFromWasm(rx: EngineReactiveRuntime, options: {
    validationResults: Record<string, EngineSignal<ValidationResult[]>>;
    errorSignals: Record<string, EngineSignal<string | null>>;
}): void`

## `clearRepeatIndexedSubtree(options: {
    rootRepeatPath: string;
    signals: Record<string, EngineSignal<any>>;
    relevantSignals: Record<string, EngineSignal<boolean>>;
    requiredSignals: Record<string, EngineSignal<boolean>>;
    readonlySignals: Record<string, EngineSignal<boolean>>;
    errorSignals: Record<string, EngineSignal<string | null>>;
    validationResults: Record<string, EngineSignal<ValidationResult[]>>;
    optionSignals: Record<string, EngineSignal<OptionEntry[]>>;
    optionStateSignals: Record<string, EngineSignal<RemoteOptionsState>>;
    repeats: Record<string, EngineSignal<number>>;
    data: Record<string, any>;
}): void`

Remove indexed paths under a repeat root from signal stores and `_data` (reactive structure only).

## `snapshotRepeatGroupTree(items: FormItem[], prefix: string, readFieldValue: (path: string) => unknown, getRepeatCount: (path: string) => number): Record<string, unknown>`

Snapshot nested field values under a repeat prefix (used when removing a repeat row).

## `applyRepeatGroupTreeSnapshot(items: FormItem[], prefix: string, snapshot: Record<string, unknown> | undefined, writeField: (path: string, value: unknown) => void): void`

Restore nested field values after repeat rows were reindexed.

## `buildFormspecResponseEnvelope(options: {
    definition: FormDefinition;
    data: Record<string, unknown>;
    report: ValidationReport;
    timestamp: string;
    meta?: {
        id?: string;
        author?: {
            id: string;
            name?: string;
        };
        subject?: {
            id: string;
            type?: string;
        };
    };
}): Record<string, unknown>`

## `collectSubmitModeShapeValidationResults(submitEval: EvalResult, shapeTiming: Map<string, EvalShapeTiming>): ValidationResult[]`

Shape validations that only run on submit, from a WASM eval with `trigger: 'submit'`.

## `buildValidationReportEnvelope(results: ValidationResult[], timestamp: string): ValidationReport`

Strip optional cardinality `source`, compute counts, and wrap the spec envelope.

## `migrateResponseData(definition: FormDefinition, responseData: Record<string, any>, fromVersion: string, options: {
    nowIso: string;
}): Record<string, any>`

## `resolvePinnedDefinition(response: PinnedResponseReference, definitions: T[]): T`

## `wasmEvaluateDefinitionPayload(options: {
    nowIso: string;
    trigger?: 'continuous' | 'submit' | 'demand' | 'disabled';
    previousResult: EvalResult | null;
    instances: Record<string, unknown>;
    registryDocuments: unknown[];
    /** Authoritative repeat row counts by group base path (matches engine repeat signals). */
    repeatCounts: Record<string, number>;
}): {
    nowIso: string;
    trigger?: 'continuous' | 'submit' | 'demand' | 'disabled';
    previousValidations: WasmPreviousValidation | undefined;
    previousNonRelevant: string[] | undefined;
    instances: Record<string, unknown>;
    registryDocuments: unknown[];
    repeatCounts: Record<string, number>;
}`

Options object consumed by the WASM definition evaluator (JSON-serialized internally).

## `mergeWasmEvalWithExternalValidations(result: EvalResult, options: {
    externalValidations: EvalValidation[];
}): EvalResult`

Append engine-owned validations (e.g. extension hooks) after WASM batch evaluation.

## `normalizeExpressionForWasmEvaluation(options: {
    expression: string;
    currentItemPath: string;
    replaceSelfRef: boolean;
    repeats: Record<string, EngineSignal<number>>;
    fieldSignals: Record<string, EngineSignal<any>>;
}): string`

## `resolveFelFieldValueForWasm(path: string, value: unknown, bindConfigs: Record<string, EngineBindConfig>, fieldIsIrrelevant: (path: string) => boolean): unknown`

## `visibleScopedVariableValues(scopePath: string, variableDefs: FormVariable[], variableSignals: Record<string, EngineSignal<any>>, overrides?: Record<string, any>): Record<string, any>`

## `buildFelRepeatWasmContext(options: {
    currentItemPath: string;
    repeats: Record<string, EngineSignal<number>>;
    fieldSignals: Record<string, EngineSignal<any>>;
}): WasmFelContext['repeatContext'] | undefined`

## `buildWasmFelExpressionContext(options: WasmFelContextBuildInput): WasmFelContext`

#### interface `WasmFelContextBuildInput`

- **currentItemPath**: `string`
- **data**: `Record<string, any>`
- **fullResult**: `EvalResult | null`
- **resultOverride?**: `EvalResult | null`
- **dataOverride?**: `Record<string, any>`
- **scopedVariableOverrides?**: `Record<string, any>`
- **fieldSignals**: `Record<string, EngineSignal<any>>`
- **validationResults**: `Record<string, EngineSignal<ValidationResult[]>>`
- **relevantSignals**: `Record<string, EngineSignal<boolean>>`
- **readonlySignals**: `Record<string, EngineSignal<boolean>>`
- **requiredSignals**: `Record<string, EngineSignal<boolean>>`
- **repeats**: `Record<string, EngineSignal<number>>`
- **bindConfigs**: `Record<string, EngineBindConfig>`
- **variableDefs**: `FormVariable[]`
- **variableSignals**: `Record<string, EngineSignal<any>>`
- **instanceData**: `Record<string, unknown>`
- **nowIso**: `string`

#### type `WasmPreviousValidation`

Subset of validation objects passed back into WASM as previous state.

```ts
type WasmPreviousValidation = Array<{
    path: string;
    severity: string;
    constraintKind: string;
    code: string;
    message: string;
    source: string;
    shapeId?: string;
    context?: Record<string, unknown>;
}>;
```

#### type `EvalShapeTiming`

```ts
type EvalShapeTiming = 'continuous' | 'submit' | 'demand';
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

## `initFormspecEngine(): Promise<void>`

Initialize the Formspec engine (loads and links the Rust/WASM module).

Call once during app startup (e.g. `await initFormspecEngine()` or `await initEngine()`).
Safe to call multiple times; concurrent calls share one load.

Not required for `formspec-webcomponent` only: importing that package starts WASM load automatically.

## `isFormspecEngineInitialized(): boolean`

Whether {@link initFormspecEngine} has completed successfully in this JS realm.

## `initFormspecEngineTools(): Promise<void>`

Initialize the tools WASM module used by lint/mapping/registry/changelog helpers.
Runtime-first flows do not need this.

## `isFormspecEngineToolsInitialized(): boolean`

Whether the tools WASM module has completed initialization.

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

## `preactReactiveRuntime: EngineReactiveRuntime`

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

formspec-studio-core

Document-agnostic semantic authoring API for Formspec.
Project composes IProjectCore (from formspec-core) and exposes
51 behavior-driven helper methods for form authoring.

Consumers import types from THIS package — never from formspec-core.

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

Definition normalization utilities.

Converts legacy/alternative serialization shapes into the canonical forms
expected by the studio engine:

- `instances[]` (array with `name` property) → `instances{}` (object keyed by name)
- `binds{}` (object keyed by path) → `binds[]` (array with `path` property)

Safe to call on already-normalized definitions (idempotent).

normalization

## `normalizeDefinition(definition: FormspecDefinition): FormspecDefinition`

Normalize a definition by converting legacy shape forms to canonical forms.

Conversions applied:
- If `definition.instances` is an array, converts to object keyed by each
  item's `name` property. The `name` property is stripped from each value.
- If `definition.binds` is a non-array object, converts to array of
  `{ path, ...config }` entries where each key becomes the `path`.

Both conversions are idempotent: calling on already-normalized data is safe.

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

formspec-studio-core

Pure TypeScript library for creating and editing Formspec artifact bundles.
Every edit is a serializable {@link Command} dispatched against a {@link Project}.

Entry point: call {@link createProject} to get a new {@link Project} instance,
then use `project.dispatch(command)` to apply mutations.

No framework dependencies, no singletons, no side effects.

Definition normalization utilities.

Converts legacy/alternative serialization shapes into the canonical forms
expected by the studio engine:

- `instances[]` (array with `name` property) → `instances{}` (object keyed by name)
- `binds{}` (object keyed by path) → `binds[]` (array with `path` property)

Safe to call on already-normalized definitions (idempotent).

normalization

## `resolvePageStructure(state: ProjectState, definitionItemKeys: string[]): ResolvedPageStructure`

Resolves the current page structure by reading all three tiers.

Priority: Tier 3 Wizard component → Tier 2 theme.pages → Tier 1 definition groups → none.

#### interface `ResolvedPage`

- **id**: `string`
- **title?**: `string`
- **description?**: `string`
- **regions?**: `{
        key?: string;
        span?: number;
        start?: number;
    }[]`

#### interface `PageDiagnostic`

- **code**: `'SHADOWED_THEME_PAGES' | 'UNKNOWN_REGION_KEY' | 'PAGEMODE_MISMATCH'`
- **severity**: `'warning' | 'error'`
- **message**: `string`

#### interface `ResolvedPageStructure`

- **mode**: `'single' | 'wizard' | 'tabs'`
- **pages**: `ResolvedPage[]`
- **controllingTier**: `'component' | 'theme' | 'definition' | 'none'`
- **diagnostics**: `PageDiagnostic[]`
- **wizardConfig**: `{
        showProgress: boolean;
        allowSkip: boolean;
    }`

## `resolveThemeCascade(theme: FormspecThemeDocument, itemKey: string, itemType: string, itemDataType?: string): Record<string, ResolvedProperty>`

#### interface `ResolvedProperty`

- **value**: `unknown`
- **source**: `'default' | 'selector' | 'item-override'`
- **sourceDetail?**: `string`

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

#### interface `FormspecGeneratedLayoutDocument`

Studio-internal generated layout document.

This is not an authored Tier 3 artifact. It holds the editor's current
generated layout tree and related lineage metadata when no explicit
component document tree is being authored.

- **'x-studio-generated'** (`true`): Marker used to distinguish generated editor state from authored artifacts.

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
- **component** (`FormspecComponentDocument`): The authored Tier 3 artifact document.
- **generatedComponent** (`FormspecGeneratedLayoutDocument`): Studio-generated layout state used for editor interactions and preview synthesis.
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

#### interface `FELMappingContext`

Mapping-editor context for expression parsing/autocomplete.

- **ruleIndex** (`number`): Optional mapping rule index in the current document.
- **direction** (`'forward' | 'reverse'`): Mapping transform direction.
- **sourcePath** (`string`): Source path context for the current rule/expression.
- **targetPath** (`string`): Target path context for the current rule/expression.

#### interface `FELParseContext`

Editor context for parsing FEL and assembling reference suggestions.

- **targetPath** (`string`): Definition path currently being edited (supports repeat-scope inference).
- **mappingContext** (`FELMappingContext`): Optional mapping-editor context for mapping-specific references.

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

#### type `Middleware`

A function that wraps the command dispatch pipeline.

Middleware sees the current (read-only) state and the command being dispatched.
It must call `next(command)` to continue the pipeline, or may short-circuit,
transform the command, or perform side effects before/after.

```ts
type Middleware = (state: Readonly<ProjectState>, command: AnyCommand, next: (command: AnyCommand) => CommandResult) => CommandResult;
```

#### interface `ResolvedRegion`

Enriched region from theme.schema.json Region with existence check.
Schema source: theme.schema.json#/$defs/Region

- **key**: `string`
- **span**: `number`
- **start?**: `number`
- **exists**: `boolean`

