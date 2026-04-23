# WOS Kernel Provenance Log Document — Schema Reference Map

> `wos-spec/schemas/kernel/wos-provenance-record.schema.json` — 655 lines — JSON Schema property index

## Overview

A WOS Kernel Provenance Log export document per Kernel §8 (Provenance). Carries an append-only array of Facts-tier provenance records emitted by runtime execution. State-transition records whose transitionTags include 'determination' MUST carry a caseFileSnapshot so notices, appeals, and override reviews can reproduce the exact factual basis used by the decision. This schema is the canonical validation target for provenance log exports -- kernel documents themselves do not embed the log.

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `provenanceLog` | array | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **CapabilityInvocationRecord** |
| **CaseFileSnapshot** |
| **FactsTierRecord** |
| **ProvenanceOutcome** |
| **SignatureAffirmationData** |
| **SignatureAffirmationRecord** |
| **SignatureConsentReference** |
| **SignatureIdentityBinding** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
