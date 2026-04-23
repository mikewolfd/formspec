# Ontology Schema Reference Map

> schemas/ontology.schema.json -- 426 lines -- Formspec Ontology Document

## Overview

The Ontology schema defines a standalone sidecar document that attaches semantic concept identifiers, cross-system equivalences, vocabulary bindings, and alignment metadata to a Formspec Definition. Like Theme, Component, and References documents, an Ontology Document targets a Definition but lives alongside it. It does not alter core behavioral semantics (required, relevant, readonly, calculate, validation). Multiple Ontology Documents MAY target the same Definition (for example, different domains, standards bodies, or interoperability contexts). All ontology property values are static: FEL expressions MUST NOT appear in any ontology property.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecOntology` | `string` (const `"1.0"`) | Yes | Ontology specification version. MUST be `"1.0"`. |
| `$schema` | `string` (format: `uri`) | No | Optional JSON Schema URI for editor validation and autocompletion. |
| `version` | `string` (minLength: 1) | Yes | Version of this Ontology Document. |
| `url` | `string` (format: `uri`) | No | Canonical URI identifier for this Ontology Document. |
| `name` | `string` (pattern: `^[a-zA-Z][a-zA-Z0-9_\-]*$`) | No | Machine-readable short name. Letters, digits, hyphens, underscores; must start with a letter. |
| `targetDefinition` | `$ref: https://formspec.org/schemas/component/1.0#/$defs/TargetDefinition` | Yes | Binding to the target Formspec Definition and optional compatibility range. |
| `title` | `string` | No | Human-readable name for this Ontology Document. |
| `description` | `string` | No | Human-readable description of this document's purpose and scope. |
| `publisher` | `$ref: #/$defs/Publisher` | No | Organization publishing this ontology document. |
| `published` | `string` (format: `date-time`) | No | ISO 8601 timestamp indicating when this ontology document was published. |
| `defaultSystem` | `string` (format: `uri`) | No | Default concept system URI. Applied when a concept binding omits `system`. |
| `concepts` | `object` (additionalProperties: `$ref: #/$defs/ConceptBinding`) | No | Map of item paths to Concept Bindings. Keys use the same path syntax as Bind.path in Core §4.3.3 (dot notation, `[*]` for all repeat instances). |
| `vocabularies` | `object` (additionalProperties: `$ref: #/$defs/VocabularyBinding`) | No | Map of option set names to Vocabulary Bindings. Keys match names in the Definition's `optionSets`. |
| `alignments` | `array` of `$ref: #/$defs/Alignment` | No | Cross-system alignment declarations: typed relationships between Definition fields and external concepts. |
| `context` | `object` (additionalProperties: `false`) | No | JSON-LD context fragment for response export; enables linked-data responses. |
| `extensions` | `object` (`propertyNames`: pattern `^x-`) | No | Document-level extension properties. All keys MUST be `x-` prefixed. |

The root object has `additionalProperties: false`. Only the properties listed above (including optional `extensions`) are permitted at the document root; arbitrary root-level `x-*` keys are not allowed by this schema.

### context Sub-Properties

| Property | Type | Required | Description |
|---|---|---|---|
| `@context` | `oneOf`: `string` \| `object` \| `array` | No | JSON-LD `@context` fragment. May be a URI string, a context object, or an array combining strings and objects. When applied to a response document, makes the response a valid JSON-LD document. |

`context` has `additionalProperties: false` (only `@context` is valid inside `context`).

### Publisher Sub-Properties ($defs/Publisher)

| Property | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Human-readable organization name. |
| `url` | `string` (format: `uri`) | Yes | Organization home page. |
| `contact` | `string` | No | Contact email or URI. |

### ConceptBinding Sub-Properties ($defs/ConceptBinding)

| Property | Type | Required | Description |
|---|---|---|---|
| `concept` | `string` (format: `uri`) | Yes | Concept URI in the external system. |
| `system` | `string` (format: `uri`) | No | Concept system or ontology URI; falls back to document `defaultSystem` if omitted. |
| `display` | `string` | No | Human-readable name of the concept. |
| `code` | `string` | No | Short code within the system (for example `MR`, `EIN`). |
| `equivalents` | `array` of `$ref: #/$defs/ConceptEquivalent` | No | Cross-system equivalences for this concept. |

