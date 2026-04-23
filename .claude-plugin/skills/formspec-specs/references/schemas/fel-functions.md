# FEL Function Catalog Schema Reference Map

> `schemas/fel-functions.schema.json` -- 1157 lines -- Structured catalog of built-in FEL v1.0 functions (normative signatures and semantics for TS/Python engines)

## Overview

This JSON Schema document doubles as the **normative FEL standard-library catalog**: it defines `$defs` for catalog shape (`FunctionEntry`, `Parameter`, `FELType`) and embeds the full `functions` array in the same file. Implementations in TypeScript (`packages/formspec-engine`) and Python (`src/formspec/fel`) must match these signatures and described behavior. The catalog is versioned with `$formspecFelFunctions: "1.0"`. It corresponds to the Formspec Expression Language (FEL) specification suite (built-in function semantics, null handling, MIP/repeat/locale behavior).

## Top-Level Structure

| Property | Type | Required | Description |
|---|---|---|---|
| `$schema` | `string` (URI) | No | JSON Schema draft 2020-12 meta-schema URI for editor/tooling. |
| `$id` | `string` (URI) | No | Canonical document id: `https://formspec.org/specs/fel/functions/1.0`. |
| `title` | `string` | No | Human title: `"FEL Function Catalog"`. |
| `description` | `string` | No | Normative role: catalog of built-in FEL functions and conformance expectation for runtimes. |
| `type` | `string` | No | Root instance type: `"object"`. |
| `required` | `array` of `string` | No | Schema keyword: instance must include `$formspecFelFunctions`. |
| `properties` | `object` | No | JSON Schema `properties` for valid instance keys (`$formspecFelFunctions`, `version`, `functions`). |
| `$defs` | `object` | No | Reusable definitions: `FELType`, `Parameter`, `FunctionEntry`. |
| `$formspecFelFunctions` | `string`, const `"1.0"` | **Yes** | Catalog spec version pin. MUST be `"1.0"`. Carries `x-lm.critical` / `x-lm.intent` for LLM tooling. |
| `version` | const `"1.0"` | No | Catalog edition identifier (matches `properties.version`). |
| `functions` | `array` of `FunctionEntry` | No | All built-in functions with metadata and examples. |

The bundled normative file includes both schema keywords and populated `version` + `functions` at the document root.

### `properties.$formspecFelFunctions` (detail)

| Sub-field | Type | Description |
|---|---|---|
| `type` | `string` | Literal string type. |
| `const` | `"1.0"` | Fixed value. |
| `description` | `string` | Version pin semantics. |
| `examples` | `array` | Example value `["1.0"]`. |
| `x-lm` | `object` | `critical: true`, `intent` documents LLM-facing importance. |

### `properties.functions`

| Constraint | Value |
|---|---|
| `type` | `array` |
| `items` | `$ref: "#/$defs/FunctionEntry"` |

## Key Type Definitions ($defs)

| Definition | Description | Key Properties | Used By |
|---|---|---|---|
| **FELType** | FEL type tag; `any` = polymorphic; `array` = array with element semantics in prose. | (enum only) | `Parameter.type`, `FunctionEntry.returns` |
| **Parameter** | One formal parameter. | `name`, `type`, `description?`, `required?` (default `true`), `variadic?` (default `false`), `enum?` | `FunctionEntry.parameters[]` |
| **FunctionEntry** | One built-in function definition. | `name`, `category`, `parameters`, `returns`, `description`, `returnDescription?`, `nullHandling?`, `deterministic?`, `shortCircuit?`, `examples?`, `sinceVersion?` | Root `functions[]` |

### FunctionEntry.examples[] item (inline object, not a named $def)

| Property | Type | Required | Description |
|---|---|---|---|
| `expression` | `string` | Yes | Example FEL expression. |
| `result` | any JSON value | Yes | Expected result (untyped in schema). |
| `note` | `string` | No | Extra commentary. |

## Required Fields

- Top-level instance: **`$formspecFelFunctions`** -- must be the string `"1.0"`.
- **FunctionEntry**: `name`, `category`, `parameters`, `returns`, `description`.
- **Parameter**: `name`, `type`.
- **Example object** (when present): `expression`, `result`.

## Enums and Patterns

| Property path | Type | Values / pattern | Description |
|---|---|---|---|
| `FELType` | enum | `string`, `number`, `boolean`, `date`, `dateTime`, `time`, `money`, `array`, `any`, `null` | Parameter and return type vocabulary. |
| `FunctionEntry.category` | enum | `aggregate`, `string`, `numeric`, `date`, `logical`, `type`, `money`, `mip`, `repeat`, `locale` | Documentation / grouping category. |
| `dateDiff` → parameter `unit` | enum | `days`, `months`, `years` | Unit for calendar difference. |
| `dateAdd` → parameter `unit` | enum | `days`, `months`, `years` | Unit for date arithmetic. |

