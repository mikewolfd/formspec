# Locale, Ontology, and References Schema Reference Maps

Combined reference for three companion sidecar document schemas.

---

# Locale Schema Reference Map

> schemas/locale.schema.json -- 173 lines -- Sidecar document for internationalized strings

## Overview

The Locale schema defines a sidecar JSON document that provides localized strings for a Formspec Definition. It maps string keys (dot-delimited paths addressing item properties, option labels, validation messages, page titles, and component strings) to localized values with optional FEL interpolation via `{{expression}}` syntax. The document targets a specific Definition via `targetDefinition` and supports a fallback cascade (regional -> base language -> inline defaults) through the `fallback` property. Locale Documents MUST NOT affect data collection, validation, or behavioral semantics.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecLocale` | `string` (const `"1.0"`) | Yes | Specification version pin. MUST be `"1.0"`. |
| `url` | `string` (format: `uri`) | No | Canonical URI identifier for this Locale Document. |
| `version` | `string` (minLength: 1) | Yes | Version of this Locale Document. |
| `name` | `string` | No | Machine-friendly short identifier. |
| `title` | `string` | No | Human-readable display name. |
| `description` | `string` | No | Human-readable description of the locale's purpose. |
| `locale` | `string` (pattern: BCP 47) | Yes | BCP 47 language tag (e.g., `en`, `fr-CA`, `zh-Hans`). |
| `fallback` | `string` (pattern: BCP 47) | No | BCP 47 tag of the locale to consult when a key is not found. |
| `targetDefinition` | `$ref: component TargetDefinition` | Yes | Binding to the target Definition with optional version range. |
| `strings` | `object` (string values) | Yes | Map of string keys to localized values with optional FEL interpolation. |
| `extensions` | `object` (x-prefixed keys) | No | Extension namespace for vendor-specific metadata. |

Root object has `additionalProperties: false`.

## Key Type Definitions ($defs)

This schema has no `$defs` block. The `targetDefinition` is a `$ref` to the Component schema's `TargetDefinition` definition.

## Required Fields

- `$formspecLocale`, `version`, `locale`, `targetDefinition`, `strings`

## String Key Format

The `strings` object uses `propertyNames` with a pattern that accepts:
- `<itemKey>.<property>` -- item properties (label, description, hint)
- `<key>.label@<context>` -- context labels
- `<key>.options.<value>.label` -- choice option labels
- `<key>.errors.<CODE>` -- validation messages by code
- `<key>.constraintMessage` / `<key>.requiredMessage` -- bind-level messages
- `$form.<property>` -- form-level strings
- `$shape.<id>.message` -- shape rule messages
- `$page.<pageId>.<property>` -- theme page strings
- `$optionSet.<setName>.<value>.label` -- shared option set labels
- `$component.<nodeId>.<property>` -- component node strings

All values MUST be strings (no objects, arrays, or numbers).

## Cross-References

| Schema | Context |
|--------|---------|
| `component.schema.json#/$defs/TargetDefinition` | Shared type for target definition binding |
| Locale Specification (specs/locale/locale-spec.md) | Behavioral semantics for cascade, interpolation, conformance |

## x-lm Critical Properties

- `$formspecLocale` -- version pin
- `version` -- revision identifier
- `locale` -- lookup key for setLocale()
- `targetDefinition` -- prevents accidental application to wrong definitions
- `strings` -- core payload; path-based keys enable cross-reference validation

---

# Ontology Schema Reference Map

> schemas/ontology.schema.json -- 429 lines -- Sidecar document for semantic concept bindings

## Overview

