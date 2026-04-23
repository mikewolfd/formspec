# WOS Workflow Governance Document — Schema Reference Map

> `wos-spec/schemas/governance/wos-workflow-governance.schema.json` — 1698 lines — JSON Schema property index

## Overview

A WOS Workflow Governance Document per the WOS Workflow Governance Specification v1.0 (Layer 1). Targets a WOS Kernel Document and declares due process requirements, review protocols, data validation pipelines with assertion gates, structured audit (Reasoning and Counterfactual tiers), quality controls (review sampling, separation of duties, override authority), rejection and remediation policies, task catalog with verifiability matrix, delegation of authority, and typed hold policies. Layer 1 e

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosWorkflowGovernance` | string | See schema for constraints. |
| `audit` | AuditConfig | See schema for constraints. |
| `delegations` | array | See schema for constraints. |
| `description` | string | See schema for constraints. |
| `dueProcess` | DueProcess | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `holdPolicies` | array | See schema for constraints. |
| `maxDelegationDepth` | integer | See schema for constraints. |
| `pipelines` | array | See schema for constraints. |
| `qualityControls` | QualityControls | See schema for constraints. |
| `reviewProtocols` | array | See schema for constraints. |
| `schemaUpgrade` | object | See schema for constraints. |
| `targetWorkflow` | string | See schema for constraints. |
| `taskCatalog` | array | See schema for constraints. |
| `title` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **AdverseDecisionPolicy** |
| **AppealMechanism** |
| **Assertion** |
| **AuditConfig** |
| **BreachPolicy** |
| **CounterfactualTierConfig** |
| **Delegation** |
| **DelegationScope** |
| **DueProcess** |
| **EscalationStep** |
| **EvidenceReference** |
| **ExtensionsMap** |
| **HoldPolicy** |
| **JsonSchemaUri** |
| **OverrideAuthority** |
| **OverrideRecord** |
| **Pipeline** |
| **PipelineStage** |
| **QualityControls** |
| **ReasoningTierConfig** |
| **ReviewProtocolBinding** |
| **ReviewSampling** |
| **RuleReference** |
| **SeparationOfDuties** |
| **SlaDefinition** |
| **TaskPattern** |
| **WarningThreshold** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
