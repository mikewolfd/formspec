# WOS Signature Profile Document — Schema Reference Map

> `wos-spec/schemas/profiles/wos-signature-profile.schema.json` — 848 lines — JSON Schema property index

## Overview

A WOS Signature Profile Document per the WOS Signature Profile specification v1.0. Declares signer roles, signing flow, document binding, consent evidence, identity-binding requirements, and policy hooks for signature workflows. WOS governs the workflow semantics and emits SignatureAffirmation provenance; Trellis owns anchoring and certificate/export composition.

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosSignatureProfile` | string | See schema for constraints. |
| `authenticationPolicies` | array | See schema for constraints. |
| `declinePolicy` | DeclinePolicy | See schema for constraints. |
| `description` | string | See schema for constraints. |
| `documents` | array | See schema for constraints. |
| `evidence` | SignatureEvidence | See schema for constraints. |
| `expiryPolicy` | ExpiryPolicy | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `reassignmentPolicy` | ReassignmentPolicy | See schema for constraints. |
| `reminders` | ReminderPolicy | See schema for constraints. |
| `roles` | array | See schema for constraints. |
| `signingFlow` | SigningFlow | See schema for constraints. |
| `targetWorkflow` | TargetWorkflow | See schema for constraints. |
| `title` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |
| `voidPolicy` | VoidPolicy | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **AssuranceLevel** |
| **AuthenticationMethod** |
| **AuthenticationPolicy** |
| **CasePath** |
| **CompletionRequirement** |
| **ConsentReference** |
| **DeclinePolicy** |
| **Duration** |
| **EventName** |
| **ExpiryPolicy** |
| **ExtensionsMap** |
| **HashAlgorithm** |
| **HashValue** |
| **Identifier** |
| **IdentityBindingRequirement** |
| **JsonSchemaUri** |
| **Key** |
| **ReassignmentPolicy** |
| **ReminderPolicy** |
| **SignatureDocument** |
| **SignatureEvidence** |
| **SignatureRole** |
| **SignerRole** |
| **SigningFlow** |
| **SigningStep** |
| **TargetWorkflow** |
| **VoidPolicy** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