### ConceptEquivalent Sub-Properties ($defs/ConceptEquivalent)

| Property | Type | Required | Description |
|---|---|---|---|
| `system` | `string` (format: `uri`) | Yes | Target system URI. |
| `code` | `string` | Yes | Concept code within the target system. |
| `display` | `string` | No | Human-readable name in the target system. |
| `type` | `string` | No | SKOS-inspired relationship type. When absent, processors MUST treat as `exact`. Documented values: `exact`, `close`, `broader`, `narrower`, `related`. Custom types MUST be `x-` prefixed. |

### VocabularyBinding Sub-Properties ($defs/VocabularyBinding)

| Property | Type | Required | Description |
|---|---|---|---|
| `system` | `string` (format: `uri`) | Yes | Terminology system URI. |
| `version` | `string` | No | Version of the terminology. |
| `display` | `string` | No | Human-readable name of the terminology. |
| `filter` | `$ref: #/$defs/VocabularyFilter` | No | Subset constraints limiting in-scope vocabulary. |
| `valueMap` | `object` (additionalProperties: `string`) | No | Maps Definition option `value` strings to external terminology codes when they differ. |

### VocabularyFilter Sub-Properties ($defs/VocabularyFilter)

| Property | Type | Required | Description |
|---|---|---|---|
| `ancestor` | `string` | No | Root code for hierarchical filtering; only descendants included. |
| `maxDepth` | `integer` (minimum: 1) | No | Maximum depth from the ancestor code. |
| `include` | `array` of `string` (minItems: 1) | No | Explicit codes to include. |
| `exclude` | `array` of `string` (minItems: 1) | No | Explicit codes to exclude. |

### Alignment Sub-Properties ($defs/Alignment)

| Property | Type | Required | Description |
|---|---|---|---|
| `field` | `string` (minLength: 1) | Yes | Definition item path; same syntax as Bind.path. |
| `target` | object (see below) | Yes | External system concept reference. |
| `type` | `string` | Yes | SKOS-inspired relationship: `exact`, `close`, `broader`, `narrower`, `related`; custom values MUST be `x-` prefixed. |
| `bidirectional` | `boolean` | No | Whether alignment applies both ways; when absent, processors MUST treat as `false`. |
| `notes` | `string` | No | Human-readable rationale for the alignment. |

### Alignment.target (inline object on Alignment)

| Property | Type | Required | Description |
|---|---|---|---|
| `system` | `string` (format: `uri`) | Yes | External system URI. |
| `code` | `string` | Yes | Concept code in the external system. |
| `display` | `string` | No | Human-readable name in the external system. |

`Alignment.target` has `additionalProperties: false`.

## Key Type Definitions ($defs)

| Definition | Description | Key Properties | Used By |
|---|---|---|---|
| **Publisher** | Organization publishing this ontology document. | `name`, `url` (required); `contact` | `properties.publisher` |
| **ConceptBinding** | Associates a Definition item with a concept in an external ontology or standard. | `concept` (required); `system`, `display`, `code`, `equivalents` | `properties.concepts` (values of map) |
| **ConceptEquivalent** | Declares equivalence to a concept in another system. | `system`, `code` (required); `display`, `type` | `ConceptBinding.equivalents[]` |
| **VocabularyBinding** | Associates a named option set with an external terminology system. | `system` (required); `version`, `display`, `filter`, `valueMap` | `properties.vocabularies` (values of map) |
| **VocabularyFilter** | Constrains in-scope portion of a terminology for an option set. | `ancestor`, `maxDepth`, `include`, `exclude` | `VocabularyBinding.filter` |
| **Alignment** | Typed relationship between a Definition field and an external concept. | `field`, `target`, `type` (required); `bidirectional`, `notes` | `properties.alignments[]` |

## Required Fields

### Top-Level (Ontology Root)

- `$formspecOntology`, `version`, `targetDefinition`

### Publisher

- `name`, `url`

### ConceptBinding

- `concept`

### ConceptEquivalent

- `system`, `code`

### VocabularyBinding

- `system`

### Alignment

- `field`, `target`, `type`

### Alignment.target (inline object)

- `system`, `code`

## Enums and Patterns

