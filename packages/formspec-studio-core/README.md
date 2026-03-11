# formspec-studio-core

Pure TypeScript library for creating and editing Formspec artifact bundles. Every edit is a serializable command dispatched against a `Project` instance.

This package is the authoring core for Formspec Studio and other tooling. It manages four editable artifacts together:

- `definition` for form structure and behavior
- `component` for UI tree and widget configuration
- `theme` for presentation and cascade rules
- `mapping` for inbound and outbound data transforms

It has no framework bindings, no singleton state, and no UI concerns.

## Install

```bash
npm install formspec-studio-core
```

Runtime dependency: `formspec-engine`

## Quick Start

```ts
import { createProject } from 'formspec-studio-core';

const project = createProject();

project.dispatch({
  type: 'definition.setFormTitle',
  payload: { title: 'Eligibility Intake' },
});

project.batch([
  {
    type: 'definition.addItem',
    payload: {
      type: 'field',
      key: 'fullName',
      label: 'Full name',
      dataType: 'string',
    },
  },
  {
    type: 'definition.addItem',
    payload: {
      type: 'field',
      key: 'age',
      label: 'Age',
      dataType: 'integer',
    },
  },
  {
    type: 'definition.setBind',
    payload: {
      path: 'age',
      properties: {
        required: true,
        constraint: '$age >= 18',
        constraintMessage: 'Must be 18 or older',
      },
    },
  },
]);

console.log(project.fieldPaths());
console.log(project.bindFor('age'));

const bundle = project.export();
```

## Core Model

`createProject()` returns a `Project` that owns a full `ProjectState`:

```ts
interface ProjectState {
  definition: FormspecDefinition;
  component: FormspecComponentDocument;
  theme: FormspecThemeDocument;
  mapping: FormspecMappingDocument;
  extensions: ExtensionsState;
  versioning: VersioningState;
}
```

The important rule is simple: read through `project.state` and query helpers, mutate only through commands.

Every dispatch follows the same flow:

1. Clone current state
2. Apply the command handler to the clone
3. Run cross-artifact normalization
4. Push history
5. Notify subscribers

That gives you atomic edits, undo/redo, command logs, and easy replay.

## Public API

The main surface is intentionally small:

- `createProject(options?)`
- `project.dispatch(command)`
- `project.batch(commands)`
- `project.undo()` / `project.redo()`
- `project.onChange(listener)`
- `project.export()`

Useful query helpers include:

- `fieldPaths()`
- `itemAt(path)`
- `bindFor(path)`
- `componentFor(fieldKey)`
- `effectivePresentation(fieldKey)`
- `searchItems(filter)`
- `parseFEL(expression)`
- `availableReferences(contextPath?)`
- `allExpressions()`
- `dependencyGraph()`
- `fieldDependents(fieldPath)`
- `diagnose()`
- `previewChangelog()`

## Command Model

Commands are plain serializable objects:

```ts
{
  type: 'definition.addItem',
  payload: {
    type: 'field',
    key: 'email',
    label: 'Email',
    dataType: 'string',
  },
}
```

Built-in command areas currently include:

- `definition.*` for items, binds, shapes, variables, option sets, instances, pages, screener, migrations, and metadata
- `component.*` for component tree structure and node properties
- `theme.*` for tokens, defaults, selectors, item overrides, pages, breakpoints, and stylesheets
- `mapping.*` for mapping rules and document-level mapping configuration
- `project.*` for whole-project import, subform import, registry loading, and publishing

Handlers self-register at module load time. Consumers usually do not interact with handlers directly; `Project` dispatch does that for you.

## History And Subscriptions

Each `Project` instance maintains its own undo stack, redo stack, and append-only command log.

```ts
const unsubscribe = project.onChange((state, event) => {
  console.log(event.source, event.command.type, event.result);
});

project.dispatch({
  type: 'definition.setFormTitle',
  payload: { title: 'Updated title' },
});

project.undo();
unsubscribe();
```

`batch()` groups multiple commands into one notification and one undo entry.

## Diagnostics And Analysis

`formspec-studio-core` is not just a mutator. It also exposes authoring-time analysis helpers:

- `diagnose()` for grouped structural, expression, extension, and consistency diagnostics
- `parseFEL()` for inline expression validation
- `availableReferences()` and `felFunctionCatalog()` for editor autocomplete
- `allDataTypes()` and `browseExtensions()` for registry-aware tooling
- `dependencyGraph()`, `fieldDependents()`, and `variableDependents()` for impact analysis
- `previewChangelog()` and `diffFromBaseline()` for versioning workflows

## Development

```bash
npm run build
npm run test
```

Package-local references:

- [API.llm.md](./API.llm.md)
- [api-spec-v3.md](./research/api-spec-v3.md)
