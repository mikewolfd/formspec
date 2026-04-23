# WOS Verification Report — Schema Reference Map

> `wos-spec/schemas/advanced/wos-verification-report.schema.json` — 226 lines — JSON Schema property index

## Overview

A WOS Verification Report sidecar document. Records the results of SMT-based formal verification of deontic constraints and governance rules. Captures which constraints were verified, the result (proven-safe, proven-unsafe, inconclusive), counterexamples, and solver metadata. Reports are immutable provenance artifacts.

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosVerificationReport` | string | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `results` | array | See schema for constraints. |
| `solver` | SolverInfo | See schema for constraints. |
| `summary` | VerificationSummary | See schema for constraints. |
| `targetWorkflow` | string | See schema for constraints. |
| `timestamp` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **ConstraintResult** |
| **Counterexample** |
| **ExtensionsMap** |
| **JsonSchemaUri** |
| **SolverInfo** |
| **VerificationSummary** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
