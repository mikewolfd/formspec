# formspec-mcp — API Reference

*Auto-generated from TypeScript declarations — do not hand-edit.*

Model Context Protocol server for AI-driven Formspec form authoring. Exposes form creation, editing, preview, and validation as MCP tools.

## `READ_ONLY: {
    readonly readOnlyHint: true;
    readonly destructiveHint: false;
    readonly idempotentHint: true;
    readonly openWorldHint: false;
}`

@filedesc Reusable MCP tool annotation presets (read-only, destructive, etc.).

## `NON_DESTRUCTIVE: {
    readonly readOnlyHint: false;
    readonly destructiveHint: false;
    readonly idempotentHint: false;
    readonly openWorldHint: false;
}`

## `DESTRUCTIVE: {
    readonly readOnlyHint: false;
    readonly destructiveHint: true;
    readonly idempotentHint: false;
    readonly openWorldHint: false;
}`

## `FILESYSTEM_IO: {
    readonly readOnlyHint: false;
    readonly destructiveHint: false;
    readonly idempotentHint: true;
    readonly openWorldHint: true;
}`

## `executeBatch(items: BatchItem[], fn: (item: BatchItem, index: number) => HelperResult): BatchResult`

Execute a batch of items, calling `fn` for each.
Catches errors per-item so one failure doesn't abort the rest.

#### interface `BatchItemResult`

Per-item result

- **index**: `number`
- **success**: `boolean`
- **summary?**: `string`
- **error?**: `{
        code: string;
        message: string;
        detail?: Record<string, unknown>;
    }`

#### interface `BatchResult`

Aggregate batch response

- **results**: `BatchItemResult[]`
- **succeeded**: `number`
- **failed**: `number`

#### type `BatchItem`

A single item in a batch — shape varies per tool

```ts
type BatchItem = Record<string, unknown>;
```

## `createFormspecServer(registry: ProjectRegistry): McpServer`

Create an McpServer with browser-safe authoring tools registered.

Excludes filesystem-dependent tools (open, save, draft, load).
Includes: guide, create (inline), undo/redo (inline), all structure/behavior/flow/
style/data/screener/query/fel tools.

Does NOT connect any transport or set up shutdown hooks.

## `formatToolError(code: string, message: string, detail?: Record<string, unknown>): ToolError`

## `errorResponse(error: ToolError): {
    isError: true;
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: Record<string, unknown>;
}`

MCP error response shape with structuredContent

## `successResponse(result: unknown): {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

MCP success response shape

## `wrapHelperCall(fn: () => HelperResult): ReturnType<typeof successResponse> | ReturnType<typeof errorResponse>`

Wraps a Project helper call with uniform error handling.
Catches HelperError → maps to ToolError wire format.
Catches any other Error → maps to COMMAND_FAILED.

## `wrapBatchCall(items: BatchItem[], fn: (item: BatchItem, index: number) => HelperResult): ReturnType<typeof successResponse> | ReturnType<typeof errorResponse>`

Wraps a batch operation into an MCP response.
Uses successResponse when all succeed, marks isError when ALL fail.
Partial success returns a normal response with the failure details inside.

#### type `ToolError`

```ts
type ToolError = {
    code: string;
    message: string;
    detail?: Record<string, unknown>;
} & Record<string, unknown>;
```

## `server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer`

@filedesc MCPB entry point — exports a configured McpServer for Claude Desktop's built-in Node.js runner.

Unlike server.ts (which connects its own StdioServerTransport), this module
exports the server so the host environment can connect its own transport.

#### interface `DraftState`

- **definition?**: `unknown`
- **component?**: `unknown`
- **theme?**: `unknown`
- **errors**: `Map<string, SchemaValidationError[]>`

#### interface `ProjectEntry`

- **id**: `string`
- **project**: `Project | null`
- **draft**: `DraftState | null`
- **sourcePath?**: `string`

#### class `ProjectRegistry`

##### `newProject(): string`

##### `getEntry(id: string): ProjectEntry`

##### `getProject(id: string): Project`

##### `getDraft(id: string): DraftState`

##### `transitionToAuthoring(id: string, project: Project): void`

##### `registerOpen(path: string, project: Project): string`

##### `close(id: string): void`

##### `listAll(): ProjectEntry[]`

##### `authoringProjects(): Array<{
        id: string;
        project: Project;
        sourcePath?: string;
    }>`

## `initSchemas(schemasDir: string): SchemaValidator`

Loads schemas from disk and creates the validator singleton.
Call once at startup. Throws (fatal) if any schema file is missing.

## `getValidator(): SchemaValidator`

## `initSchemaTexts(schemasDir: string): void`

## `getSchemaText(name: 'definition' | 'component' | 'theme'): string`

## `main(): Promise<void>`

## `handleBehavior(registry: ProjectRegistry, projectId: string, params: BehaviorParams | {
    items: BatchItem[];
}): {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

#### interface `BehaviorParams`

- **action**: `BehaviorAction`
- **target**: `string`
- **condition?**: `string`
- **expression?**: `string`
- **rule?**: `string`
- **message?**: `string`
- **options?**: `ValidationOptions`

#### type `BehaviorAction`

```ts
type BehaviorAction = 'show_when' | 'readonly_when' | 'require' | 'calculate' | 'add_rule' | 'remove_rule';
```

## `handleDraft(registry: ProjectRegistry, projectId: string, type: ArtifactType, json: unknown): {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

Submit a raw JSON artifact for schema validation during bootstrap.
type: 'definition' | 'component' | 'theme'

## `handleLoad(registry: ProjectRegistry, projectId: string): {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

Auto-validates all drafts, then transitions to authoring phase.
Returns validation errors instead of transitioning if any exist.

#### type `ArtifactType`

```ts
type ArtifactType = 'definition' | 'component' | 'theme';
```

## `handleData(registry: ProjectRegistry, projectId: string, params: DataParams): {
    isError: true;
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: Record<string, unknown>;
} | {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

#### interface `DataParams`

- **resource**: `DataResource`
- **action**: `DataAction`
- **name**: `string`
- **options?**: `ChoiceOption[]`
- **expression?**: `string`
- **scope?**: `string`
- **props?**: `InstanceProps`
- **changes?**: `Partial<InstanceProps>`
- **new_name?**: `string`

#### type `DataResource`

```ts
type DataResource = 'choices' | 'variable' | 'instance';
```

#### type `DataAction`

```ts
type DataAction = 'add' | 'update' | 'remove' | 'rename';
```

## `handleFel(registry: ProjectRegistry, projectId: string, params: FelParams): {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

#### interface `FelParams`

- **action**: `FelAction`
- **path?**: `string`
- **expression?**: `string`
- **context_path?**: `string`

#### type `FelAction`

```ts
type FelAction = 'context' | 'functions' | 'check';
```

## `handleFlow(registry: ProjectRegistry, projectId: string, params: FlowParams): {
    isError: true;
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: Record<string, unknown>;
} | {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

#### interface `FlowParams`

- **action**: `FlowAction`
- **mode?**: `'single' | 'wizard' | 'tabs'`
- **props?**: `FlowProps`
- **on?**: `string`
- **paths?**: `BranchPath[]`
- **otherwise?**: `string | string[]`

#### type `FlowAction`

```ts
type FlowAction = 'set_mode' | 'branch';
```

## `handleGuide(registry: ProjectRegistry, mode: 'new' | 'modify', projectId?: string, context?: string): {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

## `handleCreate(registry: ProjectRegistry): ReturnType<typeof successResponse> | ReturnType<typeof errorResponse>`

## `handleOpen(registry: ProjectRegistry, path: string): ReturnType<typeof successResponse> | ReturnType<typeof errorResponse>`

## `handleSave(registry: ProjectRegistry, projectId: string, path?: string): ReturnType<typeof successResponse> | ReturnType<typeof errorResponse>`

## `handleList(registry: ProjectRegistry, includeAutosaved?: boolean, autosaveDir?: string): ReturnType<typeof successResponse>`

## `handlePublish(registry: ProjectRegistry, projectId: string, version: string, summary?: string, path?: string): ReturnType<typeof successResponse> | ReturnType<typeof errorResponse>`

## `handleUndo(registry: ProjectRegistry, projectId: string): ReturnType<typeof successResponse> | ReturnType<typeof errorResponse>`

## `handleRedo(registry: ProjectRegistry, projectId: string): ReturnType<typeof successResponse> | ReturnType<typeof errorResponse>`

## `handleLayout(registry: ProjectRegistry, projectId: string, targets: string | string[], arrangement: LayoutArrangement): {
    isError: true;
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: Record<string, unknown>;
} | {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

## `handleStyle(registry: ProjectRegistry, projectId: string, path: string, properties: Record<string, unknown>): {
    isError: true;
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: Record<string, unknown>;
} | {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

## `handleStyleAll(registry: ProjectRegistry, projectId: string, properties: Record<string, unknown>, target: 'form' | {
    type: 'group' | 'field' | 'display';
} | {
    dataType: string;
}): {
    isError: true;
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: Record<string, unknown>;
} | {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

## `handleDescribe(registry: ProjectRegistry, projectId: string, mode: 'structure' | 'audit', target?: string): {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

## `handleSearch(registry: ProjectRegistry, projectId: string, filter: Partial<ItemFilter>): {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

## `handleTrace(registry: ProjectRegistry, projectId: string, mode: 'trace' | 'changelog', params: {
    expression_or_field?: string;
    from_version?: string;
}): {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

## `handlePreview(registry: ProjectRegistry, projectId: string, mode: 'preview' | 'validate', params: {
    scenario?: Record<string, unknown>;
    response?: Record<string, unknown>;
}): {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

## `handleScreener(registry: ProjectRegistry, projectId: string, params: ScreenerParams): {
    isError: true;
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: Record<string, unknown>;
} | {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

#### interface `ScreenerParams`

- **action**: `ScreenerAction`
- **enabled?**: `boolean`
- **key?**: `string`
- **label?**: `string`
- **type?**: `string`
- **props?**: `FieldProps`
- **condition?**: `string`
- **target?**: `string`
- **message?**: `string`
- **route_index?**: `number`
- **changes?**: `{
        condition?: string;
        target?: string;
        label?: string;
        message?: string;
    }`
- **direction?**: `'up' | 'down'`

#### type `ScreenerAction`

```ts
type ScreenerAction = 'enable' | 'add_field' | 'remove_field' | 'add_route' | 'update_route' | 'reorder_route' | 'remove_route';
```

## `handleField(registry: ProjectRegistry, projectId: string, params: {
    path: string;
    label: string;
    type: string;
    props?: FieldProps;
}): ReturnType<typeof wrapHelperCall>`

## `handleContent(registry: ProjectRegistry, projectId: string, params: {
    path: string;
    body: string;
    kind?: string;
    props?: ContentProps;
}): ReturnType<typeof wrapHelperCall>`

## `handleGroup(registry: ProjectRegistry, projectId: string, params: {
    path: string;
    label: string;
    props?: GroupProps & {
        repeat?: RepeatProps;
    };
}): ReturnType<typeof wrapHelperCall>`

## `handleSubmitButton(registry: ProjectRegistry, projectId: string, label?: string, pageId?: string): {
    isError: true;
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: Record<string, unknown>;
} | {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

## `handlePage(registry: ProjectRegistry, projectId: string, action: 'add' | 'remove' | 'move' | 'list', params: {
    title?: string;
    description?: string;
    page_id?: string;
    direction?: 'up' | 'down';
}): {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

## `handlePlace(registry: ProjectRegistry, projectId: string, params: {
    action: 'place' | 'unplace';
    target: string;
    page_id: string;
    options?: PlacementOptions;
}): ReturnType<typeof wrapHelperCall>`

## `handleUpdate(registry: ProjectRegistry, projectId: string, target: 'item' | 'metadata', params: {
    path?: string;
    changes: ItemChanges | MetadataChanges;
}): {
    isError: true;
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: Record<string, unknown>;
} | {
    structuredContent?: Record<string, unknown> | undefined;
    content: {
        type: "text";
        text: string;
    }[];
}`

## `editMissingAction(): {
    isError: true;
    content: {
        type: "text";
        text: string;
    }[];
    structuredContent: Record<string, unknown>;
}`

Error response when action is missing in non-batch edit mode

## `handleEdit(registry: ProjectRegistry, projectId: string, action: EditAction, params: EditParams): ReturnType<typeof wrapHelperCall>`

#### interface `EditParams`

- **path**: `string`
- **target_path?**: `string`
- **index?**: `number`
- **new_key?**: `string`
- **deep?**: `boolean`

#### type `EditAction`

```ts
type EditAction = 'remove' | 'move' | 'rename' | 'copy';
```

#### interface `StyleParams`

- **action**: `StyleAction`
- **target?**: `string | string[]`
- **arrangement?**: `LayoutArrangement`
- **path?**: `string`
- **properties?**: `Record<string, unknown>`
- **target_type?**: `string`
- **target_data_type?**: `string`

#### type `StyleAction`

```ts
type StyleAction = 'layout' | 'style' | 'style_all';
```