The Ontology schema defines a sidecar JSON document for binding form fields to concepts in external ontologies (schema.org, FHIR, ICD-10, etc.). It contains concept bindings (field-to-concept mappings by IRI), vocabulary bindings (option-set-to-terminology mappings), cross-system alignments (SKOS-inspired typed relationships), and a JSON-LD context fragment for linked data export. Ontology Documents MUST NOT alter core behavioral semantics. All property values are static -- FEL expressions MUST NOT appear.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecOntology` | `string` (const `"1.0"`) | Yes | Specification version pin. |
| `$schema` | `string` (format: `uri`) | No | JSON Schema URI for editor validation. |
| `version` | `string` (minLength: 1) | Yes | Version of this Ontology Document. |
| `url` | `string` (format: `uri`) | No | Canonical URI identifier. |
| `name` | `string` (pattern: `^[a-zA-Z][a-zA-Z0-9_\\-]*$`) | No | Machine-readable short name. |
| `targetDefinition` | `$ref: component TargetDefinition` | Yes | Binding to the target Definition. |
| `title` | `string` | No | Human-readable name. |
| `description` | `string` | No | Purpose and scope description. |
| `publisher` | `$ref: #/$defs/Publisher` | No | Publishing organization. |
| `published` | `string` (format: `date-time`) | No | ISO 8601 publication timestamp. |
| `defaultSystem` | `string` (format: `uri`) | No | Default concept system URI when a concept binding omits `system`. |
| `concepts` | `object` (additionalProperties: ConceptBinding) | No | Map of item paths to concept bindings. |
| `vocabularies` | `object` (additionalProperties: VocabularyBinding) | No | Map of option set names to vocabulary bindings. |
| `alignments` | `array` of Alignment | No | Cross-system alignment declarations. |
| `context` | `object` (contains `@context`) | No | JSON-LD context fragment for response export. |
| `extensions` | `object` (x-prefixed keys) | No | Extension properties. |

Root object has `additionalProperties: false` with `patternProperties: { "^x-": {} }`.

## Key Type Definitions ($defs)

| Definition | Description | Required Properties | Key Properties |
|---|---|---|---|
| **Publisher** | Organization publishing the document | `name`, `url` | `contact` (optional) |
| **ConceptBinding** | Associates a field with an external ontology concept | `concept` | `system` (falls back to `defaultSystem`), `display`, `code`, `equivalents` |
| **ConceptEquivalent** | Cross-system concept equivalence | `system`, `code` | `display`, `type` (defaults to `"exact"`) |
| **VocabularyBinding** | Associates an option set with a terminology system | `system` | `version`, `display`, `filter`, `valueMap` |
| **VocabularyFilter** | Subset constraints on a vocabulary | (none) | `ancestor`, `maxDepth`, `include`, `exclude` |
| **Alignment** | Typed relationship between a field and an external concept | `field`, `target`, `type` | `bidirectional` (default false), `notes` |

## Required Fields

### Top-Level
- `$formspecOntology`, `version`, `targetDefinition`

### ConceptBinding
- `concept` (URI)

### ConceptEquivalent
- `system`, `code`

### VocabularyBinding
- `system` (URI)

### Alignment
- `field` (path), `target` (object with `system`+`code`), `type` (SKOS relationship)

## Enumerations and Patterns

| Property | Values/Pattern |
|---|---|
| SKOS relationship types | `exact`, `close`, `broader`, `narrower`, `related` (plus custom `x-` prefixed) |
| `name` | `^[a-zA-Z][a-zA-Z0-9_\\-]*$` |
| `@context` | string, object, or array (JSON-LD specification) |

## Cross-References

| Schema | Context |
|--------|---------|
| `component.schema.json#/$defs/TargetDefinition` | Shared type for target definition binding |
| Ontology Specification (specs/ontology/ontology-spec.md) | Behavioral semantics, resolution cascade, conformance |
| Extension Registry (registry.schema.json) | `concept` and `vocabulary` category entries complement Ontology Documents |
| SKOS (W3C Recommendation) | Relationship type semantics |
| JSON-LD 1.1 (W3C Recommendation) | `@context` fragment format |

## x-lm Critical Properties

- `$formspecOntology` -- version pin
- `version` -- revision identifier
- `targetDefinition` -- definition binding
- `defaultSystem` -- behavioral default for concept system resolution
- `concepts` -- the concept bindings payload
- `vocabularies` -- the vocabulary bindings payload
- `alignments` -- cross-system alignment declarations
- `context.@context` -- JSON-LD bridge

---

# References Schema Reference Map

> schemas/references.schema.json -- 324 lines -- Sidecar document for external documentation and agent data stores

## Overview

