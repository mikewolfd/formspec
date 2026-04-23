# WOS Case Instance — Schema Reference Map

> `wos-spec/schemas/companions/wos-case-instance.schema.json` — 892 lines — JSON Schema property index

## Overview

A WOS CaseInstance document per the WOS Runtime Companion v1.0. A CaseInstance is the serialization format for a running workflow instance -- it captures the complete runtime state needed to resume processing after a crash, migrate between processors, or audit past behavior. This is a runtime artifact, not a WOS document type: it has no $wos* marker because it is produced and consumed by processors, not authored by workflow designers. The instance shape is normatively defined so that instances c

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `activeTasks` | array | See schema for constraints. |
| `caseState` | object | See schema for constraints. |
| `compensationLogs` | object | See schema for constraints. |
| `configuration` | array | See schema for constraints. |
| `createdAt` | string | See schema for constraints. |
| `definitionUrl` | string | See schema for constraints. |
| `definitionVersion` | string | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `governanceState` | GovernanceState | See schema for constraints. |
| `historyStore` | object | See schema for constraints. |
| `instanceId` | string | See schema for constraints. |
| `pendingEvents` | array | See schema for constraints. |
| `provenancePosition` | integer | See schema for constraints. |
| `status` | enum(active, suspended, migrating, completed, terminated) | See schema for constraints. |
| `timers` | array | See schema for constraints. |
| `updatedAt` | string | See schema for constraints. |
| `volumeCounters` | VolumeCounters | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **ActiveDelegation** |
| **ActiveHold** |
| **ActiveTask** |
| **CompensationEntry** |
| **CompensationLog** |
| **ExtensionsMap** |
| **FormspecTaskContext** |
| **GovernanceState** |
| **JsonSchemaUri** |
| **PendingEvent** |
| **TimerState** |
| **ValidationOutcome** |
| **VolumeCounter** |
| **VolumeCounters** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
