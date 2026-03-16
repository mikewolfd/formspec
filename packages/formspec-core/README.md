# formspec-core

Raw project state management for Formspec. Command dispatch, handler pipeline, undo/redo, cross-artifact normalization, and diagnostics.

This package owns the `RawProject` class (implementing `IProjectCore`) and the full handler registry -- 122 commands across definition, component, theme, mapping, and project areas. It is the foundation that `formspec-studio-core` composes over.

It manages four editable artifacts:

- `definition` -- form structure and behavior (items, binds, shapes, variables)
- `component` -- UI tree and widget configuration
- `theme` -- presentation tokens and cascade rules
- `mapping` -- bidirectional data transforms

## Install

```bash
npm install formspec-core
```

Runtime dependencies: `formspec-engine`, `formspec-types`, `ajv`

## Quick Start

```ts
import { createRawProject } from 'formspec-core';

const project = createRawProject();

project.dispatch({
  type: 'definition.setFormTitle',
  payload: { title: 'Eligibility Intake' },
});

project.batch([
  {
    type: 'definition.addItem',
    payload: { type: 'field', key: 'fullName', label: 'Full name', dataType: 'string' },
  },
  {
    type: 'definition.setBind',
    payload: { path: 'fullName', properties: { required: true } },
  },
]);

console.log(project.fieldPaths());   // ['fullName']
console.log(project.bindFor('fullName'));

const bundle = project.export();
```

## IProjectCore

The `IProjectCore` interface is the seam between this package and `formspec-studio-core`. It defines the full public API surface:

**Command dispatch:**
`dispatch(command)`, `batch(commands)`, `batchWithRebuild(phase1, phase2)`

**State getters:**
`state`, `definition`, `component`, `theme`, `mapping`, `artifactComponent`, `generatedComponent`

**History:**
`undo()`, `redo()`, `canUndo`, `canRedo`, `log`, `resetHistory()`

**Queries:**
`fieldPaths()`, `itemAt(path)`, `searchItems(filter)`, `statistics()`, `bindFor(path)`, `componentFor(key)`, `effectivePresentation(key)`, `unboundItems()`, `resolveToken(key)`, `resolveExtension(name)`, `allDataTypes()`, `instanceNames()`, `variableNames()`, `optionSetUsage(name)`, `listRegistries()`, `browseExtensions(filter?)`, `responseSchemaRows()`

**FEL & expressions:**
`parseFEL(expression, context?)`, `felFunctionCatalog()`, `availableReferences(context?)`, `allExpressions()`, `expressionDependencies(expression)`, `fieldDependents(fieldPath)`, `variableDependents(variableName)`, `dependencyGraph()`

**Diagnostics & versioning:**
`diagnose()`, `diffFromBaseline(fromVersion?)`, `previewChangelog()`, `export()`

## Command Dispatch Flow

Every `dispatch()` follows the same pipeline:

1. Run middleware chain (may transform or reject)
2. Clone state and apply the command handler
3. Rebuild component tree (if handler signals structural change)
4. Run cross-artifact normalization
5. Push history snapshot
6. Notify subscribers

`batch()` groups multiple commands into one undo entry and one notification.

## Command Catalog

122 commands across 15 handler areas:

| Area | Commands | Description |
|------|----------|-------------|
| `definition.*` | 48 | Items, binds, shapes, variables, option sets, instances, pages, screener, migrations, metadata |
| `component.*` | 25 | Component tree structure, node properties, custom components, responsive overrides |
| `theme.*` | 28 | Tokens, defaults, selectors, item overrides, pages, grid regions, breakpoints, stylesheets |
| `mapping.*` | 16 | Rules, inner rules, adapter config, preview, extensions |
| `project.*` | 5 | Import, subform import, registry loading, publishing |

## Development

## Command Catalog Schema

The full command catalog -- every type string, payload shape, and side effect -- is machine-readable at [`schemas/core-commands.schema.json`](../../schemas/core-commands.schema.json). LLM agents and CLI tools can consume this catalog to discover and construct valid commands.

```bash
npm run build        # tsc
npm run test         # vitest run (425 tests)
npm run test:watch   # vitest
```
