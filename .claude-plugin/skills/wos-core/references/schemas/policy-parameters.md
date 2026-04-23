# WOS Policy Parameter Config — Schema Reference Map

> `wos-spec/schemas/governance/wos-policy-parameters.schema.json` — 344 lines — JSON Schema property index

## Overview

A WOS Policy Parameter Config sidecar document. Provides date-indexed parameter values for temporal parameter resolution in WOS workflows. Government workflows apply rules effective at specific dates, not today's date. Each parameter declares its effective-date schedule and a resolution date reference -- the case state field that determines which date-effective value applies. Follows the OpenFisca model of date-indexed parameter values.

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosPolicyParameters` | string | See schema for constraints. |
| `bindings` | object | See schema for constraints. |
| `description` | string | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `parameters` | object | See schema for constraints. |
| `targetWorkflow` | string | See schema for constraints. |
| `title` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **BindingDateValue** |
| **DateValue** |
| **ExtensionsMap** |
| **JsonSchemaUri** |
| **ParameterDefinition** |
| **RegulatoryBinding** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
