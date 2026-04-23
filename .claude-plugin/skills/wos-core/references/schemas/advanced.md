# WOS Advanced Governance Document — Schema Reference Map

> `wos-spec/schemas/advanced/wos-advanced.schema.json` — 863 lines — JSON Schema property index

## Overview

A WOS Advanced Governance Document per the WOS Advanced Governance Specification v1.0 (Layer 3). Targets a WOS Kernel Document and declares verifiable constraint subsets (SMT), equity guardrails, constraint zones (DCR-style), multi-step sessions, tool use governance, agent lifecycle state machines, calibration methods, drift detection methods, shadow mode, and circuit breaker patterns. These capabilities serve any complex workflow -- DCR constraint zones model compliance rules for human case man

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosAdvancedGovernance` | string | See schema for constraints. |
| `agentLifecycle` | AgentLifecycleConfig | See schema for constraints. |
| `calibration` | CalibrationConfig | See schema for constraints. |
| `circuitBreaker` | CircuitBreaker | See schema for constraints. |
| `constraintZones` | array | See schema for constraints. |
| `description` | string | See schema for constraints. |
| `driftDetection` | DriftDetectionConfig | See schema for constraints. |
| `equityGuardrails` | array | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `multiStepSessions` | array | See schema for constraints. |
| `shadowMode` | ShadowMode | See schema for constraints. |
| `targetWorkflow` | string | See schema for constraints. |
| `title` | string | See schema for constraints. |
| `toolGovernance` | ToolGovernance | See schema for constraints. |
| `verifiableConstraints` | array | See schema for constraints. |
| `version` | string | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **AgentLifecycleConfig** |
| **CalibrationConfig** |
| **CircuitBreaker** |
| **ConstraintZone** |
| **DriftDetectionConfig** |
| **DriftDimension** |
| **DriftMethod** |
| **EquityGuardrail** |
| **ExtensionsMap** |
| **JsonSchemaUri** |
| **LifecycleTransition** |
| **MultiStepSession** |
| **RateLimit** |
| **SessionStep** |
| **ShadowMode** |
| **ToolDefinition** |
| **ToolGovernance** |
| **VerifiableConstraint** |
| **ZoneActivity** |
| **ZoneRelation** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
