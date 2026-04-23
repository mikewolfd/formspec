# Token Registry Schema Reference Map

> schemas/token-registry.schema.json -- 111 lines -- Formspec Token Registry

## Overview

This schema validates the **Token Registry** JSON document: a structured catalog of design tokens (`$formspecTokenRegistry`, `categories`, per-token metadata) for tooling, validation, and Studio. It matches the companion **Token Registry** specification (Tier 2, presentation). The schema’s own description states that the registry is a **development artifact** -- renderers **MUST NOT** require it at runtime; Theme’s flat `tokens` map remains the runtime surface.

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$formspecTokenRegistry` | `string` (const `"1.0"`) | Yes | Token Registry specification version. MUST be `"1.0"`. Processors MUST reject documents with an unrecognized version. |
| `description` | `string` | No | Human-readable description of this registry. |
| `categories` | `object` (`minProperties: 1`, `additionalProperties`: `$ref: #/$defs/Category`) | Yes | Token categories keyed by category prefix (for example `color`, `spacing`, `font`). Each token entry key within a category MUST start with the category key followed by a dot. |

The root object has `additionalProperties: false`.

### `categories` map values (`Category`)

Each category key is the **category prefix**; the value is a `Category` object.

| Property | Type | Required | Description |
|---|---|---|---|
| `description` | `string` | No | Human-readable description of the category. |
| `type` | `$ref: #/$defs/TokenType` | Yes | Default token type for entries in this category. Entries may override with their own `type`. |
| `darkPrefix` | `string` | No | Prefix for dark-mode counterpart tokens. When present, each token’s `dark` field holds the default dark-mode value. Derived dark key is `<darkPrefix>.<suffix>` where suffix is the token key with the category prefix and its trailing dot removed. Only categories whose type is `color` SHOULD declare `darkPrefix`. |
| `tokens` | `object` (`minProperties: 1`, `additionalProperties`: `$ref: #/$defs/TokenEntry`) | Yes | Token entries keyed by full dot-delimited key; each key MUST start with the category key followed by a dot. |

`Category` has `additionalProperties: false`.

### `TokenEntry` (values of `Category.tokens`)

| Property | Type | Required | Description |
|---|---|---|---|
| `description` | `string` | No | Human-readable description of the token’s purpose. |
| `type` | `$ref: #/$defs/TokenType` | No | Overrides the category default when present. |
| `default` | `oneOf: string \| number` | No | Default value shipped with the platform theme. |
| `dark` | `oneOf: string \| number` | No | Default dark-mode value when the containing category declares `darkPrefix`; processors MUST ignore if `darkPrefix` is absent and SHOULD warn. |
| `examples` | `array` of (`oneOf: string \| number`) | No | Example values for documentation and tooling hints. |

`TokenEntry` has `additionalProperties: false`.

## Key Type Definitions ($defs)

| Definition | Description | Key Properties | Used By |
|---|---|---|---|
| **Category** | A group of tokens sharing a category prefix and default type. | `description`, `type` (required, `$ref: TokenType`), `darkPrefix`, `tokens` (required, object of `TokenEntry`) | `properties.categories` (as `additionalProperties`) |
| **TokenEntry** | Metadata for a single design token. | `description`, `type` (`$ref: TokenType`), `default` (oneOf: string \| number), `dark` (oneOf: string \| number), `examples` (array of string \| number) | `Category.properties.tokens` (as `additionalProperties`) |
| **TokenType** | Semantic token type for editors and validation; does not affect CSS custom property emission. | (string enum) | `Category.properties.type`, `TokenEntry.properties.type` |

## Required Fields

### Top-Level (registry root)

- `$formspecTokenRegistry`
- `categories`

### `Category`

- `type`
- `tokens`

### `TokenEntry`

- (none in schema -- all properties optional)

## Enums and Patterns

| Property Path | Type | Values/Pattern | Description |
|---|---|---|---|
| `$formspecTokenRegistry` | const | `"1.0"` | Fixed registry document version. |
| `Category.type` | enum (`TokenType`) | `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `opacity`, `shadow`, `number` | Default token type for entries in this category; entries may override with their own `type`. |
| `TokenEntry.type` | enum (`TokenType`) | `color`, `dimension`, `fontFamily`, `fontWeight`, `duration`, `opacity`, `shadow`, `number` | Overrides the category default when present. |

## Cross-References

- **Normative prose:** `specs/theme/token-registry-spec.md` (Token Registry companion spec) defines discovery, dark-key derivation from `darkPrefix`, advisory validation rules, and relationship to Theme `tokens` / `tokenMeta`.
- **Theme:** Registry keys and values align with keys and values in the Theme document’s `tokens` map; the spec describes how `darkPrefix` relates to separate keys in Theme (see Theme spec token sections referenced from the Token Registry spec).
- **`tokenMeta`:** The Token Registry spec allows Theme-level `tokenMeta.categories` using the same **category object shape** as registry categories (not the full registry root -- no `$formspecTokenRegistry` inside `tokenMeta`); validating `tokenMeta` in Theme may require `theme.schema.json` updates per the companion spec.

## Extension Points

- **None in this schema.** Root, `Category`, and `TokenEntry` all set `additionalProperties: false`. Custom token keys are expressed as additional keys inside `categories` and `tokens`, not as arbitrary extra JSON properties on those objects.

## Validation Constraints

- **`$formspecTokenRegistry`:** `const: "1.0"` -- must be exactly the string `"1.0"`.
- **`categories`:** `minProperties: 1` -- at least one category entry.
- **`Category.tokens`:** `minProperties: 1` -- each category must declare at least one token entry.
- **`TokenEntry.default`:** `oneOf: [{ type: string }, { type: number }]` -- default value for the platform theme.
- **`TokenEntry.dark`:** `oneOf: [{ type: string }, { type: number }]` -- meaningful when the parent category declares `darkPrefix`; processors MUST ignore `dark` when `darkPrefix` is absent (spec: SHOULD warn).
- **`TokenEntry.examples`:** array whose items are each `oneOf: string | number` -- documentation and tooling hints.
- **No `if` / `then` / `else`** polymorphism in this schema file.
