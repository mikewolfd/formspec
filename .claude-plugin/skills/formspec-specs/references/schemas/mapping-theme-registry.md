# Mapping, Theme, and Registry -- grouped schema reference

These three JSON Schemas define **sidecar and catalog documents** that accompany a Formspec Definition: **Mapping** (Response ↔ external payloads), **Theme** (presentation cascade, pages, tokens), and **Registry** (published extensions and semantic metadata). They share no single runtime bundle, but authors and tooling often load them together when wiring integrations, rendering, and extension resolution.

---

# Mapping Schema Reference Map

> `schemas/mapping.schema.json` -- **824 lines** -- Formspec Mapping Document: bidirectional transforms between Responses and external schemas (FEL-powered).

## Overview

A Mapping Document is a standalone JSON artifact that declares field-level correspondences, structural reorganizations, coercions, value maps, and conditional logic to convert a Formspec Response into JSON/XML/CSV (or similar) and back. Computed transforms use the Formspec Expression Language (FEL). The DSL generalizes the core specification’s version-migration field map concept.

**$id**: `https://formspec.org/schemas/mapping/1.0`

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecMapping` | string (`const`: `"1.0"`) | **Yes** | Mapping DSL version pin. MUST be `"1.0"`. |
| `$schema` | string (`format`: uri) | No | URI of the Mapping JSON Schema (editor/tooling). |
| `version` | string (semver pattern) | **Yes** | Semantic version of this mapping document (not the Definition or DSL pin). |
| `definitionRef` | string (`format`: uri, `minLength`: 1) | **Yes** | Canonical Definition identity (Definition `url`). |
| `definitionVersion` | string (`minLength`: 1) | **Yes** | Semver range (node-semver) of Definition versions; processor MUST refuse if resolved Definition is out of range. |
| `targetSchema` | **TargetSchema** | **Yes** | External target descriptor; drives path syntax and adapter. |
| `direction` | string (enum) | No | `forward` (default), `reverse`, or `both`. |
| `defaults` | object | No | Forward-only leaf defaults keyed by dot paths; rules overwrite. |
| `autoMap` | boolean | No | Synthetic `preserve` rules at priority `-1` for uncovered sources (default `false`). |
| `conformanceLevel` | string (enum) | No | `core`, `bidirectional`, or `extended`. |
| `rules` | array of **FieldRule** (`minItems`: 1) | **Yes** | Ordered rules; executed after sort by `priority` descending (stable). |
| `adapters` | object | No | Built-in keys `json`, `xml`, `csv`; `^x-` custom adapter objects. |
| `extensions` | object (`propertyNames`: `^x-`) | No | Document-level `x-` extension namespace. |

**Top-level required:** `$formspecMapping`, `version`, `definitionRef`, `definitionVersion`, `targetSchema`, `rules`.

**Top-level constraints:** `additionalProperties`: false; `patternProperties`: `"^x-"` allowed at top level (alongside explicit `extensions` object).

## TargetSchema (nested)

| Property | Type | Required | Description |
|---|---|---|---|
| `format` | string | **Yes** | `json` \| `xml` \| `csv` OR `^x-` custom. |
| `name` | string | No | Human-readable target name. |
| `url` | string (uri) | No | Informational schema URI. |
| `rootElement` | string | **If** `format` = `xml` | Root XML local name (required for XML). |
| `namespaces` | object (string values) | No | Prefix → URI map; default ns uses `""` key. |

## FieldRule (items of `rules`)

| Property | Type | Required | Description |
|---|---|---|---|
| `sourcePath` | string | **anyOf** with `targetPath` | Source path; bracket/wildcard per spec. |
| `targetPath` | string \| null | **anyOf** with `sourcePath` | Target path or null (e.g. drop); syntax depends on `targetSchema.format`. |
| `transform` | string (enum) | **Yes** | Transform discriminator. |
| `expression` | string | **If** transform ∈ `expression`, `constant`, `concat`, `split` | FEL; `$` / `@source` per spec. |
| `coerce` | **Coerce** \| shorthand string | **If** transform = `coerce` | Type conversion. |
| `valueMap` | **ValueMap** \| legacy flat object | **If** transform = `valueMap` | Lookup / bijectivity rules per spec. |
| `reverse` | **ReverseOverride** | No | Reverse-only overrides (no path re-spec). |
| `bidirectional` | boolean (default true) | No | Reverse participation; lossy rules need `false` or explicit `reverse`. |
| `condition` | string | No | FEL guard; false/null skips rule. |
| `default` | any | No | Fallback when source missing/null per transform semantics. |
| `array` | **ArrayDescriptor** | No | Repeat/array iteration modes. |
| `separator` | string | No | Delimiter for flatten/nest string modes. |
| `description` | string | No | Ignored at execution. |
| `priority` | integer (default 0) | No | Sort descending before execution. |
| `reversePriority` | integer (`minimum` 0) | No | Reverse collision precedence when `direction` allows reverse. |

**FieldRule constraints:** `anyOf` requires at least one of `sourcePath`, `targetPath`. **allOf** if/then: `expression` required for `expression`|`constant`|`concat`|`split`; `coerce` for `coerce`; `valueMap` for `valueMap`.

## Key Type Definitions ($defs)

| Definition | Description | Key properties | Used by |
|---|---|---|---|
| **TargetSchema** | Target format + path rules | `format`, `name`, `url`, `rootElement`, `namespaces` | `targetSchema` |
| **FieldRule** | Atomic mapping rule | paths, `transform`, FEL, `coerce`, `valueMap`, `reverse`, `array` | `rules[]` |
| **Coerce** | Typed conversion | `from`, `to`, `format` | `FieldRule`, `InnerRule`, `ReverseOverride` |
| **ValueMap** | Code/value translation | `forward`, `reverse`, `unmapped`, `default` | `FieldRule`, `InnerRule`, `ReverseOverride` |
| **ArrayDescriptor** | Array/repeat handling | `mode`, `separator`, `innerRules` | `FieldRule`, `InnerRule`, `ReverseOverride` |
| **InnerRule** | Rule inside `array.innerRules` | Same as FieldRule + optional `index` | `ArrayDescriptor.innerRules` |
| **ReverseOverride** | Reverse execution patch | `transform`, `expression`, `coerce`, `valueMap`, … | `FieldRule.reverse`, `InnerRule.reverse` |
| **JsonAdapter** | JSON output options | `pretty`, `sortKeys`, `nullHandling` | `adapters.json` |
| **XmlAdapter** | XML output options | `declaration`, `indent`, `cdata` | `adapters.xml` |
| **CsvAdapter** | RFC 4180 CSV options | `delimiter`, `quote`, `header`, `encoding`, `lineEnding` | `adapters.csv` |

## Required Fields

- **Document:** `$formspecMapping`, `version`, `definitionRef`, `definitionVersion`, `targetSchema`, `rules`.
- **TargetSchema:** `format`; **if** `format` = `xml` → `rootElement`.
- **FieldRule / InnerRule:** `transform`; at least one of `sourcePath`, `targetPath`; conditional `expression` / `coerce` / `valueMap` as above.
- **Coerce:** `from`, `to`.
- **ValueMap:** `forward`.
- **ArrayDescriptor:** `mode`.

## Enums and Patterns

| Property path | Type | Values / pattern | Notes |
|---|---|---|---|
| `$formspecMapping` | const | `1.0` | Version pin. |
| `version` | pattern | `^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$` | Strict semver for document. |
| `direction` | enum | `forward`, `reverse`, `both` | Default `forward`. |
| `conformanceLevel` | enum | `core`, `bidirectional`, `extended` | Processor capability hint. |
| `targetSchema.format` | enum \| pattern | `json`, `xml`, `csv` **or** `^x-` | Custom formats are `x-` prefixed strings. |
| `FieldRule.transform` / `InnerRule.transform` / `ReverseOverride.transform` | enum | `preserve`, `drop`, `expression`, `coerce`, `valueMap`, `flatten`, `nest`, `constant`, `concat`, `split` | Same set everywhere. |
| `coerce` (shorthand) | enum | `string`, `number`, `boolean`, `date`, `datetime`, `integer`, `array`, `object`, `money` | Alternative to **Coerce** object. |
| `Coerce.from` / `Coerce.to` | enum | `string`, `number`, `boolean`, `date`, `datetime`, `integer`, `array`, `object`, `money` | Object form. |
| `ValueMap.unmapped` | enum | `error`, `drop`, `passthrough`, `default` | Default `error`. |
| `ArrayDescriptor.mode` | enum | `each`, `whole`, `indexed` | Iteration strategy. |
| `JsonAdapter.nullHandling` | enum | `include`, `omit` | Default `include`. |
| `CsvAdapter.lineEnding` | enum | `crlf`, `lf` | Default `crlf`. |

## Cross-References

- **Normative:** Mapping specification (transform semantics, path syntax, reverse execution).
- **FEL:** `expression`, `condition`, and reverse expressions bind `$` / `@source` per Mapping spec.
- **`definitionRef`:** Must match Definition `url`; **`definitionVersion`** is a semver range over Definition `version`.
- **Internal `$ref` only:** no cross-schema `$ref` in `mapping.schema.json`.

## Extension Points

- Top-level `patternProperties` `^x-` (with `additionalProperties`: false).
- Top-level `extensions` object: keys MUST match `^x-`.
- **TargetSchema:** `patternProperties` `^x-`; custom `format` values use `x-` prefix.
- **adapters:** `patternProperties` `^x-` → `type: object` for custom adapters.
- **FieldRule**, **InnerRule**, **ReverseOverride:** `patternProperties` `^x-`.

## x-lm (language-model hints)

| Path | critical | intent (summary) |
|---|---|---|
| `$formspecMapping` | yes | DSL version pin. |
| `version` | yes | Document revision id. |
| `definitionRef` | yes | Target Definition identity. |
| `definitionVersion` | yes | Reject execution when Definition out of range. |
| `targetSchema` | yes | Output format and adapter. |
| `direction` | yes | Allowed execution directions. |
| `rules` | yes | Transform pipeline. |
| `FieldRule` / `FieldRule.transform` | yes | Atomic rule + transform discriminator. |

## Validation Constraints

- **rules:** `minItems`: 1.
- **FieldRule / InnerRule:** `reversePriority` `minimum` 0; `InnerRule.index` `minimum` 0 when used.
- **CsvAdapter:** `delimiter` and `quote` length 1; **XmlAdapter** `indent` `minimum` 0.
- **JsonAdapter**, **XmlAdapter**, **CsvAdapter**, **Coerce**, **ValueMap**, **ArrayDescriptor**, **FieldRule**, **InnerRule**, **ReverseOverride**, **TargetSchema** (except allowed `^x-` / pattern hooks): `additionalProperties`: false where schema declares it.

---

# Theme Schema Reference Map

> `schemas/theme.schema.json` -- **688 lines** -- Formspec Theme Document: visual presentation sidecar (cascade, widgets, pages, tokens).

## Overview

A Theme controls how a Definition is **shown**, not what it **collects** or **validates**. It binds to a Definition URL, applies a three-level cascade (`defaults` → `selectors` → `items`), optional **pages** on a 12-column grid, **tokens** resolved as `$token.<key>`, and optional **tokenMeta** for custom token categories (Token Registry shape).

**$id**: `https://formspec.org/schemas/theme/1.0`

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecTheme` | string (`const`: `"1.0"`) | **Yes** | Theme DSL version pin. |
| `url` | string (uri) | No | Canonical theme URI; pair with `version` should be unique. |
| `version` | string (`minLength` 1) | **Yes** | Theme revision (SemVer recommended). |
| `name` | string | No | Short machine id. |
| `title` | string | No | Display name. |
| `description` | string | No | Human description. |
| `targetDefinition` | **TargetDefinition** ($ref component) | **Yes** | Definition URL + optional `compatibleVersions` range. |
| `platform` | string | No | Informational (`web`, `mobile`, `pdf`, …). |
| `tokens` | **Tokens** ($ref component) | No | Token map; values string or number. |
| `defaults` | **PresentationBlock** | No | Cascade level 1 baseline. |
| `selectors` | array of **Selector** | No | Cascade level 2 type/dataType rules. |
| `items` | object → **PresentationBlock** | No | Cascade level 3 per-item key overrides. |
| `pages` | array of **PageLayout** | No | Optional paged layout / regions. |
| `breakpoints` | **Breakpoints** ($ref component) | No | Named min-width thresholds for `Region.responsive`. |
| `extensions` | object (`propertyNames`: `^x-`) | No | Ignored if unrecognized; MUST NOT change core presentation semantics. |
| `stylesheets` | array of string (uri-reference) | No | External CSS load order. |
| `tokenMeta` | object | No | `categories` keyed by prefix; values **`Category`** from Token Registry schema. |

**Top-level required:** `$formspecTheme`, `version`, `targetDefinition`.

**Top-level:** `additionalProperties`: false.

## PresentationBlock

| Property | Type | Required | Description |
|---|---|---|---|
| `widget` | string | No | Widget id (`textInput`, `moneyInput`, …, `x-…`, `none`). |
| `widgetConfig` | object (`additionalProperties`: true) | No | Widget-specific; not carried on fallback. |
| `labelPosition` | string (enum) | No | `top`, `start`, `hidden`. |
| `style` | object (values string \| number) | No | Flat style map; may use `$token.*`. |
| `accessibility` | **AccessibilityBlock** ($ref component) | No | Replaced whole per cascade level. |
| `fallback` | array of string | No | Progressive widget fallback chain. |
| `cssClass` | string \| array of string | No | **Union** merge across cascade (unique). |

## Selector, SelectorMatch, PageLayout, Region

| Object | Property | Type | Required | Description |
|---|---|---|---|---|
| **Selector** | `match` | **SelectorMatch** | **Yes** | AND of `type` / `dataType` when both present. |
| **Selector** | `apply` | **PresentationBlock** | **Yes** | Applied when match hits. |
| **SelectorMatch** | `type` | enum | **anyOf** with `dataType` | `group`, `field`, `display`. |
| **SelectorMatch** | `dataType` | enum | **anyOf** with `type` | 13 core dataTypes (see enums). |
| **PageLayout** | `id` | string (pattern) | **Yes** | Page id. |
| **PageLayout** | `title` | string | **Yes** | Nav label. |
| **PageLayout** | `description` | string | No | Page blurb. |
| **PageLayout** | `regions` | array of **Region** | No | Ordered regions. |
| **Region** | `key` | string | **Yes** | Definition item key (group = subtree). |
| **Region** | `span` | integer 1–12 | No | Default 12. |
| **Region** | `start` | integer 1–12 | No | Column start. |
| **Region** | `responsive` | object | No | Keys = breakpoint names → `{ span?, start?, hidden? }`. |

## Key Type Definitions ($defs)

| Definition | Description | Key properties | Used by |
|---|---|---|---|
| **TargetDefinition** | Definition bind | (in component schema) | `targetDefinition` |
| **Tokens** | Design tokens | (in component schema) | `tokens` |
| **PresentationBlock** | Cascade payload | `widget`, `widgetConfig`, `labelPosition`, `style`, `accessibility`, `fallback`, `cssClass` | `defaults`, `selectors[].apply`, `items.*` |
| **AccessibilityBlock** | A11y hints | (in component schema) | `PresentationBlock.accessibility` |
| **Selector** | Match + apply | `match`, `apply` | `selectors[]` |
| **SelectorMatch** | Match criteria | `type`, `dataType` | `Selector.match` |
| **PageLayout** | Page + grid | `id`, `title`, `description`, `regions` | `pages[]` |
| **Region** | Grid cell | `key`, `span`, `start`, `responsive` | `PageLayout.regions[]` |
| **Breakpoints** | Named widths | (in component schema) | `breakpoints` |

## Required Fields

- **Document:** `$formspecTheme`, `version`, `targetDefinition`.
- **Selector:** `match`, `apply`.
- **SelectorMatch:** at least one of `type`, `dataType` (`anyOf`).
- **PageLayout:** `id`, `title`.
- **Region:** `key`.
- **PresentationBlock:** *(none required)*.

## Enums and Patterns

| Property path | Type | Values / pattern | Notes |
|---|---|---|---|
| `$formspecTheme` | const | `1.0` | Version pin. |
| `version` | constraint | `minLength` 1 | SemVer recommended. |
| `PresentationBlock.labelPosition` | enum | `top`, `start`, `hidden` | |
| `SelectorMatch.type` | enum | `group`, `field`, `display` | Structural match. |
| `SelectorMatch.dataType` | enum | `string`, `text`, `integer`, `decimal`, `boolean`, `date`, `dateTime`, `time`, `uri`, `attachment`, `choice`, `multiChoice`, `money` | Field-only. |
| `PageLayout.id` | pattern | `^[a-zA-Z][a-zA-Z0-9_\-]*$` | |
| `Region.span` | integer | 1–12 (default 12) | |
| `Region.start` | integer | 1–12 | |
| `Region.responsive.*.span` | integer | 1–12 | |
| `Region.responsive.*.start` | integer | 1–12 | |

## Cross-References

- **Normative:** Theme specification (cascade, pages, Tier 1 interaction, null theme behavior).
- **External `$ref`:**
  - `https://formspec.org/schemas/component/1.0#/$defs/TargetDefinition`
  - `https://formspec.org/schemas/component/1.0#/$defs/Tokens`
  - `https://formspec.org/schemas/component/1.0#/$defs/AccessibilityBlock`
  - `https://formspec.org/schemas/component/1.0#/$defs/Breakpoints`
  - `https://formspec.org/schemas/token-registry/1.0#/$defs/Category` (via `tokenMeta.categories` values)
