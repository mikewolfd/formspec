# WOS Assertion Gate Library — Schema Reference Map

> `wos-spec/schemas/governance/wos-assertion-gate.schema.json` — 269 lines — JSON Schema property index

## Overview

A WOS Assertion Gate Library sidecar document. Provides a reusable collection of assertion gate definitions for WOS data validation pipelines. Pipelines reference assertions by identifier, enabling shared definitions across multiple pipelines and governance documents.

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosAssertionLibrary` | string | See schema for constraints. |
| `assertions` | array | See schema for constraints. |
| `description` | string | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `title` | string | See schema for constraints. |
| `url` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **AssertionDefinition** |
| **AssertionInlineUse** |
| **AssertionReference** |
| **AssertionUse** |
| **ExtensionsMap** |
| **JsonSchemaUri** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
