# WOS Due Process Config — Schema Reference Map

> `wos-spec/schemas/governance/wos-due-process.schema.json` — 195 lines — JSON Schema property index

## Overview

A WOS Due Process Config sidecar document. Provides detailed due process configuration -- notice templates, explanation templates, appeal routing, continuation-of-service policies -- for a WOS Workflow Governance Document. Operational parameters can be updated independently of the governance structure.

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosDueProcess` | string | See schema for constraints. |
| `appealRouting` | AppealRouting | See schema for constraints. |
| `continuationPolicies` | array | See schema for constraints. |
| `explanationTemplates` | array | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `targetGovernance` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **AppealRouting** |
| **ContinuationPolicy** |
| **ExplanationTemplate** |
| **ExtensionsMap** |
| **JsonSchemaUri** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
