# WOS Business Calendar Schema Reference Map

> `wos-spec/schemas/sidecars/wos-business-calendar.schema.json` -- 194 lines -- WOS Business Calendar Config v1.0

## Overview

The WOS Business Calendar Schema describes a sidecar document defining working days, holidays, and operating hours. Public service workflows measure deadlines in business days (e.g., a 30-day window excluding weekends and holidays); this sidecar enables correct SLA evaluation.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$wosBusinessCalendar` | `string` (const `"1.0"`) | Yes | Specification version pin. |
| `targetWorkflow` | `string` (format: `uri`) | Yes | Registry URI of the Kernel Document this calendar targets. |
| `timezone` | `string` | Yes | IANA timezone identifier for all calculations. |
| `workWeek` | `array` of enum | Yes | Working days (mon-sun). Standard: `monday`-`friday`. |
| `holidays` | `array` of `Holiday` | No | Non-working days (fixed-date or rules-based). |
| `operatingHours` | `$ref: OperatingHours` | No | Working hours within a business day. |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties |
|---|---|---|
| **Holiday** | Fixed or floating day off. | `name`, `date` (ISO), `rule` (nthWeekday) |
| **OperatingHours** | Daily time window. | `start` (HH:MM), `end` (HH:MM) |

## Calculation Logic

1. **Business Day Check:** A date is a business day if its day-of-week is in `workWeek` AND it is NOT listed in `holidays`.
2. **Hour Counting:** If `operatingHours` is present, only time within the [start, end) window in the declared `timezone` counts toward hour-based SLAs.
3. **Absence Fallback:** If no business calendar is present, the processor defaults to wall-clock time (24/7/365).

## x-lm Annotations (Critical)

| Property Path | Intent |
|---|---|
| `$wosBusinessCalendar` | Version pin for schema/processor compatibility. |
| `targetWorkflow` | Binding to a specific kernel identity. |
| `timezone` | Determines the absolute time reference for all business calculations. |
| `workWeek` | Declares the standard working days for SLA calculation. |
| `holidays` | Identifies non-working days that must be excluded from durations. |
| `operatingHours` | Constrains clock-time to actual institutional operating hours. |
| `hour.start` / `hour.end` | Define the daily boundaries for hour-based SLA counting. |
