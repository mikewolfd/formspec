# Determination Record Schema Reference Map

> `schemas/determination.schema.json` -- 235 lines -- Formspec Determination Record (`$id`: `https://formspec.org/schemas/determination/1.0`)

## Overview

This schema defines the **Determination Record**: the structured output produced by evaluating a Screener Document against respondent inputs. It captures matched and eliminated routes (with reasons and scores), override handling, per-phase results, a full snapshot of inputs keyed by Formspec paths, and provenance via `(screener.url, screener.version)`. Records are treated as immutable after creation; `status` may later become `expired` when `resultValidity` elapses, and `unavailable` means no evaluation ran. It corresponds to normative behavior in the Formspec screener / determination pipeline (Core + screener documents).

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecDetermination` | `string` (const `"1.0"`) | Yes | Determination Record specification version. MUST be `"1.0"`. |
| `screener` | `object` | Yes | Reference to the Screener Document that produced this record. The `(url, version)` tuple uniquely identifies the screener revision whose evaluation logic was applied. |
| `timestamp` | `string` (`format: date-time`) | Yes | ISO 8601 date-time when the evaluation completed. |
| `evaluationVersion` | `string` | Yes | Version of the Screener Document’s evaluation logic that was applied. Reflects `evaluationBinding`: `submission` → version at session start; `completion` → version at evaluation time. |
| `status` | `string` (enum) | Yes | `completed`: all items answered and evaluation finished. `partial`: not all items answered; evaluation on available data. `expired`: result validity exceeded post-evaluation. `unavailable`: screener outside availability window; no evaluation. |
| `overrides` | `object` | Yes | Override route evaluation. Overrides are hoisted and run before all phases. |
| `phases` | `array` of `#/$defs/PhaseResult` | Yes | Per-phase results in declaration order. Empty if a terminal override halted the pipeline. |
| `inputs` | `object` (`additionalProperties` → `#/$defs/InputEntry`) | Yes | Map from item path to `{ value, state }` for every screener item. Keys use Formspec path syntax including indexed repeat paths (e.g. `group[0].field`). |
| `validity` | `object` | No | Expiration metadata from the screener’s `resultValidity`. Omitted when the screener does not declare `resultValidity`. |
| `extensions` | `object` | No | Extension payload. Keys must match `propertyNames` pattern `^x-` (same `x-` mechanism as other Formspec documents). |

The root has `additionalProperties: false` -- only the properties above are allowed at the top level.

### `screener` sub-properties

| Property | Type | Required | Description |
|---|---|---|---|
| `url` | `string` (`format: uri`) | Yes | Canonical URI of the screener that produced this record. |
| `version` | `string` | Yes | Semantic version of the screener that produced this record. |

`screener` has `additionalProperties: false`.

### `overrides` sub-properties

| Property | Type | Required | Description |
|---|---|---|---|
| `matched` | `array` of `#/$defs/RouteResult` | Yes | Override routes that matched. Empty when none matched. |
| `halted` | `boolean` | Yes | `true` if a terminal override halted the pipeline; then `phases` is empty (no phases evaluated). |

`overrides` has `additionalProperties: false`.

### `validity` sub-properties

| Property | Type | Required | Description |
|---|---|---|---|
| `validUntil` | `string` (`format: date-time`) | No | When this record expires: `timestamp` + screener `resultValidity`. |
| `resultValidity` | `string` | No | Original ISO 8601 duration from the Screener Document (e.g. `P14D`, `P90D`). |

`validity` has `additionalProperties: false`. The `validity` object itself has no `required` array in the schema -- both fields are optional when `validity` is present.

## Key Type Definitions (`$defs`)

| Definition | Description | Key properties | Used by |
|---|---|---|---|
| **PhaseResult** | Result for one pipeline phase: status, strategy, matched/eliminated routes, warnings. | `id`, `status`, `strategy`, `matched`, `eliminated`, `warnings` | `properties.phases.items` |
| **RouteResult** | One route’s outcome in a phase or override list; eliminated entries may carry `reason`. | `target`, `label`, `message`, `score`, `reason`, `metadata` | `PhaseResult.matched.items`, `PhaseResult.eliminated.items`, `overrides.matched.items` |
| **InputEntry** | Captured value and answer state for one screener item; map key is the item path. | `value`, `state` | `properties.inputs.additionalProperties` |

### `PhaseResult` properties

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Phase id matching the Screener Document phase `id`. |
| `status` | `string` (enum) | Yes | `evaluated`, `skipped`, `unsupported-strategy` (processor lacks strategy; Core only mandates `first-match`). |
| `strategy` | `string` | Yes | Strategy used or that would have been used if skipped/unsupported. |
| `matched` | `array` of `#/$defs/RouteResult` | Yes | Routes that matched in this phase. |
| `eliminated` | `array` of `#/$defs/RouteResult` | Yes | Routes that did not match, with elimination reasons where applicable. |
| `warnings` | `array` of `string` | No (default `[]`) | Phase-level warnings (e.g. `below-minimum` for fan-out below `config.minMatches`). |

`PhaseResult` has `additionalProperties: false`.

### `RouteResult` properties

