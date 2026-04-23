# WOS Correspondence Metadata Config — Schema Reference Map

> `wos-spec/schemas/kernel/wos-correspondence-metadata.schema.json` — 254 lines — JSON Schema property index

## Overview

A WOS Correspondence Metadata Config sidecar document. Declares the metadata schema for correspondence entries stored in case state. Government workflows track correspondence (letters, phone calls, emails, portal submissions, in-person interactions) as part of the case record. The kernel's existing event mechanism handles correspondence events -- events that match no transition are recorded in provenance (Kernel S4.9). This sidecar defines structured metadata for consistent cataloging and retrie

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosCorrespondenceMetadata` | string | See schema for constraints. |
| `correspondenceField` | string | See schema for constraints. |
| `description` | string | See schema for constraints. |
| `entryTemplates` | array | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `targetWorkflow` | string | See schema for constraints. |
| `title` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **CorrespondenceEntry** |
| **EntryTemplate** |
| **ExtensionsMap** |
| **JsonSchemaUri** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
