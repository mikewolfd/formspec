# Definition Schema Reference Map

> schemas/definition.schema.json -- 1635 lines -- Formspec Definition document per v1.0 specification

## Overview

The Definition schema describes a complete, self-contained JSON document that defines the structure, behavior, and constraints of a data-collection instrument (a form). It is the foundational Tier 1 artifact in Formspec: every form starts here. The tuple `(url, version)` uniquely identifies a Definition across all systems. Definitions are organized into three layers: Structure (`items`), Behavior (`binds` + `shapes`), and Presentation (advisory `formPresentation` and per-item `presentation`). Conformant processors implement a four-phase processing cycle: Rebuild, Recalculate, Revalidate, Notify. Normative semantics live in the Formspec Core (Definition) specification; FEL grammar and bind evaluation are defined in the FEL specification.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspec` | `string` (const `"1.0"`) | Yes | Definition specification version pin. MUST be `"1.0"`. |
| `url` | `string` (format: `uri`) | Yes | Canonical URI of the logical form; stable across versions. Combined with `version` for immutable identity. Referenced by Responses via `definitionUrl`. |
| `version` | `string` (minLength: 1) | Yes | Version identifier of this document. Interpretation governed by `versionAlgorithm` (default `semver`). Active definitions are immutable. |
| `versionAlgorithm` | `string` (enum) | No | How `version` strings are interpreted and compared. Default: `semver`. |
| `status` | `string` (enum) | Yes | Lifecycle: `draft` → `active` → `retired`. Backward transitions forbidden for the same version. |
| `derivedFrom` | `oneOf`: URI `string` OR `object` `{ url, version? }` | No | Parent definition (informational only; no behavioral inheritance). String = logical form URI; object pins `url` and optional `version`. |
| `name` | `string` (pattern: `^[a-zA-Z][a-zA-Z0-9\-]*$`) | No | Machine-readable short name for tooling; not globally unique. |
| `title` | `string` | Yes | Human-readable definition title for authoring and rendering. |
| `description` | `string` | No | Human-readable purpose and scope of the form. |
| `date` | `string` (format: `date`) | No | Publication or last-modified date (ISO 8601 `YYYY-MM-DD`). |
| `items` | `array` of `$ref: #/$defs/Item` | Yes | Root item tree: fields, groups, and display nodes. Determines Instance (response) shape. |
| `binds` | `array` of `$ref: #/$defs/Bind` | No | Reactive FEL binds by data path (calculate, relevant, required, readonly, constraint, default, etc.). |
| `shapes` | `array` of `$ref: #/$defs/Shape` | No | Named cross-field / form-level validation (SHACL-style composition). |
| `instances` | `object` (additionalProperties: `$ref: #/$defs/Instance`) | No | Named secondary data for FEL `@instance('name')`. Property names are instance identifiers. |
| `variables` | `array` of `$ref: #/$defs/Variable` | No | Named computed values; referenced as `@name` in FEL. Lexical scoping via `scope`. |
| `nonRelevantBehavior` | `string` (enum) | No | Form-wide default for non-relevant nodes in submitted data. Default: `remove`. Per-bind override on `Bind.nonRelevantBehavior`. |
| `optionSets` | `object` (additionalProperties: `$ref: #/$defs/OptionSet`) | No | Named reusable option lists; referenced by Field `optionSet`. |
| `migrations` | `$ref: #/$defs/Migrations` | No | How to transform Responses from prior versions into this version. |
| `extensions` | `object` (propertyNames: `^x-`) | No | Domain extension data; keys MUST be `x-` prefixed; processors ignore unknown keys. |
| `formPresentation` | `object` (see below) | No | Form-wide Tier 1 presentation hints; advisory only. `additionalProperties: false`. |

The root object has `additionalProperties: false`.

