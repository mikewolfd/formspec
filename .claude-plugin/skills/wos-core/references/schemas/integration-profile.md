# WOS Integration Profile Document — Schema Reference Map

> `wos-spec/schemas/profiles/wos-integration-profile.schema.json` — 638 lines — JSON Schema property index

## Overview

A WOS Integration Profile Document per the WOS Integration Profile specification v1.0. A parallel seam document that declares named integration bindings for a WOS workflow: Arazzo sequences for multi-step API orchestration, CWL-informed tool descriptors for non-HTTP invocations, CloudEvents extension attributes for event interoperability, external policy engine bridges (XACML, OPA, Cedar), and standard request-response/event/callback patterns. Each binding declares interface references, input/ou

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosIntegrationProfile` | string | See schema for constraints. |
| `bindings` | object | See schema for constraints. |
| `description` | string | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `targetWorkflow` | TargetWorkflow | See schema for constraints. |
| `title` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **CloudEventsExtension** |
| **ContractRef** |
| **CorrelationRule** |
| **DecisionMapping** |
| **ExtensionsMap** |
| **IntegrationBinding** |
| **InterfaceRef** |
| **InvocationDescriptor** |
| **JsonSchemaUri** |
| **ResourceRequirements** |
| **RetryPolicy** |
| **TargetWorkflow** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
