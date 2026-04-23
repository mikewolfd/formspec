# Core Command Catalog Reference Map

> `schemas/core-commands.schema.json` -- 1152 lines -- Structured catalog of commands for `RawProject.dispatch()` / `Project.dispatch()` in formspec-core

## Overview

This file is a **hybrid JSON Schema and catalog instance**: it declares `$defs` for `CommandEntry`, `PayloadProperty`, and `NodeRef`, embeds the canonical `commands` array (112 entries), and duplicates `version` at the root alongside schema metadata. Consumers (LLM agents, CLI, Studio) use it to discover command `type` strings, payload shapes, `sideEffects`, optional `returns`, and `examples`. Behavioral semantics for definitions, themes, mapping, components, and pages live in the Formspec Core and companion specs; this schema documents the **mutation surface** only, not full document validation (see `definition.schema.json`, `theme.schema.json`, etc.).

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$schema` | string (URI) | No | JSON Schema draft 2020-12 meta-schema reference. |
| `$id` | string (URI) | No | Canonical id: `https://formspec.org/core/commands/0.1`. |
| `title` | string | No | `"Core Command Catalog"`. |
| `description` | string | No | Purpose: catalog for agents, CLI, editors; valid payloads for dispatch. |
| `type` | string | No | Root instance type: `"object"`. |
| `properties` | object | No | Subschema describing valid catalog document keys (`version`, `commands`). |
| `$defs` | object | No | Definitions: `PayloadProperty`, `NodeRef`, `CommandEntry`. |
| `version` | const `"0.1"` | No | Embedded catalog format version (same as `properties.version`). |
| `commands` | array of `CommandEntry` | No | Embedded list of all command entries. |

### `properties` (instance shape)

| Property | Type | Required | Description |
|---|---|---|---|
| `version` | const `"0.1"` | No | Not listed in root `required`; semantically required for a valid catalog. |
| `commands` | array (`$ref: #/$defs/CommandEntry`) | No | Ordered command definitions; semantically required. |

## Command catalog by area

Counts match the embedded `commands` array (112 total, 15 `area` values). There is **no** `definition-screener` area in this schema version.

### definition-items (6)

| Command | Description | Returns (extra) |
|---|---|---|
| `definition.addItem` | Add field, group, or display item. | `insertedPath` |
| `definition.deleteItem` | Remove item and subtree; cascades binds/components. | -- |
| `definition.renameItem` | Rename key; FEL/path cascade. | `newPath` |
| `definition.moveItem` | Reparent or reindex. | `newPath` |
| `definition.reorderItem` | Move among siblings (`direction`). | -- |
| `definition.duplicateItem` | Deep copy after original. | `insertedPath` |

### definition-binds (5)

| Command | Description |
|---|---|
| `definition.setBind` | Set bind properties on a field path; creates bind if missing. |
| `definition.setItemProperty` | Set arbitrary item property (dotted paths). |
| `definition.setFieldDataType` | Change field `dataType`. |
| `definition.setFieldOptions` | Inline options array or named option set string. |
| `definition.setItemExtension` | Set/remove `x-` extension on item. |

### definition-metadata (1)

| Command | Description |
|---|---|
| `definition.setFormTitle` | Set form title. |

### definition-pages (3)

| Command | Description |
|---|---|
| `definition.setDefinitionProperty` | Top-level definition metadata properties. |
| `definition.setFormPresentation` | Presentation keys (`pageMode`, `labelPosition`, …). |
| `definition.setGroupRef` | Group subform `ref` / `keyPrefix`. |

### definition-shapes (5)

| Command | Description |
|---|---|
| `definition.addShape` | Cross-field validation shape. |
| `definition.setShapeProperty` | Update shape property. |
| `definition.setShapeComposition` | `and` / `or` / `xone` / `not` composition. |
| `definition.renameShape` | Rename shape id; updates composition refs. |
| `definition.deleteShape` | Remove shape by id. |

### definition-variables (3)

| Command | Description |
|---|---|
| `definition.addVariable` | Named FEL variable. |
| `definition.setVariable` | Update variable property. |
| `definition.deleteVariable` | Remove variable. |

### definition-optionsets (3)

| Command | Description |
|---|---|
| `definition.setOptionSet` | Create/update named option set. |
| `definition.deleteOptionSet` | Remove option set. |
| `definition.promoteToOptionSet` | Inline options → shared set + reference. |

