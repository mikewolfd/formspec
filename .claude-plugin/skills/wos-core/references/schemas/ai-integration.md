# WOS AI Integration Document — Schema Reference Map

> `wos-spec/schemas/ai/wos-ai-integration.schema.json` — 1203 lines — JSON Schema property index

## Overview

A WOS AI Integration Document per the WOS AI Integration Specification v1.0 (Layer 2). Targets a WOS Kernel Document and declares agent registration, deontic constraints (permission/prohibition/obligation/right), autonomy levels with impact-level caps, Formspec-as-validator pattern, confidence framework with decay, fallback chains, decision drift detection, AI-specific oversight extensions, volume constraints, agent-specific review sampling, agent disclosure, and Narrative provenance tier. Every

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosAIIntegration` | string | See schema for constraints. |
| `agentDisclosure` | AgentDisclosure | See schema for constraints. |
| `agents` | array | See schema for constraints. |
| `assistGovernanceProxy` | AssistGovernanceProxy | See schema for constraints. |
| `confidenceFloor` | ConfidenceFloor | See schema for constraints. |
| `defaultAutonomy` | enum(autonomous, supervisory, assistive, manual) | See schema for constraints. |
| `deonticConstraints` | DeonticConstraints | See schema for constraints. |
| `description` | string | See schema for constraints. |
| `driftDetection` | DriftDetectionConfig | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `fallbackChain` | array | See schema for constraints. |
| `narrativeTier` | NarrativeTierConfig | See schema for constraints. |
| `oversightExtensions` | OversightExtensions | See schema for constraints. |
| `reviewSampling` | AgentReviewSampling | See schema for constraints. |
| `targetWorkflow` | string | See schema for constraints. |
| `title` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |
| `volumeConstraints` | VolumeConstraints | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **AgentDeclaration** |
| **AgentDisclosure** |
| **AgentReviewSampling** |
| **AssistGovernanceProxy** |
| **Capability** |
| **ConfidenceDecay** |
| **ConfidenceFloor** |
| **DecayTrigger** |
| **DeonticConstraints** |
| **DriftDetectionConfig** |
| **ExtensionsMap** |
| **FallbackLevel** |
| **JsonSchemaUri** |
| **NarrativeTierConfig** |
| **NullBehavior** |
| **Obligation** |
| **OversightExtensions** |
| **OversightPresentation** |
| **Permission** |
| **Prohibition** |
| **Right** |
| **RubberStampConfig** |
| **ToolCategoryGovernance** |
| **ViolationAction** |
| **VolumeConstraints** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
