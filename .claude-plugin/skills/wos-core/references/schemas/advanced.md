# WOS Advanced Governance Schema Reference Map

> `wos-spec/schemas/advanced/wos-advanced.schema.json` -- 582 lines -- WOS Advanced Governance v1.0 (Layer 3)

## Overview

The WOS Advanced Governance Schema describes Layer 3: Verification & Adaptive Management. It targets a WOS Kernel workflow and declares equity guardrails, adaptive Constraint Zones (DCR-style), multi-step session policies, and formal verification hooks (SMT). It provides operational resilience patterns like shadow mode and circuit breakers.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$wosAdvancedGovernance` | `string` (const `"1.0"`) | Yes | Specification version pin. |
| `targetWorkflow` | `string` (format: `uri`) | Yes | Registry URI of the Kernel Document this document targets. |
| `version` | `string` | No | Version of this advanced governance document. |
| `equityGuardrails` | `array` of `EquityGuardrail` | No | Asynchronous monitors for statistical outcome disparity. |
| `constraintZones` | `array` of `ConstraintZone` | No | Declarative, adaptive case management phases (DCR-style). |
| `multiStepSessions` | `array` of `MultiStepSession` | No | Checkpoints and intervention points for compound agent sessions. |
| `toolGovernance` | `$ref: ToolGovernance` | No | Registry and side-effect policies for agent tool use. |
| `agentLifecycle` | `$ref: AgentLifecycleConfig` | No | Multi-state management (Active/Degraded/Suspended). |
| `verifiableConstraints` | `array` of `VerifiableConstraint` | No | Annotations for SMT verification of deontic constraints. |
| `calibration` | `$ref: CalibrationConfig` | No | Methods for reported-vs-actual probability alignment. |
| `shadowMode` | `$ref: ShadowMode` | No | Side-by-side agent validation before production commit. |
| `circuitBreaker` | `$ref: CircuitBreaker` | No | Automatic fallback triggering on high error rates. |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties |
|---|---|---|
| **EquityGuardrail** | Disparity monitor. | `metric`, `groupBy` (path), `maxDisparity`, `onViolation` |
| **ConstraintZone** | DCR activity graph. | `id`, `activities` (included/pending), `relations` (condition/response/etc.) |
| **ZoneActivity** | Activity with markings. | `id`, `initialIncluded`, `initialPending` |
| **ZoneRelation** | DCR constraint. | `type`, `source` (id), `target` (id) |
| **VerifiableConstraint** | SMT verification hook. | `constraintRef` (L2 ID), `verifiable: true`, `expression` |
| **CircuitBreaker** | Resilience pattern. | `enabled`, `errorRateThreshold`, `cooldownDuration` |

## x-lm Annotations (Critical)

| Property Path | Intent |
|---|---|
| `$wosAdvancedGovernance` | Version pin for schema compatibility. |
| `targetWorkflow` | Binding to a specific kernel identity. |
| `constraintZones` | Adaptive case management phases where actions are governed by DCR relations. |
| `equity.metric` | The workflow outcome being monitored for statistical disparity. |
| `equity.groupBy` | The demographic or categorical dimension across which disparity is measured. |
| `activity.id` | Identifies the activity within the adaptive case management phase. |
| `relation.type` | Determines the constraint semantics between two activities (e.g. condition, response). |
| `verifiable.constraintRef` | Identifies which deontic constraint is subject to formal SMT verification. |