### definition-instances (4)

| Command | Description |
|---|---|
| `definition.addInstance` | External data instance. |
| `definition.setInstance` | Update instance property. |
| `definition.renameInstance` | Rename; updates `@instance()` refs. |
| `definition.deleteInstance` | Remove instance. |

### definition-migrations (7)

| Command | Description |
|---|---|
| `definition.addMigration` | Version migration entry. |
| `definition.deleteMigration` | Remove by `fromVersion`. |
| `definition.setMigrationProperty` | Update migration property. |
| `definition.addFieldMapRule` | Field map rule on migration. |
| `definition.setFieldMapRule` | Update rule property. |
| `definition.deleteFieldMapRule` | Remove rule by index. |
| `definition.setMigrationDefaults` | Default values map for new fields. |

### theme (17)

| Command | Description |
|---|---|
| `theme.setToken` | Single token path (dot-delimited). |
| `theme.setTokens` | Replace entire `tokens` object. |
| `theme.setDefaults` | Cascade level 1 defaults. |
| `theme.addSelector` | Cascade level 2 selector. |
| `theme.setSelector` | Update selector by index. |
| `theme.deleteSelector` | Remove selector. |
| `theme.reorderSelector` | Selector order / priority. |
| `theme.setItemOverride` | Per-item presentation (level 3). |
| `theme.deleteItemOverride` | Clear all overrides for item. |
| `theme.setItemStyle` | Style on item override. |
| `theme.setItemWidgetConfig` | Widget config on item override. |
| `theme.setItemAccessibility` | A11y on item override. |
| `theme.setBreakpoint` | Named viewport breakpoint. |
| `theme.setStylesheets` | Replace stylesheet URL list. |
| `theme.setDocumentProperty` | Top-level theme property. |
| `theme.setExtension` | Theme document extension (`x-`). |
| `theme.setTargetCompatibility` | Semver range for target definition. |

### mapping (16)

| Command | Description |
|---|---|
| `mapping.setProperty` | Top-level mapping doc property. |
| `mapping.setTargetSchema` | Target schema property. |
| `mapping.addRule` | Add mapping rule. |
| `mapping.setRule` | Update rule property. |
| `mapping.deleteRule` | Delete rule by index. |
| `mapping.reorderRule` | Rule order. |
| `mapping.setAdapter` | Output adapter `format` + `config`. |
| `mapping.setDefaults` | Output defaults object. |
| `mapping.autoGenerateRules` | Generate rules from definition. |
| `mapping.setExtension` | Mapping doc extension. |
| `mapping.setRuleExtension` | Extension on one rule. |
| `mapping.addInnerRule` | Nested inner rule. |
| `mapping.setInnerRule` | Update inner rule. |
| `mapping.deleteInnerRule` | Remove inner rule. |
| `mapping.reorderInnerRule` | Inner rule order. |
| `mapping.preview` | Run rules on sample data (read-only). |

### component-tree (7)

| Command | Description | Returns (extra) |
|---|---|---|
| `component.addNode` | Add tree node under `parent` ref. | `nodeRef` |
| `component.deleteNode` | Remove subtree. | -- |
| `component.moveNode` | Reparent / reindex. | -- |
| `component.reorderNode` | Sibling reorder. | -- |
| `component.duplicateNode` | Deep copy. | `nodeRef` |
| `component.wrapNode` | Insert wrapper container. | `nodeRef` |
| `component.unwrapNode` | Remove one wrapper level. | -- |

### component-properties (17)

| Command | Description |
|---|---|
| `component.setNodeProperty` | Arbitrary node property. |
| `component.setNodeType` | Change component type; optional `preserveProps`. |
| `component.setNodeStyle` | Style property. |
| `component.setNodeAccessibility` | A11y property. |
| `component.spliceArrayProp` | Array splice on node property. |
| `component.setFieldWidget` | Widget by field key. |
| `component.setResponsiveOverride` | Breakpoint patch. |
| `component.setGroupRepeatable` | Group repeatable flag. |
| `component.setGroupDisplayMode` | Group display mode. |
| `component.setGroupDataTable` | Data table config for repeatable group. |
| `component.registerCustom` | Custom component template. |
| `component.updateCustom` | Update template. |
| `component.deleteCustom` | Remove template. |
| `component.renameCustom` | Rename template. |
| `component.setToken` | Tier-3 token on component document. |
| `component.setBreakpoint` | Document-level breakpoint. |
| `component.setDocumentProperty` | Top-level component doc property. |

