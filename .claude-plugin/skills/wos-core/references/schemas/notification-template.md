# WOS Notification Template Config — Schema Reference Map

> `wos-spec/schemas/sidecars/wos-notification-template.schema.json` — 264 lines — JSON Schema property index

## Overview

A WOS Notification Template Config sidecar document. Defines reusable templates for notices that WOS workflows generate during governance events: adverse decision notices, hold notifications, appeal acknowledgments, SLA warnings, and case status updates. Government workflows have strict notice requirements -- an adverse benefits decision must include the specific determination, individualized reason codes, appeal rights, and filing deadlines. Templates separate notice content from governance log

## Top-Level Properties

| Property | Type / shape | Notes |
|----------|--------------|-------|
| `$schema` | JsonSchemaUri | See schema for constraints. |
| `$wosNotificationTemplate` | string | See schema for constraints. |
| `description` | string | See schema for constraints. |
| `extensions` | ExtensionsMap | See schema for constraints. |
| `targetWorkflow` | string | See schema for constraints. |
| `templates` | object | See schema for constraints. |
| `title` | string | See schema for constraints. |
| `version` | string | See schema for constraints. |

## Key `$defs` (sample)

| Definition |
|------------|
| **ExtensionsMap** |
| **JsonSchemaUri** |
| **NotificationTemplate** |
| **TemplateSection** |

## Cross-References

Resolve `$ref` targets inside the schema file for full nested structures. Sidecar schemas typically declare a `targetWorkflow`, `targetGovernance`, or `targetAgent` binding to a parent document.
