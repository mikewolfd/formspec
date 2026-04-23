# Screener Schema Reference Map

> `schemas/screener.schema.json` -- 286 lines -- Formspec Screener Document (`$id`: `https://formspec.org/schemas/screener/1.0`)

## Overview

This schema defines a **standalone Screener document**: a freestanding routing instrument for respondent classification. It does not bind to a target Definition; relationships to Definitions are expressed only through route `target` URIs. The document declares screening `items` and optional `binds` (evaluated in an isolated scope), lifecycle fields (`availability`, `resultValidity`, `evaluationBinding`), and an ordered `evaluation` pipeline of phases with pluggable strategies. Evaluation produces a Determination Record (separate schema). Normative evaluation behavior, override hoisting, and Determination Record shape are defined in the Formspec screener specification and Core (items, binds, extensions).

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecScreener` | `string` (const `"1.0"`) | Yes | Screener specification version. MUST be `"1.0"`. Processors MUST reject screeners with an unrecognized version. |
| `url` | `string` (`format: uri`) | Yes | Canonical, stable URI identifying this screener. MUST be globally unique. The pair `(url, version)` uniquely identifies a screener revision. URN syntax is acceptable; need not be HTTP-resolvable. |
| `version` | `string` (`minLength: 1`) | Yes | Semantic version of this Screener Document (semver 2.0.0). Independent of any Definition version. |
| `title` | `string` | Yes | Human-readable name for the screener. |
| `description` | `string` | No | Purpose description for the screener. |
| `availability` | `$ref: #/$defs/Availability` | No | Calendar window during which the screener accepts new respondents. When omitted, always available. |
| `resultValidity` | `string` (pattern: ISO 8601 duration) | No | How long a completed Determination Record remains valid before re-screening. When omitted, no expiration. |
| `evaluationBinding` | `string` (enum; default `submission`) | No | Which screener evaluation logic version governs when the screener is updated between session start and completion. |
| `items` | `array` of `https://formspec.org/schemas/definition/1.0#/$defs/Item` | Yes | Screening items (standard Formspec Item; Core section 4.2). Not part of any form instance data; keys MUST be unique within the document. |
| `binds` | `array` of `https://formspec.org/schemas/definition/1.0#/$defs/Bind` | No | Binds scoped to screener items (standard Bind; Core section 4.3). Paths reference screener item keys; isolated from Definition binds. |
| `evaluation` | `array` of `#/$defs/Phase` | Yes | Ordered evaluation pipeline. Phases run in declaration order; override routes are hoisted and evaluated before all phases. |
| `extensions` | `object` (`propertyNames`: `^x-`) | No | Extension declarations (same mechanism as Definition; Core section 4.6). |

The root has `additionalProperties: false`.

### `availability` (`Availability`) sub-properties

| Property | Type | Required | Description |
|---|---|---|---|
| `from` | `string` (`format: date`) | No | Earliest inclusive date the screener accepts respondents. Omitted = no start constraint. |
| `until` | `string` (`format: date`) | No | Latest inclusive date the screener accepts respondents. Omitted = no end constraint. |

`Availability` has `additionalProperties: false`. Either or both of `from` / `until` may be omitted for open-ended windows.

## Key Type Definitions (`$defs`)

| Definition | Description | Key properties | Used by |
|---|---|---|---|
| **Availability** | Accept-new-respondents calendar window; open-ended if bounds omitted. | `from`, `until` | `properties.availability` |
| **Phase** | One pipeline stage: strategy, routes, optional gating and strategy config. | `id`, `label`, `description`, `strategy`, `routes`, `activeWhen`, `config` | `properties.evaluation.items` |
| **Route** | One routing rule: condition and/or score, threshold, target, messaging, override/terminal flags, metadata. | `condition`, `score`, `threshold`, `target`, `label`, `message`, `metadata`, `override`, `terminal` | `Phase.routes.items` |

### `Phase` properties

| Property | Type | Required | Description |
|---|---|---|---|
| `id` | `string` (pattern) | Yes | Unique phase id within the screener. |
| `label` | `string` | No | Human-readable phase name. |
| `description` | `string` | No | Phase purpose. |
| `strategy` | `string` (pattern) | Yes | Evaluation strategy: normative `first-match`, `fan-out`, `score-threshold`, or extension `x-*`. |
| `routes` | `array` of `#/$defs/Route` | Yes | Routes evaluated with this phase’s strategy. |
| `activeWhen` | `$ref: definition#/$defs/FELExpression` | No | If present, phase runs only when expression is true; if absent, phase always runs. |
| `config` | `object` | No | Strategy-specific configuration (see below). |

`Phase` has `additionalProperties: false`.

#### `Phase.config` sub-properties

| Property | Type | Required / default | Description |
|---|---|---|---|
| `minMatches` | `integer` (`minimum: 0`) | No | Fan-out: minimum routes that must match for success. |
| `maxMatches` | `integer` (`minimum: 1`) | No | Fan-out: maximum matched routes to include. |
| `topN` | `integer` (`minimum: 1`) | No | Score-threshold: return only top N scoring routes. |
| `normalize` | `boolean` (default `false`) | No | Score-threshold: when true, normalize scores to 0.0–1.0 before threshold comparison. |

