# WOS Semantic Profile Document — Schema Reference Map

> `wos-spec/schemas/profiles/wos-semantic-profile.schema.json` — 386 lines — JSON Schema property index

## Overview

A WOS Semantic Profile Document per the WOS Semantic Profile specification v1.0. A parallel seam document that declares linked data semantics for a WOS workflow: a JSON-LD @context mapping WOS properties to RDF terms, SHACL shape references for semantic validation, PROV-O vocabulary mappings for provenance export, and XES/OCEL export configuration for process mining interoperability. The Semantic Profile adds interpretation and export capability without changing how WOS documents are processed. 

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosSemanticProfile` | string | See schema for constraints. |
| `context` | ContextConfiguration | See schema for constraints. |
| `description` | string | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `processMining` | ProcessMiningConfiguration | See schema for constraints. |
| `provMapping` | ProvMappingConfiguration | See schema for constraints. |
| `shapes` | ShapeConfiguration | See schema for constraints. |
| `targetWorkflow` | TargetWorkflow | See schema for constraints. |
| `title` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **ContextConfiguration** |
| **DomainVocabulary** |
| **ExtensionsMap** |
| **JsonSchemaUri** |
| **ProcessMiningConfiguration** |
| **ProvMappingConfiguration** |
| **ShapeConfiguration** |
| **TargetWorkflow** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