- **Internal `$ref`:** `PresentationBlock`, `Selector`, `SelectorMatch`, `PageLayout`, `Region`.

## Extension Points

- `extensions`: keys `^x-`; processors MUST ignore unknown keys.
- Custom **widgets:** `x-` prefix; SHOULD include **fallback** ending on a core widget.
- `widgetConfig`, `style`: open keys per schema (`widgetConfig` `additionalProperties`: true; `style` values string \| number).
- `items`: arbitrary keys (Definition item keys).

## x-lm (language-model hints)

| Path | critical | intent (summary) |
|---|---|---|
| `$formspecTheme` | yes | Reject unknown theme version. |
| `version` | yes | Audit/cache bust. |
| `targetDefinition` | yes | Prevent wrong Definition pairing. |
| `tokens` | yes | `$token.<key>` vocabulary. |
| `defaults` / `selectors` / `items` | yes | Cascade levels 1–3. |
| `PresentationBlock.widget` | yes | Primary control choice. |
| `PresentationBlock.cssClass` | yes | Union merge across cascade. |

## Validation Constraints

- **PresentationBlock.style** values: `oneOf` string \| number.
- **PresentationBlock.cssClass:** `oneOf` string \| string[].
- **Objects with `additionalProperties`: false** in this file: `Selector`, `SelectorMatch`, `PageLayout`, `Region`, `PresentationBlock`, `tokenMeta` (top-level of `tokenMeta` only allows `categories`).

