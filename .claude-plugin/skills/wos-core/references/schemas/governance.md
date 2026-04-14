# WOS Workflow Governance Schema Reference Map

> `wos-spec/schemas/governance/wos-workflow-governance.schema.json` -- 1050 lines -- WOS Workflow Governance v1.0 (Layer 1)

## Overview

The WOS Workflow Governance Schema describes Layer 1: Human Governance. It targets a WOS Kernel workflow and declares due process, review protocols, validation pipelines, and audit requirements. Layer 1 ensures procedural fairness and evidentiary standards for high-stakes human workflows.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$wosWorkflowGovernance` | `string` (const `"1.0"`) | Yes | Specification version pin. |
| `targetWorkflow` | `string` (format: `uri`) | Yes | Registry URI of the Kernel Document this governance document targets. |
| `version` | `string` | No | Version of this governance document. |
| `title` / `description` | `string` | No | Human-readable metadata. |
| `dueProcess` | `$ref: DueProcess` | No | Notice, explanation, and appeal rules (rights-impacting). |
| `reviewProtocols` | `array` of `ReviewProtocolBinding` | No | Cognitive forcing functions (independentFirst, etc.). |
| `pipelines` | `array` of `Pipeline` | No | Multi-stage data validation with assertion gates. |
| `audit` | `$ref: AuditConfig` | No | Reasoning and Counterfactual tier requirements. |
| `qualityControls` | `$ref: QualityControls` | No | Sampling, separation of duties, and override authority. |
| `taskCatalog` | `array` of `TaskPattern` | No | Verifiability matrix for task types. |
| `delegations` | `array` of `Delegation` | No | Authorization chains for determination signing (determination, signing). |
| `holdPolicies` | `array` of `HoldPolicy` | No | Semantics for typed case holds (e.g. pending-applicant). |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties |
|---|---|---|
| **DueProcess** | High-level fairness policy. | `scope` (FEL), `adverseDecisionPolicy` |
| **ReviewProtocolBinding** | Attaches protocols to tags. | `tags`, `protocols`, `scope` |
| **Pipeline** | Staged data validation. | `id`, `stages` (contract-validation / assertion-gate) |
| **Assertion** | Individual gate check. | `type` (source-grounded/arithmetic/etc.), `expression` |
| **Delegation** | Formal authorization. | `delegator`, `delegate`, `authority`, `legalInstrument` |
| **HoldPolicy** | Case suspension logic. | `holdType`, `expectedDuration`, `resumeTrigger` |

## x-lm Annotations (Critical)

| Property Path | Intent |
|---|---|
| `$wosWorkflowGovernance` | Version pin for schema compatibility. |
| `targetWorkflow` | Binding to a specific kernel identity. |
| `dueProcess` | Procedural fairness for individuals affected by decisions. |
| `reviewProtocols` | Empirically grounded review procedures to ensure cognitive engagement. |
| `delegations` | Chain of authority for legally binding determinations. |
| `holdPolicies` | Semantic definitions for case suspension and timeout behavior. |
| `protocol.tags` | Declares which transitions are governed by which protocols. |
| `stage.type` | Determines the fundamental verification logic of a pipeline stage. |
