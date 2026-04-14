# WOS AI Integration Schema Reference Map

> `wos-spec/schemas/ai/wos-ai-integration.schema.json` -- 1026 lines -- WOS AI Integration v1.0 (Layer 2)

## Overview

The WOS AI Integration Schema describes Layer 2: AI Governance. It registers AI agents as actors and imposes deontic constraints (Permissions, Prohibitions, Obligations, Rights) on their behavior. Layer 2 implements the "agent as untrusted user" pattern, where agent output is validated against high-stakes contracts before being committed to case state.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$wosAIIntegration` | `string` (const `"1.0"`) | Yes | Specification version pin. |
| `targetWorkflow` | `string` (format: `uri`) | Yes | Registry URI of the Kernel Document this document targets. |
| `version` | `string` | No | Version of this integration document. |
| `agents` | `array` of `AgentDeclaration` | Yes | Registration of AI agents participating in the workflow. |
| `deonticConstraints` | `$ref: DeonticConstraints` | No | Frame of Permissions, Prohibitions, Obligations, and Rights. |
| `confidenceFloor` | `$ref: ConfidenceFloor` | No | Global minimum confidence for autonomous actions. |
| `fallbackChain` | `array` of `FallbackLevel` | No | Default recovery path for agent invocation failures. |
| `oversightExtensions` | `$ref: OversightExtensions` | No | AI-specific review UI controls (e.g. `suppressAgentOutput`). |
| `volumeConstraints` | `$ref: VolumeConstraints` | No | Rate limits for autonomous agent actions. |
| `driftDetection` | `$ref: DriftDetectionConfig` | No | Statistical monitoring for behavioral shift. |
| `narrativeTier` | `$ref: NarrativeTierConfig` | No | Configuration for model-generated, non-authoritative explanations. |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties |
|---|---|---|
| **AgentDeclaration** | Defines a single AI model actor. | `id`, `agentType` (generative/etc.), `modelIdentifier`, `modelVersion` |
| **Capability** | Named task with I/O contracts. | `id`, `inputContractRef`, `outputContractRef` |
| **Permission** | Declares permitted value bounds. | `id`, `allowedFields`, `bounds` (FEL), `onViolation` |
| **Prohibition** | Forbids specified conditions. | `id`, `condition` (FEL), `reason`, `onViolation` |
| **Obligation** | Requires specified conditions. | `id`, `requirement` (FEL), `reason`, `onViolation` |
| **Right** | Specifies input entitlements. | `id`, `entitlement` (path), `description` |
| **FallbackLevel** | Single recovery step. | `action` (retry/escalate/etc.), `taskRef`, `alternateAgentRef` |
| **OversightExtensions** | UI governance for AI review. | `suppressAgentOutput`, `presentation` |

## Deontic Enforcement Order

Processor guardrails MUST execute in this normative order:
1. **Contract Validation:** Check agent output against `outputContractRef`.
2. **Permission:** Verify all fields/values are within permitted bounds.
3. **Prohibition:** Verify no `condition` evaluates to `true`.
4. **Obligation:** Verify all `requirement` expressions evaluate to `true`.
5. **Confidence Floor:** Verify reported confidence meets the required floor.
6. **Volume Constraints:** Verify invocation is within rate limits.

## x-lm Annotations (Critical)

| Property Path | Intent |
|---|---|
| `$wosAIIntegration` | Version pin for schema compatibility. |
| `targetWorkflow` | Binding to a specific kernel identity. |
| `agents` | Registers agents with identity and taxonomy (deterministic/generative). |
| `agentType` | Generative agents require the strongest controls and oversight. |
| `deonticConstraints` | Fundamental structural governance boundary for agent outputs. |
| `fallbackChain` | Guarantees every agent failure has a defined human resolution path. |
| `prohibition.condition` | The guard expression that forbids specific high-risk agent outputs. |
| `obligation.requirement` | The guard expression that mandates specific safety/audit content. |