### Cascade (behavioral)

- Order: Tier 1 hints < `defaults` < `selectors` (doc order, all matches apply) < `items`.
- Shallow merge per property; **replace whole** `widgetConfig`, `style`, `accessibility`.
- **Exception:** `cssClass` unions with de-duplication preserving order.
- Fallback: **does not** inherit prior `widgetConfig`.

---

# Registry Schema Reference Map

> `schemas/registry.schema.json` -- **647 lines** -- Formspec Registry Document: extension catalog and semantic metadata.

## Overview

A Registry document lists **entries** (data types, functions, constraints, properties, namespaces, concepts, vocabularies) with lifecycle, compatibility ranges, and category-specific fields. Publishers and timestamps are first-class for provenance and cache behavior.

**$id**: `https://formspec.org/schemas/registry/v1.0/registry.json`

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecRegistry` | string (`const`: `"1.0"`) | **Yes** | Registry format version pin. |
| `$schema` | string (uri) | No | JSON Schema URI for editors. |
| `publisher` | **Publisher** | **Yes** | Document-level publisher. |
| `published` | string (`format`: date-time) | **Yes** | Publication instant (ISO 8601). |
| `entries` | array of **RegistryEntry** | **Yes** | Catalog; `(name, version)` unique per document. |
| `extensions` | object (`propertyNames`: `^x-`) | No | Registry-level vendor metadata. |

**Top-level required:** `$formspecRegistry`, `publisher`, `published`, `entries`.

**Top-level:** `additionalProperties`: false.

## RegistryEntry (all properties)

| Property | Type | Required | Description |
|---|---|---|---|
| `name` | string (pattern) | **Yes** | `x-` extension id; `x-formspec-` reserved. |
| `category` | string (enum) | **Yes** | Discriminator for conditional fields. |
| `version` | string (semver pattern) | **Yes** | Extension semver (not Formspec core). |
| `status` | string (enum) | **Yes** | Lifecycle state. |
| `publisher` | **Publisher** | No | Overrides document `publisher` for this entry. |
| `description` | string (`minLength` 1) | **Yes** | Summary. |
| `specUrl` | string (uri) | No | Human spec link. |
| `schemaUrl` | string (uri) | No | JSON Schema for Definition payloads using extension. |
| `compatibility` | object | **Yes** | Requires `formspecVersion`; optional `mappingDslVersion`. |
| `license` | string (SPDX pattern) | No | SPDX id. |
| `deprecationNotice` | string (`minLength` 1) | **If** `status` = `deprecated` | Human deprecation text. |
| `examples` | array (`items`: true) | No | Usage fragments (any JSON). |
| `extensions` | object (`propertyNames`: `^x-`) | No | Entry-level vendor metadata. |
| `baseType` | string (enum) | **If** `category` = `dataType` | Core supertype. |
| `constraints` | object | No | Default constraints for custom data types. |
| `metadata` | object | No | Open metadata (display, formatting, …). |
| `parameters` | array of parameter objects | **If** `function` \| `constraint` | Positional signature. |
| `returns` | string | **If** `category` = `function` | Return type name for FEL checking. |
| `members` | array of string (name pattern) | No | Namespace membership ids. |
| `conceptUri` | string (uri) | **If** `category` = `concept` | Concept IRI. |
| `conceptSystem` | string (uri) | No | Ontology URI. |
| `conceptCode` | string | No | Short code in system. |
| `equivalents` | array of **ConceptEquivalent** | No | Cross-system mappings. |
| `vocabularySystem` | string (uri) | **If** `category` = `vocabulary` | Terminology system URI. |
| `vocabularyVersion` | string | No | External terminology version. |
| `filter` | **VocabularyFilter** | No | Subset of codes in scope. |

### `parameters[]` item

| Property | Type | Required |
|---|---|---|
| `name` | string | **Yes** |
| `type` | string | **Yes** |
| `description` | string | No |

### **ConceptEquivalent**

| Property | Type | Required | Description |
|---|---|---|---|
| `system` | string (uri) | **Yes** | Target system. |
| `code` | string | **Yes** | Code in target system. |
| `display` | string | No | Display string. |
| `type` | string | No | SKOS-like relation; default `exact`; custom values `x-` prefixed. |

### **VocabularyFilter**

| Property | Type | Constraints |
|---|---|---|
| `ancestor` | string | -- |
| `maxDepth` | integer | `minimum` 1 |
| `include` | array of string | `minItems` 1 |
| `exclude` | array of string | `minItems` 1 |

## Key Type Definitions ($defs)

| Definition | Description | Key properties | Used by |
|---|---|---|---|
| **Publisher** | Org + contact | `name`, `url`, `contact` | top-level `publisher`, `RegistryEntry.publisher` |
| **RegistryEntry** | Extension record | `name`, `category`, `version`, `status`, `description`, `compatibility`, + conditional | `entries[]` |
| **ConceptEquivalent** | Crosswalk | `system`, `code`, `display`, `type` | `RegistryEntry.equivalents` |
| **VocabularyFilter** | Terminology subset | `ancestor`, `maxDepth`, `include`, `exclude` | `RegistryEntry.filter` |

## Required Fields

- **Publisher:** `name`, `url`.
- **RegistryEntry:** `name`, `category`, `version`, `status`, `description`, `compatibility`.
- **compatibility:** `formspecVersion`.
- **Conditional (allOf if/then on RegistryEntry):**
  - `category` = `dataType` → `baseType`
  - `category` = `function` → `parameters`, `returns`
  - `category` = `constraint` → `parameters`
  - `category` = `concept` → `conceptUri`
  - `category` = `vocabulary` → `vocabularySystem`
  - `status` = `deprecated` → `deprecationNotice`
- **ConceptEquivalent:** `system`, `code`.

## Enums and Patterns

| Property path | Type | Values / pattern | Notes |
|---|---|---|---|
| `$formspecRegistry` | const | `1.0` | |
| `RegistryEntry.name` | pattern | `^x-[a-z][a-z0-9]*(-[a-z][a-z0-9]*)*$` | Lowercase segments. |
| `RegistryEntry.version` | pattern | `^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$` | Strict semver. |
| `RegistryEntry.category` | enum | `dataType`, `function`, `constraint`, `property`, `namespace`, `concept`, `vocabulary` | |
| `RegistryEntry.status` | enum | `draft`, `stable`, `deprecated`, `retired` | No skipped transitions. |
| `RegistryEntry.baseType` | enum | `string`, `integer`, `decimal`, `boolean`, `date`, `dateTime`, `time`, `uri` | For `dataType` entries. |
| `RegistryEntry.license` | pattern | `^[A-Za-z0-9][A-Za-z0-9.\-]*[A-Za-z0-9]$` | SPDX-style. |

## Cross-References

- **Normative:** Extension Registry specification (entry semantics, lifecycle, interoperability).
- **Internal `$ref` only** in this schema file.
- **`compatibility.formspecVersion` / `mappingDslVersion`:** semver ranges vs core / Mapping DSL.
- **`schemaUrl`:** optional JSON Schema for validating extension-shaped fragments in Definitions.
- **Namespace `members`:** should name other registry entries.

## Extension Points

- Top-level and per-entry `extensions` with keys `^x-`.
- **`metadata`**, **`constraints`**, **`examples`:** open structured / free JSON as declared in schema.
- **`ConceptEquivalent.type`:** standard SKOS-like tokens or `x-` vendor types.

## x-lm (language-model hints)

| Path | critical | intent (summary) |
|---|---|---|
| `$formspecRegistry` | yes | Format version pin. |
| `publisher` / `published` / `entries` | yes | Provenance + catalog. |
| `RegistryEntry.name` / `category` / `version` / `status` | yes | Identity + lifecycle. |
| `RegistryEntry.compatibility` | yes | Hard gate vs Formspec (warn/error per spec). |
| `RegistryEntry.baseType` | yes | dataType inheritance. |
| `RegistryEntry.parameters` / `returns` | yes | FEL arity/types for functions. |
| `RegistryEntry.conceptUri` | yes | Global concept IRI. |
| `RegistryEntry.vocabularySystem` | yes | Terminology system id. |

## Validation Constraints

- **published:** `format: date-time`.
- **description** / **deprecationNotice:** `minLength` 1 where required.
- **Publisher**, **RegistryEntry**, **ConceptEquivalent**, **VocabularyFilter**, **compatibility**, parameter items: `additionalProperties`: false where declared.
- **Document semantic constraint:** `(name, version)` uniqueness -- not expressible in JSON Schema alone.

### Lifecycle

Valid transitions: `draft` → `stable` → `deprecated` → `retired` (no skipping). **deprecated** requires **deprecationNotice**. **retired** → processors SHOULD warn.