| Property | Type | Required | Description |
|---|---|---|---|
| `target` | `string` | Yes | Route target URI; matches the Route `target` in the Screener Document. |
| `label` | `string` | No | Human-readable label from the screener. |
| `message` | `string` | No | Respondent-facing message; if the route used `{{expression}}` interpolation, this is the resolved string. |
| `score` | `number` | No | Computed score for score-threshold routes; present only under `score-threshold` evaluation. |
| `reason` | `string` | No | Why eliminated: `condition-false`, `below-threshold`, `max-exceeded`, `null-score` (documented; not an enum in schema). Only in `eliminated` arrays. |
| `metadata` | `object` | No | Opaque metadata copied from the Screener Document. |

`RouteResult` has `additionalProperties: false`, except `metadata` uses `additionalProperties: true`.

### `InputEntry` properties

| Property | Type | Required | Description |
|---|---|---|---|
| `value` | any JSON value | No | Value at evaluation time (string, number, boolean, array, object, or `null`). `null` when `state` is `declined` or `not-presented`. |
| `state` | `string` (enum) | Yes | `answered`, `declined`, `not-presented`. |

`InputEntry` has `additionalProperties: false`.

## Required Fields

- **Root:** `$formspecDetermination`, `screener`, `timestamp`, `evaluationVersion`, `status`, `overrides`, `phases`, `inputs`
- **`screener`:** `url`, `version`
- **`overrides`:** `matched`, `halted`
- **`PhaseResult`:** `id`, `status`, `strategy`, `matched`, `eliminated`
- **`RouteResult`:** `target`
- **`InputEntry`:** `state`

## Enums and Patterns

| Property path | Type | Values / pattern | Description |
|---|---|---|---|
| `$formspecDetermination` | const | `1.0` | Record format version pin. |
| `status` | enum | `completed`, `partial`, `expired`, `unavailable` | Top-level evaluation lifecycle / outcome. |
| `PhaseResult.status` | enum | `evaluated`, `skipped`, `unsupported-strategy` | Whether the phase ran, was skipped, or used an unsupported strategy. |
| `InputEntry.state` | enum | `answered`, `declined`, `not-presented` | How the item was answered at evaluation time. |
| `extensions` keys | `propertyNames.pattern` | `^x-` | Extension property names must be `x-` prefixed. |
| `RouteResult.reason` | `string` (documented values) | `condition-false`, `below-threshold`, `max-exceeded`, `null-score` | Documented elimination reasons; **not** enforced as a schema `enum`. |

## Cross-References

- **Normative prose:** `specs/screener/screener-spec.md` §8 *Determination Record* (shape, overrides, phases, inputs, validity); `specs/core/spec.md` references Determination Records in the broader processing model.
- **Screener source:** `(screener.url, screener.version)` identifies the screener revision; phases/routes align with that document’s `id` / `target` / labels / messages / metadata.
- **Paths:** `inputs` keys follow Formspec path rules (including repeat indices), as in the Core path syntax.
- **Policy:** `evaluationVersion` and `validity` / `resultValidity` tie to screener fields such as `evaluationBinding` and `resultValidity` (screener spec; Screener type in `schemas/definition.schema.json` where applicable).
- **No external `$ref`:** The schema only references `#/$defs/*`; it does not import other JSON Schema files.

## Extension Points

- **`extensions` (root):** Keys must match `^x-`. The object does **not** set `additionalProperties: false`; constraint is via `propertyNames` only.
- **`RouteResult.metadata`:** Open object (`additionalProperties: true`) for screener-authored metadata -- not the same as document-level `x-` extensions.

## Validation Constraints

| Kind | Detail |
|---|---|
| **Root** | `additionalProperties: false` on the determination object, `screener`, `overrides`, `validity`, `PhaseResult`, `RouteResult`, `InputEntry`. |
| **Const** | `$formspecDetermination` MUST be `"1.0"`. |
| **Formats** | `uri`: `screener.url`; `date-time`: `timestamp`, `validity.validUntil`. |
| **Default** | `PhaseResult.warnings` defaults to `[]`. |
| **Arrays** | No `minItems` / `maxItems` on arrays in this schema. |
| **Immutability / status** | Schema prose: record is immutable once produced; only `status` may move to `expired` after `resultValidity`; `unavailable` means no evaluation (empty phases / no meaningful route results). |

### Behavioral notes (schema `description` only; not JSON Schema–enforceable)

- **`partial`:** Not all items were answered; evaluation used available data.
- **`overrides.halted`:** When `true`, `phases` MUST be empty (override short-circuit).
- **`RouteResult.score`:** Only meaningful for `score-threshold` strategies.
- **`RouteResult.reason`:** Expected on eliminated routes, not on matched.
- **`null-score`:** Score expression evaluated to `null` (e.g. non-relevant inputs).
- **`InputEntry.value`:** Use `null` when `state` is `declined` or `not-presented`.
- **`validity.validUntil`:** Derived as `timestamp` + screener `resultValidity`, not independently authored.

## `x-lm` annotations (schema metadata)

| Path | `critical` | Intent (summary) |
|---|---|---|
| `$formspecDetermination` | yes | Reject unknown determination versions. |
| `screener` | yes | Provenance for audit and reproducibility. |
| `status` | yes | Consumers must check status before trusting routes. |
| `inputs` | yes | Full input snapshot for audit and replay. |

---

*Generated from `schemas/determination.schema.json` (235 lines).*