### formPresentation Sub-Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `pageMode` | enum | `single` | `single`, `wizard`, or `tabs`. Unsupported modes SHOULD fall back to `single`. |
| `labelPosition` | enum | `top` | `top`, `start`, or `hidden` (hidden still requires accessible markup). |
| `density` | enum | `comfortable` | `compact`, `comfortable`, or `spacious`. |
| `defaultCurrency` | `string` (pattern `^[A-Z]{3}$`) | -- | ISO 4217 default for money fields without `currency`. |
| `direction` | enum | `ltr` | `ltr`, `rtl`, or `auto` (RTL locales from active locale). |
| `showProgress` | `boolean` | `true` | Wizard: show step progress. |
| `allowSkip` | `boolean` | `false` | Wizard: allow forward navigation without validating current page. |
| `sidenav` | `boolean` | `false` | Wizard: vertical side nav vs horizontal progress. |
| `defaultTab` | `integer` (minimum: 0) | `0` | Tabs: zero-based initial tab index. |
| `tabPosition` | enum | `top` | `top`, `bottom`, `left`, or `right` (tab bar position). |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties | Used By |
|---|---|---|---|
| **Item** | Structural tree node; polymorphic by `type` (`group`, `field`, `display`) via `allOf` + `if`/`then`. | Base: `key`, `type`, `label`, `description`, `hint`, `labels`, `extensions`. Group: `children`, `repeatable`, `minRepeat`, `maxRepeat`, `$ref`, `keyPrefix`, `presentation`. Field: `dataType`, `currency`, `precision`, `prefix`, `suffix`, `options`, `optionSet`, `initialValue`, `semanticType`, `prePopulate`, `children`, `presentation`. Display: `presentation`. | `properties.items` (root array); Group `children`; Field `children` (recursive `$ref`) |
| **Bind** | Behavioral FEL attachment to one or more nodes by `path`. | `path`, `calculate`, `relevant`, `required`, `readonly`, `constraint`, `constraintMessage`, `default`, `whitespace`, `excludedValue`, `nonRelevantBehavior`, `disabledDisplay`, `extensions` | `properties.binds` |
| **Shape** | Named validation shape; requires one of `constraint`, `and`, `or`, `not`, `xone` (`anyOf`). | `id`, `target`, `severity`, `constraint`, `message`, `code`, `context`, `activeWhen`, `timing`, `and`, `or`, `not`, `xone`, `extensions` | `properties.shapes` |
| **Instance** | Secondary data; FEL `@instance('name')`. Requires `source` and/or `data` (`anyOf`). | `description`, `source`, `static`, `data`, `schema`, `readonly`, `extensions` | `properties.instances` (values of map) |
| **Variable** | Scoped computed value; `@name` in FEL. | `name`, `expression`, `scope`, `extensions` | `properties.variables` |
| **OptionSet** | Reusable options; requires `options` and/or `source` (`anyOf`). | `options`, `source`, `valueField`, `labelField`, `extensions` | `properties.optionSets` (values of map) |
| **OptionEntry** | One choice value. | `value`, `label`, `keywords`, `extensions` | `OptionSet.options`; Field `options` when inline array |
| **Migrations** | Version migration container. | `from`, `extensions` | `properties.migrations` |
| **MigrationDescriptor** | Rules from one prior version. | `description`, `fieldMap`, `defaults`, `extensions` | `Migrations.from` (map values) |
| **Presentation** | Tier 1 per-item presentation hints; `additionalProperties: true` at root; nested objects closed. | `widgetHint`, `layout`, `styleHints`, `accessibility` | Group / Field / Display `presentation` |
| **FELExpression** | FEL v1.0 expression string. | `type: string`, `minLength: 1` | `Bind` FEL slots; `Shape.constraint`, `activeWhen`, `context` values; `Variable.expression`; `MigrationDescriptor.fieldMap[].expression` |

### Item -- Type-Specific Properties (schema `if` / `then`)

| `type` | Required beyond base | Allowed extras | Constraints |
|---|---|---|---|
| `group` | -- | `children`, `repeatable`, `minRepeat`, `maxRepeat`, `$ref`, `keyPrefix`, `presentation` | `anyOf`: must have `children` OR `$ref`. `additionalProperties: false` in `then`. |
| `field` | `dataType` | `currency`, `precision`, `prefix`, `suffix`, `options`, `optionSet`, `initialValue`, `semanticType`, `prePopulate`, `children`, `presentation` | Nested `if/then`: `currency` only when `dataType` is `money`; `precision` only `decimal` or `money`; `options` / `optionSet` only `choice` or `multiChoice`. |
| `display` | -- | `presentation` only (plus common base fields) | `additionalProperties: false` in `then`. |

### Presentation -- Nested Objects

**layout** (`additionalProperties: false`): `flow` (enum `stack`, `grid`, `inline`; default `stack`), `columns` (1–12), `colSpan` (1–12), `newRow`, `collapsible`, `collapsedByDefault`, `page` (string, minLength 1).

**styleHints** (`additionalProperties: false`): `emphasis` (`primary`, `success`, `warning`, `danger`, `muted`), `size` (`compact`, `default`, `large`; default `default`).

**accessibility** (`additionalProperties: false`): `role`, `description`, `liveRegion` (`off`, `polite`, `assertive`; default `off`).

## Required Fields

### Definition root
- `$formspec`, `url`, `version`, `status`, `title`, `items`

### Item (all types)
- `key`, `type`, `label`

### Item (`type`: `"field"`)
- `dataType`

