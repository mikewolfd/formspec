# WOS Conformance Trace — Schema Reference Map

> `wos-spec/schemas/conformance/conformance-trace.schema.json` — 304 lines — JSON Schema property index

## Overview

Structured execution trace emitted by the WOS conformance runner for a single fixture. Each trace records the fixture identity, kernel version, the ordered sequence of event-processing steps (with guard evaluations and policy applications observed during each step), and the final pass/fail/error outcome. Downstream consumers (wos-mcp, explain/diff CLI, external validators) use this document to diagnose conformance failures, generate teaching signals for LLM-assisted repair, and track regression 

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | string | See schema for constraints. |
| `fixtureId` | string | See schema for constraints. |
| `kernelVersion` | string | See schema for constraints. |
| `outcome` | enum(pass, fail, error) | See schema for constraints. |
| `steps` | array | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **Delta** |
| **DeltaGuardFalse** |
| **DeltaPolicyOverride** |
| **DeltaStateMismatch** |
| **Event** |
| **GuardEvaluation** |
| **PolicyApplication** |
| **TraceStep** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