The References schema defines a sidecar JSON document for attaching external resources (documentation, regulations, knowledge bases, tool schemas, retrieval endpoints) to a Formspec Definition. References serve two audiences: human users (help articles, guidance) and AI companion agents (vector stores, RAG endpoints, tool invocations). The schema supports a `referenceDefs` registry for deduplication via `$ref` pointers, audience-based filtering (`human`/`agent`/`both`), 12 reference types across three categories (human-oriented, shared, agent-oriented), and relationship semantics (`rel`). References MUST NOT alter core behavioral semantics.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecReferences` | `string` (const `"1.0"`) | Yes | Specification version pin. |
| `url` | `string` (format: `uri`) | No | Canonical URI identifier. |
| `name` | `string` (pattern: `^[a-zA-Z][a-zA-Z0-9_\\-]*$`) | No | Machine-readable short name. |
| `title` | `string` | No | Human-readable name. |
| `description` | `string` | No | Purpose and scope description. |
| `version` | `string` (minLength: 1) | Yes | Version of this References Document. |
| `targetDefinition` | `$ref: component TargetDefinition` | Yes | Binding to the target Definition. |
| `referenceDefs` | `$ref: #/$defs/ReferenceDefs` | No | Registry of reusable Reference objects. |
| `references` | `array` of BoundReference | Yes | Ordered list of references bound to the target Definition. |

Root object has `additionalProperties: false` with `patternProperties: { "^x-": {} }`.

## Key Type Definitions ($defs)

| Definition | Description | Required Properties | Key Properties |
|---|---|---|---|
| **BoundReference** | Reference bound to a specific Definition item | `target` (+ allOf ReferenceOrRef) | All Reference properties via composition |
| **Reference** | Core reference object | `type`, `audience` | `id`, `uri`, `content`, `title`, `mediaType`, `language`, `description`, `tags`, `priority`, `rel`, `selector`, `extensions` |
| **ReferenceOrRef** | Union: inline Reference or `$ref` pointer | (oneOf) | Inline: all Reference props. $ref: `$ref` pointer + override properties |
| **ReferenceDefs** | Registry of reusable Reference objects | (none) | Keys must match `^[a-zA-Z][a-zA-Z0-9_-]*$`, values are Reference objects |

## Required Fields

### Top-Level
- `$formspecReferences`, `version`, `targetDefinition`, `references`

### Reference
- `type`, `audience`, plus at least one of `uri` or `content` (anyOf constraint)

### BoundReference
- `target`

## Enumerations and Patterns

| Property | Values/Pattern |
|---|---|
| `audience` | `human`, `agent`, `both` |
| `priority` | `primary`, `supplementary`, `background` |
| Reference `type` | `documentation`, `example`, `regulation`, `policy`, `glossary`, `schema`, `vector-store`, `knowledge-base`, `retrieval`, `tool`, `api`, `context` (plus custom `x-` prefixed) |
| `rel` | `authorizes`, `constrains`, `defines`, `exemplifies`, `supersedes`, `superseded-by`, `derived-from`, `see-also` (plus custom `x-` prefixed) |
| `id` pattern | `^[a-zA-Z][a-zA-Z0-9_-]*$` |
| `$ref` pattern | `^#/referenceDefs/[a-zA-Z][a-zA-Z0-9_-]*$` |

## Cross-References

| Schema | Context |
|--------|---------|
| `component.schema.json#/$defs/TargetDefinition` | Shared type for target definition binding |
| References Specification (specs/core/references-spec.md) | Behavioral semantics, agent integration, conformance |
| Core Specification S4.3.3 | Bind.path syntax used for `target` property |

## x-lm Critical Properties

- `$formspecReferences` -- version pin
- `version` -- revision identifier
- `targetDefinition` -- definition binding
- `references` -- the reference bindings payload
- `target` (BoundReference) -- binds reference to specific item or form
- `type` (Reference) -- determines discovery and presentation behavior
- `audience` (Reference) -- controls human/agent filtering

## Schema Design Notes

- **ReferenceOrRef uses `oneOf`**: Either a full inline Reference or a `$ref` pointer with overrides. The `$ref` branch explicitly lists override properties -- if a property is added to Reference, it must also be added to the `$ref` branch. The `id` property MUST NOT appear alongside `$ref` (enforced via `"not": { "required": ["id"] }`).
- **BoundReference uses `allOf` composition**: Composes ReferenceOrRef with the `target` property. Uses `unevaluatedProperties: false`.
- **ReferenceDefs key validation is processing-time**: If an entry declares `id`, it MUST match the key. This cannot be expressed in JSON Schema and must be enforced at runtime.
- **`anyOf` for uri/content**: At least one of `uri` or `content` must be present. Both may be present (content is fallback).