### Item (`type`: `"group"`)
- `anyOf`: `children` OR `$ref`

### Bind
- `path`

### Shape
- `id`, `target`, `message`
- `anyOf`: at least one of `constraint`, `and`, `or`, `not`, `xone`

### Instance
- `anyOf`: `source` OR `data`

### Variable
- `name`, `expression`

### OptionSet
- `anyOf`: `options` OR `source`

### OptionEntry
- `value`, `label`

### MigrationDescriptor.fieldMap entries
- `source`, `target`, `transform`

### Field `prePopulate`
- `instance`, `path`

### `derivedFrom` (object form)
- `url`

## Enums and Patterns

| Property Path | Type | Values / Pattern | Description |
|---|---|---|---|
| `$formspec` | const | `1.0` | Version pin. |
| `name` | pattern | `^[a-zA-Z][a-zA-Z0-9\-]*$` | Top-level short name. |
| `versionAlgorithm` | enum | `semver`, `date`, `integer`, `natural` | Version comparison algorithm. |
| `status` | enum | `draft`, `active`, `retired` | Definition lifecycle. |
| `Item.key` | pattern | `^[a-zA-Z][a-zA-Z0-9_]*$` | Unique item key across definition. |
| `Item.type` | enum | `group`, `field`, `display` | Item kind. |
| `Field.dataType` | enum | `string`, `text`, `integer`, `decimal`, `boolean`, `date`, `dateTime`, `time`, `uri`, `attachment`, `choice`, `multiChoice`, `money` | Field value type. |
| `Field.currency` | pattern | `^[A-Z]{3}$` | ISO 4217 when `dataType` is `money`. |
| `Group.keyPrefix` | pattern | `^[a-zA-Z][a-zA-Z0-9_]*$` | Prefix for keys imported via `$ref`. |
| `nonRelevantBehavior` (top-level) | enum | `remove`, `empty`, `keep` | Serialized response behavior for non-relevant nodes; default `remove`. |
| `formPresentation.pageMode` | enum | `single`, `wizard`, `tabs` | Pagination mode; default `single`. |
| `formPresentation.labelPosition` | enum | `top`, `start`, `hidden` | Default field labels; default `top`. |
| `formPresentation.density` | enum | `compact`, `comfortable`, `spacious` | Layout density; default `comfortable`. |
| `formPresentation.defaultCurrency` | pattern | `^[A-Z]{3}$` | Default money currency. |
| `formPresentation.direction` | enum | `ltr`, `rtl`, `auto` | Text direction; default `ltr`. |
| `formPresentation.tabPosition` | enum | `top`, `bottom`, `left`, `right` | Tab bar placement; default `top`. |
| `Bind.whitespace` | enum | `preserve`, `trim`, `normalize`, `remove` | Text normalization before storage/validation; default `preserve`. |
| `Bind.excludedValue` | enum | `preserve`, `null` | FEL visibility when non-relevant; default `preserve`. |
| `Bind.nonRelevantBehavior` | enum | `remove`, `empty`, `keep` | Per-path override of definition default. |
| `Bind.disabledDisplay` | enum | `hidden`, `protected` | Presentation when non-relevant; default `hidden`. |
| `Shape.id` | pattern | `^[a-zA-Z][a-zA-Z0-9_\-]*$` | Unique shape id within definition. |
| `Shape.severity` | enum | `error`, `warning`, `info` | Validation severity; default `error`. |
| `Shape.timing` | enum | `continuous`, `submit`, `demand` | When shape runs; default `continuous`. |
| `MigrationDescriptor.fieldMap[].transform` | enum | `preserve`, `drop`, `expression` | Migration transform kind. |
| `Presentation.layout.flow` | enum | `stack`, `grid`, `inline` | Child layout; default `stack`. |
| `Presentation.styleHints.emphasis` | enum | `primary`, `success`, `warning`, `danger`, `muted` | Semantic tone. |
| `Presentation.styleHints.size` | enum | `compact`, `default`, `large` | Relative size; default `default`. |
| `Presentation.accessibility.liveRegion` | enum | `off`, `polite`, `assertive` | AT announcement mode; default `off`. |
| `Variable.name` | pattern | `^[a-zA-Z][a-zA-Z0-9_]*$` | Variable identifier for `@name`. |
| `extensions` (all levels) | propertyNames | `^x-` | Extension object keys must match pattern. |
| `FELExpression` | minLength | `1` | Non-empty expression string. |

**Formats:** `uri` -- `url`, `derivedFrom` (string), `derivedFrom.url`, `Group.$ref`, `OptionSet.source`, Field `options` when URI `oneOf` branch; `date` -- top-level `date`; `uri-template` -- `Instance.source`.

