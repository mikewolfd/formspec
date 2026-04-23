# WOS Lifecycle Detail Configuration — Schema Reference Map

> `wos-spec/schemas/companions/wos-lifecycle-detail.schema.json` — 226 lines — JSON Schema property index

## Overview

A WOS Lifecycle Detail Configuration document per the WOS Lifecycle Detail Companion v1.0. Provides detailed compensation, history, and timer configuration that elaborates the kernel's lifecycle semantics. This is an optional companion to a WOS Kernel Document -- a Kernel Structural processor does not need it. A Kernel Complete processor SHOULD use it to configure advanced execution behavior: compensation recovery mode, parallel cancellation behavior, history state policies, and timer tolerance.

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosLifecycleDetail` | string | See schema for constraints. |
| `compensation` | CompensationConfig | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `scxmlMapping` | ScxmlMappingConfig | See schema for constraints. |
| `targetWorkflow` | string | See schema for constraints. |
| `timerConfig` | TimerConfig | See schema for constraints. |
| `title` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **CompensationConfig** |
| **CompensationScopeOverride** |
| **ExtensionsMap** |
| **JsonSchemaUri** |
| **ScxmlMappingConfig** |
| **TimerConfig** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