| Property Path | Type | Values/Pattern | Description |
|---|---|---|---|
| `$formspecOntology` | const | `"1.0"` | Fixed ontology specification version. |
| `name` | pattern | `^[a-zA-Z][a-zA-Z0-9_\-]*$` | Machine-readable document short name. |
| `extensions` (propertyNames) | pattern | `^x-` | Extension keys under `extensions` MUST be `x-` prefixed. |
| `ConceptEquivalent.type` | string (documented) | `exact`, `close`, `broader`, `narrower`, `related`; custom MUST be `x-` prefixed | When absent, processors MUST treat as `exact`. Not a JSON Schema `enum`. |
| `Alignment.type` | string (documented) | `exact`, `close`, `broader`, `narrower`, `related`; custom MUST be `x-` prefixed | Qualifies the alignment. Not a JSON Schema `enum`. |

## Cross-References

- **`targetDefinition`**: `$ref` to `https://formspec.org/schemas/component/1.0#/$defs/TargetDefinition` (same pattern as other definition-targeting sidecars).
- **`concepts` keys**: Same path syntax as `Bind.path` in Core §4.3.3.
- **`vocabularies` keys**: Match `optionSets` names on the target Definition.
- **`context.@context`**: JSON-LD bridge for response export and linked data.
- **`ConceptEquivalent.type` / `Alignment.type`**: SKOS-inspired vocabulary; semantics in the Ontology specification.
- Ontology metadata MUST NOT alter Core behavioral semantics (required, relevant, readonly, calculate, validation).

## Extension Points

- **`extensions`**: Top-level object for document-level extensions. Keys MUST match `^x-` per `propertyNames`. The root does not use `patternProperties`; extensions belong in this property (or future schema versions may widen the root).

- **`ConceptEquivalent.type` / `Alignment.type`**: Custom relationship types MUST be `x-` prefixed.

All `$defs` types (`Publisher`, `ConceptBinding`, `ConceptEquivalent`, `VocabularyBinding`, `VocabularyFilter`, `Alignment`) and the inline `Alignment.target` object use `additionalProperties: false`.

## Validation Constraints

- **`$formspecOntology`**: `const: "1.0"`.
- **`version`**: `minLength: 1`.
- **`name`**: `pattern: "^[a-zA-Z][a-zA-Z0-9_\\-]*$"`.
- **URI formats**: `$schema`, `url`, `defaultSystem`, `Publisher.url`, `ConceptBinding.concept`, `ConceptBinding.system`, `ConceptEquivalent.system`, `VocabularyBinding.system`, `Alignment.target.system` use `format: "uri"`.
- **`published`**: `format: "date-time"`.
- **`VocabularyFilter.maxDepth`**: `integer`, `minimum: 1`.
- **`VocabularyFilter.include` / `exclude`**: when present, `minItems: 1` on each array.
- **`Alignment.field`**: `minLength: 1`.
- **`VocabularyBinding.valueMap`**: string values only (`additionalProperties: { "type": "string" }`).
- **`context`**: `additionalProperties: false` (only `@context`).
- **`context.@context`**: `oneOf` string, object, or array (polymorphic JSON-LD context).
- **Root**: `additionalProperties: false` (fixed property set; no extra root keys).

## x-lm Critical Annotations

Properties marked `x-lm.critical: true` in the schema (authoring contract signal):

| Property Path | Intent |
|---|---|
| `$formspecOntology` | Version pin for ontology document compatibility. |
| `version` | Revision identifier for the ontology document. |
| `targetDefinition` | Declares which Definition this ontology document is designed for. |
| `defaultSystem` | Default concept system when bindings omit `system`. |
| `concepts` | Concept bindings from Definition fields to external ontology concepts. |
| `vocabularies` | Vocabulary bindings from option sets to external terminology systems. |
| `alignments` | Cross-form and cross-system interoperability alignments. |
| `context.@context` | JSON-LD bridge for linked-data responses. |
| `ConceptBinding.concept` | Globally unique identifier for the represented concept. |
| `VocabularyBinding.system` | External terminology system for the option set. |
| `Alignment.field` | Definition field this alignment applies to. |
| `Alignment.target` | External concept aligned with the field. |
| `Alignment.type` | Nature of the alignment (exact, broader, narrower, related, close). |