### pages (13)

| Command | Description |
|---|---|
| `pages.addPage` | Add `Page` node; may promote to wizard. |
| `pages.deletePage` | Remove page by id. |
| `pages.setMode` | `single` / `wizard` / `tabs`. |
| `pages.reorderPages` | Page sibling order. |
| `pages.movePageToIndex` | Absolute page index. |
| `pages.setPageProperty` | Arbitrary page node property. |
| `pages.assignItem` | Move bound item onto page. |
| `pages.unassignItem` | Remove item from page to root. |
| `pages.autoGenerate` | Pages from definition layout hints. |
| `pages.setPages` | Replace all pages. |
| `pages.reorderRegion` | Region order within page. |
| `pages.renamePage` | Page title (`newId` described as new title in schema). |
| `pages.setRegionProperty` | `span` / `start` / `responsive` on region. |

### project (5)

| Command | Description |
|---|---|
| `project.import` | Replace artifacts; clears history. |
| `project.importSubform` | Import external definition into group. |
| `project.loadRegistry` | Load extension registry. |
| `project.removeRegistry` | Unload registry by URL. |
| `project.publish` | Versioned release / changelog. |

### Counts by area

| Area | Count |
|---|---|
| definition-items | 6 |
| definition-binds | 5 |
| definition-metadata | 1 |
| definition-pages | 3 |
| definition-shapes | 5 |
| definition-variables | 3 |
| definition-optionsets | 3 |
| definition-instances | 4 |
| definition-migrations | 7 |
| theme | 17 |
| mapping | 16 |
| component-tree | 7 |
| component-properties | 17 |
| pages | 13 |
| project | 5 |
| **Total** | **112** |

## Key Type Definitions ($defs)

| Definition | Description | Key properties | Used by |
|---|---|---|---|
| **PayloadProperty** | One named parameter in a command payload object. | See table below | `CommandEntry.payload[]` |
| **NodeRef** | Component node address: field bind and/or node id. | `bind`, `nodeId` | Described on `component.*` / `pages.*` payload props typed as `object` (not a formal `$ref` from `CommandEntry`). |
| **CommandEntry** | Single catalog command: discriminant, area, docs, payload schema, effects, returns, examples. | `type`, `area`, `description`, `payload`, `sideEffects`, `returns`, `examples` | Root `commands[]` |

### PayloadProperty

| Property | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Payload object key. |
| `type` | string | Yes | Annotation (e.g. `string`, `object`, `any`, or union such as array plus string). |
| `description` | string | No | Human-readable parameter description. |
| `required` | boolean | No | Whether callers must supply the property (default `false`). |
| `enum` | array of string | No | Allowed string literals when present. |
| `default` | any | No | Default if omitted (JSON Schema `default` on property). |

### CommandEntry

| Property | Type | Required | Description |
|---|---|---|---|
| `type` | string | Yes | Command discriminant for `dispatch({ type, payload })`. |
| `area` | string (enum) | Yes | Handler grouping; see Enums. |
| `description` | string | Yes | What the command does. |
| `payload` | array of `PayloadProperty` | Yes | Ordered parameter documentation. |
| `sideEffects` | array of string (enum) | No | Post-execution effects. |
| `returns` | object | No | Extra result fields (string values only); keys are names, values are descriptions. |
| `examples` | array | No | Example `{ command, note? }` objects. |

### CommandEntry.examples[] items

| Property | Type | Required | Description |
|---|---|---|---|
| `command` | object | Yes | Example command (typically `type` + `payload`). |
| `note` | string | No | Explanatory note. |

### NodeRef

| Property | Type | Required | Description |
|---|---|---|---|
| `bind` | string | No | Field key for bound nodes. |
| `nodeId` | string | No | Id for unbound layout nodes. |

## Required Fields

- **CommandEntry:** `type`, `area`, `description`, `payload`
- **PayloadProperty:** `name`, `type`
- **CommandEntry.examples[]:** `command`
- **Root catalog object:** the schema’s `properties` object does **not** include a `required` array; validators that only apply `properties` may not mark `version` / `commands` required -- treat them as required for real catalogs.

