# WOS Extension Registry — Schema Reference Map

> `wos-spec/schemas/registry/wos-extension-registry.schema.json` — 233 lines — JSON Schema property index

## Overview

A WOS Extension Registry document. Catalogs the named extension seams that the WOS Kernel exposes (Kernel §10) plus higher-layer or vendor-supplied entries that bind to those seams. Adopters scan a registry to discover which seams exist, which lifecycle stage they have reached (draft, stable, deprecated, retired), how multiple registrations compose at a single seam, and which vendor namespaces are claimed. Registries are descriptive — they catalog seams; they do not enforce behavior. Lint toolin

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosExtensionRegistry` | string | See schema for constraints. |
| `description` | string | See schema for constraints. |
| `entries` | array | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `title` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **ExtensionsMap** |
| **JsonSchemaUri** |
| **RegistryEntry** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
