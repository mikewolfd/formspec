# WOS Case Instance Schema Reference Map

> `wos-spec/schemas/companions/wos-case-instance.schema.json` -- 682 lines -- WOS Case Instance v1.0

## Overview

The WOS Case Instance Schema describes the serialization format for a running workflow instance. It captures the complete runtime state needed to resume processing, migrate between processors, or audit past behavior. It is a runtime artifact produced by WOS Processors.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `instanceId` | `string` (URI) | Yes | Globally unique identifier for this instance. |
| `definitionUrl` | `string` (URI) | Yes | URL of the governing Kernel Document. |
| `definitionVersion` | `string` | Yes | Pinned version of the Kernel Document. |
| `configuration` | `array` of `string` | Yes | Current active leaf states (statechart config). |
| `caseState` | `object` | Yes | Current case file field values (business data). |
| `status` | `string` (enum) | Yes | `active`, `suspended`, `migrating`, `completed`, `terminated`. |
| `provenancePosition` | `integer` | Yes | Cursor index into the append-only provenance log. |
| `timers` | `array` of `TimerState` | Yes | Pending durable timer state. |
| `activeTasks` | `array` of `ActiveTask` | Yes | Durable nonterminal task state. |
| `pendingEvents` | `array` of `PendingEvent` | No | FIFO queue of events enqueued but not yet processed. |
| `governanceState` | `$ref: GovernanceState` | No | Active delegations, holds, and review protocol status. |
| `volumeCounters` | `$ref: VolumeCounters` | No | AI invocation counters for rate-limiting. |
| `historyStore` | `object` | No | Saved history state configurations for compound reentry. |
| `compensationLogs` | `object` | No | Active recovery logs for compensable scopes. |
| `createdAt` / `updatedAt` | `dateTime` | Yes | Lifecycle timestamps. |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties |
|---|---|---|
| **TimerState** | Resumable timer. | `timerId`, `deadline`, `event`, `scopeState` |
| **ActiveTask** | Resumable task. | `taskId`, `taskRef`, `status`, `assignedActor`, `contractRef` |
| **PendingEvent** | Queued trigger. | `event`, `actorId`, `data`, `timestamp` |
| **ActiveDelegation** | Operational authority. | `delegatorId`, `delegateId`, `scope`, `authority` |
| **ActiveHold** | Operational suspension. | `holdType`, `startedAt`, `resumeTrigger` |
| **VolumeCounter** | Rate limit bucket. | `count`, `windowStart` |

## x-lm Annotations (Critical)

| Property Path | Intent |
|---|---|
| `instanceId` | Unique identity for routing and cross-case relationships. |
| `definitionUrl` | Immutable link to the governing specification. |
| `definitionVersion` | Immutable version pin for behavioral consistency. |
| `configuration` | The current "you are here" marker in the statechart. |
| `caseState` | The authoritative snapshot of business data. |
| `status` | Determines whether the instance accepts new events. |
| `provenancePosition` | Ensures audit-sync and idempotent recovery from crashes. |
| `timers` | Ensures time-based logic (SLAs, timeouts) survives restarts. |
| `activeTasks` | Ensures human/agent work-in-progress is not lost. |
| `context.contractRef` | Stable handoff shape for Formspec-backed task rendering. |
