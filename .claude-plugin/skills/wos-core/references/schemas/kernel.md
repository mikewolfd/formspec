# WOS Kernel Schema Reference Map

> `wos-spec/schemas/kernel/wos-kernel.schema.json` -- 720 lines -- WOS Kernel Document v1.0

## Overview

The WOS Kernel Schema describes a WOS Kernel Document: the minimal orchestration substrate. It defines lifecycle topology (states/transitions), case state (typed data), actor models, and extension seams. It handles the "Facts" tier of provenance and provides durable execution guarantees. WOS is a companion framework to Formspec and does not alter Formspec semantics.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$wosKernel` | `string` (const `"1.0"`) | Yes | Specification version pin. Must be `"1.0"`. |
| `url` | `string` (format: `uri`) | No | Canonical URI identifier. Stable across versions. |
| `version` | `string` | No | Version of this document (SemVer recommended). |
| `title` | `string` | No | Human-readable name for the workflow. |
| `description` | `string` | No | Human-readable description of purpose and scope. |
| `status` | `string` (enum) | No | Lifecycle state: `draft` -> `active` -> `retired`. |
| `impactLevel` | `string` (enum) | No | Consequence level: `rights-impacting`, `safety-impacting`, `operational`, `informational`. Default: `operational`. |
| `actors` | `array` of `$ref: ActorDeclaration` | No | Declarations of participating human/system actors. |
| `lifecycle` | `$ref: Lifecycle` | Yes | Statechart defining states, transitions, and milestones. |
| `caseFile` | `$ref: CaseFile` | No | Typed data schema for the workflow instance state. |
| `contracts` | `object` of `$ref: ContractReference` | No | Named validation/participation contracts (Formspec/JSON Schema). |
| `provenance` | `$ref: ProvenanceConfig` | No | Crypto-digest and audit configuration (Facts tier). |
| `execution` | `$ref: ExecutionConfig` | No | Timeout, idempotency, and versioning policies. |
| `evaluationMode` | `string` (enum) | No | `event-driven` (default) or `continuous` guard evaluation. |
| `maxRelationshipEventDepth` | `integer` | No | Cascade limit for relationship events. Default: 3. |
| `extensions` | `object` (propertyNames: `^x-`) | No | Domain-specific extension data. |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties |
|---|---|---|
| **ActorDeclaration** | Defines a human or system actor. | `id`, `type` (human/system), `description` |
| **Lifecycle** | The statechart root. | `initialState`, `states` (map), `milestones` (map) |
| **State** | A node in the statechart. | `type` (atomic/compound/parallel/final), `transitions`, `tags` |
| **Transition** | Movement between states. | `event`, `target`, `guard` (FEL), `actions`, `tags` |
| **Action** | Operation executed by processor. | `action` (createTask/invokeService/setData/etc.), `taskRef`, `path` |
| **CaseFile** | Instance data model. | `fields` (map), `relationships` (array) |
| **FieldDefinition** | Simple type for case data. | `type` (string/number/boolean/etc.), `default` |
| **ContractReference** | Binding to external validator. | `binding` (formspec/jsonSchema), `ref` (URI) |
| **ExecutionConfig** | Operational policies. | `workflowTimeout`, `idempotencyKey`, `instanceVersioning` |

## Required Fields

### Top-Level
- `$wosKernel`, `lifecycle`

### ActorDeclaration / State / Action
- `id`, `type` / `type` / `action`

### Lifecycle / Region
- `initialState`, `states`

### Transition
- `event`, `target`

## Enumerations

| Enum | Values | Used At |
|---|---|---|
| `status` | `draft`, `active`, `retired` | Top-level `status` |
| `impactLevel` | `rights-impacting`, `safety-impacting`, `operational`, `informational` | Top-level `impactLevel` |
| `actor.type` | `human`, `system` | `ActorDeclaration.type` |
| `state.type` | `atomic`, `compound`, `parallel`, `final` | `State.type` |
| `action.action` | `createTask`, `invokeService`, `setData`, `emitEvent`, `startTimer`, `cancelTimer`, `log` | `Action.action` |
| `evaluationMode` | `event-driven`, `continuous` | Top-level `evaluationMode` |

## x-lm Annotations (Critical)

| Property Path | Intent |
|---|---|
| `$wosKernel` | Version pin for WOS Kernel document compatibility. |
| `url` | Stable identifier for workflow logic across versions. |
| `impactLevel` | Governs the strength of governance controls (sieve proportionality). |
| `actors` | Defines participation model and provenance requirements. |
| `lifecycle` | The normative state machine ruling instance behavior. |
| `evaluationMode` | Controls whether workflow reacts to events OR pure data changes. |
| `action.action` | Determines the fundamental capability exposed to transitions. |
