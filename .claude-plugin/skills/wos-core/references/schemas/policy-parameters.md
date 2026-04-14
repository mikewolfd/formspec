# WOS Policy Parameters Schema Reference Map

> `wos-spec/schemas/governance/wos-policy-parameters.schema.json` -- 279 lines -- WOS Policy Parameter Config v1.0

## Overview

The WOS Policy Parameters Schema describes a sidecar document providing date-indexed parameter values. Government workflows apply rules effective at specific dates (e.g., application date), not today's date. This sidecar enables temporal parameter resolution following the OpenFisca model.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$wosPolicyParameters` | `string` (const `"1.0"`) | Yes | Specification version pin. |
| `targetWorkflow` | `string` (format: `uri`) | Yes | Registry URI of the Kernel Document these parameters target. |
| `version` | `string` | No | Version of this parameter document. |
| `title` / `description` | `string` | No | Human-readable metadata. |
| `parameters` | `object` of `ParameterDefinition` | Yes | Named parameters with date-indexed value schedules. |
| `bindings` | `object` of `RegulatoryBinding` | No | Named document version bindings with date-indexed URI schedules. |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties |
|---|---|---|
| **ParameterDefinition** | Single temporal parameter. | `type`, `resolutionDateRef` (path), `values` (array) |
| **RegulatoryBinding** | Single temporal document link. | `bindingType`, `resolutionDateRef`, `values` (array) |
| **DateValue** | Single point on the timeline. | `effectiveDate`, `value` |

## Resolution Logic

1. **Resolution Date:** The processor looks up the value of the `resolutionDateRef` path in the case state (e.g., `caseFile.applicationDate`).
2. **Value Lookup:** The processor identifies the most recent entry in the `values` array where `effectiveDate <= Resolution Date`.
3. **Availability:** Resolved values are injected into the evaluation context under `parameters.[name]`.

## x-lm Annotations (Critical)

| Property Path | Intent |
|---|---|
| `$wosPolicyParameters` | Version pin for schema/processor compatibility. |
| `targetWorkflow` | Binding to a specific kernel identity. |
| `parameters` | Core declarative map of date-indexed business rules. |
| `bindings` | Core declarative map of date-indexed document version links (e.g. correct form version for date). |
| `resolutionDateRef` | Determines WHICH case date is used for lookup -- essential for the temporal logic. |
| `values` | The chronological schedule of values that drives the temporal resolution. |
