# WOS Equity Config — Schema Reference Map

> `wos-spec/schemas/advanced/wos-equity.schema.json` — 224 lines — JSON Schema property index

## Overview

A WOS Equity Config sidecar document. Provides detailed equity monitoring configuration -- protected category definitions, disparity calculation methods, reporting schedules, remediation triggers. Equity monitoring applies to human AND AI decisions.

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosEquityConfig` | string | See schema for constraints. |
| `disparityMethods` | array | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `protectedCategories` | array | See schema for constraints. |
| `remediationTriggers` | array | See schema for constraints. |
| `reportingSchedule` | ReportingSchedule | See schema for constraints. |
| `targetWorkflow` | string | See schema for constraints. |
| `title` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **DisparityMethod** |
| **ExtensionsMap** |
| **JsonSchemaUri** |
| **ProtectedCategory** |
| **RemediationTrigger** |
| **ReportingSchedule** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