No `pattern` constraints are defined on these $defs. Regex behavior for `matches()` is described in prose (host engine: ECMA-262 vs Python `re`).

## Cross-References

- **FEL normative prose**: Core / FEL specification sections defining expression evaluation, null propagation, bind context, and built-in behavior (use `specs/` and `.claude-plugin/skills/formspec-specs/references/fel-grammar.md` for grammar-level navigation).
- **Implementations**: `packages/formspec-engine` (TypeScript), `src/formspec/fel` (Python) -- must align with this catalog.
- **Extension registry**: Custom/host-registered functions are not listed here; see `schemas/registry.schema.json` and extension-registry reference material for add-on surfaces.
- **Internal `$ref` only**: `#/$defs/FunctionEntry`, `#/$defs/Parameter`, `#/$defs/FELType` -- no cross-file schema `$ref`.

## Extension Points

- **`additionalProperties: false`** on `Parameter` and `FunctionEntry` -- no extra keys on those objects without a schema revision.
- **`x-lm`** on `$formspecFelFunctions` -- implementation-specific LLM metadata (not general extension vocabulary for functions).
- **`sinceVersion`** (default `"1.0"`) on `FunctionEntry` -- forward-compatible tagging when new functions ship.
- **Closed `FunctionEntry.category` enum** -- new categories require schema enum updates.
- **Runtime function registration** (custom builtins) is an implementation concern; this file is the **built-in** catalog only.

## Validation Constraints

- Root `type` is `object`; only `$formspecFelFunctions` is in `required` for instances (per `required` array).
- **`$formspecFelFunctions`**: `const` `"1.0"`.
- **`properties.version`**: `const` `"1.0"` when present.
- **Variadic parameters** must be last in `parameters` (documented on `FunctionEntry.parameters`).
- **Semantic flags** (not JSON Schema–enforced): `shortCircuit`, `deterministic`, MIP literal-path arguments, currency rules on money functions -- described per function in embedded data.

## Embedded function catalog (73 entries)

| Category | Count | Function names |
|---|---|---|
| `aggregate` | 12 | `sum`, `count`, `countWhere`, `sumWhere`, `avgWhere`, `minWhere`, `maxWhere`, `every`, `some`, `avg`, `min`, `max` |
| `string` | 11 | `length`, `contains`, `startsWith`, `endsWith`, `substring`, `replace`, `upper`, `lower`, `trim`, `matches`, `format` |
| `numeric` | 5 | `round`, `floor`, `ceil`, `abs`, `power` |
| `date` | 14 | `today`, `now`, `year`, `month`, `day`, `hours`, `minutes`, `seconds`, `time`, `dateDiff`, `dateAdd`, `timeDiff`, `duration` |
| `logical` | 6 | `if`, `coalesce`, `empty`, `present`, `selected`, `instance` |
| `type` | 9 | `isNumber`, `isString`, `isDate`, `isNull`, `typeOf`, `number`, `string`, `boolean`, `date` |
| `money` | 6 | `money`, `moneyAmount`, `moneyCurrency`, `moneyAdd`, `moneySum`, `moneySumWhere` |
| `locale` | 3 | `locale`, `runtimeMeta`, `pluralCategory` |
| `mip` | 4 | `valid`, `relevant`, `readonly`, `required` |
| `repeat` | 3 | `prev`, `next`, `parent` |

### `shortCircuit: true` (lazy / per-element predicate evaluation)

`countWhere`, `sumWhere`, `avgWhere`, `minWhere`, `maxWhere`, `every`, `some`, `if`, `moneySumWhere`.

### `deterministic: false`

`today`, `now`, `locale`, `runtimeMeta`. (`pluralCategory` is explicitly deterministic when a locale tag is supplied.)

### Notable behavioral notes (from catalog prose)

- **`timeDiff`**: `laterTime`, `earlierTime` (`time`) -- signed difference in **whole seconds** (not `duration()` milliseconds; not a `unit` enum).
- **`duration`**: Parses ISO 8601 duration subset to **milliseconds**; fixed 365-day years / 30-day months for Y/M in date part.
- **MIP functions** (`valid`, `relevant`, `readonly`, `required`): path argument is a **literal** field reference string, not a evaluated subexpression.
- **`substring`**: `start` is **1-based**.
- **`round`**: Banker’s rounding (half to even).
- **`replace`**: Literal substring replacement only (not regex).
- **`typeOf`**: Returns one of `'string'`, `'number'`, `'boolean'`, `'array'`, `'object'`, `'null'`.
