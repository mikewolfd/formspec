# Locale Schema Reference Map

> `schemas/locale.schema.json` (`$id`: `https://formspec.org/schemas/locale/1.0`) -- 173 lines -- Formspec Locale Document: internationalized strings for a Definition via URL binding, flat path keys, `{{expression}}` interpolation, and fallback cascade

## Overview

The Locale schema defines a sidecar JSON document that supplies internationalized strings for a Formspec Definition. It binds to a Definition by URL (`targetDefinition`), maps stable path keys to localized string values, allows FEL inside `{{expression}}`, and composes with other locales through explicit `fallback` plus implicit regional-to-base rules and inline defaults. Multiple Locale Documents MAY target the same Definition (one per locale). Normative resolution and cascade behavior live in the Locale specification; this schema constrains document shape only.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecLocale` | `string` (`const`: `"1.0"`) | Yes | Locale specification version. Processors MUST reject documents with an unrecognized version. |
| `url` | `string` (`format`: `uri`) | No | Canonical identifier for this Locale Document. The tuple `(url, version)` SHOULD be globally unique. |
| `version` | `string` (`minLength`: 1) | Yes | Revision of this Locale Document. SemVer is RECOMMENDED. |
| `name` | `string` | No | Machine-friendly short identifier. |
| `title` | `string` | No | Human-readable display name for the document. |
| `description` | `string` | No | Human-readable purpose and audience description. |
| `locale` | `string` (`minLength`: 2, BCP 47 `pattern`; see Enums) | Yes | Language tag for this payload. Processors MUST compare case-insensitively and SHOULD normalize (e.g. lowercase language, title-case region). |
| `fallback` | `string` (`minLength`: 2, same `pattern` as `locale`) | No | Explicit next locale in the cascade when a key is missing. Processors MUST detect circular fallback and terminate with a warning. |
| `targetDefinition` | `$ref` → `https://formspec.org/schemas/component/1.0#/$defs/TargetDefinition` | Yes | Target Definition URL and optional semver range. Version mismatch SHOULD warn; processor MUST NOT fail solely for mismatch. |
| `strings` | `object`: values `string`; `propertyNames` regex (see Enums); no `additionalProperties` key beyond string values | Yes | Path-keyed localized strings; values MAY contain FEL interpolation `{{...}}`. |
| `extensions` | `object`: `propertyNames` `^x-` only | No | Vendor or tooling metadata. Processors MUST ignore unrecognized keys; semantics MUST NOT change resolution. |

The root object has `additionalProperties: false`.

### strings key format

The `strings` object applies `propertyNames.pattern` to every key. Conventions (Locale spec §3.1):

| Key prefix / form | Example | Description |
|---|---|---|
| `<itemKey>.<property>` | `projectName.label` | Item label, description, hint, etc. |
| `<itemKey>.<property>@<context>` | `budgetSection.label@short` | Context-specific variants |
| `<itemKey>.options.<value>.label` | `fundingStatus.options.yes.label` | Inline choice labels |
| `<itemKey>.errors.<CODE>` | `email.errors.REQUIRED` | Validation messages by code |
| `<itemKey>.constraintMessage` / `requiredMessage` | `ssn.constraintMessage` | Bind messages |
| `$form.<property>` | `$form.title` | Form-level strings |
| `$shape.<id>.message` | `$shape.budget-balance.message` | Shape messages |
| `$page.<pageId>.<property>` | `$page.info.title` | Theme page strings |
| `$optionSet.<setName>.<value>.label` | `$optionSet.yesNoNA.yes.label` | Shared option sets |
| `$component.<nodeId>.<property>` | `$component.submitBtn.label` | Component tree strings |
| `$component.<nodeId>.<prop>[<index>]` | `$component.mainTabs.tabLabels[0]` | Indexed component array slots |

**`propertyNames` regex (same as Enums table):** `^(\$form\.|\$shape\.|\$page\.|\$optionSet\.|\$component\.|[a-zA-Z])[a-zA-Z0-9_@.\\\[\]\-]*$`

### targetDefinition sub-properties

Reused type from `schemas/component.schema.json` → `$defs/TargetDefinition`:

| Property | Type | Required | Description |
|---|---|---|---|
| `url` | `string` (`format`: `uri`) | Yes | Canonical Definition `url`. |
| `compatibleVersions` | `string` | No | npm-style semver range; when omitted, any Definition version is treated as compatible. |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties | Used By |
|---|---|---|---|
| *(none)* | `$defs` is `{}`. | -- | -- |

External `$ref`: **TargetDefinition** (component schema) -- `url`, optional `compatibleVersions` -- referenced by `targetDefinition`.

## Required Fields

- `$formspecLocale`
- `version`
- `locale`
- `targetDefinition`
- `strings`

## Enums and Patterns

| Property path | Kind | Values / pattern | Description |
|---|---|---|---|
| `$formspecLocale` | `const` | `"1.0"` | Document format version pin. |
| `locale` | `pattern` | `^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$` | BCP 47-style tag; also `minLength` 2. |
| `fallback` | `pattern` | `^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$` | Same as `locale`; `minLength` 2. |
| `strings` (`propertyNames`) | `pattern` | `^(\$form\.|\$shape\.|\$page\.|\$optionSet\.|\$component\.|[a-zA-Z])[a-zA-Z0-9_@.\\\[\]\-]*$` | Allowed key shapes for the strings map. |
| `extensions` (`propertyNames`) | `pattern` | `^x-` | Extension keys must be `x-` prefixed. |

No other enums at the root. No `if` / `then` / `else` polymorphism in this schema.

## Cross-References

- **Locale specification** -- `specs/locale/locale-spec.md`: cascade, interpolation, key paths (e.g. §3.1).
- **Component schema** -- `schemas/component.schema.json`: `$defs/TargetDefinition`.
- **Definition schema** -- `schemas/definition.schema.json`: target artifact; keys and structure drive valid string paths.
- **Theme schema** -- `schemas/theme.schema.json`: `$page.*` keys reference theme page ids.
- **FEL** -- grammar and evaluation for `{{expression}}` inside string values.

## Extension Points

- **`extensions`**: only property name constraint (`^x-`). The schema does not restrict the JSON type of each extension value (examples use nested objects). Processors MUST ignore unrecognized `x-*` entries and MUST NOT let extensions change how strings are resolved.

## Validation Constraints

- **Root**: `additionalProperties: false`.
- **`$formspecLocale`**: must equal `"1.0"` exactly (`const`).
- **`version`**: non-empty string (`minLength` 1).
- **`locale`**: `minLength` 2 + BCP 47 pattern above.
- **`fallback`**: when present, `minLength` 2 + same pattern as `locale`.
- **`url`**: URI format when present.
- **`strings`**: every value is type `string`; every key must match `propertyNames.pattern`.
- **`targetDefinition`**: must satisfy `TargetDefinition` (`required`: `["url"]`, `additionalProperties`: false in component schema).
- **`x-lm`**: schema annotations mark `$formspecLocale`, `version`, `locale`, `targetDefinition`, and `strings` as critical for tooling/LLM context (`x-lm.critical` / `intent` in source JSON only; not a validation keyword).