`Phase.config` declares the properties above and `additionalProperties: true` (extension strategies may add keys).

### `Route` properties

| Property | Type | Required | Description |
|---|---|---|---|
| `condition` | `$ref: definition#/$defs/FELExpression` | No | Boolean FEL over screener item values. Required for `first-match` and `fan-out` (behavioral; not JSON Schema `required`). |
| `score` | `$ref: definition#/$defs/FELExpression` | No | Numeric FEL. Required for `score-threshold` (behavioral). |
| `threshold` | `number` | No | Minimum score for match (`score >= threshold`). Required for `score-threshold` (behavioral). |
| `target` | `string` | Yes | Destination URI: Definition `url|version`, external URI, or `outcome:name`. |
| `label` | `string` | No | Human-readable route description. |
| `message` | `string` | No | Respondent message when route matches; MAY include `{{expression}}` interpolation. |
| `metadata` | `object` | No | Opaque key-value metadata preserved in the Determination Record (`additionalProperties: true`). |
| `override` | `boolean` (default `false`) | No | If true, route is hoisted and evaluated before all phases. |
| `terminal` | `boolean` (default `false`) | No | If true and override matches, pipeline halts. Ignored when `override` is false. |

`Route` has `additionalProperties: false`.

## Required Fields

- **Root:** `$formspecScreener`, `url`, `version`, `title`, `items`, `evaluation`
- **`Phase`:** `id`, `strategy`, `routes`
- **`Route`:** `target`
- **`Availability`:** none (empty required array in schema terms: no `required` keyword; both fields optional)

## Enums and Patterns

| Property path | Kind | Values / pattern | Description |
|---|---|---|---|
| `$formspecScreener` | const | `1.0` | Document format version pin. |
| `evaluationBinding` | enum | `submission`, `completion` | `submission` (default): rules at session start; `completion`: rules at completion. |
| `resultValidity` | pattern | `^P(?:\d+Y)?(?:\d+M)?(?:\d+W)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+S)?)?$` | ISO 8601 duration (e.g. `P14D`, `P90D`, `P1Y`). |
| `Phase.id` | pattern | `^[a-zA-Z][a-zA-Z0-9_-]*$` | Phase id: leading letter; then letters, digits, `_`, `-`. |
| `Phase.strategy` | pattern | <code>^(first-match|fan-out|score-threshold|x-.+)$</code> | Normative strategy names or extension strategies with <code>x-</code> prefix. |

**if / then / else polymorphism:** This schema does not use JSON Schema conditional keywords (`if` / `then` / `else`). Strategy-specific requirements on `Route` (`condition` vs `score`/`threshold`) are behavioral contracts in the screener spec, not enforced by the schema.

## Cross-References

- **Items:** `items` → `https://formspec.org/schemas/definition/1.0#/$defs/Item` (Core section 4.2).
- **Binds:** `binds` → `https://formspec.org/schemas/definition/1.0#/$defs/Bind` (Core section 4.3).
- **FEL:** `Phase.activeWhen`, `Route.condition`, `Route.score` → `https://formspec.org/schemas/definition/1.0#/$defs/FELExpression`.
- **Output:** Determination Records use `schemas/determination.schema.json` (pairs with this document’s `url` / `version` / `evaluationBinding` / `resultValidity` semantics).
- **Normative behavior:** Screener spec (evaluation strategies, override hoisting, terminal overrides, Determination contents) and extension registry for non-core strategies.

## Extension Points

- **`extensions` (root):** Keys MUST match `^x-` (same pattern as Definition extensions).
- **`Phase.strategy`:** Extensions MUST match `x-.+` (e.g. `x-constraint-satisfaction`).
- **`Phase.config`:** `additionalProperties: true` for custom extension strategy configuration.
- **`Route.metadata`:** `additionalProperties: true`; processor does not interpret keys/values beyond preservation.

## Validation Constraints

- **Root / `Availability` / `Phase` / `Route`:** `additionalProperties: false` (strict shapes).
- **`$formspecScreener`:** const `1.0` only.
- **`url`:** valid URI (`format: uri`).
- **`version`:** non-empty string (`minLength: 1`).
- **`Phase.config`:** `minMatches` ≥ 0; `maxMatches` ≥ 1; `topN` ≥ 1 when present.
- **`Availability.from` / `until`:** `format: date` when present.
- **Spec-only (not JSON Schema):** For `first-match` / `fan-out`, routes typically need `condition`; for `score-threshold`, routes need `score` and `threshold`. Core conformance: processors must support `first-match`; complete conformance: all three normative strategies.

### Strategy–route alignment (behavioral summary)

| Strategy | Route fields (normative) | `Phase.config` |
|---|---|---|
| `first-match` | `condition` | -- |
| `fan-out` | `condition` | `minMatches`, `maxMatches` |
| `score-threshold` | `score`, `threshold` | `topN`, `normalize` |
| `x-*` | Strategy-defined | Via `config` additional properties |

### `x-lm` critical annotations (authoring / LM hints)

Properties marked `x-lm.critical: true` in the schema include: `$formspecScreener`, `url`, `version`, `title`, `items`, `evaluation`, `Phase.strategy`, `Route.target`. These carry `intent` strings in the schema for tooling (version rejection, auditing, display, routing).
