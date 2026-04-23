# WOS Custody Hook Append Input — Schema Reference Map

> `wos-spec/schemas/kernel/wos-custody-hook-encoding.schema.json` — 164 lines — JSON Schema property index

## Overview

JSON serialization of the WOS-owned authored-record surface crossing the Kernel `custodyHook` seam. This is a runtime artifact, not an authored WOS document type, so it intentionally has no `$wos*` marker. The root object is the four-field append input defined by WOS Custody Hook Encoding §1.3. The live seam carries raw dCBOR bytes in `record`; this schema models the JSON host representation used by fixtures, tests, and debug export, where those bytes are serialized as base64 text.

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `caseId` | CaseTypeId | See schema for constraints. |
| `eventType` | WosEventType | See schema for constraints. |
| `record` | string | See schema for constraints. |
| `recordId` | RecordTypeId | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **CaseTypeId** |
| **CustodyAppendReceipt** |
| **IdempotencySource** |
| **RecordTypeId** |
| **ReservedRecordTypeId** |
| **TenantPrefix** |
| **TypeIdTail** |
| **VendorRecordTypeId** |
| **WosEventType** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
