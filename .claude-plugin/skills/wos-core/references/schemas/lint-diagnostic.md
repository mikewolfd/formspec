# WOS Lint Diagnostic — Schema Reference Map

> `wos-spec/schemas/lint/wos-lint-diagnostic.schema.json` — 135 lines — JSON Schema property index

## Overview

Schema for a single structured diagnostic emitted by wos-lint. Stable JSON serialization consumed by LLM authoring loops, downstream tooling, and CI pipelines.

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `message` | string | See schema for constraints. |
| `path` | string | See schema for constraints. |
| `relatedDocs` | array | See schema for constraints. |
| `ruleId` | string | See schema for constraints. |
| `severity` | enum(error, warning, info) | See schema for constraints. |
| `source` | object | See schema for constraints. |
| `suggestedFix` | object | See schema for constraints. |
| `tier` | enum(T1, T2, T3) | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| *(none)* |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
