# WOS Business Calendar Config — Schema Reference Map

> `wos-spec/schemas/sidecars/wos-business-calendar.schema.json` — 238 lines — JSON Schema property index

## Overview

A WOS Business Calendar Config sidecar document. Defines business days, holiday schedules, and operating hours for SLA evaluation and temporal parameter resolution in WOS workflows. Government workflows measure deadlines in business days, not wall-clock time: a 30-day response window excludes weekends and holidays. The governance layer's SLA evaluation (Governance S10.3) and temporal parameter resolution (Governance S13.3) consume this sidecar when present. When absent, SLA evaluation uses wall-

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosBusinessCalendar` | string | See schema for constraints. |
| `appliesWhen` | string | See schema for constraints. |
| `description` | string | See schema for constraints. |
| `effectiveDate` | string | See schema for constraints. |
| `expirationDate` | string | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `holidays` | array | See schema for constraints. |
| `operatingHours` | OperatingHours | See schema for constraints. |
| `targetWorkflow` | string | See schema for constraints. |
| `timezone` | string | See schema for constraints. |
| `title` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |
| `workWeek` | array | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **ExtensionsMap** |
| **Holiday** |
| **JsonSchemaUri** |
| **OperatingHours** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
