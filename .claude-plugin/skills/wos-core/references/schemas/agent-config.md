# WOS Agent Config — Schema Reference Map

> `wos-spec/schemas/ai/wos-agent-config.schema.json` — 319 lines — JSON Schema property index

## Overview

A WOS Agent Config sidecar document. Provides detailed operational configuration for an agent declared in a WOS AI Integration Document -- endpoint configuration, credential references, approved model version lists, calibration requirements, autonomy escalation and demotion policies, and per-action overrides. Operational parameters can be updated independently of the governance document.

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosAgentConfig` | string | See schema for constraints. |
| `actionOverrides` | array | See schema for constraints. |
| `approvedVersions` | array | See schema for constraints. |
| `autonomyPolicy` | AutonomyPolicy | See schema for constraints. |
| `calibration` | CalibrationConfig | See schema for constraints. |
| `endpoint` | EndpointConfig | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `targetAgent` | string | See schema for constraints. |
| `targetIntegration` | string | See schema for constraints. |
| `title` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **ActionOverride** |
| **AutonomyPolicy** |
| **CalibrationConfig** |
| **DemotionRule** |
| **EndpointConfig** |
| **EscalationRule** |
| **ExtensionsMap** |
| **JsonSchemaUri** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