Per-command required payload parameters are indicated by `PayloadProperty.required: true` on each catalog entry (see embedded JSON for the authoritative list).

## Enums and Patterns

| Property path | Kind | Values / pattern | Description |
|---|---|---|---|
| `CommandEntry.area` | enum | `definition-items`, `definition-binds`, `definition-metadata`, `definition-pages`, `definition-shapes`, `definition-variables`, `definition-optionsets`, `definition-instances`, `definition-migrations`, `theme`, `mapping`, `pages`, `component-tree`, `component-properties`, `project` | Handler module grouping. |
| `CommandEntry.sideEffects[]` | enum | `rebuildComponentTree`, `clearHistory` | After successful command. |
| `definition.addItem` payload `type` | enum | `field`, `group`, `display` | Item kind. |
| `definition.reorderItem` payload `direction` | enum | `up`, `down` | Sibling direction. |
| `definition.addShape` payload `severity` | enum | `error`, `warning`, `info` | Shape severity. |
| `definition.addShape` payload `timing` | enum | `continuous`, `submit`, `demand` | When shape runs. |
| `definition.setShapeComposition` payload `mode` | enum | `and`, `or`, `xone`, `not` | Composition operator. |
| `theme.reorderSelector` payload `direction` | enum | `up`, `down` | Selector list order. |
| `mapping.reorderRule` payload `direction` | enum | `up`, `down` | Rule list order. |
| `mapping.reorderInnerRule` payload `direction` | enum | `up`, `down` | Inner rule order. |
| `mapping.preview` payload `direction` | enum | `forward`, `reverse` | Preview direction (optional). |
| `pages.setMode` payload `mode` | enum | `single`, `wizard`, `tabs` | Page presentation mode. |
| `pages.reorderPages` payload `direction` | enum | `up`, `down` | Page sibling direction. |
| `pages.setRegionProperty` payload `property` | enum | `span`, `start`, `responsive` | Region property key. |
| `component.reorderNode` payload `direction` | enum | `up`, `down` | Node sibling direction. |

No `pattern` constraints appear in this schema file.

## Cross-References

- **Dispatch API:** `Project.dispatch()` / `RawProject.dispatch()` in formspec-core; `type` + `payload` match catalog entries.
- **Normative documents:** Core definition (items, binds, shapes, variables, instances, migrations), Theme, Mapping, Component tree, Pages / presentation -- spec sections define field/bind/FEL semantics; this file only lists mutating commands.
- **JSON `$ref`:** Internal only: `commands.items` → `#/$defs/CommandEntry`; `CommandEntry.payload.items` → `#/$defs/PayloadProperty`. No `$ref` to other schema files.
- **Registry:** `project.loadRegistry` payload references registry document shape in descriptions.

## Extension Points

- **NodeRef:** No `additionalProperties: false`; only `bind` and `nodeId` are declared -- extra keys are not ruled out by schema (runtime may still reject).
- **CommandEntry.returns:** `additionalProperties: { "type": "string" }` -- map of result field name → description string.
- **CommandEntry.examples[].command:** `type: object` with no `properties` -- arbitrary example structure.
- **PayloadProperty.default:** untyped in JSON Schema (no `type` keyword) -- any JSON value allowed in schema instance data.

## Validation Constraints

- **Root `type`:** `"object"`.
- **`properties.version`:** `const` `"0.1"` (root embedded `version` matches).
- **`PayloadProperty`:** `additionalProperties: false`; required `name`, `type`.
- **`CommandEntry`:** `additionalProperties: false`; required `type`, `area`, `description`, `payload`.
- **No `if` / `then` / `else`** polymorphism in schema keywords.
- **Defaults:** `PayloadProperty.properties.required.default` is `false`; `component.setNodeType` payload documents `preserveProps` default `false` in catalog text.
- **Null semantics:** Many payload descriptions use “Null to remove.” **`definition.setShapeProperty`** assigns `value` onto the shape record as-is (`packages/formspec-core/src/handlers/definition-shapes.ts`), so `null` sets a property to `null` rather than deleting it; removing a shape uses **`definition.deleteShape`**.
- **`sideEffects`:** `rebuildComponentTree` on structural definition/component/pages changes and some imports; `clearHistory` on `project.import` (with `rebuildComponentTree`).
- **`mapping.preview`:** Described as non-mutating; returns `output`, `diagnostics`, `appliedRules`, `direction` per `returns` map.
