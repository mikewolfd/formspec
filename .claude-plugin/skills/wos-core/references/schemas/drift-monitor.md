# WOS Drift Monitor Config — Schema Reference Map

> `wos-spec/schemas/ai/wos-drift-monitor.schema.json` — 285 lines — JSON Schema property index

## Overview

A WOS Drift Monitor Config sidecar document. Provides drift detection and monitoring configuration for agents in a WOS workflow -- drift detection methods, evaluation windows, alert thresholds, rubber-stamp detection, and deployment sequence policies. Monitoring parameters can be tuned independently of the governance document.

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosDriftMonitor` | string | See schema for constraints. |
| `deploymentSequence` | DeploymentSequence | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `monitors` | array | See schema for constraints. |
| `targetWorkflow` | string | See schema for constraints. |
| `title` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **AgentMonitor** |
| **AlertThreshold** |
| **DeploymentSequence** |
| **ExtensionsMap** |
| **JsonSchemaUri** |
| **MonitorMetric** |
| **RubberStampConfig** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
