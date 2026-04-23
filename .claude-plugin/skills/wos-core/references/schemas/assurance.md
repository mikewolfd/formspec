# WOS Assurance Declaration — Schema Reference Map

> `wos-spec/schemas/assurance/wos-assurance.schema.json` — 99 lines — JSON Schema property index

## Overview

Assurance-level and subject-continuity declarations (WOS Assurance Layer).

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `assuranceLevel` | string | See schema for constraints. |
| `attestation` | object | See schema for constraints. |
| `disclosurePosture` | enum(anonymous, pseudonymous, identified, public) | See schema for constraints. |
| `subjectContinuity` | object | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| *(none)* |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