## Cross-References

- **Formspec Core (Definition)** -- document identity, `items` tree, `binds` processing model, `shapes`, `instances`, `variables`, `nonRelevantBehavior`, migrations, Tier 1 presentation.
- **FEL specification** -- syntax, functions, null propagation, bind-context defaults for `relevant` / `required` / `readonly` / `constraint`.
- **Theme / Component specs** -- Tier 2/3 presentation overrides; `formPresentation` and `Presentation` are advisory and MUST NOT change data or validation semantics.
- **Response document** -- semantic link: Responses reference a Definition via `definitionUrl` (+ version); not a JSON Schema `$ref` from this file.
- **Annotation** -- `FELExpression.x-lm.ref` points to `schemas/fel-functions.schema.json` (documentation hook; not a schema `$ref`).

**Internal `$ref` targets (all `#/$defs/...` in this file):** `Item`, `Bind`, `Shape`, `Instance`, `Variable`, `OptionSet`, `OptionEntry`, `Migrations`, `MigrationDescriptor`, `Presentation`, `FELExpression`. Recursive: `Item` in `children` (group and field).

## Extension Points

- **`extensions` objects** -- At definition, item, bind, shape, instance, variable, option entry, option set, migrations, and migration-descriptor levels: `propertyNames` pattern `^x-`. Unknown keys ignored; MUST NOT alter core semantics.
- **`Presentation`** -- Root `additionalProperties: true` for forward-compatible hints; `layout`, `styleHints`, `accessibility` use `additionalProperties: false`.
- **`widgetHint`** -- Custom values MUST use `x-` prefix per schema description.

## Validation Constraints

### Root
- `additionalProperties: false` on the definition object.

### `derivedFrom`
- `oneOf`: URI string OR object with `url` (uri), optional `version` (minLength 1), `additionalProperties: false`.

### `Item` polymorphism
- Three `allOf` branches keyed on `type` const `group` | `field` | `display`; each `then` uses `additionalProperties: false`.
- **Group:** `anyOf` requires `children` or `$ref`. When `repeatable`, `minRepeat` ≥ 0, `maxRepeat` ≥ 1 if present, and `maxRepeat` ≥ `minRepeat` (described in prose; partial enforcement via minimums).

### `Field` dataType gates
- `currency` disallowed unless `dataType` is `money`.
- `precision` disallowed unless `dataType` is `decimal` or `money`.
- `options` and `optionSet` disallowed unless `dataType` is `choice` or `multiChoice`.

### `Field.options`
- `oneOf`: array of `OptionEntry` OR URI string (`format: uri`). If both `options` and `optionSet`, `optionSet` wins (per description).

### `Shape`
- `anyOf` on shape body: at least one of `constraint`, `and`, `or`, `not`, `xone`. If `constraint` and a composition operator both present, implicit AND (per description).

### `Instance`, `OptionSet`
- `anyOf` ensures `source` and/or `data` (Instance) and `options` and/or `source` (OptionSet).

### `Migrations`
- `additionalProperties: false`; `from` maps version strings to `MigrationDescriptor`.

### `MigrationDescriptor.fieldMap` entries
- `additionalProperties: false`; `target` may be `string` or `null` (drop). `expression` required when `transform` is `expression`.

### Defaults (selected)
| Location | Property | Default |
|---|---|---|
| Top-level | `versionAlgorithm` | `semver` |
| Top-level | `nonRelevantBehavior` | `remove` |
| Group | `repeatable` | `false` |
| Bind | `whitespace` | `preserve` |
| Bind | `excludedValue` | `preserve` |
| Bind | `disabledDisplay` | `hidden` |
| Shape | `severity` | `error` |
| Shape | `timing` | `continuous` |
| Instance | `static` | `false` |
| Instance | `readonly` | `true` |
| Variable | `scope` | `"#"` |
| OptionSet | `valueField` / `labelField` | `"value"` / `"label"` |
| Field.prePopulate | `editable` | `true` |
| Presentation.layout | `flow`, `newRow`, `collapsible`, `collapsedByDefault` | `stack`, `false`, `false`, `false` |

### Behavioral notes (from descriptions; not all JSON Schema-enforced)
- `status` transitions are one-way per version; `active` content immutable.
- `Item.key` unique across entire definition.
- `Bind.relevant` AND-inherited; `readonly` OR-inherited; `required` and `constraint` not inherited.
- `calculate` implies readonly unless `readonly` is explicitly false.
- Integer/decimal always trim regardless of `Bind.whitespace`.
- `prePopulate` overrides `initialValue` when both set.
- Variables must not form circular dependency graphs.
